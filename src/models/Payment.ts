import { BalanceChange } from './BalanceChange';

export class Payment extends BalanceChange {
    constructor(
        date: Date, 
        sum: number, 
        totalInterestUntil: number = 0, 
        totalLoanUntil: number = 0
    ) {
        super(date, sum, totalInterestUntil, totalLoanUntil);
    }
}
