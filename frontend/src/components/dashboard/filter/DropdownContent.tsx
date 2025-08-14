import React, { type ReactNode } from "react";

interface DropdownContentProps {
    children: ReactNode;
    className?: string;
}

const DropdownContent: React.FC<DropdownContentProps> = ({
    children,
    className = ""
}) => {
    return (
        <div className={`py-1 ${className}`}>
            {children}
        </div>
    );
};

export default DropdownContent; 