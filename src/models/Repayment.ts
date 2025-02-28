import { BalanceChange } from './BalanceChange';

export class Repayment extends BalanceChange {
    private payedLoanPartPercent: number;
    private ecbExchangeRateForThatDate: number;
    private sumInEuro: number;

    constructor(
        date: Date, 
        sum: number, 
        payedLoanPartPercent: number = 0,
        ecbExchangeRateForThatDate: number = 1,
        sumInEuro: number = 0,
        totalInterestUntil: number = 0, 
        totalLoanUntil: number = 0
    ) {
        super(date, sum, totalInterestUntil, totalLoanUntil);
        this.payedLoanPartPercent = payedLoanPartPercent;
        this.ecbExchangeRateForThatDate = ecbExchangeRateForThatDate;
        this.sumInEuro = sumInEuro;
    }

    // Getters
    public getPayedLoanPartPercent(): number {
        return this.payedLoanPartPercent;
    }

    public getEcbExchangeRateForThatDate(): number {
        return this.ecbExchangeRateForThatDate;
    }

    public getSumInEuro(): number {
        return this.sumInEuro;
    }

    // Setters
    public setPayedLoanPartPercent(payedLoanPartPercent: number): void {
        this.payedLoanPartPercent = payedLoanPartPercent;
    }

    public setEcbExchangeRateForThatDate(ecbExchangeRateForThatDate: number): void {
        this.ecbExchangeRateForThatDate = ecbExchangeRateForThatDate;
    }

    public setSumInEuro(sumInEuro: number): void {
        this.sumInEuro = sumInEuro;
    }
} 