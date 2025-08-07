import React, { useEffect, useRef } from "react";
import type { ReactNode } from "react";

interface DropdownProps {
    isOpen: boolean;
    onClose: () => void;
    position: { x: number; y: number } | null;
    buttonPosition?: { x: number; y: number; width: number; height: number } | null;
    children: ReactNode;
    className?: string;
    style?: React.CSSProperties;
}

const Dropdown: React.FC<DropdownProps> = ({
    isOpen,
    onClose,
    position,
    buttonPosition,
    children,
    className = "",
    style = {}
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
    }, [isOpen, onClose, buttonPosition]);

    if (!isOpen || !position) {
        return null;
    }

    return (
        <div 
            ref={dropdownRef}
            className={`fixed z-50 bg-white border border-gray-200 rounded-md shadow-lg ${className}`}
            style={{
                left: `${position.x}px`,
                top: `${position.y}px`,
                transform: 'translateX(-50%)',
                minWidth: '180px',
                ...style
            }}
        >
            {children}
        </div>
    );
};

export default Dropdown; 