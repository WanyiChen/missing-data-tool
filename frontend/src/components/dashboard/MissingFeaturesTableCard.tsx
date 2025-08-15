import React, { useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import FilterListIcon from "@mui/icons-material/FilterList";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import { DataTypeDropdown, FilterDropdown, DataTypeFilterDropdown, CorrelationFilterDropdown, CorrelationDetailsDropdown } from "./filter";
import type { SortOption, DataTypeFilter, CorrelationFilter } from "./filter";

interface FeatureData {
    feature_name: string;
    data_type: "N" | "C"; // Numerical or Categorical
    number_missing: number;
    percentage_missing: number;
    most_correlated_with: {
        feature_name: string;
        correlation_value: number;
        correlation_type: "r" | "V" | "η²"; // Pearson, Cramer's V, or Eta-squared
    } | null;
    correlated_features?: {
        feature_name: string;
        correlation_value: number;
        correlation_type: "r" | "V" | "η²";
        p_value: number;
    }[]; // Store all correlations that meet thresholds
    informative_missingness: {
        is_informative: boolean;
        p_value: number;
    };
    // Loading states for async data
    isLoadingCorrelation?: boolean;
    isLoadingInformative?: boolean;
}

interface MissingFeaturesTableCardProps {
    onInfoClick: (message: string) => void;
}

const MissingFeaturesTableCard: React.FC<MissingFeaturesTableCardProps> = ({
    onInfoClick,
}: MissingFeaturesTableCardProps) => {
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [features, setFeatures] = useState<FeatureData[]>([]);
    const [skipped, setSkipped] = useState(false);
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

    // Correlation filter states
    const [openCorrelationFilterDropdown, setOpenCorrelationFilterDropdown] =
        useState<boolean>(false);
    const [correlationFilterPosition, setCorrelationFilterPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [correlationFilterButtonPosition, setCorrelationFilterButtonPosition] =
        useState<{
            x: number;
            y: number;
            width: number;
            height: number;
        } | null>(null);
    const [correlationFilter, setCorrelationFilter] = useState<CorrelationFilter>({
        correlations: true,
        noCorrelations: true,
        pearsonThreshold: 0.7,
        cramerVThreshold: 0.7,
        etaSquaredThreshold: 0.7,
    });

    // Correlation details dropdown states
    const [openCorrelationDetailsDropdown, setOpenCorrelationDetailsDropdown] = useState<string | null>(null);
    const [correlationDetailsPosition, setCorrelationDetailsPosition] = useState<{
        x: number;
        y: number;
    } | null>(null);
    const [correlationDetailsButtonPosition, setCorrelationDetailsButtonPosition] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    const [sortConfig, setSortConfig] = useState<{
        feature: SortOption;
        number: SortOption;
        percentage: SortOption;
    }>({
        feature: "No Sort",
        number: "No Sort",
        percentage: "No Sort",
    });

    // Load basic feature data
    useEffect(() => {
        const fetchFeaturesData = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/missing-features-table");
                if (res.data.success) {
                    // Set skipped status
                    setSkipped(res.data.skipped || false);
                    
                    // Initialize features with loading states
                    const featuresWithLoading = res.data.features.map((feature: FeatureData) => ({
                        ...feature,
                        isLoadingCorrelation: true,
                        isLoadingInformative: true,
                    }));
                    setFeatures(featuresWithLoading);
                    
                    // Start loading detailed analysis for each feature (only if not skipped)
                    if (!res.data.skipped) {
                        featuresWithLoading.forEach((feature: FeatureData) => {
                            loadFeatureAnalysis(feature.feature_name);
                        });
                    }
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

    // Reload feature analysis when correlation filter thresholds change
    useEffect(() => {
        if (features.length > 0) {
            features.forEach((feature: FeatureData) => {
                loadFeatureAnalysis(feature.feature_name);
            });
        }
    }, [correlationFilter.pearsonThreshold, correlationFilter.cramerVThreshold, correlationFilter.etaSquaredThreshold]);

    // Load detailed analysis for a specific feature
    const loadFeatureAnalysis = async (featureName: string) => {
        try {
            const params = new URLSearchParams({
                pearson_threshold: correlationFilter.pearsonThreshold.toString(),
                cramer_v_threshold: correlationFilter.cramerVThreshold.toString(),
                eta_squared_threshold: correlationFilter.etaSquaredThreshold.toString(),
            });
            
            const res = await axios.get(`/api/feature-details/${encodeURIComponent(featureName)}?${params}`);
            if (res.data.success) {
                setFeatures((prevFeatures: FeatureData[]) =>
                    prevFeatures.map((feature: FeatureData) =>
                        feature.feature_name === featureName
                            ? {
                                  ...feature,
                                  most_correlated_with: res.data.correlated_features.length > 0 
                                      ? res.data.correlated_features[0] 
                                      : null, // Keep the first one for now, we'll update the UI later
                                  correlated_features: res.data.correlated_features, // Store all correlations
                                  informative_missingness: res.data.informative_missingness,
                                  isLoadingCorrelation: false,
                                  isLoadingInformative: false,
                              }
                            : feature
                    )
                );
            } else {
                // Mark as loaded even if failed to prevent infinite loading
                setFeatures((prevFeatures: FeatureData[]) =>
                    prevFeatures.map((feature: FeatureData) =>
                        feature.feature_name === featureName
                            ? {
                                  ...feature,
                                  isLoadingCorrelation: false,
                                  isLoadingInformative: false,
                              }
                            : feature
                    )
                );
            }
        } catch (err: any) {
            console.error(`Error loading analysis for ${featureName}:`, err);
            // Mark as loaded even if failed to prevent infinite loading
            setFeatures((prevFeatures: FeatureData[]) =>
                prevFeatures.map((feature: FeatureData) =>
                    feature.feature_name === featureName
                        ? {
                              ...feature,
                              isLoadingCorrelation: false,
                              isLoadingInformative: false,
                          }
                        : feature
                )
            );
        }
    };

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
                setFeatures((prevFeatures: FeatureData[]) =>
                    prevFeatures.map((feature: FeatureData) =>
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

    const closeCorrelationFilterDropdown = React.useCallback(() => {
        setOpenCorrelationFilterDropdown(false);
        setCorrelationFilterPosition(null);
        setCorrelationFilterButtonPosition(null);
    }, []);

    const closeCorrelationDetailsDropdown = React.useCallback(() => {
        setOpenCorrelationDetailsDropdown(null);
        setCorrelationDetailsPosition(null);
        setCorrelationDetailsButtonPosition(null);
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

    const getCorrelationTypeLabel = (type: "r" | "V" | "η²") => {
        switch (type) {
            case "r":
                return "Pearson";
            case "V":
                return "Cramer's V";
            case "η²":
                return "Eta-squared";
            default:
                return type;
        }
    };

    const getDataTypeDisplay = (type: "N" | "C") => {
        // Check if screen is small (you can adjust this breakpoint)
        const isSmallScreen = window.innerWidth < 768;
        return isSmallScreen ? type : getDataTypeLabel(type);
    };

    const currentFeature = features.find(
        (f: FeatureData) => f.feature_name === openDataTypeDropdown
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

    const toggleCorrelationFilterDropdown = (event?: React.MouseEvent) => {
        if (openCorrelationFilterDropdown) {
            closeCorrelationFilterDropdown();
        } else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                setCorrelationFilterPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 5,
                });
                setCorrelationFilterButtonPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                });
            }
            setOpenCorrelationFilterDropdown(true);
        }
    };

    const toggleCorrelationDetailsDropdown = (featureName: string, event?: React.MouseEvent) => {
        if (openCorrelationDetailsDropdown === featureName) {
            closeCorrelationDetailsDropdown();
        } else {
            if (event) {
                const rect = event.currentTarget.getBoundingClientRect();
                setCorrelationDetailsPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.bottom + 5,
                });
                setCorrelationDetailsButtonPosition({
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    width: rect.width,
                    height: rect.height,
                });
            }
            setOpenCorrelationDetailsDropdown(featureName);
        }
    };

    const handleDataTypeFilterChange = (newFilter: DataTypeFilter) => {
        setDataTypeFilter(newFilter);
    };

    const handleCorrelationFilterChange = (newFilter: CorrelationFilter) => {
        setCorrelationFilter(newFilter);
    };

    // Filter features based on data type filter and correlation filter
    const filteredFeatures = features.filter((feature: FeatureData) => {
        // Data type filtering
        const passesDataTypeFilter = 
            (feature.data_type === "N" && dataTypeFilter.numerical) ||
            (feature.data_type === "C" && dataTypeFilter.categorical);
        
        if (!passesDataTypeFilter) return false;

        // Correlation filtering
        const hasCorrelation = feature.correlated_features && feature.correlated_features.length > 0;
        const correlationPassesThreshold = hasCorrelation && (() => {
            // Check if any correlation meets the thresholds
            return feature.correlated_features!.some(correlation => {
                switch (correlation.correlation_type) {
                    case "r":
                        return Math.abs(correlation.correlation_value) >= correlationFilter.pearsonThreshold;
                    case "V":
                        return correlation.correlation_value >= correlationFilter.cramerVThreshold;
                    case "η²":
                        return correlation.correlation_value >= correlationFilter.etaSquaredThreshold;
                    default:
                        return false;
                }
            });
        })();

        const shouldShowCorrelations = correlationFilter.correlations && correlationPassesThreshold;
        const shouldShowNoCorrelations = correlationFilter.noCorrelations && !hasCorrelation;

        return shouldShowCorrelations || shouldShowNoCorrelations;
    });

    return (
        <div className="rounded-2xl border bg-white shadow-sm p-6 w-full">
            {/* Header Section */}
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
                Features with Missing Data
                <InfoOutlinedIcon fontSize="small" className="text-gray-400" />
            </div>

            {loading ? (
                <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                    <span className="ml-3 text-gray-600">Loading features...</span>
                </div>
            ) : error ? (
                <div className="text-center py-8 text-red-600">{error}</div>
            ) : (
                <div className="overflow-x-auto">
                    {skipped && (
                        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                            <p className="text-blue-800 text-sm">
                                To gain insight into{" "}
                                <span
                                    className="cursor-pointer hover:underline font-medium"
                                    onClick={() => {
                                        onInfoClick?.(
                                            "Sometimes, the fact that some cases are missing some particular features can be informative. For instance, in a hypothetical financial dataset, if people with lower credit scores are less likely to report their credit scores, then whether a person's credit score is missing is informative. Informative missingness often happens when data is Missing Not at Random (MNAR)."
                                        );
                                    }}
                                >
                                    informative missingness
                                </span>{" "}
                                <span
                                    className="cursor-pointer"
                                    onClick={() => {
                                        onInfoClick?.(
                                            "Sometimes, the fact that some cases are missing some particular features can be informative. For instance, in a hypothetical financial dataset, if people with lower credit scores are less likely to report their credit scores, then whether a person's credit score is missing is informative. Informative missingness often happens when data is Missing Not at Random (MNAR)."
                                        );
                                    }}
                                >
                                    ⓘ
                                </span>,{" "}
                                <span
                                    className="cursor-pointer hover:underline font-medium"
                                    onClick={() => {
                                        navigate("/?step=3");
                                    }}
                                >
                                    select your target feature
                                </span>
                                .
                            </p>
                        </div>
                    )}
                    <table className="w-full border-collapse border">
                        <thead>
                            <tr className="bg-gray-50">
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        Data Type
                                        <InfoOutlinedIcon
                                            fontSize="small"
                                            className="text-gray-400"
                                        />
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                    <div className="flex items-center gap-1 justify-center">
                                        Feature Name
                                        <button
                                            onClick={(e: React.MouseEvent) => {
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
                                            onClick={(e: React.MouseEvent) => {
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
                                            onClick={(e: React.MouseEvent) => {
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
                                {!skipped && (
                                    <>
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
                                                <button
                                                    onClick={(e: React.MouseEvent) => {
                                                        e.stopPropagation();
                                                        toggleCorrelationFilterDropdown(e);
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
                                    </>
                                )}
                            </tr>
                        </thead>
                        <tbody>
                            {filteredFeatures.map((feature: FeatureData, index: number) => (
                                <tr key={index} className="border-b">
                                    <td className="text-center py-3 px-2 border">
                                        <button
                                            onClick={(e: React.MouseEvent) =>
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
                                            onClick={(e: React.MouseEvent) => {
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
                                    {!skipped && (
                                        <>
                                            <td className="text-center py-3 px-2 border">
                                                {feature.isLoadingCorrelation ? (
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                        <span className="ml-2 text-xs text-gray-500">Loading...</span>
                                                    </div>
                                                ) : feature.most_correlated_with ? (
                                                    <div className="flex items-center gap-1 justify-center">
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
                                                        {feature.correlated_features && feature.correlated_features.length > 1 && (
                                                            <button
                                                                onClick={(e: React.MouseEvent) => {
                                                                    e.stopPropagation();
                                                                    toggleCorrelationDetailsDropdown(feature.feature_name, e);
                                                                }}
                                                                className="ml-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 cursor-pointer"
                                                            >
                                                                <ArrowDropDownIcon fontSize="small" />
                                                            </button>
                                                        )}
                                                    </div>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        --
                                                    </span>
                                                )}
                                            </td>
                                            <td className="text-center py-3 px-2 border">
                                                {feature.isLoadingInformative ? (
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                        <span className="ml-2 text-xs text-gray-500">Loading...</span>
                                                    </div>
                                                ) : (
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
                                                )}
                                            </td>
                                        </>
                                    )}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            <DataTypeDropdown
                isOpen={!!openDataTypeDropdown}
                onClose={closeDropdown}
                onSelect={(type: "N" | "C") =>
                    handleDataTypeChange(openDataTypeDropdown!, type)
                }
                currentType={currentFeature?.data_type || "N"}
                position={dataTypeDropdownPosition}
            />

            <FilterDropdown
                isOpen={!!openFilterDropdown}
                onClose={closeFilterDropdown}
                onSelect={(option: SortOption) =>
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

            <CorrelationFilterDropdown
                isOpen={openCorrelationFilterDropdown}
                onClose={closeCorrelationFilterDropdown}
                onSelect={handleCorrelationFilterChange}
                currentFilter={correlationFilter}
                position={correlationFilterPosition}
                buttonPosition={correlationFilterButtonPosition}
            />

            <CorrelationDetailsDropdown
                isOpen={!!openCorrelationDetailsDropdown}
                onClose={closeCorrelationDetailsDropdown}
                correlations={features.find(f => f.feature_name === openCorrelationDetailsDropdown)?.correlated_features || []}
                position={correlationDetailsPosition}
                buttonPosition={correlationDetailsButtonPosition}
            />
        </div>
    );
};

export default MissingFeaturesTableCard;
