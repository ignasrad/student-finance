import { getDocument } from "pdfjs-dist";
import { useState, useEffect, useRef } from "react";
import { StatementParserService } from "./services/StatementParserService";
import { StatementProcessorService } from "./services/StatementProcessorService";
import { ExcelGeneratorService } from "./services/ExcelGeneratorService";
import { EcbExchangeRateService } from "./services/EcbExchangeRateService";
import { 
  Box, 
  Paper, 
  Typography, 
  Button, 
  CircularProgress, 
  IconButton} from "@mui/material";
import { 
  GetApp as GetAppIcon,
  PictureAsPdf as PdfIcon,
  ArrowUpward as ArrowUpwardIcon,
  Close as CloseIcon,
  Download as DownloadIcon
} from "@mui/icons-material";
import JSZip from 'jszip';

const PdfReader = () => {
    const [text, setText] = useState("");
    const [isLoadingRates, setIsLoadingRates] = useState(false);
    const [ratesLoaded, setRatesLoaded] = useState(false);
    const [ratesError, setRatesError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
    const [filesProcessed, setFilesProcessed] = useState(false);
    const [generatedExcelBlobs, setGeneratedExcelBlobs] = useState<{year: number, blob: Blob}[]>([]);
    const fileInputRef = useRef<HTMLInputElement>(null);

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
    
    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (!files || files.length === 0) return;
      
      const fileArray = Array.from(files);
      setSelectedFiles(fileArray);
      setFilesProcessed(false);
    };

    const handleRemoveFile = (index: number) => {
      setSelectedFiles(prev => prev.filter((_, i) => i !== index));
      if (selectedFiles.length <= 1) {
        setFilesProcessed(false);
      }
    };

    const handleProcessFiles = async () => {
      if (selectedFiles.length === 0) return;
      
      setIsProcessing(true);
      setText("");
      
      try {
        const statements = [];
        const { 
          ecbExchangeRateService, 
          statementParserService, 
          statementProcessorService, 
          excelGeneratorService 
        } = servicesRef.current;
        
        // Process each file
        for (let i = 0; i < selectedFiles.length; i++) {
          const file = selectedFiles[i];
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
        
        // Find the earliest and latest years in the balance changes
        let earliestYear = new Date().getFullYear();
        let latestYear = 0;
        
        balanceChanges.forEach(change => {
          const year = new Date(change.getDate()).getFullYear();
          if (year < earliestYear) earliestYear = year;
          if (year > latestYear) latestYear = year;
        });
        
        // Generate Excel files for each year
        const excelBlobs = [];
        
        for (let year = earliestYear; year <= latestYear; year++) {
          const startDate = new Date(year, 0, 1); // January 1st of the year
          const endDate = new Date(year, 11, 31); // December 31st of the year
          
          // Generate the Excel file for this year
          const workbook = await excelGeneratorService.generateExcel(balanceChanges, startDate, endDate);
          const buffer = await excelGeneratorService.generateBuffer(workbook);
          
          // Create a blob for this year's Excel file
          const blob = new Blob([buffer], { 
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
          });
          
          excelBlobs.push({ year, blob });
        }
        
        setGeneratedExcelBlobs(excelBlobs);
        setText(JSON.stringify(statements, null, 2));
        setFilesProcessed(true);
      } catch (error) {
        console.error("Error processing files:", error);
      } finally {
        setIsProcessing(false);
      }
    };

    // Update the download function to handle a specific year
    const handleDownloadExcel = (blob: Blob, year: number) => {
      if (!blob) return;
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `loan_summary_${year}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    };

    // Add a function to download all files
    const handleDownloadAllExcels = async () => {
      if (generatedExcelBlobs.length === 0) return;
      
      try {
        // Create a new JSZip instance
        const zip = new JSZip();
        
        // Add each Excel file to the zip
        generatedExcelBlobs.forEach(({year, blob}) => {
          zip.file(`loan_summary_${year}.xlsx`, blob);
        });
        
        // Generate the zip file
        const zipBlob = await zip.generateAsync({type: 'blob'});
        
        // Download the zip file
        const url = window.URL.createObjectURL(zipBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'loan_summaries.zip';
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } catch (error) {
        console.error("Error creating zip file:", error);
      }
    };

    const triggerFileInput = () => {
      if (fileInputRef.current) {
        fileInputRef.current.click();
      }
    };

    const handleReset = () => {
      setSelectedFiles([]);
      setText("");
      setFilesProcessed(false);
    };

    return (
      <Paper elevation={3} sx={{ p: 4, borderRadius: 2, width: '100%', maxWidth: 1000, mx: 'auto' }}>
        <Box sx={{ my: 4 }}>
          <Box 
            sx={{ 
              border: '1px dashed #ccc', 
              borderRadius: 2, 
              p: 4, 
              textAlign: 'center',
              mb: 3,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: 200
            }}
          >
            <Box 
              sx={{ 
                bgcolor: '#f0f7ff', 
                borderRadius: '50%', 
                width: 60, 
                height: 60, 
                display: 'flex', 
                alignItems: 'center', 
                justifyContent: 'center',
                mb: 2
              }}
            >
              <ArrowUpwardIcon color="primary" fontSize="large" />
            </Box>
            
            <Typography variant="h6" gutterBottom>
              Upload All Student Finance Statements
            </Typography>
            
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Maximum file size: 50 MB
            </Typography>
            
            <Typography variant="body2" color="text.secondary">
              Supported format: PDF
            </Typography>
            
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf,.csv,.xlsx"
              onChange={handleFileSelect}
              style={{ display: 'none' }}
              multiple
            />
            
            <Button
              variant="contained"
              onClick={triggerFileInput}
              sx={{ mt: 2 }}
              disabled={isProcessing}
            >
              Select Files
            </Button>
          </Box>
          
          {selectedFiles.length > 0 && (
            <Typography variant="subtitle1" gutterBottom>
              Uploaded Files
            </Typography>
          )}
          
          {selectedFiles.length > 0 ? (
            <Box sx={{ mb: 3 }}>
              {selectedFiles.map((file, index) => (
                <Box 
                  key={index} 
                  sx={{ 
                    display: 'flex', 
                    alignItems: 'center', 
                    p: 1, 
                    border: '1px solid #eee', 
                    borderRadius: 1,
                    mb: 1
                  }}
                >
                  <Box 
                    sx={{ 
                      bgcolor: '#e8f5e9', 
                      width: 40, 
                      height: 40, 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center',
                      borderRadius: 1,
                      mr: 2
                    }}
                  >
                    <PdfIcon color="success" />
                  </Box>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="body2">{file.name}</Typography>
                    <Typography variant="caption" color="text.secondary">
                      {file.type} • {(file.size / 1024).toFixed(1)} KB
                    </Typography>
                  </Box>
                  <IconButton size="small" onClick={() => handleRemoveFile(index)}>
                    <CloseIcon fontSize="small" />
                  </IconButton>
                </Box>
              ))}
            </Box>
          ) : null}
          
          {/* New Processed Files section */}
          {filesProcessed && generatedExcelBlobs.length > 0 && (
            <>
              <Typography variant="subtitle1" gutterBottom sx={{ mt: 3 }}>
                Processed Files
              </Typography>
              <Box sx={{ mb: 3 }}>
                {generatedExcelBlobs.map(({year, blob}, index) => (
                  <Box 
                    key={index} 
                    sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      p: 1, 
                      border: '1px solid #eee', 
                      borderRadius: 1,
                      mb: 1,
                      bgcolor: '#f0f7ff'
                    }}
                  >
                    <Box 
                      sx={{ 
                        bgcolor: '#e3f2fd', 
                        width: 40, 
                        height: 40, 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'center',
                        borderRadius: 1,
                        mr: 2
                      }}
                    >
                      <DownloadIcon color="primary" />
                    </Box>
                    <Box sx={{ flexGrow: 1 }}>
                      <Typography variant="body2">loan_summary_{year}.xlsx</Typography>
                      <Typography variant="caption" color="text.secondary">
                        Excel Spreadsheet • {year} • Ready to download
                      </Typography>
                    </Box>
                    <Button 
                      variant="outlined" 
                      size="small" 
                      startIcon={<GetAppIcon />}
                      onClick={() => handleDownloadExcel(blob, year)}
                    >
                      Download
                    </Button>
                  </Box>
                ))}
              </Box>
            </>
          )}
          
          {selectedFiles.length > 0 && (
            <Box 
              sx={{ 
                display: 'flex', 
                alignItems: 'center', 
                p: 2, 
                border: '1px solid #eee', 
                borderRadius: 1,
                mt: 3,
                bgcolor: filesProcessed ? '#f0f7ff' : 'transparent'
              }}
            >
              {isProcessing ? (
                <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                  <CircularProgress size={24} sx={{ mr: 2 }} />
                  <Typography variant="body2">Processing files...</Typography>
                </Box>
              ) : filesProcessed ? (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Typography variant="body2">Download all files</Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    startIcon={<GetAppIcon />}
                    onClick={handleDownloadAllExcels}
                    size="small"
                  >
                    Download All Reports
                  </Button>
                </>
              ) : (
                <>
                  <Box sx={{ display: 'flex', alignItems: 'center', flexGrow: 1 }}>
                    <Typography variant="body2">Process your files</Typography>
                  </Box>
                  <Button 
                    variant="contained" 
                    onClick={handleProcessFiles}
                    size="small"
                  >
                    Process Files
                  </Button>
                </>
              )}
            </Box>
          )}
        </Box>
      </Paper>
    );
};

export default PdfReader;