import * as ExcelJS from 'exceljs';
import { BalanceChange } from '../models/BalanceChange';
import { Interest } from '../models/Interest';
import { Payment } from '../models/Payment';
import { Repayment } from '../models/Repayment';

export class ExcelGeneratorService {
  /**
   * Generates an Excel file from balance changes data
   * @param balanceChanges List of balance changes to include in the report
   * @param dateFrom Start date for the report
   * @param dateTo End date for the report
   * @returns Promise resolving to an ExcelJS workbook
   */
  public async generateExcel(
    balanceChanges: BalanceChange[],
    dateFrom: Date,
    dateTo: Date
  ): Promise<ExcelJS.Workbook> {
    // Create a new workbook
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Student Finance App';
    workbook.lastModifiedBy = 'Student Finance App';
    workbook.created = new Date();
    workbook.modified = new Date();

    // Add a worksheet
    const worksheet = workbook.addWorksheet('Loan Summary');

    // Define columns
    worksheet.columns = [
      { header: 'Data', key: 'date', width: 12 },
      { header: 'Palūkanos', key: 'interestRate', width: 15 },
      { header: 'Pridėtos palūkanos', key: 'interestAmount', width: 15 },
      { header: 'Įmoka', key: 'payment', width: 15 },
      { header: 'Einamoji paskolos dalis', key: 'currentLoanPortion', width: 20 },
      { header: 'Einamoji palūkanų suma', key: 'currentInterestTotal', width: 20 },
      { header: 'Bendra paskola', key: 'totalLoan', width: 15 },
      { header: 'Paskolos %', key: 'loanPercentage', width: 12 },
      { header: 'Palūkanų %', key: 'interestPercentage', width: 12 },
      { header: 'Sumokėta paskolos (£)', key: 'paidLoanTotal', width: 18 },
      { header: 'Sumokėta palūkanų (£)', key: 'paidInterestTotal', width: 18 },
      { header: 'Sumokėta paskolos (€)', key: 'paidLoanTotalEur', width: 18 },
      { header: 'Sumokėta palūkanų (€)', key: 'paidInterestTotalEur', width: 18 },
      { header: 'ECB kursas', key: 'ecbRate', width: 12 },
    ];

    // Filter balance changes by date range
    const filteredChanges = balanceChanges.filter(
      change => change.getDate() >= dateFrom && change.getDate() <= dateTo
    );

    // Sort by date
    filteredChanges.sort((a, b) => a.getDate().getTime() - b.getDate().getTime());

    // Add rows for each balance change
    for (const change of filteredChanges) {
      const row: any = {
        date: this.formatDate(change.getDate()),
        currentInterestTotal: this.formatCurrency(change.getTotalInterestUntil()),
        totalLoan: this.formatCurrency(change.getTotalLoanUntil() + change.getTotalInterestUntil()),
        currentLoanPortion: this.formatCurrency(change.getTotalLoanUntil()),
      };

      // Set values based on the type of balance change
      if (change instanceof Interest) {
        row.interestRate = `${(change.getInterestRate() * 100).toFixed(2)}%`;
        row.interestAmount = this.formatCurrency(change.getSum());
      } else if (change instanceof Payment) {
        row.payment = this.formatCurrency(change.getSum());
      } else if (change instanceof Repayment) {
        const repayment = change as Repayment;
        row.payment = this.formatCurrency(repayment.getSum());
        
        // Calculate paid loan and interest portions for this repayment
        const loanPortion = repayment.getSum() * repayment.getPayedLoanPartPercent();
        const interestPortion = repayment.getSum() - loanPortion;
        
        row.paidLoanTotal = this.formatCurrency(loanPortion);
        row.paidInterestTotal = this.formatCurrency(interestPortion);
        
        // Add Euro values and ECB exchange rate
        if (repayment.getEcbExchangeRateForThatDate && typeof repayment.getEcbExchangeRateForThatDate === 'function') {
          const ecbRate = repayment.getEcbExchangeRateForThatDate();
          row.ecbRate = ecbRate ? ecbRate.toFixed(5) : 'N/A';
          
          if (repayment.getSumInEuro && typeof repayment.getSumInEuro === 'function') {
            const sumInEuro = repayment.getSumInEuro();
            if (sumInEuro) {
              const loanPortionEur = sumInEuro * repayment.getPayedLoanPartPercent();
              const interestPortionEur = sumInEuro - loanPortionEur;
              
              row.paidLoanTotalEur = this.formatEuroCurrency(loanPortionEur);
              row.paidInterestTotalEur = this.formatEuroCurrency(interestPortionEur);
            }
          }
        }
      }

      // Calculate percentages of current outstanding balance
      const totalOutstanding = change.getTotalLoanUntil() + change.getTotalInterestUntil();
      if (totalOutstanding > 0) {
        row.loanPercentage = `${((change.getTotalLoanUntil() / totalOutstanding) * 100).toFixed(2)}%`;
        row.interestPercentage = `${((change.getTotalInterestUntil() / totalOutstanding) * 100).toFixed(2)}%`;
      }

      worksheet.addRow(row);
    }

    // Calculate totals
    let totalPaidLoan = 0;
    let totalPaidInterest = 0;
    let totalPaidLoanEur = 0;
    let totalPaidInterestEur = 0;

    // Sum up all repayments
    filteredChanges.forEach(change => {
      if (change instanceof Repayment) {
        const repayment = change as Repayment;
        const loanPortion = repayment.getSum() * repayment.getPayedLoanPartPercent();
        const interestPortion = repayment.getSum() - loanPortion;
        
        totalPaidLoan += loanPortion;
        totalPaidInterest += interestPortion;
        
        // Add Euro values if available
        if (repayment.getSumInEuro && typeof repayment.getSumInEuro === 'function') {
          const sumInEuro = repayment.getSumInEuro();
          if (sumInEuro) {
            const loanPortionEur = sumInEuro * repayment.getPayedLoanPartPercent();
            const interestPortionEur = sumInEuro - loanPortionEur;
            
            totalPaidLoanEur += loanPortionEur;
            totalPaidInterestEur += interestPortionEur;
          }
        }
      }
    });

    // Add a blank row for spacing
    worksheet.addRow({});
    
    // Add summary row
    const summaryRow = worksheet.addRow({
      date: 'VISO:',
      paidLoanTotal: this.formatCurrency(totalPaidLoan),
      paidInterestTotal: this.formatCurrency(totalPaidInterest),
      paidLoanTotalEur: this.formatEuroCurrency(totalPaidLoanEur),
      paidInterestTotalEur: this.formatEuroCurrency(totalPaidInterestEur)
    });
    
    // Style the summary row
    summaryRow.eachCell((cell) => {
      cell.font = { bold: true };
      if (cell.value && typeof cell.value === 'string' && 
         (cell.value.startsWith('£') || cell.value.startsWith('€'))) {
        cell.alignment = { horizontal: 'right' };
      }
    });

    // Apply styles
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).alignment = { vertical: 'middle', horizontal: 'center' };

