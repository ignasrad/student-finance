import { Repayment } from '../models/Repayment';

interface ExchangeRateData {
  date: string;
  rate: number;
}

export class EcbExchangeRateService {
  private exchangeRates: Map<string, number> = new Map();
  private isLoading: boolean = false;
  private isLoaded: boolean = false;
  private error: Error | null = null;

  /**
   * Fetches exchange rates from the ECB API for a given date range
   * @param startDate Start date in YYYY-MM-DD format
   * @param endDate End date in YYYY-MM-DD format
   * @returns Promise that resolves when data is loaded
   */
  public async fetchExchangeRates(startDate: string, endDate: string): Promise<void> {
    if (this.isLoading) return;
    
    this.isLoading = true;
    this.error = null;
    
    try {
      // Construct the ECB API URL for daily exchange rates (GBP to EUR)
      const url = 'https://data-api.ecb.europa.eu/service/data/EXR/D.GBP.EUR.SP00.A';
      
      // Add date range parameters
      const params = new URLSearchParams({
        'startPeriod': startDate,
        'endPeriod': endDate,
        'format': 'jsondata',
        'detail': 'dataonly'
      });
      
      const response = await fetch(`${url}?${params.toString()}`);
      
      if (!response.ok) {
        throw new Error(`ECB API request failed with status: ${response.status}`);
      }
      
      const data = await response.json();
      
      // Process the response data
      this.processExchangeRateData(data);
      this.isLoaded = true;
    } catch (error) {
      this.error = error instanceof Error ? error : new Error('Unknown error occurred');
      console.error('Error fetching ECB exchange rates:', this.error);
    } finally {
      this.isLoading = false;
    }
  }
  
  /**
   * Process the ECB API response and extract exchange rates
   * @param data The API response data
   */
  private processExchangeRateData(data: any): void {
    try {
      if (!data.dataSets || !data.dataSets[0] || !data.dataSets[0].series || 
          !data.dataSets[0].series['0:0:0:0:0'] || !data.structure) {
        throw new Error('Unexpected API response format');
      }
      
      const observations = data.dataSets[0].series['0:0:0:0:0'].observations;
      const dimensions = data.structure.dimensions;
      
      // Find the time periods dimension
      let timePeriods: any[] = [];
      for (const dim of dimensions.observation) {
        if (dim.id === 'TIME_PERIOD') {
          timePeriods = dim.values;
          break;
        }
      }
      
      // Create a map of date: rate pairs
      for (let i = 0; i < timePeriods.length; i++) {
        const date = timePeriods[i].id;
        if (observations[i.toString()]) {
          const rate = observations[i.toString()][0];
          this.exchangeRates.set(date, rate);
        }
      }

      console.log(this.exchangeRates);
    // Example: Get rate for specific date
    const testDate = '2023-12-19';
    const testRate = this.exchangeRates.get(testDate);
    console.log(`Exchange rate for ${testDate}: ${testRate}`);
      
    } catch (error) {
      console.error('Error processing exchange rate data:', error);
      throw error;
    }
  }
  
  /**
   * Gets the exchange rate for a specific date
   * @param date Date object to get exchange rate for
   * @returns Exchange rate or 1 if not found
   */
  public getExchangeRate(date: Date): number {
    // Format date as YYYY-MM-DD
    console.log('date', date);
    const formattedDate = this.formatDate(date);

    console.log(formattedDate);

    // Try to get the exact date
    if (this.exchangeRates.has(formattedDate)) { 
      console.log('exchangeRates.has(formattedDate)', this.exchangeRates.get(formattedDate));
      return this.exchangeRates.get(formattedDate) || 1;
    }
    
    // If not found, try to find the closest previous date
    // This handles weekends and holidays when ECB doesn't publish rates
    const dateObj = new Date(date);
    for (let i = 1; i <= 10; i++) {
      dateObj.setDate(dateObj.getDate() - 1);
      const previousDate = this.formatDate(dateObj);
      if (this.exchangeRates.has(previousDate)) {
        return this.exchangeRates.get(previousDate) || 1;
      }
    }
    
    // Default to 1 if no rate found
    console.warn(`No exchange rate found for date: ${formattedDate}`);
    return 1;
  }
  
  /**
   * Format a date as YYYY-MM-DD
   * @param date Date to format
   * @returns Formatted date string
   */
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  
  /**
   * Check if data is currently loading
   */
  public isDataLoading(): boolean {
    return this.isLoading;
  }
  
  /**
   * Check if data has been loaded
   */
  public isDataLoaded(): boolean {
    return this.isLoaded;
  }
  
  /**
   * Get any error that occurred during loading
   */
  public getError(): Error | null {
    return this.error;
  }
  
  /**
   * Get all exchange rates as an array
   */
  public getAllExchangeRates(): ExchangeRateData[] {
    const result: ExchangeRateData[] = [];
    this.exchangeRates.forEach((rate, date) => {
      result.push({ date, rate });
    });
    return result.sort((a, b) => a.date.localeCompare(b.date));
  }
} 