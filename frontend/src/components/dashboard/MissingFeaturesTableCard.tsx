import React, { useEffect, useState } from "react";
import axios from "axios";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DataTypeDropdown from "../common/DataTypeDropdown";
import FilterDropdown from "../common/FilterDropdown";
import type { SortOption } from "../common/FilterDropdown";

interface FeatureData {
    feature_name: string;
    data_type: 'N' | 'C'; // Numerical or Categorical
    number_missing: number;
    percentage_missing: number;
    most_correlated_with: {
        feature_name: string;
        correlation_value: number;
        correlation_type: 'r' | 'V'; // Pearson or Cramer's V
    } | null;
    informative_missingness: {
        is_informative: boolean;
        p_value: number;
    };
}

const FeaturesTableCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [features, setFeatures] = useState<FeatureData[]>([]);
    const [openDropdown, setOpenDropdown] = useState<string | null>(null);
    const [dropdownPosition, setDropdownPosition] = useState<{ x: number; y: number } | null>(null);
    
    // Filter dropdown states
    const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(null);
    const [filterDropdownPosition, setFilterDropdownPosition] = useState<{ x: number; y: number } | null>(null);
    const [sortConfig, setSortConfig] = useState<{
        feature: SortOption;
        number: SortOption;
        percentage: SortOption;
    }>({
        feature: 'No Sort',
        number: 'No Sort',
        percentage: 'No Sort'
    });

    useEffect(() => {
        const fetchFeaturesData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/missing-features-table");
                if (res.data.success) {
                    setFeatures(res.data.features);
                } else {
                    setError(res.data.message || "Failed to fetch data");
                }
            } catch (err: any) {
                setError(err);
                console.log(err);
            } finally {
                setLoading(false);
            }
        };
        fetchFeaturesData();
    }, []);

    const handleDataTypeChange = async (featureName: string, newType: 'N' | 'C') => {
        try {
            const res = await axios.patch("/api/features-table", {
                feature_name: featureName,
                data_type: newType
            });
            
            if (res.data.success) {
                // Update the local state
                setFeatures(prevFeatures => 
                    prevFeatures.map(feature => 
                        feature.feature_name === featureName 
                            ? { ...feature, data_type: newType }
                            : feature
                    )
                );
            } else {
                console.error("Failed to update data type:", res.data.message);
            }
        } catch (err: any) {
            console.error("Error updating data type:", err);
        } finally {
            setOpenDropdown(null);
            setDropdownPosition(null);
        }
    };

    const toggleDropdown = (featureName: string, event: React.MouseEvent) => {
        if (openDropdown === featureName) {
            setOpenDropdown(null);
            setDropdownPosition(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setDropdownPosition({
                x: rect.left + rect.width / 2,
                y: rect.top - 10 // Position above the button
            });
            setOpenDropdown(featureName);
        }
    };

    const toggleFilterDropdown = (filterType: string, event: React.MouseEvent) => {
        if (openFilterDropdown === filterType) {
            setOpenFilterDropdown(null);
            setFilterDropdownPosition(null);
        } else {
            const rect = event.currentTarget.getBoundingClientRect();
            setFilterDropdownPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 5 // Position below the icon
            });
            setOpenFilterDropdown(filterType);
        }
    };

    const closeDropdown = () => {
        setOpenDropdown(null);
        setDropdownPosition(null);
    };

    const closeFilterDropdown = () => {
        setOpenFilterDropdown(null);
        setFilterDropdownPosition(null);
    };

    const handleSortChange = (filterType: 'feature' | 'number' | 'percentage', newSort: SortOption) => {
        // Reset other sorts when one is selected
        const newSortConfig = {
            feature: 'No Sort' as SortOption,
            number: 'No Sort' as SortOption,
            percentage: 'No Sort' as SortOption
        };
        
        // Set the new sort for the selected filter type
        newSortConfig[filterType] = newSort;
        setSortConfig(newSortConfig);
        
        // Apply sorting to features
        const sortedFeatures = [...features].sort((a, b) => {
            if (newSort === 'No Sort') return 0;
            
            let comparison = 0;
            switch (filterType) {
                case 'feature':
                    comparison = a.feature_name.localeCompare(b.feature_name);
                    break;
                case 'number':
                    comparison = a.number_missing - b.number_missing;
                    break;
                case 'percentage':
                    comparison = a.percentage_missing - b.percentage_missing;
                    break;
            }
            
            return newSort === 'Ascending' ? comparison : -comparison;
        });
        
        setFeatures(sortedFeatures);
        closeFilterDropdown();
    };

    const getDataTypeLabel = (type: 'N' | 'C') => {
        return type === 'N' ? 'Numerical' : 'Categorical';
    };

    const getCorrelationTypeLabel = (type: 'r' | 'V') => {
        return type === 'r' ? 'Pearson' : "Cramer's V";
    };

    const getDataTypeDisplay = (type: 'N' | 'C') => {
        // Check if screen is small (you can adjust this breakpoint)
        const isSmallScreen = window.innerWidth < 768;
        return isSmallScreen ? type : getDataTypeLabel(type);
    };

    const currentFeature = features.find(f => f.feature_name === openDropdown);

    return (
        <div className="rounded-2xl border bg-white shadow-sm p-6 w-full">
            {/* Header Section */}
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                Features with Missing Data
                <InfoOutlinedIcon fontSize="small" className="text-gray-400" />
            </div>
            
            {loading ? (
                <div className="text-center text-gray-400 py-8">Loading...</div>
            ) : error ? (
                <div className="text-center text-red-500 py-8">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Data Type
                                        <FilterListIcon fontSize="small" className="text-gray-400" />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Feature Name
                                        <button
                                            onClick={(e) => toggleFilterDropdown('feature', e)}
                                            className="hover:text-black transition-colors"
                                        >
                                            <FilterListIcon fontSize="small" className="text-gray-400 hover:text-black" />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Number Missing
                                        <button
                                            onClick={(e) => toggleFilterDropdown('number', e)}
                                            className="hover:text-black transition-colors"
                                        >
                                            <FilterListIcon fontSize="small" className="text-gray-400 hover:text-black" />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Percentage Missing
                                        <button
                                            onClick={(e) => toggleFilterDropdown('percentage', e)}
                                            className="hover:text-black transition-colors"
                                        >
                                            <FilterListIcon fontSize="small" className="text-gray-400 hover:text-black" />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Most Correlated With
                                        <InfoOutlinedIcon fontSize="small" className="text-gray-400" />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1">
                                        Informative Missingness
                                        <InfoOutlinedIcon fontSize="small" className="text-gray-400" />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {features.map((feature, index) => (
                                <tr key={index} className="border-b">
                                    <td className="text-center py-3 px-2 border">
                                        <button
                                            onClick={(e) => toggleDropdown(feature.feature_name, e)}
                                            className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 transition-all duration-200 cursor-pointer"
                                        >
                                            {getDataTypeDisplay(feature.data_type)}
                                        </button>
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        <a 
                                            href="#" 
                                            className="text-blue-600 hover:text-blue-800 underline"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // TODO: Implement feature detail view
                                                console.log(`Clicked on ${feature.feature_name}`);
                                            }}
                                        >
                                            {feature.feature_name}
                                        </a>
                                    </td>
                                    <td className="text-center py-3 px-2 border font-medium">
                                        {feature.number_missing.toLocaleString()}
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        {feature.percentage_missing.toFixed(2)}%
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        {feature.most_correlated_with ? (
                                            <div className="flex items-center gap-1">
                                                <span className="text-gray-600">
                                                    {feature.most_correlated_with.feature_name}
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    ({feature.most_correlated_with.correlation_type} = {feature.most_correlated_with.correlation_value})
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">--</span>
                                        )}
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                                            {feature.informative_missingness.is_informative ? 'Yes' : 'No'}
                                            <span className="ml-1">
                                                (p = {feature.informative_missingness.p_value.toFixed(2)})
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reusable Dropdown Component */}
            <DataTypeDropdown
                isOpen={!!openDropdown}
                onClose={closeDropdown}
                onSelect={(type) => handleDataTypeChange(openDropdown!, type)}
                currentType={currentFeature?.data_type || 'N'}
                position={dropdownPosition}
            />

            {/* Filter Dropdown Component */}
            <FilterDropdown
                isOpen={!!openFilterDropdown}
                onClose={closeFilterDropdown}
                onSelect={(option) => handleSortChange(openFilterDropdown as 'feature' | 'number' | 'percentage', option)}
                currentSort={sortConfig[openFilterDropdown as keyof typeof sortConfig] || 'No Sort'}
                position={filterDropdownPosition}
                filterType={openFilterDropdown as 'feature' | 'number' | 'percentage'}
            />
        </div>
    );
};

export default FeaturesTableCard; 