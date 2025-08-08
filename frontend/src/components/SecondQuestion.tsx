import React from 'react';

interface SecondQuestionProps {
  previewRows: any[][];
  missingDataOptions: {
    blanks: boolean;
    na: boolean;
    other: boolean;
    otherText: string;
  };
  setMissingDataOptions: (opts: {
    blanks: boolean;
    na: boolean;
    other: boolean;
    otherText: string;
  }) => void;
  onBack: () => void;
  onNext: (processedData?: any[][]) => void;
}

const SecondQuestion: React.FC<SecondQuestionProps> = ({
  previewRows,
  missingDataOptions,
  setMissingDataOptions,
  onBack,
  onNext,
}) => {
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

  const { hasBlanks, hasNA } = autoDetectMissingData(previewRows);

  const handleCheckbox = (key: 'blanks' | 'na' | 'other') => {
    setMissingDataOptions({
      ...missingDataOptions,
      [key]: !missingDataOptions[key],
      ...(key === 'other' && missingDataOptions.other ? { otherText: '' } : {}),
    });
  };

  const handleOtherText = (e: React.ChangeEvent<HTMLInputElement>) => {
    setMissingDataOptions({ ...missingDataOptions, otherText: e.target.value });
  };

  const canProceed = missingDataOptions.blanks || missingDataOptions.na || (missingDataOptions.other && missingDataOptions.otherText.trim() !== '');

  // Process data based on user selections
  const processData = () => {
    console.log('Processing data with options:', missingDataOptions);
    console.log('Original data sample:', previewRows.slice(0, 3));
    
    const processedRows = previewRows.map((row, rowIndex) => {
      if (rowIndex === 0) return row; // Keep header row as is
      
      return row.map((cell, colIndex) => {
        // Handle different cell formats
        let cellValue;
        if (cell === null || cell === undefined) {
          cellValue = null;
        } else if (typeof cell === 'object' && cell !== null && 'value' in cell) {
          cellValue = cell.value;
        } else {
          cellValue = cell;
        }

        // Process based on user selections
        let shouldBeNull = false;
        
        // Check blanks
        if (missingDataOptions.blanks) {
          if (cellValue === '' || (typeof cellValue === 'string' && cellValue.trim() === '')) {
            shouldBeNull = true;
            console.log(`Converting blank to null: "${cellValue}" at row ${rowIndex}, col ${colIndex}`);
          }
        }
        
        // Check N/A patterns
        if (missingDataOptions.na && !shouldBeNull) {
          const naPatterns = ['N/A', 'NA', 'na', 'n/a', 'N/a', 'n/A'];
          if (typeof cellValue === 'string' && naPatterns.includes(cellValue)) {
            shouldBeNull = true;
            console.log(`Converting N/A to null: "${cellValue}" at row ${rowIndex}, col ${colIndex}`);
          }
        }
        
        // Check other patterns
        if (missingDataOptions.other && missingDataOptions.otherText && !shouldBeNull) {
          const otherPatterns = missingDataOptions.otherText.split(',').map(s => s.trim());
          if (typeof cellValue === 'string' && 
              otherPatterns.some(pattern => cellValue.toLowerCase().includes(pattern.toLowerCase()))) {
            shouldBeNull = true;
            console.log(`Converting other to null: "${cellValue}" at row ${rowIndex}, col ${colIndex}`);
          }
        }
        
        const result = shouldBeNull ? null : cellValue;
        if (cellValue === 0 && result === null) {
          console.log(`WARNING: 0 value converted to null at row ${rowIndex}, col ${colIndex}`);
        }
        return result;
      });
    });
    
    console.log('Processed data sample:', processedRows.slice(0, 3));
    return processedRows;
  };

  const handleNext = () => {
    const processedData = processData();
    onNext(processedData);
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-white">
      <div className="w-full max-w-4xl px-4 py-8">
        <div className="mb-2 text-5xl font-semibold flex items-end">
          <span>2</span>
          <span className="text-gray-400">/3</span>
          <span className="text-base font-normal ml-4 text-gray-400">Just three questions to get started.</span>
        </div>
        <div className="mb-6 mt-8">
          <label className="block text-lg font-medium mb-2">
            How is missing data represented in this dataset? You can select multiple answers.
          </label>
          <div className="flex flex-col gap-2 mb-2">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={missingDataOptions.blanks}
                onChange={() => handleCheckbox('blanks')}
              />
              <span>Blanks {hasBlanks && missingDataOptions.blanks ? '(auto-detected)' : ''}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={missingDataOptions.na}
                onChange={() => handleCheckbox('na')}
              />
              <span>N/A {hasNA && missingDataOptions.na ? '(auto-detected)' : ''}</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={missingDataOptions.other}
                onChange={() => handleCheckbox('other')}
              />
              <span>Other:</span>
              <input
                type="text"
                className="border rounded px-2 py-1 text-sm min-w-[180px] italic"
                placeholder="Please Indicate"
                value={missingDataOptions.otherText}
                onChange={handleOtherText}
                disabled={!missingDataOptions.other}
              />
            </label>
          </div>
          <div className="text-xs text-gray-500 mt-1 mb-2">(Separate by commas if more than one answer.)</div>
        </div>
        <div className="mb-6 mt-8">
          <div className="text-gray-500 text-sm mb-2">Dataset preview (first 10 rows)</div>
          <div className="overflow-x-auto border rounded-xl bg-white shadow max-w-full">
            <table className="min-w-[600px] border-collapse">
              <thead>
                <tr>
                  {previewRows[0]?.map((col: any, i: number) => {
                    // Handle both old format (direct values) and new format (objects with value/isMissing)
                    const colValue = typeof col === 'object' && col !== null && 'value' in col ? col.value : col;
                    return (
                      <th key={i} className="px-3 py-2 border-b font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50">{String(colValue)}</th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {previewRows.slice(1).map((row, i) => {
                  // Get the header row to determine how many columns we should have
                  const headerRow = previewRows[0];
                  const numColumns = headerRow.length;
                  
                  return (
                    <tr key={i}>
                      {Array.from({ length: numColumns }, (_, j) => {
                        const cell = row[j] || ''; // Use empty string if cell doesn't exist
                        
                        // Handle both old format (direct values) and new format (objects with value/isMissing)
                        const cellValue = typeof cell === 'object' && cell !== null && 'value' in cell ? cell.value : cell;
                        const isMissingFromData = typeof cell === 'object' && cell !== null && 'isMissing' in cell ? cell.isMissing : false;
                        
                        // Only highlight based on user selections OR if already marked as missing in data
                        const isMissing = isMissingFromData || 
                          (missingDataOptions.blanks && (cellValue === null || cellValue === undefined || cellValue === '' || (typeof cellValue === 'string' && cellValue.trim() === ''))) ||
                          (missingDataOptions.na && (cellValue === 'N/A' || cellValue === 'NA' || cellValue === 'na' || cellValue === 'n/a')) ||
                          (missingDataOptions.other && missingDataOptions.otherText && typeof cellValue === 'string' && 
                           missingDataOptions.otherText.split(',').map(s => s.trim()).some(text => cellValue.toLowerCase().includes(text.toLowerCase())));
                        
                        return (
                          <td 
                            key={j} 
                            className={`px-3 py-2 border-b text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300 ${
                              isMissing ? 'bg-red-50 text-red-600' : ''
                            }`}
                          >
                            {cellValue === undefined ? '' : String(cellValue)}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="mt-2 text-xs text-gray-500">
            💡 Missing values are highlighted in red above
          </div>
        </div>
        <div className="flex justify-between mt-8">
          <button
            className="bg-gray-100 text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
            onClick={onBack}
          >
            &larr; Back
          </button>
          <button
            className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
            disabled={!canProceed}
            onClick={handleNext}
          >
            Next &rarr;
          </button>
        </div>
      </div>
    </div>
  );
};

export default SecondQuestion;
