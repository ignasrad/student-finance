import { Interest } from './Interest';
import { Repayment } from './Repayment';
import { Payment } from './Payment';


export class Statement {
    private statementPeriodFrom: Date;
    private statementPeriodTo: Date;
    private openingDebitBalance: number;
    private totalLoansBorrowed: number;
    private interests: Interest[];
    private repayments: Repayment[];
    private payments: Payment[];

    
    constructor(
        statementPeriodFrom: Date,
        statementPeriodTo: Date,
        openingDebitBalance: number,
        totalLoansBorrowed: number,
        interests: Interest[] = [],
        repayments: Repayment[] = [],
        payments: Payment[] = []
    ) {
        this.statementPeriodFrom = statementPeriodFrom;
        this.statementPeriodTo = statementPeriodTo;
        this.openingDebitBalance = openingDebitBalance;
        this.totalLoansBorrowed = totalLoansBorrowed;
        this.interests = interests;
        this.repayments = repayments;
        this.payments = payments;
    }

    // Getters
    public getStatementPeriodFrom(): Date {
        return this.statementPeriodFrom;
    }

    public getStatementPeriodTo(): Date {
        return this.statementPeriodTo;
    }

    public getOpeningDebitBalance(): number {
        return this.openingDebitBalance;
    }

    public getTotalLoansBorrowed(): number {
        return this.totalLoansBorrowed;
    }

    public getInterests(): Interest[] {
        return this.interests;
    }

    // Setters
    public setStatementPeriodFrom(statementPeriodFrom: Date): void {
        this.statementPeriodFrom = statementPeriodFrom;
    }

    public setStatementPeriodTo(statementPeriodTo: Date): void {
        this.statementPeriodTo = statementPeriodTo;
    }

    public setOpeningDebitBalance(openingDebitBalance: number): void {
        this.openingDebitBalance = openingDebitBalance;
    }

    public setTotalLoansBorrowed(totalLoansBorrowed: number): void {
        this.totalLoansBorrowed = totalLoansBorrowed;
    }

    public setInterests(interests: Interest[]): void {
        this.interests = interests;
    }

    public addInterest(interest: Interest): void {
        this.interests.push(interest);
    }

    public getRepayments(): Repayment[] {
        return this.repayments;
    }

    public setRepayments(repayments: Repayment[]): void {
        this.repayments = repayments;
    }

    public addRepayment(repayment: Repayment): void {
        this.repayments.push(repayment);
    }

    public getPayments(): Payment[] {
        return this.payments;
    }

    public setPayments(payments: Payment[]): void {
        this.payments = payments;
    }

    public addPayment(payment: Payment): void {
        this.payments.push(payment);
    }
} 