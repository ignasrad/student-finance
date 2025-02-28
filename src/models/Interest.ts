import { BalanceChange } from './BalanceChange';

export class Interest extends BalanceChange {
    private interestRate: number;

    constructor(date: Date, sum: number, interestRate: number, totalInterestUntil: number = 0, totalLoanUntil: number = 0) {
        super(date, sum, totalInterestUntil, totalLoanUntil);
        this.interestRate = interestRate;
    }

    // Getter
    public getInterestRate(): number {
        return this.interestRate;
    }

    // Setter
    public setInterestRate(interestRate: number): void {
        this.interestRate = interestRate;
    }
}