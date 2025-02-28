import { getDocument } from "pdfjs-dist";
import { TextItem } from "pdfjs-dist/types/src/display/api";
import { useState, useEffect, useRef } from "react";
import { StatementParserService } from "./services/StatementParserService";
import { StatementProcessorService } from "./services/StatementProcessorService";
import { ExcelGeneratorService } from "./services/ExcelGeneratorService";
import { EcbExchangeRateService } from "./services/EcbExchangeRateService";

const PdfReader = () => {
    const [text, setText] = useState("");
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [ratesLoaded, setRatesLoaded] = useState(false);
    const [ratesError, setRatesError] = useState<string | null>(null);

    // Use useRef to maintain service instances across renders
    const servicesRef = useRef({
        ecbExchangeRateService: new EcbExchangeRateService(),
        statementParserService: new StatementParserService(),
        statementProcessorService: null as StatementProcessorService | null,
        excelGeneratorService: new ExcelGeneratorService()
    });
    
    // Initialize the processor service that depends on the exchange rate service
    useEffect(() => {
        servicesRef.current.statementProcessorService = new StatementProcessorService(
            servicesRef.current.ecbExchangeRateService
        );
    }, []);
    
    // Fetch exchange rates when component mounts
    useEffect(() => {
      const fetchExchangeRates = async () => {
        try {
          setIsLoadingRates(true);
          
          // Get exchange rates for the last 15 years
          const tomorrow = new Date();
          tomorrow.setDate(tomorrow.getDate() + 1);
          const endDate = tomorrow.toISOString().split('T')[0]; // Tomorrow
          const startDate = new Date('2012-01-01')
            .toISOString().split('T')[0];
            
          await servicesRef.current.ecbExchangeRateService.fetchExchangeRates(startDate, endDate);
          setRatesLoaded(true);
        } catch (error) {
          console.error("Error fetching exchange rates:", error);
          setRatesError(error instanceof Error ? error.message : "Unknown error");
        } finally {
          setIsLoadingRates(false);
        }
      };
      
      fetchExchangeRates();
    }, []);
    
    const handleFileUpload = async (event: any) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
  
      const statements = [];
      const { 
        ecbExchangeRateService, 
        statementParserService, 
        statementProcessorService, 
        excelGeneratorService 
      } = servicesRef.current;
      
      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();
        
        // Convert FileReader to Promise for easier handling
        const readFileAsync = () => {
          return new Promise<ArrayBuffer>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as ArrayBuffer);
            reader.onerror = reject;
            reader.readAsArrayBuffer(file);
          });
        };
        
        try {
          const arrayBuffer = await readFileAsync();
          const pdf = await getDocument({ data: arrayBuffer }).promise;
          const statement = await statementParserService.parseStatement(pdf);
          statements.push(statement);
        } catch (error) {
          console.error(`Error processing file ${file.name}:`, error);
        }
      }
      
      const balanceChanges = statementProcessorService!.execute(statements);
      
      // Generate Excel file from the processed data
      const currentYear = new Date().getFullYear() - 2;
      const startDate = new Date(currentYear, 0, 1); // January 1st of current year
      const endDate = new Date(currentYear, 11, 31); // December 31st of current year
      
      // Generate and download the Excel file
      const workbook = await excelGeneratorService.generateExcel(balanceChanges, startDate, endDate);
      const buffer = await excelGeneratorService.generateBuffer(workbook);
      
      // Create a blob and download it
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'loan_summary.xlsx';
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      
      setText(JSON.stringify(statements, null, 2));
    };

    return (
        <div className="p-4 border rounded-lg shadow-lg max-w-xl mx-auto">
          {isLoadingRates && <p className="text-blue-500">Loading exchange rates from ECB...</p>}
          {ratesError && <p className="text-red-500">Error loading exchange rates: {ratesError}</p>}
          {ratesLoaded && <p className="text-green-500">Exchange rates loaded successfully!</p>}
          
          <input 
            type="file" 
            accept="application/pdf" 
            onChange={handleFileUpload} 
            className="mb-4" 
            multiple 
            disabled={isLoadingRates} 
          />
          <textarea value={text} readOnly rows={10} className="w-full p-2 border rounded"></textarea>
        </div>
      );
    };
    
    export default PdfReader;