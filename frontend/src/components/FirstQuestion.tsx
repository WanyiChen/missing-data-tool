import React, { useEffect, useState } from 'react';
import styles from './Button.module.css';

type FirstQuestionProps = {
  previewRows: any[][];
  featureNames: boolean | null;
  setFeatureNames: (val: boolean) => void;
  onNext: () => void;
  onBack: () => void;
};

// Utility function to detect missing data patterns
const detectMissingDataPatterns = (data: any[][]): {
  emptyStrings: number;
  nullValues: number;
  undefinedValues: number;
  whitespaceOnly: number;
  totalMissing: number;
  missingPatterns: string[];
} => {
  let emptyStrings = 0;
  let nullValues = 0;
  let undefinedValues = 0;
  let whitespaceOnly = 0;
  const missingPatterns: string[] = [];

  // Analyze each cell in the data
  data.forEach((row, rowIndex) => {
    row.forEach((cell, colIndex) => {
      if (cell === null) {
        nullValues++;
        if (!missingPatterns.includes('null values')) {
          missingPatterns.push('null values');
        }
      } else if (cell === undefined) {
        undefinedValues++;
        if (!missingPatterns.includes('undefined values')) {
          missingPatterns.push('undefined values');
        }
      } else if (cell === '') {
        emptyStrings++;
        if (!missingPatterns.includes('empty strings')) {
          missingPatterns.push('empty strings');
        }
      } else if (typeof cell === 'string' && cell.trim() === '') {
        whitespaceOnly++;
        if (!missingPatterns.includes('whitespace-only strings')) {
          missingPatterns.push('whitespace-only strings');
        }
      }
    });
  });

  const totalMissing = emptyStrings + nullValues + undefinedValues + whitespaceOnly;

  return {
    emptyStrings,
    nullValues,
    undefinedValues,
    whitespaceOnly,
    totalMissing,
    missingPatterns
  };
};

// Function to fetch detailed missing data analysis from backend
const fetchMissingDataAnalysis = async (): Promise<{
  missing_cells: number;
  missing_percentage: number;
  missing_patterns: {
    null_values: number;
    empty_strings: number;
    whitespace_only: number;
  };
  pattern_percentages: {
    null_percentage: number;
    empty_string_percentage: number;
    whitespace_percentage: number;
  };
  columns_with_missing: Record<string, number>;
} | null> => {
  try {
    const response = await fetch('/api/missing-data-analysis');
    if (response.ok) {
      const data = await response.json();
      return data;
    }
  } catch (error) {
    console.log('Backend analysis not available, using frontend detection only');
  }
  return null;
};

