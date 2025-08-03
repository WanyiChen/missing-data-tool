import React, { useEffect, useState } from "react";
import axios from "axios";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import DataTypeDropdown from "./filter/DataTypeDropdown";
import FilterDropdown from "./filter/FilterDropdown";
import DataTypeFilterDropdown from "./filter/DataTypeFilterDropdown";
import type { SortOption } from "./filter/FilterDropdown";
import type { DataTypeFilter } from "./filter/DataTypeFilterDropdown";

interface FeatureData {
    feature_name: string;
    data_type: "N" | "C"; // Numerical or Categorical
    number_missing: number;
    percentage_missing: number;
    most_correlated_with: {
        feature_name: string;
        correlation_value: number;
        correlation_type: "r" | "V"; // Pearson or Cramer's V
    } | null;
    informative_missingness: {
        is_informative: boolean;
        p_value: number;
    };
}

interface MissingFeaturesTableCardProps {
    onInfoClick: (message: string) => void;
}

const MissingFeaturesTableCard: React.FC<MissingFeaturesTableCardProps> = ({
    onInfoClick,
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [features, setFeatures] = useState<FeatureData[]>([]);
    const [openDataTypeDropdown, setOpenDataTypeDropdown] = useState<
        string | null
    >(null);
    const [dataTypeDropdownPosition, setDataTypeDropdownPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);

    // Filter dropdown states
    const [openFilterDropdown, setOpenFilterDropdown] = useState<string | null>(
        null
    );
    const [filterDropdownPosition, setFilterDropdownPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [filterButtonPosition, setFilterButtonPosition] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    // Data type filter states
    const [openDataTypeFilterDropdown, setOpenDataTypeFilterDropdown] =
        useState<boolean>(false);
    const [dataTypeFilterPosition, setDataTypeFilterPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [dataTypeFilterButtonPosition, setDataTypeFilterButtonPosition] =
        useState<{
            x: number;
            y: number;
            width: number;
            height: number;
        } | null>(null);
    const [dataTypeFilter, setDataTypeFilter] = useState<DataTypeFilter>({
        numerical: true,
        categorical: true,
    });

    const [sortConfig, setSortConfig] = useState<{
        feature: SortOption;
        number: SortOption;
        percentage: SortOption;
    }>({
        feature: "No Sort",
        number: "No Sort",
        percentage: "No Sort",
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
            } finally {
                setLoading(false);
            }
        };
        fetchFeaturesData();
    }, []);

    const handleDataTypeChange = async (
        featureName: string,
        newType: "N" | "C"
    ) => {
        try {
            const res = await axios.patch("/api/features-table", {
                feature_name: featureName,
                data_type: newType,
            });

            if (res.data.success) {
                // Update the local state
                setFeatures((prevFeatures) =>
                    prevFeatures.map((feature) =>
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
            setOpenDataTypeDropdown(null);
            setDataTypeDropdownPosition(null);
        }
    };

    const toggleDropdown = (featureName: string, event?: React.MouseEvent) => {
        if (openDataTypeDropdown === featureName) {
            setOpenDataTypeDropdown(null);
            setDataTypeDropdownPosition(null);
        } else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                setDataTypeDropdownPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top - 10, // Position above the button
                });
            }
            setOpenDataTypeDropdown(featureName);
        }
    };

    const toggleFilterDropdown = (
        filterType: string,
        event?: React.MouseEvent
    ) => {
        if (openFilterDropdown !== null) {
            closeFilterDropdown();
            return;
        }

        if (event) {
            const rect = event.currentTarget.getBoundingClientRect();
            setFilterDropdownPosition({
                x: rect.left + rect.width / 2,
                y: rect.bottom + 5,
            });
            setFilterButtonPosition({
                x: rect.left + rect.width / 2,
                y: rect.top,
                width: rect.width,
                height: rect.height,
            });
        }
        setOpenFilterDropdown(filterType);
    };

    const closeDropdown = React.useCallback(() => {
        setOpenDataTypeDropdown(null);
        setDataTypeDropdownPosition(null);
    }, []);

    const closeFilterDropdown = React.useCallback(() => {
        setOpenFilterDropdown(null);
        setFilterDropdownPosition(null);
        setFilterButtonPosition(null);
    }, []);

    const closeDataTypeFilterDropdown = React.useCallback(() => {
        setOpenDataTypeFilterDropdown(false);
        setDataTypeFilterPosition(null);
        setDataTypeFilterButtonPosition(null);
    }, []);

    const handleSortChange = (
        filterType: "feature" | "number" | "percentage",
        newSort: SortOption
    ) => {
        // Reset other sorts when one is selected
        const newSortConfig = {
            feature: "No Sort" as SortOption,
            number: "No Sort" as SortOption,
            percentage: "No Sort" as SortOption,
        };

        // Set the new sort for the selected filter type
        newSortConfig[filterType] = newSort;
        setSortConfig(newSortConfig);

        // Apply sorting to features
        const sortedFeatures = [...features].sort((a, b) => {
            if (newSort === "No Sort") return 0;

            let comparison = 0;
            switch (filterType) {
                case "feature":
                    comparison = a.feature_name.localeCompare(b.feature_name);
                    break;
                case "number":
                    comparison = a.number_missing - b.number_missing;
                    break;
                case "percentage":
                    comparison = a.percentage_missing - b.percentage_missing;
                    break;
            }

            return newSort === "Ascending" || newSort === "Alphabetical"
                ? comparison
                : -comparison;
        });

        setFeatures(sortedFeatures);
        closeFilterDropdown();
    };

    const getDataTypeLabel = (type: "N" | "C") => {
        return type === "N" ? "Numerical" : "Categorical";
    };

    const getCorrelationTypeLabel = (type: "r" | "V") => {
        return type === "r" ? "Pearson" : "Cramer's V";
    };

    const getDataTypeDisplay = (type: "N" | "C") => {
        // Check if screen is small (you can adjust this breakpoint)
        const isSmallScreen = window.innerWidth < 768;
        return isSmallScreen ? type : getDataTypeLabel(type);
    };

    const currentFeature = features.find(
        (f) => f.feature_name === openDataTypeDropdown
    );

    const toggleDataTypeFilterDropdown = (event?: React.MouseEvent) => {
        if (openDataTypeFilterDropdown) {
            closeDataTypeFilterDropdown();
        } else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                setDataTypeFilterPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 5,
                });
                setDataTypeFilterButtonPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                });
            }
            setOpenDataTypeFilterDropdown(true);
        }
    };

    const handleDataTypeFilterChange = (newFilter: DataTypeFilter) => {
        setDataTypeFilter(newFilter);
    };

    // Filter features based on data type filter
    const filteredFeatures = features.filter((feature) => {
        if (feature.data_type === "N" && dataTypeFilter.numerical) return true;
        if (feature.data_type === "C" && dataTypeFilter.categorical)
            return true;
        return false;
    });

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
                                    <div className="flex items-center gap-1 justify-center">
                                        <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => {
                                                onInfoClick?.(
                                                    'Data types are auto-detected. "N" stands for numerical, and "C" stands for categorical. If the auto-detection is wrong, click on the letter to change data type.\n Numerical data are numbers representing measurable quantities, such as a person\'s age and income. Categorical data are labels describing different characteristics. Categorical data has two subcategories - nominal data and ordinal data. Nominal data have no inherent order among the categories, such as a person\'s gender and hometown. Ordinal data are labels with inherent orders, such as student grades where "A" is considered better than "B."'
                                                );
                                            }}
                                        >
                                            Data Type
                                            <InfoOutlinedIcon
                                                fontSize="small"
                                                className="text-gray-400"
                                            />
                                        </span>
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                toggleDataTypeFilterDropdown(e);
                                            }}
                                            className={`group transition-colors duration-100 cursor-pointer p-1 rounded hover:bg-gray-200`}
                                        >
                                            <FilterListIcon
                                                fontSize="small"
                                                className="text-gray-400 group-hover:text-black transition-colors duration-200"
                                            />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        Feature Name
                                        <button
                                            onClick={(e) => {
                                                toggleFilterDropdown(
                                                    "feature",
                                                    e
                                                );
                                            }}
                                            className={`group transition-colors duration-100 cursor-pointer p-1 rounded hover:bg-gray-200`}
                                        >
                                            <FilterListIcon
                                                fontSize="small"
                                                className="text-gray-400 group-hover:text-black transition-colors duration-200"
                                            />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        Number Missing
                                        <button
                                            onClick={(e) => {
                                                toggleFilterDropdown(
                                                    "number",
                                                    e
                                                );
                                            }}
                                            className={`group transition-colors duration-100 cursor-pointer p-1 rounded hover:bg-gray-200`}
                                        >
                                            <FilterListIcon
                                                fontSize="small"
                                                className="text-gray-400 group-hover:text-black transition-colors duration-200"
                                            />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        Percentage Missing
                                        <button
                                            onClick={(e) => {
                                                toggleFilterDropdown(
                                                    "percentage",
                                                    e
                                                );
                                            }}
                                            className={`group transition-colors duration-100 cursor-pointer p-1 rounded hover:bg-gray-200`}
                                        >
                                            <FilterListIcon
                                                fontSize="small"
                                                className="text-gray-400 group-hover:text-black transition-colors duration-200"
                                            />
                                        </button>
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => {
                                                onInfoClick?.(
                                                    'Some features are strongly correlated with other features. For numerical variables, their correlations are calculated by the correlation coefficient, denoted by r. For categorical variable, their correlations are calculated by Cramer\'s V, denoted by V.\n The "most correlated with" column shows features that have the strongest correlation with the feature listed in the "feature name" column. If more than one features are strongly associated, they will be shown by clicking on the expand (▸) button.'
                                                );
                                            }}
                                        >
                                            Most Correlated With
                                        </span>
                                        <InfoOutlinedIcon
                                            fontSize="small"
                                            className="text-gray-400"
                                        />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        <span
                                            className="cursor-pointer hover:underline"
                                            onClick={() => {
                                                onInfoClick?.(
                                                    "Sometimes, the fact that some cases are missing some particular features can be informative. For instance, in a hypothetical financial dataset, if people with lower credit scores are less likely to report their credit scores, then whether a person's credit score is missing is informative. Informative missingness often happens when data is Missing Not at Random (MNAR). \nIn the table, informative missingness is calculated by testing the relationships between the user-specified target feature and the missingness of all other features. If p-value > 0.05, the missingness is considered not informative. If p-value <= 0.05, data is considered informative. \nFor more details on how the p-value is calculated, please check out this paper: Van Ness, M., Bosschieter, T. M., Halpin- Gregorio, R., & Udell, M. (2023, August). The missing indicator method: From low to high dimensions. In Proceedings of the 29th ACM SIGKDD Conference on Knowledge Discovery and Data Mining (pp. 5004-5015)."
                                                );
                                            }}
                                        >
                                            Informative Missingness
                                        </span>
                                        <InfoOutlinedIcon
                                            fontSize="small"
                                            className="text-gray-400"
                                        />
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeatures.map((feature, index) => (
                                <tr key={index} className="border-b">
                                    <td className="text-center py-3 px-2 border">
                                        <button
                                            onClick={(e) =>
                                                toggleDropdown(
                                                    feature.feature_name,
                                                    e
                                                )
                                            }
                                            className="inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-medium bg-blue-500 text-white hover:bg-blue-600 hover:scale-105 transition-all duration-200 cursor-pointer"
                                        >
                                            {getDataTypeDisplay(
                                                feature.data_type
                                            )}
                                        </button>
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        <a
                                            href="#"
                                            className="text-blue-600 hover:text-blue-800 underline"
                                            onClick={(e) => {
                                                e.preventDefault();
                                                // TODO: Implement feature detail view
                                                console.log(
                                                    `Clicked on ${feature.feature_name}`
                                                );
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
                                                    {
                                                        feature
                                                            .most_correlated_with
                                                            .feature_name
                                                    }
                                                </span>
                                                <span className="text-xs text-gray-500">
                                                    (
                                                    {
                                                        feature
                                                            .most_correlated_with
                                                            .correlation_type
                                                    }{" "}
                                                    ={" "}
                                                    {
                                                        feature
                                                            .most_correlated_with
                                                            .correlation_value
                                                    }
                                                    )
                                                </span>
                                            </div>
                                        ) : (
                                            <span className="text-gray-400">
                                                --
                                            </span>
                                        )}
                                    </td>
                                    <td className="text-center py-3 px-2 border">
                                        <div className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-300">
                                            {feature.informative_missingness
                                                .is_informative
                                                ? "Yes"
                                                : "No"}
                                            <span className="ml-1">
                                                (p ={" "}
                                                {feature.informative_missingness.p_value.toFixed(
                                                    2
                                                )}
                                                )
                                            </span>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <DataTypeDropdown
                isOpen={!!openDataTypeDropdown}
                onClose={closeDropdown}
                onSelect={(type) =>
                    handleDataTypeChange(openDataTypeDropdown!, type)
                }
                currentType={currentFeature?.data_type || "N"}
                position={dataTypeDropdownPosition}
            />

            <FilterDropdown
                isOpen={!!openFilterDropdown}
                onClose={closeFilterDropdown}
                onSelect={(option) =>
                    handleSortChange(
                        openFilterDropdown as
                            | "feature"
                            | "number"
                            | "percentage",
                        option
                    )
                }
                currentSort={
                    sortConfig[openFilterDropdown as keyof typeof sortConfig] ||
                    "No Sort"
                }
                position={filterDropdownPosition}
                filterType={
                    openFilterDropdown as "feature" | "number" | "percentage"
                }
                buttonPosition={filterButtonPosition}
            />

            <DataTypeFilterDropdown
                isOpen={openDataTypeFilterDropdown}
                onClose={closeDataTypeFilterDropdown}
                onSelect={handleDataTypeFilterChange}
                currentFilter={dataTypeFilter}
                position={dataTypeFilterPosition}
                buttonPosition={dataTypeFilterButtonPosition}
            />
        </div>
    );
};

export default MissingFeaturesTableCard;
