import React, { useEffect, useRef, useState } from "react";

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
    }, [isOpen, onClose]);

    if (!isOpen || !position) {
        return null;
    }

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
                <button
                    onClick={() => onSelect('N')}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        currentType === 'N' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                >
                    N - Numerical
                </button>
                <button
                    onClick={() => onSelect('C')}
                    className={`w-full text-left px-3 py-2 text-sm hover:bg-gray-100 ${
                        currentType === 'C' ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                    }`}
                >
                    C - Categorical
                </button>
            </div>
        </div>
    );
};

export default DataTypeDropdown; 