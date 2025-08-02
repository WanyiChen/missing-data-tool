import React, { useEffect, useRef } from "react";
import CheckIcon from '@mui/icons-material/Check';

export type DataTypeFilter = {
    numerical: boolean;
    categorical: boolean;
};

interface DataTypeFilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (filter: DataTypeFilter) => void;
    currentFilter: DataTypeFilter;
    position: { x: number; y: number } | null;
    buttonPosition?: { x: number; y: number; width: number; height: number } | null;
}

const DataTypeFilterDropdown: React.FC<DataTypeFilterDropdownProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentFilter,
    position,
    buttonPosition
}) => {
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                // Check if the click is within the button's bounding box
                if (buttonPosition) {
                    const clickX = event.clientX;
                    const clickY = event.clientY;
                    const buttonLeft = buttonPosition.x - buttonPosition.width / 2;
                    const buttonRight = buttonPosition.x + buttonPosition.width / 2;
                    const buttonTop = buttonPosition.y;
                    const buttonBottom = buttonPosition.y + buttonPosition.height;
                    
                    // If click is within button bounds, don't close
                    if (clickX >= buttonLeft && clickX <= buttonRight && 
                        clickY >= buttonTop && clickY <= buttonBottom) {
                        return;
                    }
                }
                
                event.stopPropagation();
                onClose();
            }
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                event.stopPropagation();
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

    const handleOptionClick = (option: 'numerical' | 'categorical') => {
        const newFilter = { ...currentFilter };
        
        // Toggle the clicked option
        newFilter[option] = !newFilter[option];
        
        // Ensure at least one option is selected
        if (!newFilter.numerical && !newFilter.categorical) {
            // If both would be deselected, keep the other one selected
            newFilter[option === 'numerical' ? 'categorical' : 'numerical'] = true;
        }
        
        onSelect(newFilter);
    };

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
                    onClick={() => handleOptionClick('numerical')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                        currentFilter.numerical
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                    <span>Numerical</span>
                    {currentFilter.numerical && (
                        <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
                    )}
                </button>
                <button
                    onClick={() => handleOptionClick('categorical')}
                    className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                        currentFilter.categorical
                            ? 'bg-blue-50 text-blue-700'
                            : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                    }`}
                >
                    <span>Categorical</span>
                    {currentFilter.categorical && (
                        <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
                    )}
                </button>
            </div>
        </div>
    );
};

export default DataTypeFilterDropdown; 