import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import axios from 'axios';
import * as XLSX from 'xlsx';
import FirstQuestion from '../components/FirstQuestion';
import SecondQuestion from '../components/SecondQuestion';
import ThirdQuestion from '../components/ThirdQuestion';

const MAX_SIZE_MB = 100;

function ErrorModal({ message, onClose }: { message: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Blurred background */}
      <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
      {/* Modal content */}
      <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center justify-center min-h-[300px]">
        <h2 className="text-xl font-bold mb-4 text-center">Upload Error</h2>
        <p className="text-gray-700 mb-8 text-center">{message}</p>
        <div className="absolute bottom-6 left-0 w-full flex justify-center">
          <button
            onClick={onClose}
            className="bg-transparent border border-black text-black px-8 py-2 rounded-lg font-semibold transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black"
          >
            OK
          </button>
        </div>
      </div>
    </div>
  );
}

function truncateFileName(name: string, maxLength = 28) {
  if (name.length <= maxLength) return name;
  const extIndex = name.lastIndexOf('.');
  const ext = extIndex !== -1 ? name.slice(extIndex) : '';
  const base = name.slice(0, maxLength - ext.length - 3);
  return `${base}...${ext}`;
}

export default function LandingPage() {
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [errorModal, setErrorModal] = useState<{ open: boolean; message: string }>({ open: false, message: '' });
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [step, setStep] = useState(0);
  const [previewRows, setPreviewRows] = useState<any[][] | null>(null);
  const [featureNames, setFeatureNames] = useState<null | boolean>(null);
  const [datasetRows, setDatasetRows] = useState<any[][] | null>(null);
  const [missingDataOptions, setMissingDataOptions] = useState({
    blanks: false,
    na: false,
    other: false,
    otherText: '',
  });
  const [targetFeature, setTargetFeature] = useState<string | null>(null);
  const [targetType, setTargetType] = useState<'numerical' | 'categorical' | null>(null);

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      await axios.post('/api/validate-upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setUploadSuccess(true);
    } catch (error: any) {
      let message = 'An unknown error occurred.';
      if (error.response && error.response.data && error.response.data.message) {
        message = error.response.data.message;
      }
      setErrorModal({ open: true, message });
      setSelectedFile(null);
    } finally {
      setUploading(false);
    }
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadSuccess(false);
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: {
      'text/csv': ['.csv'],
      'application/vnd.ms-excel': ['.xls'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
    },
    maxSize: MAX_SIZE_MB * 1024 * 1024,
    multiple: false,
    onDrop,
    disabled: uploading || uploadSuccess,
  });

  const parseFilePreview = async (file: File) => {
    return new Promise<any[][]>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = e.target?.result;
          let workbook;
          if (file.name.endsWith('.csv')) {
            workbook = XLSX.read(data, { type: 'string' });
          } else {
            workbook = XLSX.read(data, { type: 'array' });
          }
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          
          // Use a more careful parsing approach to preserve empty cells
          const range = XLSX.utils.decode_range(sheet['!ref'] || 'A1');
          const rows: any[][] = [];
          
          for (let R = range.s.r; R <= range.e.r; R++) {
            const row: any[] = [];
            for (let C = range.s.c; C <= range.e.c; C++) {
              const cellAddress = XLSX.utils.encode_cell({ r: R, c: C });
              const cell = sheet[cellAddress];
              
              if (!cell) {
                // Empty cell - preserve as null
                row.push(null);
              } else if (cell.t === 'n') {
                // Number cell
                console.log(`Number cell at ${cellAddress}: ${cell.v} (type: ${typeof cell.v})`);
                row.push(cell.v);
              } else if (cell.t === 's') {
                // String cell
                console.log(`String cell at ${cellAddress}: "${cell.v}" (type: ${typeof cell.v})`);
                row.push(cell.v);
              } else {
                // Other types
                console.log(`Other cell at ${cellAddress}: ${cell.v} (type: ${typeof cell.v})`);
                row.push(cell.v);
              }
            }
            rows.push(row);
          }
          
          console.log('Parsed data sample:', rows.slice(0, 3));
          resolve(rows.slice(0, 12));
        } catch (err) {
          reject(err);
        }
      };
      if (file.name.endsWith('.csv')) {
        reader.readAsText(file);
      } else {
        reader.readAsArrayBuffer(file);
      }
    });
  };

  // Auto-detect missing data patterns
  const autoDetectMissingData = (rows: any[][]) => {
    let hasBlanks = false;
    let hasNA = false;
    
    // Skip header row
    for (let i = 1; i < rows.length; i++) {
      for (let j = 0; j < rows[i].length; j++) {
        const cell = rows[i][j];
        
        // Check for blanks (empty strings, whitespace-only, null, undefined)
        if (cell === null || cell === undefined || cell === '' || 
            (typeof cell === 'string' && cell.trim() === '')) {
          hasBlanks = true;
        }
        
        // Check for N/A patterns
        if (typeof cell === 'string') {
          const naPatterns = ['N/A', 'NA', 'na', 'n/a', 'N/a', 'n/A'];
          if (naPatterns.includes(cell)) {
            hasNA = true;
          }
        }
        
        if (hasBlanks && hasNA) break; // Both detected, no need to continue
      }
      if (hasBlanks && hasNA) break;
    }
    
    return { hasBlanks, hasNA };
  };

  const handleContinue = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const rows = await parseFilePreview(selectedFile);
      setPreviewRows(rows);
      const firstRow = rows[0];
      const allStrings = firstRow.every(cell => typeof cell === 'string');
      if (allStrings) {
        setFeatureNames(true);
      } else {
        setFeatureNames(false);
      }
      
      // Auto-detect missing data patterns and set defaults
      const { hasBlanks, hasNA } = autoDetectMissingData(rows);
      setMissingDataOptions({
        blanks: hasBlanks,
        na: hasNA,
        other: false,
        otherText: '',
      });
      
      setStep(1);
    } catch (err) {
      setErrorModal({ open: true, message: 'Could not parse file for preview.' });
    } finally {
      setUploading(false);
    }
  };

  if (step === 1 && previewRows) {
    const handleFirstQuestionNext = () => {
      if (!previewRows) return;
      let processedRows: any[][];
      if (featureNames === false) {
        // Generate generic feature names
        const numCols = Math.max(...previewRows.map(r => r.length));
        const header = Array.from({ length: numCols }, (_, i) => `Feature ${i + 1}`);
        processedRows = [header, ...previewRows];
      } else {
        processedRows = [...previewRows];
      }
      setDatasetRows(processedRows);
      setStep(2);
    };
    
    return (
      <FirstQuestion
        previewRows={previewRows}
        featureNames={featureNames}
        setFeatureNames={setFeatureNames}
        onNext={handleFirstQuestionNext}
        onBack={() => setStep(0)}
      />
    );
  }

  if (step === 2 && datasetRows) {
    const handleSecondQuestionBack = () => setStep(1);
    const handleSecondQuestionNext = (processedData?: any[][]) => {
      if (processedData) {
        setDatasetRows(processedData);
      }
      setStep(3);
    };
    return (
      <SecondQuestion
        previewRows={datasetRows}
        missingDataOptions={missingDataOptions}
        setMissingDataOptions={setMissingDataOptions}
        onBack={handleSecondQuestionBack}
        onNext={handleSecondQuestionNext}
      />
    );
  }

  if (step === 3 && datasetRows) {
    const handleThirdQuestionBack = () => setStep(2);
    const handleThirdQuestionNext = () => {
      // TODO: Advance to next step or process results (MDT-12)
      console.log('Target feature:', targetFeature, 'Type:', targetType);
      console.log('Missing data options:', missingDataOptions);
      console.log('File:', selectedFile?.name);
      // For now, just log the results - analysis dashboard will be implemented later
    };
    return (
      <ThirdQuestion
        previewRows={datasetRows}
        targetFeature={targetFeature}
        setTargetFeature={setTargetFeature}
        targetType={targetType}
        setTargetType={setTargetType}
        onBack={handleThirdQuestionBack}
        onNext={handleThirdQuestionNext}
      />
    );
  }

  return (
    <div className={`min-h-screen flex flex-col items-center justify-center bg-white ${errorModal.open ? 'overflow-hidden h-screen' : ''}`}>
      {errorModal.open && (
        <ErrorModal message={errorModal.message} onClose={() => setErrorModal({ open: false, message: '' })} />
      )}
      <h1 className="text-4xl font-bold mb-2">The Missing Data Tool</h1>
      <h2 className="text-lg text-gray-600 mb-8">Explore patterns of missing data and get actionable insights.</h2>
      <div className="w-[90vw] max-w-xl h-[350px] sm:h-[450px] flex flex-col items-center justify-center mb-6 px-4">
        {!uploadSuccess ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-3xl w-full h-full flex flex-col items-center justify-center cursor-pointer transition-colors duration-200 ${isDragActive ? 'border-blue-600' : 'border-gray-300'} ${uploading ? 'pointer-events-none opacity-60' : ''}`}
          >
            <input {...getInputProps()} />
            <h3 className="text-xl font-medium mb-2">Drag &amp; drop dataset here</h3>
            <p className="mb-2 text-gray-700">or</p>
            <button
              type="button"
              className="bg-gray-800 text-white text-lg font-semibold rounded-lg px-8 py-3 mb-2 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={uploading}
            >
              {uploading ? 'Uploading...' : 'Browse file'}
            </button>
            <p className="text-sm text-gray-500 text-center">
              Supported formats: csv, xls, xlsx<br />
              File size limit: 100 MB
            </p>
          </div>
        ) : (
          <div className="border-2 border-dashed rounded-3xl w-full h-full flex flex-col items-center justify-center bg-green-50 border-green-400 animate-fade-in">
            <div className="flex flex-col items-center justify-center">
              <span className="text-lg font-semibold text-green-700 mb-2 break-all max-w-[90%] text-center">
                {selectedFile && truncateFileName(selectedFile.name)}
              </span>
              <span className="text-base text-green-700 mb-4">File has been uploaded successfully.</span>
            </div>
            <button
              type="button"
              className="mt-2 mb-3 bg-black text-white text-lg font-semibold rounded-lg px-8 py-3 transition-transform duration-200 hover:scale-105 focus:outline-none focus:ring-2 focus:ring-black"
              onClick={handleContinue}
              disabled={uploading}
            >
              {uploading ? 'Loading preview...' : 'Continue'}
            </button>
            <button
              type="button"
              className="text-gray-700 hover:text-black transition-colors duration-200 underline text-base"
              onClick={resetUpload}
            >
              or upload another file.
            </button>
          </div>
        )}
      </div>
      <p className="text-sm text-gray-500 mt-2 text-center max-w-xl">
        Developers won't have access to your files. The analysis won't be saved once you close the browser window.
      </p>
    </div>
  );
} 