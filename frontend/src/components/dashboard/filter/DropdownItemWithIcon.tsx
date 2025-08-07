import React, { type ReactNode } from "react";
import CheckIcon from '@mui/icons-material/Check';

interface DropdownItemWithIconProps {
    label: string;
    isSelected?: boolean;
    onClick: () => void;
    icon?: ReactNode;
    showCheckIcon?: boolean;
    className?: string;
    description?: string;
}

const DropdownItemWithIcon: React.FC<DropdownItemWithIconProps> = ({
    label,
    isSelected = false,
    onClick,
    icon,
    showCheckIcon = true,
    className = "",
    description
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
            <div className="flex items-center gap-2">
                {icon && <span className="text-gray-500">{icon}</span>}
                <div className="flex flex-col">
                    <span>{label}</span>
                    {description && (
                        <span className="text-xs text-gray-500">{description}</span>
                    )}
                </div>
            </div>
            {isSelected && showCheckIcon && (
                <CheckIcon className="text-blue-600 ml-2" fontSize="small" />
            )}
        </button>
    );
};

export default DropdownItemWithIcon; 