    // Apply borders to all cells
    worksheet.eachRow({ includeEmpty: true }, (row, rowNumber) => {
      row.eachCell({ includeEmpty: true }, (cell) => {
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
        
        // Align numbers to right
        if (typeof cell.value === 'number' || (typeof cell.value === 'string' && cell.value.startsWith('£'))) {
          cell.alignment = { horizontal: 'right' };
        }
      });
    });

    return workbook;
  }

  /**
   * Saves the workbook to a file
   * @param workbook ExcelJS workbook to save
   * @param filePath Path where to save the file
   */
  public async saveToFile(workbook: ExcelJS.Workbook, filePath: string): Promise<void> {
    await workbook.xlsx.writeFile(filePath);
  }

  /**
   * Generates a buffer containing the Excel file
   * @param workbook ExcelJS workbook to convert to buffer
   * @returns Promise resolving to an ArrayBuffer containing the Excel file
   */
  public async generateBuffer(workbook: ExcelJS.Workbook): Promise<ArrayBuffer> {
    return await workbook.xlsx.writeBuffer();
  }

  /**
   * Formats a date as DD/MM/YYYY
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    return `${date.getDate().toString().padStart(2, '0')}/${(date.getMonth() + 1).toString().padStart(2, '0')}/${date.getFullYear()}`;
  }

  /**
   * Formats a number as currency (£)
   * @param amount Amount to format
   * @returns Formatted currency string
   */
  private formatCurrency(amount: number): string {
    return `£${amount.toFixed(2)}`;
  }

  /**
   * Formats a number as currency (€)
   * @param amount Amount to format
   * @returns Formatted currency string
   */
  private formatEuroCurrency(amount: number): string {
    return `€${amount.toFixed(2)}`;
  }
} 