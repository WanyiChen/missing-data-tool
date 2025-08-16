import React from "react";
import Dropdown from "./Dropdown";
import DropdownContent from "./DropdownContent";

interface CorrelationDetails {
    feature_name: string;
    correlation_value: number;
    correlation_type: "r" | "V" | "η";
    p_value: number;
}

interface CorrelationDetailsDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    correlations: CorrelationDetails[];
    position: { x: number; y: number } | null;
    buttonPosition?: { x: number; y: number; width: number; height: number } | null;
}

const CorrelationDetailsDropdown: React.FC<CorrelationDetailsDropdownProps> = ({
    isOpen,
    onClose,
    correlations,
    position,
    buttonPosition
}) => {
    const getCorrelationTypeLabel = (type: "r" | "V" | "η") => {
        switch (type) {
            case "r":
                return "Pearson";
            case "V":
                return "Cramer's V";
            case "η":
                return "Eta";
            default:
                return type;
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
                <div className="px-4 py-2">
                    <div className="font-medium text-gray-700 mb-3">
                        Correlated Features
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                        {correlations.map((correlation, index) => (
                            <div key={index} className="px-4 py-2 border-b border-gray-100 last:border-b-0">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm font-medium text-gray-900">
                                        {correlation.feature_name}
                                    </span>
                                    <span className="text-sm text-gray-600">
                                        {getCorrelationTypeLabel(correlation.correlation_type)} = {correlation.correlation_value}
                                    </span>
                                </div>
                                <div className="text-xs text-gray-500 mt-1">
                                    p-value: {correlation.p_value.toFixed(3)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </DropdownContent>
        </Dropdown>
    );
};

export default CorrelationDetailsDropdown; 