import React from "react";
import CheckIcon from '@mui/icons-material/Check';

interface DropdownItemProps {
    label: string;
    isSelected?: boolean;
    onClick: () => void;
    showCheckIcon?: boolean;
    className?: string;
}

const DropdownItem: React.FC<DropdownItemProps> = ({
    label,
    isSelected = false,
    onClick,
    showCheckIcon = true,
    className = ""
}) => {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left px-4 py-2.5 text-sm flex items-center justify-between transition-colors duration-200 cursor-pointer ${
                isSelected
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-700 hover:bg-gray-200 hover:text-gray-900'
            } ${className}`}
        >
            <span>{label}</span>
            {isSelected && showCheckIcon && (
                <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
            )}
        </button>
    );
};

export default DropdownItem; 