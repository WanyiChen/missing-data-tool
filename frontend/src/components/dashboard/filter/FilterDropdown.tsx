import React, { useEffect, useRef } from "react";
import CheckIcon from '@mui/icons-material/Check';

export type SortOption = 'No Sort' | 'Ascending' | 'Descending' | 'Alphabetical' | 'Reverse Alphabetical';

interface FilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: SortOption) => void;
    currentSort: SortOption;
    position: { x: number; y: number } | null;
    filterType: 'feature' | 'number' | 'percentage';
    buttonPosition?: { x: number; y: number; width: number; height: number } | null;
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentSort,
    position,
    filterType,
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
                            console.log("click is within button bounds");
                        return;
                    }
                }
                
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

    const getSortOptions = () => {
        const nameOptions: SortOption[] = ['No Sort', 'Alphabetical', 'Reverse Alphabetical'];
        const baseOptions: SortOption[] = ['No Sort', 'Ascending', 'Descending'];
        if (filterType === 'feature') {
            return nameOptions;
        } else {
            return baseOptions;
        }
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
                {getSortOptions().map((option) => (
                    <button
                        key={option}
                        onClick={() => onSelect(option)}
                        className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                            currentSort === option
                                ? 'bg-blue-50 text-blue-700'
                                : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
                        }`}
                        style={{ minWidth: '100%' }}
                    >
                        <span>{option}</span>
                        {currentSort === option && (
                            <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
                        )}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FilterDropdown; 