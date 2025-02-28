import { Statement } from '../models/Statement';
import { BalanceChange } from '../models/BalanceChange';
import { Interest } from '../models/Interest';
import { Payment } from '../models/Payment';
import { Repayment } from '../models/Repayment';
import { EcbExchangeRateService } from './EcbExchangeRateService';

export class StatementProcessorService {
    private ecbExchangeRateService: EcbExchangeRateService;

    constructor(ecbExchangeRateService?: EcbExchangeRateService) {
        this.ecbExchangeRateService = ecbExchangeRateService || new EcbExchangeRateService();
    }

    /**
     * Processes a list of statements to analyze and aggregate data
     * @param statements List of statements to process
     * @returns Object containing processed statement data
     */
    public execute(statements: Statement[]): BalanceChange[] {
        if (!statements || statements.length === 0) {
            throw new Error('No statements provided for processing');
        }

        // Extract all balance changes from all statements
        const allBalanceChanges: BalanceChange[] = [];
        
        for (const statement of statements) {
            // Add interests
            for (const interest of statement.getInterests()) {
                allBalanceChanges.push(interest);
            }
            
            // Add payments
            for (const payment of statement.getPayments()) {
                allBalanceChanges.push(payment);
            }
            
            // Add repayments
            for (const repayment of statement.getRepayments()) {
                allBalanceChanges.push(repayment);
            }
        }
        
        // Sort all balance changes by date
        allBalanceChanges.sort((a, b) => a.getDate().getTime() - b.getDate().getTime());
        
        // Calculate running totals
        let totalInterestUntil = 0;
        let totalLoanUntil = 0;
        
        for (const balanceChange of allBalanceChanges) {
            // Update running totals based on the type of balance change
            if (balanceChange instanceof Interest) {
                // For interest entries, add to the interest total
                totalInterestUntil += balanceChange.getSum();
            } else if (balanceChange instanceof Payment) {
                // For payment entries, add to the loan total
                totalLoanUntil += balanceChange.getSum();
            } else if (balanceChange instanceof Repayment) {
                // For repayment entries, calculate how much goes to loan vs interest
                const repaymentAmount = balanceChange.getSum();
                const totalOutstanding = totalLoanUntil + totalInterestUntil;
                
                if (totalOutstanding > 0) {
                    // Calculate what percentage of the outstanding balance is loan
                    const payedLoanPartPercent = totalLoanUntil / totalOutstanding;
                    
                    // Apply the repayment proportionally
                    const loanPortion = repaymentAmount * payedLoanPartPercent;
                    const interestPortion = repaymentAmount - loanPortion;
                    
                    // Update the totals
                    totalLoanUntil -= loanPortion;
                    totalInterestUntil -= interestPortion;
                    
                    // Store the calculated percentage on the repayment object
                    balanceChange.setPayedLoanPartPercent(payedLoanPartPercent);
                    
                    // Set ECB exchange rate and calculate sum in Euro
                    if (this.ecbExchangeRateService.isDataLoaded()) {
                        const rate = this.ecbExchangeRateService.getExchangeRate(balanceChange.getDate());
                        balanceChange.setEcbExchangeRateForThatDate(rate);
                        balanceChange.setSumInEuro(repaymentAmount / rate); // EUR to GBP conversion
                        console.log('rate', rate);
                        console.log('repaymentAmount', repaymentAmount);
                        console.log('repaymentAmount / rate', repaymentAmount / rate);
                        console.log(balanceChange);
                    }
                }
            }
            
            // Set the running totals on the balance change
            balanceChange.setTotalInterestUntil(totalInterestUntil);
            balanceChange.setTotalLoanUntil(totalLoanUntil);
        }
        
        return allBalanceChanges;
    }
}
