import React, { useEffect, useRef } from "react";
import CheckIcon from '@mui/icons-material/Check';

interface DataTypeDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (type: 'N' | 'C') => void;
    currentType: 'N' | 'C';
    position: { x: number; y: number } | null;
}

const DataTypeDropdown: React.FC<DataTypeDropdownProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentType,
    position
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                onClose();
            }
        };

        if (isOpen) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleKeyDown);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [isOpen]);

    if (!isOpen || !position) {
        return null;
    }

    return (
        <div 
            ref={dropdownRef}
            className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)',
                minWidth: '180px'
            }}
        >
            <div className="py-1">
                <button
                    onClick={() => onSelect('N')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                        currentType === 'N'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                    <span>N - Numerical</span>
                    {currentType === 'N' && (
                        <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
                    )}
                </button>
                <button
                    onClick={() => onSelect('C')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                        currentType === 'C'
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                    <span>C - Categorical</span>
                    {currentType === 'C' && (
                        <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default DataTypeDropdown; 