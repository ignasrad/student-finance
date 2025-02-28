export class BalanceChange {
    private date: Date;
    private sum: number;
    private totalInterestUntil: number;
    private totalLoanUntil: number;

    constructor(date: Date, sum: number, totalInterestUntil: number = 0, totalLoanUntil: number = 0) {
        this.date = date;
        this.sum = sum;
        this.totalInterestUntil = totalInterestUntil;
        this.totalLoanUntil = totalLoanUntil;
    }

    // Getters
    public getDate(): Date {
        return this.date;
    }

    public getSum(): number {
        return this.sum;
    }

    public getTotalInterestUntil(): number {
        return this.totalInterestUntil;
    }

    public getTotalLoanUntil(): number {
        return this.totalLoanUntil;
    }

    // Setters
    public setDate(date: Date): void {
        this.date = date;
    }

    public setSum(sum: number): void {
        this.sum = sum;
    }

    public setTotalInterestUntil(totalInterestUntil: number): void {
        this.totalInterestUntil = totalInterestUntil;
    }

    public setTotalLoanUntil(totalLoanUntil: number): void {
        this.totalLoanUntil = totalLoanUntil;
    }
} 