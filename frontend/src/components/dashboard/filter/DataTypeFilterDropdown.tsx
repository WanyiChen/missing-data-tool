import React from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import DropdownContent from "./DropdownContent";

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
        <Dropdown
            isOpen={isOpen}
            onClose={onClose}
            position={position}
            buttonPosition={buttonPosition}
        >
            <DropdownContent>
                <DropdownItem
                    label="Numerical"
                    isSelected={currentFilter.numerical}
                    onClick={() => handleOptionClick('numerical')}
                />
                <DropdownItem
                    label="Categorical"
                    isSelected={currentFilter.categorical}
                    onClick={() => handleOptionClick('categorical')}
                />
            </DropdownContent>
        </Dropdown>
    );
};

export default DataTypeFilterDropdown; 