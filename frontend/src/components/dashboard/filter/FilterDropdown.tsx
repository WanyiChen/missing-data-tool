import React from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import DropdownContent from "./DropdownContent";

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
        <Dropdown
            isOpen={isOpen}
            onClose={onClose}
            position={position}
            buttonPosition={buttonPosition}
        >
            <DropdownContent>
                {getSortOptions().map((option) => (
                    <DropdownItem
                        key={option}
                        label={option}
                        isSelected={currentSort === option}
                        onClick={() => onSelect(option)}
                    />
                ))}
            </DropdownContent>
        </Dropdown>
    );
};

export default FilterDropdown; 