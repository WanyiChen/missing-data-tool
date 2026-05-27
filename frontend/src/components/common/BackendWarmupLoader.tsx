import React from 'react';

interface BackendWarmupLoaderProps {
  message?: string;
}

export const BackendWarmupLoader: React.FC<BackendWarmupLoaderProps> = ({ 
  message = "Waking up the backend server..." 
}) => {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-8 max-w-md text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-lg font-semibold mb-2">{message}</p>
        <p className="text-sm text-gray-600">This may take up to 30 seconds...</p>
      </div>
    </div>
  );
};
