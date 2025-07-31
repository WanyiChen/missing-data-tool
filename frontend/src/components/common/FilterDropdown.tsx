import React, { useEffect, useRef } from "react";

export type SortOption = 'No Sort' | 'Ascending' | 'Descending' | 'Alphabetical' | 'Reverse Alphabetical';

interface FilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (option: SortOption) => void;
    currentSort: SortOption;
    position: { x: number; y: number } | null;
    filterType: 'feature' | 'number' | 'percentage';
}

const FilterDropdown: React.FC<FilterDropdownProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentSort,
    position,
    filterType
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
    }, [isOpen, onClose]);

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
            className="fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg min-w-[140px]"
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)'
            }}
        >
            <div className="py-1">
                {getSortOptions().map((option) => (
                    <button
                        key={option}
                        onClick={() => onSelect(option)}
                        className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                            currentSort === option ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                        }`}
                    >
                        {option}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default FilterDropdown; 