import { Statement } from '../models/Statement';
import { Interest } from '../models/Interest';
import { Repayment } from '../models/Repayment';
import { Payment } from '../models/Payment';
import { PDFDocumentProxy } from 'pdfjs-dist';

export class StatementParserService {
    async parseStatement(pdf: PDFDocumentProxy): Promise<Statement> {
        // Extract text content from all pages
        const pagesArray = [];
        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
                .filter((item: any) => 'str' in item)
                .map((item: any) => item.str)
                .join(" ");
            
            pagesArray.push({
                pageNumber: i,
                content: pageText
            });
        }

        const fullContent = pagesArray.map(page => page.content).join(' ');
        
        // Parse statement period
        const periodMatch = fullContent.match(/This statement is for the following period:\s+(\d{2}\/\d{2}\/\d{4})\s+-\s+(\d{2}\/\d{2}\/\d{4})/);
        const statementPeriodFrom = periodMatch ? this.parseDate(periodMatch[1]) : new Date();
        const statementPeriodTo = periodMatch ? this.parseDate(periodMatch[2]) : new Date();

        // Parse opening balance
        const openingBalanceMatch = fullContent.match(/Opening debit balance on \d{2}\/\d{2}\/\d{4}\s+(\d+\.\d{2})/);
        const openingDebitBalance = openingBalanceMatch ? parseFloat(openingBalanceMatch[1]) : 0;

        // Parse total loans borrowed
        const totalLoansMatch = fullContent.match(/Total loan\(s\) borrowed during statement period\s+(\d+\.\d{2})/);
        const totalLoansBorrowed = totalLoansMatch ? parseFloat(totalLoansMatch[1]) : 0;

        // Parse interests
        const interests: Interest[] = [];
        const interestRegex = /(\d{2}\/\d{2}\/\d{4})\s+Interest\s+(\d+\.\d{2})%\s+(\d+\.\d{2})/g;
        let interestMatch;
        
        while ((interestMatch = interestRegex.exec(fullContent)) !== null) {
            const date = this.parseDate(interestMatch[1]);
            const rate = parseFloat(interestMatch[2]) / 100; // Convert percentage to decimal
            const sum = parseFloat(interestMatch[3]);
            interests.push(new Interest(date, sum, rate));
        }

        // Parse Tuition Fee Loan Payments
        const payments: Payment[] = [];
        const paymentRegex = /(\d{2}\/\d{2}\/\d{4})\s+Tuition Fee Loan Payment\s+(\d+\.\d{2})/g;
        let paymentMatch;
        
        while ((paymentMatch = paymentRegex.exec(fullContent)) !== null) {
            const date = this.parseDate(paymentMatch[1]);
            const amount = parseFloat(paymentMatch[2]);
            payments.push(new Payment(date, amount));
        }

        // Parse repayments
        const repayments: Repayment[] = [];
        const repaymentRegex = /(\d{2}\/\d{2}\/\d{4})\s+Repayment Received\s+(\d+\.\d{2})/g;
        let repaymentMatch;
        
        while ((repaymentMatch = repaymentRegex.exec(fullContent)) !== null) {
            const dateStr = repaymentMatch[1];
            const amount = parseFloat(repaymentMatch[2]);
            
            // Parse the date (DD/MM/YYYY format)
            const [day, month, year] = dateStr.split('/').map(Number);
            const date = new Date(year, month - 1, day); // month is 0-indexed in JS Date
            
            repayments.push(new Repayment(date, amount)); // Negative amount as it reduces the balance
        }

        try {
            const statement = new Statement(
                statementPeriodFrom,
                statementPeriodTo,
                openingDebitBalance,
                totalLoansBorrowed,
                interests,
                repayments,
                payments
            );
            return statement;
        } catch (error) {
            console.error('Error parsing statement:', error);
            throw new Error('Failed to parse statement content');
        }
    }

    private parseDate(dateString: string): Date {
        const [day, month, year] = dateString.split('/').map(Number);
        return new Date(year, month - 1, day);
    }

    // Helper method to parse currency values
    private parseCurrencyValue(value: string): number {
        // Remove currency symbols and convert to number
        return parseFloat(value.replace(/[^0-9.-]+/g, ''));
    }
} 