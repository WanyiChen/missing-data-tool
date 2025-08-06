import React from "react";
import styles from "../Button.module.css";

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    children: React.ReactNode;
    className?: string;
    overlayClassName?: string;
    contentClassName?: string;
    showCloseButton?: boolean;
    closeButtonClassName?: string;
    style?: React.CSSProperties;
}

const Modal: React.FC<ModalProps> = ({
    isOpen,
    onClose,
    children,
    className = "",
    overlayClassName = "",
    contentClassName = "",
    showCloseButton = false,
    closeButtonClassName = "",
    style,
}) => {
    if (!isOpen) return null;

    return (
        <div className={`fixed inset-0 z-50 flex items-center justify-center ${className}`}>
            {/* Background overlay */}
            <div 
                className={`absolute inset-0 bg-black/30 backdrop-blur-sm ${overlayClassName}`}
                onClick={onClose}
            />
            
            {/* Modal content */}
            <div className={`relative bg-white rounded-2xl shadow-xl ${contentClassName}`} style={style}>
                {/* Close X button */}
                {showCloseButton && (
                    <button
                        onClick={onClose}
                        className={`absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-black hover:text-gray-600 text-lg font-normal cursor-pointer ${closeButtonClassName}`}
                    >
                        ×
                    </button>
                )}
                
                {/* Modal content via composition */}
                {children}
            </div>
        </div>
    );
};

export default Modal; 