import React from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import DropdownContent from "./DropdownContent";

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
    return (
        <Dropdown
            isOpen={isOpen}
            onClose={onClose}
            position={position}
        >
            <DropdownContent>
                <DropdownItem
                    label="N - Numerical"
                    isSelected={currentType === 'N'}
                    onClick={() => onSelect('N')}
                />
                <DropdownItem
                    label="C - Categorical"
                    isSelected={currentType === 'C'}
                    onClick={() => onSelect('C')}
                />
            </DropdownContent>
        </Dropdown>
    );
};

export default DataTypeDropdown; 