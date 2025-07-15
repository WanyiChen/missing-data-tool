import { useDropzone } from 'react-dropzone';
import { useState } from 'react';
import axios from 'axios';

const MAX_SIZE_MB = 100;
const ACCEPTED_FORMATS = ['.csv', '.xls', '.xlsx'];

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

  const onDrop = async (acceptedFiles: File[]) => {
    if (acceptedFiles.length === 0) return;
    const file = acceptedFiles[0];
    setSelectedFile(file);
    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);
    try {
      const response = await axios.post('/api/validate-upload', formData, {
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
            >
              Continue
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