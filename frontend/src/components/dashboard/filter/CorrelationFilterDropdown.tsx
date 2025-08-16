import React, { useState } from "react";
import Dropdown from "./Dropdown";
import DropdownItem from "./DropdownItem";
import DropdownContent from "./DropdownContent";
import Slider from "@mui/material/Slider";

export type CorrelationFilter = {
    correlations: boolean;
    noCorrelations: boolean;
    pearsonThreshold: number;
    cramerVThreshold: number;
    etaThreshold: number;
};

interface CorrelationFilterDropdownProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (filter: CorrelationFilter) => void;
    currentFilter: CorrelationFilter;
    position: { x: number; y: number } | null;
    buttonPosition?: { x: number; y: number; width: number; height: number } | null;
}

const CorrelationFilterDropdown: React.FC<CorrelationFilterDropdownProps> = ({
    isOpen,
    onClose,
    onSelect,
    currentFilter,
    position,
    buttonPosition
}) => {
    const [localFilter, setLocalFilter] = useState<CorrelationFilter>(currentFilter);

    const handleOptionClick = (option: 'correlations' | 'noCorrelations') => {
        const newFilter = { ...localFilter };
        
        // Toggle the clicked option
        newFilter[option] = !newFilter[option];
        
        // Ensure at least one option is selected
        if (!newFilter.correlations && !newFilter.noCorrelations) {
            // If both would be deselected, keep the other one selected
            newFilter[option === 'correlations' ? 'noCorrelations' : 'correlations'] = true;
        }
        
        setLocalFilter(newFilter);
        onSelect(newFilter);
    };

    const handleThresholdChange = (thresholdType: 'pearsonThreshold' | 'cramerVThreshold' | 'etaThreshold', value: number) => {
        const newFilter = { ...localFilter, [thresholdType]: value };
        setLocalFilter(newFilter);
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
                <div className="px-4 py-2 border-b border-gray-200">
                    <div className="font-medium text-gray-700 mb-3">
                        Filter
                    </div>
                    <DropdownItem
                        label="Correlations"
                        isSelected={localFilter.correlations}
                        onClick={() => handleOptionClick('correlations')}
                    />
                    <DropdownItem
                        label="No correlations"
                        isSelected={localFilter.noCorrelations}
                        onClick={() => handleOptionClick('noCorrelations')}
                    />
                    <div className="mb-2"></div>
                </div>
                
                <div className="px-4 py-2">
                    <div className="font-medium text-gray-700 mb-3">
                        Adjust Threshold(s)
                    </div>
                    
                    <div>
                        <div className="text-gray-600 mb-1 block text-sm">
                            Correlation Coefficient (Absolute Value)
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Slider
                                    value={localFilter.pearsonThreshold}
                                    onChange={(_, value) => handleThresholdChange('pearsonThreshold', value as number)}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    marks={[
                                        { value: 0, label: '0' },
                                        { value: 1, label: '1' }
                                    ]}
                                    size="small"
                                />
                            </div>
                            <input
                                type="number"
                                value={localFilter.pearsonThreshold}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 1) {
                                        // Round to nearest 0.05 step
                                        const roundedValue = Math.round(value * 20) / 20;
                                        handleThresholdChange('pearsonThreshold', roundedValue);
                                    }
                                }}
                                onBlur={(e) => {
                                    // Ensure value is properly rounded when user leaves the field
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                        const clampedValue = Math.max(0, Math.min(1, value));
                                        const roundedValue = Math.round(clampedValue * 20) / 20;
                                        handleThresholdChange('pearsonThreshold', roundedValue);
                                    }
                                }}
                                min={0}
                                max={1}
                                step={0.05}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-gray-600 block text-sm">
                            Cramér's V
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Slider
                                    value={localFilter.cramerVThreshold}
                                    onChange={(_, value) => handleThresholdChange('cramerVThreshold', value as number)}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    marks={[
                                        { value: 0, label: '0' },
                                        { value: 1, label: '1' }
                                    ]}
                                    size="small"
                                />
                            </div>
                            <input
                                type="number"
                                value={localFilter.cramerVThreshold}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 1) {
                                        // Round to nearest 0.05 step
                                        const roundedValue = Math.round(value * 20) / 20;
                                        handleThresholdChange('cramerVThreshold', roundedValue);
                                    }
                                }}
                                onBlur={(e) => {
                                    // Ensure value is properly rounded when user leaves the field
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                        const clampedValue = Math.max(0, Math.min(1, value));
                                        const roundedValue = Math.round(clampedValue * 20) / 20;
                                        handleThresholdChange('cramerVThreshold', roundedValue);
                                    }
                                }}
                                min={0}
                                max={1}
                                step={0.05}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                    
                    <div>
                        <div className="text-gray-600 mb-1 block text-sm">
                            Eta-squared
                        </div>
                        <div className="flex items-center gap-2">
                            <div className="flex-1">
                                <Slider
                                    value={localFilter.etaThreshold}
                                    onChange={(_, value) => handleThresholdChange('etaThreshold', value as number)}
                                    min={0}
                                    max={1}
                                    step={0.05}
                                    marks={[
                                        { value: 0, label: '0' },
                                        { value: 1, label: '1' }
                                    ]}
                                    size="small"
                                />
                            </div>
                            <input
                                type="number"
                                value={localFilter.etaThreshold}
                                onChange={(e) => {
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value) && value >= 0 && value <= 1) {
                                        // Round to nearest 0.05 step
                                        const roundedValue = Math.round(value * 20) / 20;
                                        handleThresholdChange('etaThreshold', roundedValue);
                                    }
                                }}
                                onBlur={(e) => {
                                    // Ensure value is properly rounded when user leaves the field
                                    const value = parseFloat(e.target.value);
                                    if (!isNaN(value)) {
                                        const clampedValue = Math.max(0, Math.min(1, value));
                                        const roundedValue = Math.round(clampedValue * 20) / 20;
                                        handleThresholdChange('etaThreshold', roundedValue);
                                    }
                                }}
                                min={0}
                                max={1}
                                step={0.05}
                                className="w-16 px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                    </div>
                </div>
            </DropdownContent>
        </Dropdown>
    );
};

export default CorrelationFilterDropdown; 