import React, { useState, useEffect } from "react";
import axios from "axios";
import KeyboardArrowRightIcon from "@mui/icons-material/KeyboardArrowRight";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import FilterListIcon from "@mui/icons-material/FilterList";
import ArrowDropDownIcon from "@mui/icons-material/ArrowDropDown";
import {
    DataTypeDropdown,
    DataTypeFilterDropdown,
    CorrelationFilterDropdown,
    CorrelationDetailsDropdown,
} from "./filter";
import type { DataTypeFilter, CorrelationFilter } from "./filter";
import { ModalLink } from "../common/modal";

// Interface will be used in subsequent tasks
interface CompleteFeatureData {
    feature_name: string;
    data_type: "N" | "C";
    most_correlated_with: {
        feature_name: string;
        correlation_value: number;
        correlation_type: "r" | "V" | "η";
    } | null;
    correlated_features?: {
        feature_name: string;
        correlation_value: number;
        correlation_type: "r" | "V" | "η";
        p_value: number;
    }[];
    isLoadingCorrelation?: boolean;
}

interface CompleteFeaturesTableCardProps {
    onInfoClick: (message: string) => void;
}

const CompleteFeaturesTableCard: React.FC<CompleteFeaturesTableCardProps> = ({
    onInfoClick,
}) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<string | null>(null);
    const [features, setFeatures] = useState<CompleteFeatureData[]>([]);
    const [retryCount, setRetryCount] = useState(0);

    // Data type dropdown states
    const [openDataTypeDropdown, setOpenDataTypeDropdown] = useState<
        string | null
    >(null);
    const [dataTypeDropdownPosition, setDataTypeDropdownPosition] = useState<{
        x: number;
        y: number;
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
    const [
        correlationFilterButtonPosition,
        setCorrelationFilterButtonPosition,
    ] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);
    const [correlationFilter, setCorrelationFilter] =
        useState<CorrelationFilter>({
            correlations: true,
            noCorrelations: true,
            pearsonThreshold: 0.7,
            cramerVThreshold: 0.7,
            etaThreshold: 0.7,
        });

    // Correlation details dropdown states
    const [openCorrelationDetailsDropdown, setOpenCorrelationDetailsDropdown] =
        useState<string | null>(null);
    const [correlationDetailsPosition, setCorrelationDetailsPosition] =
        useState<{
            x: number;
            y: number;
        } | null>(null);
    const [
        correlationDetailsButtonPosition,
        setCorrelationDetailsButtonPosition,
    ] = useState<{
        x: number;
        y: number;
        width: number;
        height: number;
    } | null>(null);

    const toggleExpanded = () => {
        setIsExpanded(!isExpanded);
    };

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

    const closeDataTypeDropdown = React.useCallback(() => {
        setOpenDataTypeDropdown(null);
        setDataTypeDropdownPosition(null);
    }, []);

    const closeCorrelationDetailsDropdown = React.useCallback(() => {
        setOpenCorrelationDetailsDropdown(null);
        setCorrelationDetailsPosition(null);
        setCorrelationDetailsButtonPosition(null);
    }, []);

    const toggleDataTypeFilterDropdown = (event?: React.MouseEvent) => {
        try {
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
        } catch (err) {
            console.error("Error toggling data type filter dropdown:", err);
            closeDataTypeFilterDropdown();
        }
    };

    const toggleCorrelationFilterDropdown = (event?: React.MouseEvent) => {
        try {
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
        } catch (err) {
            console.error("Error toggling correlation filter dropdown:", err);
            closeCorrelationFilterDropdown();
        }
    };

    const handleDataTypeFilterChange = (newFilter: DataTypeFilter) => {
        setDataTypeFilter(newFilter);
    };

    const handleCorrelationFilterChange = (newFilter: CorrelationFilter) => {
        setCorrelationFilter(newFilter);
    };

    const toggleCorrelationDetailsDropdown = (
        featureName: string,
        event?: React.MouseEvent
    ) => {
        try {
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
        } catch (err) {
            console.error("Error toggling correlation details dropdown:", err);
            closeCorrelationDetailsDropdown();
        }
    };

    const handleDataTypeChange = async (
        featureName: string,
        newType: "N" | "C"
    ) => {
        try {
            const res = await axios.patch(
                "/api/features-table",
                {
                    feature_name: featureName,
                    data_type: newType,
                },
                {
                    timeout: 10000, // 10 second timeout
                }
            );

            if (res.data.success) {
                // Update the local state
                setFeatures((prevFeatures: CompleteFeatureData[]) =>
                    prevFeatures.map((feature: CompleteFeatureData) =>
                        feature.feature_name === featureName
                            ? { ...feature, data_type: newType }
                            : feature
                    )
                );
            } else {
                const errorMsg =
                    res.data.message || "Failed to update data type";
                console.error("Failed to update data type:", errorMsg);
                // Show user-friendly error message
                onInfoClick?.(
                    `Failed to update data type for ${featureName}: ${errorMsg}`
                );
            }
        } catch (err: any) {
            const errorInfo = getErrorMessage(err);
            console.error("Error updating data type:", {
                feature: featureName,
                newType,
                error: err.message,
                status: err.response?.status,
            });

            // Show user-friendly error message
            let userMessage = `Failed to update data type for ${featureName}`;
            if (errorInfo.type === "network" || errorInfo.type === "timeout") {
                userMessage += ". Please check your connection and try again.";
            } else if (errorInfo.type === "server_error") {
                userMessage +=
                    ". Server error occurred, please try again later.";
            } else {
                userMessage += `. ${errorInfo.message}`;
            }
            onInfoClick?.(userMessage);
        } finally {
            setOpenDataTypeDropdown(null);
            setDataTypeDropdownPosition(null);
        }
    };

    const toggleDataTypeDropdown = (
        featureName: string,
        event?: React.MouseEvent
    ) => {
        try {
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
        } catch (err) {
            console.error("Error toggling data type dropdown:", err);
            // Reset dropdown state on error
            setOpenDataTypeDropdown(null);
            setDataTypeDropdownPosition(null);
        }
    };

    const getDataTypeLabel = (type: "N" | "C") => {
        return type === "N" ? "Numerical" : "Categorical";
    };

    const getDataTypeDisplay = (type: "N" | "C") => {
        try {
            // Check if screen is small (you can adjust this breakpoint)
            const isSmallScreen = window.innerWidth < 768;
            return isSmallScreen ? type : getDataTypeLabel(type);
        } catch (err) {
            console.warn("Error getting data type display:", err);
            return type || "?";
        }
    };

    const getErrorMessage = (error: any): { message: string; type: string } => {
        // Network errors (no response received)
        if (!error.response) {
            if (error.code === "ECONNABORTED") {
                return {
                    message:
                        "Request timed out. Please check your connection and try again.",
                    type: "timeout",
                };
            }
            if (error.code === "ERR_NETWORK") {
                return {
                    message:
                        "Network error. Please check your internet connection.",
                    type: "network",
                };
            }
            return {
                message:
                    "Unable to connect to server. Please check your connection.",
                type: "connection",
            };
        }

        // HTTP status errors
        const status = error.response.status;
        switch (status) {
            case 400:
                return {
                    message: error.response.data?.message || "Invalid request.",
                    type: "validation",
                };
            case 404:
                return {
                    message: "Complete features data not found.",
                    type: "not_found",
                };
            case 500:
                return {
                    message: "Server error. Please try again later.",
                    type: "server_error",
                };
            case 503:
                return {
                    message:
                        "Service temporarily unavailable. Please try again in a moment.",
                    type: "service_unavailable",
                };
            default:
                return {
                    message:
                        error.response.data?.message ||
                        "An unexpected error occurred.",
                    type: "unknown",
                };
        }
    };

    const fetchFeaturesData = async (isRetry: boolean = false) => {
        if (!isRetry) {
            setLoading(true);
            setError(null);
            setErrorType(null);
        }

        try {
            const res = await axios.get("/api/complete-features-table", {
                timeout: 30000, // 30 second timeout
                headers: {
                    "Cache-Control": "no-cache",
                },
            });

            if (res.data.success) {
                // Initialize features with loading states
                const featuresWithLoading = res.data.features.map(
                    (feature: CompleteFeatureData) => ({
                        ...feature,
                        isLoadingCorrelation: true,
                    })
                );
                setFeatures(featuresWithLoading);
                setError(null);
                setErrorType(null);
                setRetryCount(0);

                // Start loading detailed analysis for each feature
                featuresWithLoading.forEach((feature: CompleteFeatureData) => {
                    loadFeatureAnalysis(feature.feature_name);
                });
            } else {
                const errorMsg =
                    res.data.message ||
                    "Failed to fetch complete features data";
                setError(errorMsg);
                setErrorType("validation");
            }
        } catch (err: any) {
            const errorInfo = getErrorMessage(err);
            setError(errorInfo.message);
            setErrorType(errorInfo.type);

            console.error("Error fetching complete features data:", {
                message: err.message,
                status: err.response?.status,
                data: err.response?.data,
                retryCount: retryCount,
            });

            // Auto-retry for certain error types (max 2 retries)
            if (
                retryCount < 2 &&
                ["timeout", "network", "service_unavailable"].includes(
                    errorInfo.type
                )
            ) {
                setTimeout(() => {
                    setRetryCount((prev) => prev + 1);
                    fetchFeaturesData(true);
                }, Math.pow(2, retryCount) * 1000); // Exponential backoff: 1s, 2s
            } else if (errorInfo.type === "server_error" && retryCount >= 2) {
                // If server is completely down after retries, show degraded mode message
                setError(
                    "Server is currently unavailable. Some features may not work properly."
                );
                setErrorType("degraded");
            }
        } finally {
            if (!isRetry) {
                setLoading(false);
            }
        }
    };

    // Load basic feature data
    useEffect(() => {
        fetchFeaturesData();
    }, []);

    // Reload feature analysis when correlation filter thresholds change
    useEffect(() => {
        if (features.length > 0) {
            features.forEach((feature: CompleteFeatureData) => {
                loadFeatureAnalysis(feature.feature_name);
            });
        }
    }, [
        correlationFilter.pearsonThreshold,
        correlationFilter.cramerVThreshold,
        correlationFilter.etaThreshold,
    ]);

    // Load detailed analysis for a specific feature
    const loadFeatureAnalysis = async (
        featureName: string,
        retryAttempt: number = 0
    ) => {
        try {
            const params = new URLSearchParams({
                pearson_threshold:
                    correlationFilter.pearsonThreshold.toString(),
                cramer_v_threshold:
                    correlationFilter.cramerVThreshold.toString(),
                eta_squared_threshold:
                    correlationFilter.etaThreshold.toString(),
            });

            const res = await axios.get(
                `/api/feature-details/${encodeURIComponent(
                    featureName
                )}?${params}`,
                {
                    timeout: 15000, // 15 second timeout for individual feature analysis
                }
            );
            if (res.data.success) {
                setFeatures((prevFeatures: CompleteFeatureData[]) =>
                    prevFeatures.map((feature: CompleteFeatureData) =>
                        feature.feature_name === featureName
                            ? {
                                  ...feature,
                                  most_correlated_with:
                                      res.data.correlated_features.length > 0
                                          ? res.data.correlated_features[0]
                                          : null,
                                  correlated_features:
                                      res.data.correlated_features,
                                  isLoadingCorrelation: false,
                              }
                            : feature
                    )
                );
            } else {
                console.warn(
                    `Failed to load analysis for ${featureName}:`,
                    res.data.message
                );
                // Mark as loaded even if failed to prevent infinite loading
                setFeatures((prevFeatures: CompleteFeatureData[]) =>
                    prevFeatures.map((feature: CompleteFeatureData) =>
                        feature.feature_name === featureName
                            ? {
                                  ...feature,
                                  isLoadingCorrelation: false,
                              }
                            : feature
                    )
                );
            }
        } catch (err: any) {
            const errorInfo = getErrorMessage(err);
            console.error(`Error loading analysis for ${featureName}:`, {
                message: err.message,
                status: err.response?.status,
                attempt: retryAttempt + 1,
            });

            // Retry for network/timeout errors (max 1 retry per feature)
            if (
                retryAttempt < 1 &&
                ["timeout", "network", "service_unavailable"].includes(
                    errorInfo.type
                )
            ) {
                setTimeout(() => {
                    loadFeatureAnalysis(featureName, retryAttempt + 1);
                }, 2000); // 2 second delay before retry
                return;
            }

            // Mark as loaded even if failed to prevent infinite loading
            setFeatures((prevFeatures: CompleteFeatureData[]) =>
                prevFeatures.map((feature: CompleteFeatureData) =>
                    feature.feature_name === featureName
                        ? {
                              ...feature,
                              isLoadingCorrelation: false,
                          }
                        : feature
                )
            );
        }
    };

    // Filter features based on data type filter and correlation filter
    const filteredFeatures = features.filter((feature: CompleteFeatureData) => {
        try {
            // Data type filtering - handle missing data_type gracefully
            if (!feature.data_type) {
                console.warn(
                    `Feature ${feature.feature_name} has no data_type, skipping`
                );
                return false;
            }

            const passesDataTypeFilter =
                (feature.data_type === "N" && dataTypeFilter.numerical) ||
                (feature.data_type === "C" && dataTypeFilter.categorical);

            if (!passesDataTypeFilter) return false;

            // Correlation filtering - handle cases where correlation data is missing or loading
            const hasCorrelation =
                feature.correlated_features &&
                Array.isArray(feature.correlated_features) &&
                feature.correlated_features.length > 0;

            // If still loading correlation data, show the feature
            if (feature.isLoadingCorrelation) {
                return true;
            }

            const correlationPassesThreshold =
                hasCorrelation &&
                (() => {
                    try {
                        // Check if any correlation meets the thresholds
                        return feature.correlated_features!.some(
                            (correlation) => {
                                if (
                                    !correlation ||
                                    typeof correlation.correlation_value !==
                                        "number"
                                ) {
                                    return false;
                                }

                                switch (correlation.correlation_type) {
                                    case "r":
                                        return (
                                            Math.abs(
                                                correlation.correlation_value
                                            ) >=
                                            correlationFilter.pearsonThreshold
                                        );
                                    case "V":
                                        return (
                                            correlation.correlation_value >=
                                            correlationFilter.cramerVThreshold
                                        );
                                    case "η":
                                        return (
                                            correlation.correlation_value >=
                                            correlationFilter.etaThreshold
                                        );
                                    default:
                                        return false;
                                }
                            }
                        );
                    } catch (err) {
                        console.warn(
                            `Error processing correlations for ${feature.feature_name}:`,
                            err
                        );
                        return false;
                    }
                })();

            const shouldShowCorrelations =
                correlationFilter.correlations && correlationPassesThreshold;
            const shouldShowNoCorrelations =
                correlationFilter.noCorrelations &&
                (!hasCorrelation || feature.correlated_features === undefined);

            return shouldShowCorrelations || shouldShowNoCorrelations;
        } catch (err) {
            console.error(
                `Error filtering feature ${feature.feature_name}:`,
                err
            );
            // In case of error, include the feature to avoid hiding data
            return true;
        }
    });

    const currentFeature = features.find(
        (f: CompleteFeatureData) => f && f.feature_name === openDataTypeDropdown
    );

    return (
        <div className="rounded-2xl border bg-white shadow-sm p-6 w-full">
            {/* Header Section */}
            <div
                className="text-lg font-semibold mb-4 flex items-center gap-2 cursor-pointer hover:bg-gray-50 -m-2 p-2 rounded-lg transition-colors duration-200"
                onClick={toggleExpanded}
            >
                {isExpanded ? (
                    <KeyboardArrowDownIcon className="text-gray-600" />
                ) : (
                    <KeyboardArrowRightIcon className="text-gray-600" />
                )}
                Features with complete data
            </div>

            {/* Collapsible Content */}
            <div
                className={`overflow-hidden transition-all duration-300 ease-in-out ${
                    isExpanded
                        ? "max-h-screen opacity-100"
                        : "max-h-0 opacity-0"
                }`}
            >
                {loading ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="flex items-center justify-center gap-2">
                            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-500"></div>
                            <span>Loading complete features...</span>
                        </div>
                        {retryCount > 0 && (
                            <div className="text-xs text-gray-500 mt-2">
                                Retry attempt {retryCount} of 2
                            </div>
                        )}
                    </div>
                ) : error ? (
                    <div className="text-center py-8">
                        <div className="text-red-500 mb-4">
                            <div className="font-medium mb-2">
                                {errorType === "validation"
                                    ? "Data Not Available"
                                    : errorType === "network" ||
                                      errorType === "connection"
                                    ? "Connection Error"
                                    : errorType === "timeout"
                                    ? "Request Timeout"
                                    : errorType === "not_found"
                                    ? "Data Not Found"
                                    : errorType === "server_error"
                                    ? "Server Error"
                                    : errorType === "service_unavailable"
                                    ? "Service Unavailable"
                                    : errorType === "degraded"
                                    ? "Limited Functionality"
                                    : "Error"}
                            </div>
                            <div className="text-sm">{error}</div>
                        </div>

                        {/* Retry button for recoverable errors */}
                        {[
                            "network",
                            "connection",
                            "timeout",
                            "server_error",
                            "service_unavailable",
                        ].includes(errorType || "") && (
                            <button
                                onClick={() => fetchFeaturesData()}
                                disabled={loading}
                                className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                                {loading ? "Retrying..." : "Try Again"}
                            </button>
                        )}

                        {/* Additional help for validation errors */}
                        {errorType === "validation" && (
                            <div className="text-xs text-gray-500 mt-2">
                                Please ensure your dataset is properly loaded
                                and contains valid data.
                            </div>
                        )}

                        {retryCount > 0 && (
                            <div className="text-xs text-gray-500 mt-2">
                                Retry attempt {retryCount} of 2
                            </div>
                        )}
                    </div>
                ) : features.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="mb-2">No complete features found</div>
                        <div className="text-sm">
                            All features in your dataset have missing values.
                        </div>
                    </div>
                ) : filteredFeatures.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                        <div className="mb-2">
                            No features match the current filters
                        </div>
                        <div className="text-sm">
                            Try adjusting your data type or correlation filters
                            to see more results.
                        </div>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b">
                                    <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                        <div className="flex items-center gap-1 justify-center">
                                            <ModalLink
                                                text={"Data Type"}
                                                onClick={() => {
                                                    onInfoClick?.(
                                                        'Data types are auto-detected. If the auto-detection is wrong, click on the letter to change data type.\n Numerical data are numbers representing measurable quantities, such as a person\'s age and income. Categorical data are labels describing different characteristics. Categorical data has two subcategories - nominal data and ordinal data. Nominal data have no inherent order among the categories, such as a person\'s gender and hometown. Ordinal data are labels with inherent orders, such as student grades where "A" is considered better than "B."'
                                                    );
                                                }}
                                            />
                                            <button
                                                onClick={(
                                                    e: React.MouseEvent
                                                ) => {
                                                    e.stopPropagation();
                                                    toggleDataTypeFilterDropdown(
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
                                            Feature Name
                                        </div>
                                    </th>
                                    <th className="text-center py-3 px-2 font-medium text-gray-700 border">
                                        <div className="flex items-center gap-1 justify-center">
                                            <ModalLink
                                                text={"Most Correlated With"}
                                                onClick={() => {
                                                    onInfoClick?.(
                                                        'Some features are strongly correlated with other features. For numerical variables, their correlations are calculated by the correlation coefficient, denoted by r. For categorical variable, their correlations are calculated by Cramer\'s V, denoted by V.\n The "most correlated with" column shows features that have the strongest correlation with the feature listed in the "feature name" column. If more than one features are strongly associated, they will be shown by clicking on the expand (▸) button.'
                                                    );
                                                }}
                                            />
                                            <button
                                                onClick={(
                                                    e: React.MouseEvent
                                                ) => {
                                                    e.stopPropagation();
                                                    toggleCorrelationFilterDropdown(
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
                                </tr>
                            </thead>
                            <tbody>
                                {filteredFeatures.map(
                                    (
                                        feature: CompleteFeatureData,
                                        index: number
                                    ) => (
                                        <tr key={index} className="border-b">
                                            <td className="text-center py-3 px-2 border">
                                                <button
                                                    onClick={(
                                                        e: React.MouseEvent
                                                    ) =>
                                                        toggleDataTypeDropdown(
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
                                                {/* Feature name column will be implemented in subsequent tasks */}
                                                <span className="text-blue-600">
                                                    {feature.feature_name}
                                                </span>
                                            </td>
                                            <td className="text-center py-3 px-2 border">
                                                {feature.isLoadingCorrelation ? (
                                                    <div className="flex items-center justify-center">
                                                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                                                        <span className="ml-2 text-xs text-gray-500">
                                                            Analyzing
                                                            correlations...
                                                        </span>
                                                    </div>
                                                ) : feature.most_correlated_with ? (
                                                    <div className="flex items-center gap-1 justify-center">
                                                        <div className="flex items-center gap-1">
                                                            <span className="text-gray-600">
                                                                {feature
                                                                    .most_correlated_with
                                                                    .feature_name ||
                                                                    "Unknown"}
                                                            </span>
                                                            <span className="text-xs text-gray-500">
                                                                (
                                                                {feature
                                                                    .most_correlated_with
                                                                    .correlation_type ||
                                                                    "?"}{" "}
                                                                ={" "}
                                                                {typeof feature
                                                                    .most_correlated_with
                                                                    .correlation_value ===
                                                                "number"
                                                                    ? feature.most_correlated_with.correlation_value.toFixed(
                                                                          3
                                                                      )
                                                                    : "N/A"}
                                                                )
                                                            </span>
                                                        </div>
                                                        {feature.correlated_features &&
                                                            feature
                                                                .correlated_features
                                                                .length > 1 && (
                                                                <button
                                                                    onClick={(
                                                                        e: React.MouseEvent
                                                                    ) => {
                                                                        e.stopPropagation();
                                                                        toggleCorrelationDetailsDropdown(
                                                                            feature.feature_name,
                                                                            e
                                                                        );
                                                                    }}
                                                                    className="ml-1 text-gray-400 hover:text-gray-600 transition-colors duration-200 cursor-pointer"
                                                                >
                                                                    <ArrowDropDownIcon fontSize="small" />
                                                                </button>
                                                            )}
                                                    </div>
                                                ) : feature.most_correlated_with ===
                                                      undefined &&
                                                  !feature.isLoadingCorrelation ? (
                                                    <span className="text-gray-400 text-xs">
                                                        Analysis unavailable
                                                    </span>
                                                ) : (
                                                    <span className="text-gray-400">
                                                        --
                                                    </span>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

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

            <DataTypeDropdown
                isOpen={!!openDataTypeDropdown}
                onClose={closeDataTypeDropdown}
                onSelect={(type: "N" | "C") =>
                    handleDataTypeChange(openDataTypeDropdown!, type)
                }
                currentType={currentFeature?.data_type || "N"}
                position={dataTypeDropdownPosition}
            />

            <CorrelationDetailsDropdown
                isOpen={!!openCorrelationDetailsDropdown}
                onClose={closeCorrelationDetailsDropdown}
                correlations={
                    features.find(
                        (f) => f.feature_name === openCorrelationDetailsDropdown
                    )?.correlated_features || []
                }
                position={correlationDetailsPosition}
                buttonPosition={correlationDetailsButtonPosition}
            />
        </div>
    );
};

export default CompleteFeaturesTableCard;
