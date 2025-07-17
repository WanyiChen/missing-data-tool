import React from 'react';

interface AnalysisDashboardProps {
  selectedFile: File | null;
  featureNames: boolean | null;
  missingDataOptions: {
    blanks: boolean;
    na: boolean;
    other: boolean;
    otherText: string;
  };
  targetFeature: string | null;
  targetType: 'numerical' | 'categorical' | null;
  previewRows: any[][] | null;
  onBack: () => void;
}

const AnalysisDashboard: React.FC<AnalysisDashboardProps> = ({
  selectedFile,
  featureNames,
  missingDataOptions,
  targetFeature,
  targetType,
  previewRows,
  onBack,
}) => {
  const missingDataIndicators = [];
  if (missingDataOptions.blanks) missingDataIndicators.push('Blanks');
  if (missingDataOptions.na) missingDataIndicators.push('N/A');
  if (missingDataOptions.other && missingDataOptions.otherText) {
    missingDataIndicators.push(missingDataOptions.otherText);
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">Missing Data Analysis Dashboard</h1>
            <p className="text-gray-600">Analysis results for your uploaded dataset</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
            {/* File Information */}
            <div className="bg-blue-50 rounded-lg p-6 border border-blue-200">
              <h3 className="text-lg font-semibold text-blue-900 mb-3">Dataset Information</h3>
              <div className="space-y-2 text-sm">
                <p><span className="font-medium">File:</span> {selectedFile?.name || 'Unknown'}</p>
                <p><span className="font-medium">Size:</span> {selectedFile ? `${(selectedFile.size / 1024).toFixed(1)} KB` : 'Unknown'}</p>
                <p><span className="font-medium">Has headers:</span> {featureNames ? 'Yes' : 'No'}</p>
                <p><span className="font-medium">Columns:</span> {previewRows?.[0]?.length || 0}</p>
                <p><span className="font-medium">Preview rows:</span> {previewRows ? previewRows.length - 1 : 0}</p>
              </div>
            </div>

            {/* Missing Data Configuration */}
            <div className="bg-yellow-50 rounded-lg p-6 border border-yellow-200">
              <h3 className="text-lg font-semibold text-yellow-900 mb-3">Missing Data Indicators</h3>
              <div className="space-y-2 text-sm">
                {missingDataIndicators.length > 0 ? (
                  missingDataIndicators.map((indicator, i) => (
                    <div key={i} className="flex items-center">
                      <span className="w-2 h-2 bg-yellow-500 rounded-full mr-2"></span>
                      {indicator}
                    </div>
                  ))
                ) : (
                  <p className="text-gray-500 italic">No missing data indicators selected</p>
                )}
              </div>
            </div>

            {/* Target Feature */}
            <div className="bg-green-50 rounded-lg p-6 border border-green-200">
              <h3 className="text-lg font-semibold text-green-900 mb-3">Target Feature</h3>
              <div className="space-y-2 text-sm">
                {targetFeature ? (
                  <>
                    <p><span className="font-medium">Feature:</span> {targetFeature}</p>
                    <p><span className="font-medium">Type:</span> 
                      <span className={`ml-1 px-2 py-1 rounded text-xs ${
                        targetType === 'numerical' 
                          ? 'bg-blue-100 text-blue-800' 
                          : 'bg-purple-100 text-purple-800'
                      }`}>
                        {targetType}
                      </span>
                    </p>
                  </>
                ) : (
                  <p className="text-gray-500 italic">No target feature selected</p>
                )}
              </div>
            </div>
          </div>

          {/* Data Preview */}
          {previewRows && (
            <div className="mb-8">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Data Preview</h3>
              <div className="overflow-x-auto border rounded-lg">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      {previewRows[0]?.map((col: any, i: number) => (
                        <th key={i} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          {String(col)}
                          {targetFeature === String(col) && (
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Target
                            </span>
                          )}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {previewRows.slice(1, 6).map((row, i) => (
                      <tr key={i} className={i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                        {row.map((cell, j) => (
                          <td key={j} className="px-4 py-3 text-sm text-gray-900">
                            {cell === undefined || cell === null || cell === '' ? (
                              <span className="text-gray-400 italic">missing</span>
                            ) : (
                              String(cell)
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Analysis Placeholder */}
          <div className="bg-gray-50 rounded-lg p-8 text-center border-2 border-dashed border-gray-300">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Missing Data Analysis</h3>
            <p className="text-gray-600 mb-4">Advanced missing data analysis and visualizations will be implemented in the next iteration.</p>
            <div className="text-sm text-gray-500">
              <p>Coming soon:</p>
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>Missing data patterns visualization</li>
                <li>Statistical analysis of missingness</li>
                <li>Recommendations for handling missing data</li>
                <li>Interactive charts and graphs</li>
              </ul>
            </div>
          </div>

          <div className="flex justify-between mt-8">
            <button
              className="bg-gray-100 text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
              onClick={onBack}
            >
              &larr; Back to Questions
            </button>
            <button
              className="bg-blue-600 text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-blue-700 transition-colors"
              onClick={() => window.location.reload()}
            >
              Start Over
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalysisDashboard;