const FirstQuestion: React.FC<FirstQuestionProps> = ({ previewRows, featureNames, setFeatureNames, onNext, onBack }) => {
  const [missingDataInfo, setMissingDataInfo] = useState<{
    emptyStrings: number;
    nullValues: number;
    undefinedValues: number;
    whitespaceOnly: number;
    totalMissing: number;
    missingPatterns: string[];
  } | null>(null);
  
  const [backendAnalysis, setBackendAnalysis] = useState<{
    missing_cells: number;
    missing_percentage: number;
    missing_patterns: {
      null_values: number;
      empty_strings: number;
      whitespace_only: number;
    };
    pattern_percentages: {
      null_percentage: number;
      empty_string_percentage: number;
      whitespace_percentage: number;
    };
    columns_with_missing: Record<string, number>;
  } | null>(null);
  const [loadingAnalysis, setLoadingAnalysis] = useState(false);

  useEffect(() => {
    if (previewRows && previewRows.length > 0) {
      const patterns = detectMissingDataPatterns(previewRows);
      setMissingDataInfo(patterns);
      
      // Optionally fetch detailed analysis from backend
      setLoadingAnalysis(true);
      fetchMissingDataAnalysis().then((analysis) => {
        setBackendAnalysis(analysis);
        setLoadingAnalysis(false);
      }).catch(() => {
        setLoadingAnalysis(false);
      });
    }
  }, [previewRows]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-4xl px-4 py-8 flex flex-col">
        <div className="mb-4 flex items-center">
          <button
            className={`${styles.button} ${styles.secondary}`}
            onClick={onBack}
            style={{ minWidth: 80 }}
          >
            &larr; Back
          </button>
        </div>
        <div>
          <div className="mb-2 text-5xl font-semibold flex items-end">
            <span>1</span>
            <span className="text-gray-400">/3</span>
            <span className="text-base font-normal ml-4 text-gray-400">Just three questions to get started.</span>
          </div>
          
          {/* Missing Data Detection Section */}
          {missingDataInfo && missingDataInfo.totalMissing > 0 && (
            <div className="mb-6 mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h3 className="text-lg font-semibold text-blue-800 mb-2">📊 Missing Data Detected</h3>
              <p className="text-blue-700 text-sm mb-3">
                We found {missingDataInfo.totalMissing} missing values in your dataset with the following patterns:
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm">
                {missingDataInfo.emptyStrings > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                    <span className="text-blue-800">Empty strings: {missingDataInfo.emptyStrings}</span>
                  </div>
                )}
                {missingDataInfo.nullValues > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                    <span className="text-red-800">Null values: {missingDataInfo.nullValues}</span>
                  </div>
                )}
                {missingDataInfo.undefinedValues > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-yellow-500 rounded-full"></span>
                    <span className="text-yellow-800">Undefined values: {missingDataInfo.undefinedValues}</span>
                  </div>
                )}
                {missingDataInfo.whitespaceOnly > 0 && (
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                    <span className="text-green-800">Whitespace-only: {missingDataInfo.whitespaceOnly}</span>
                  </div>
                )}
              </div>
              
              {/* Backend Analysis Section */}
              {backendAnalysis && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <h4 className="text-sm font-semibold text-blue-800 mb-2">📈 Detailed Analysis</h4>
                  <div className="grid grid-cols-3 gap-4 text-xs">
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-blue-800">Total Missing</div>
                      <div className="text-lg font-bold text-blue-600">{backendAnalysis.missing_cells}</div>
                      <div className="text-gray-500">({backendAnalysis.missing_percentage}%)</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-red-800">Null Values</div>
                      <div className="text-lg font-bold text-red-600">{backendAnalysis.missing_patterns.null_values}</div>
                      <div className="text-gray-500">({backendAnalysis.pattern_percentages.null_percentage}%)</div>
                    </div>
                    <div className="bg-white p-2 rounded border">
                      <div className="font-semibold text-green-800">Empty Strings</div>
                      <div className="text-lg font-bold text-green-600">{backendAnalysis.missing_patterns.empty_strings}</div>
                      <div className="text-gray-500">({backendAnalysis.pattern_percentages.empty_string_percentage}%)</div>
                    </div>
                  </div>
                  {backendAnalysis.columns_with_missing && Object.keys(backendAnalysis.columns_with_missing).length > 0 && (
                    <div className="mt-3">
                      <div className="text-xs font-semibold text-blue-800 mb-1">Columns with missing data:</div>
                      <div className="text-xs text-blue-700">
                        {Object.entries(backendAnalysis.columns_with_missing).slice(0, 3).map(([col, count]) => (
                          <span key={col} className="inline-block bg-blue-100 px-2 py-1 rounded mr-2 mb-1">
                            {col}: {count}
                          </span>
                        ))}
                        {Object.keys(backendAnalysis.columns_with_missing).length > 3 && (
                          <span className="text-gray-500">+{Object.keys(backendAnalysis.columns_with_missing).length - 3} more</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {loadingAnalysis && (
                <div className="mt-4 pt-4 border-t border-blue-200">
                  <div className="text-xs text-blue-600">🔄 Loading detailed analysis...</div>
                </div>
              )}
            </div>
          )}

          <div className="mb-6 mt-8">
            <label className="block text-lg font-medium mb-2">Is your first row feature names?</label>
            <div className="flex gap-8 items-center mb-2">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="featureNames" checked={featureNames === true} onChange={() => setFeatureNames(true)} />
                <span>Yes</span>
              </label>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="radio" name="featureNames" checked={featureNames === false} onChange={() => setFeatureNames(false)} />
                <span>No</span>
              </label>
            </div>
            <p className="text-gray-500 text-sm mt-2">If you choose "no," feature names will automatically be assigned. The first column will be named "Feature 1," the second column will be named "Feature 2," etc.</p>
          </div>
          <div className="mb-6 mt-8">
            <div className="text-gray-500 text-sm mb-2">Dataset preview {featureNames === true ? '(first 10 data rows)' : '(first 10 rows)'}</div>
            <div className="overflow-x-auto border bg-white shadow max-w-full">
              <table className="min-w-[600px] border-collapse">
                <thead>
                  <tr>
                    {(featureNames === false
                      ? Array.from({ length: Math.max(...previewRows.map(r => r.length)) }, (_, i) => `Feature ${i + 1}`)
                      : previewRows[0]
                    ).map((col: any, i: number) => (
                      <th key={i} className="px-3 py-2 border-b font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50">{String(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {previewRows.slice(featureNames === true ? 1 : 0, featureNames === true ? 11 : 10).map((row, i) => {
                    // Get the header row to determine how many columns we should have
                    const headerRow = featureNames === true ? previewRows[0] : Array.from({ length: Math.max(...previewRows.map(r => r.length)) }, (_, i) => `Feature ${i + 1}`);
                    const numColumns = headerRow.length;
                    
                    return (
                      <tr key={i}>
                        {Array.from({ length: numColumns }, (_, j) => {
                          const cell = row[j] || ''; // Use empty string if cell doesn't exist
                          return (
                            <td 
                              key={j} 
                              className="px-3 py-2 border-b text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300"
                            >
                              {cell === undefined ? '' : String(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

          </div>
          <div className="flex justify-end">
            <button
              className={`${styles.button} ${styles.primary} ml-2`}
              disabled={featureNames === null}
              onClick={onNext}
              style={{ minWidth: 80 }}
            >
              Next &rarr;
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default FirstQuestion; 