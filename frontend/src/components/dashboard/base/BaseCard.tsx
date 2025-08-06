import React from "react";

interface BaseCardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    minHeight?: string;
}

const BaseCard: React.FC<BaseCardProps> = ({ children, className = "", title, minHeight = "150px" }) => {
    return (
        <div 
            className={`rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 ${className}`}
            style={{ minHeight }}
        >
            {title && (
                <div className="text-s text-gray-500 mb-2 text-center">
                    {title}
                </div>
            )}
            {children}
        </div>
    );
};

export default BaseCard; 