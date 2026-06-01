import React, { useEffect, useState } from "react";
import api from "../../config";
import { ModalLink } from "../common/modal";

interface RecommendationData {
    recommendation_type: string;
    features: string[];
    reason: string;
}

interface RecommendationTableCardProps {
    onInfoClick?: (message: string, recommendationType?: string) => void;
}


const recommendationExplanations: Record<string, string> = {
    "Missing-indicator method": 'The missing-indicator method adds binary dummy variables to indicate which values were originally missing and have been imputed. For example, if “Feature_1” contains missing data, it will add a feature “Feature_1_missing” in addition to imputing Feature_1.',
    "Remove Features": "No explanation available.",
    "Create an 'unknown' category or consider adjusting the categories": "For categorical variables, an \"unknown\" category can be created to replace missing data. For example:",
    "multiple imputation": "Multiple imputation imputes missing values multiple times, producing multiple complete datasets with imputed values. Each imputed dataset is analyzed separately, and the results are pooled together using statistical rules. This method assumes MAR. It is the uncertainty of missing data into consideration, but it’s computationally intensive. For machine learning, Multiple Imputation by Chained Equations (MICE) is a common implementation.",
    "Machine learning algorithms that can directly handle missing data or multiple imputation": "Several types of machine learning algorithms, such as generalized additive models, decision trees, and tree-based algorithms such as XGBoost, can automatically handle missing data. Depending on the libraries used and the parameters set, these algorithms employ a wide range of missing data treatment methods.",
    "All methods are valid: complete case analysis, machine learning algorithms that can directly handle missing data, multiple imputation, etc.": "No explanation available."
};


// Enhanced error types for better error handling
interface ApiErrorResponse {
    success: boolean;
    message: string;
    error_type?: string;
}

const RecommendationTableCard: React.FC<RecommendationTableCardProps> = ({
    onInfoClick,
}: RecommendationTableCardProps) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<
        RecommendationData[]
    >([]);
    const [retryCount, setRetryCount] = useState(0);

    const getErrorMessage = (
        error: unknown
    ): { message: string; type: string } => {
        const apiError = error as {
            response?: { status?: number; data?: ApiErrorResponse };
            code?: string;
        };

        // Network errors (no response received)
        if (!apiError.response) {
            if (apiError.code === "ECONNABORTED") {
                return {
                    message:
                        "Request timed out. Please check your connection and try again.",
                    type: "timeout",
                };
            }
            if (apiError.code === "ERR_NETWORK") {
                return {
                    message:
                        "Network error. Please check your internet connection.",
                    type: "network",
                };
            }
            return {
                message:
                    "Unable to connect to the server. Please check your connection and try again.",
                type: "connection",
            };
        }

        // Server responded with error status
    const status = apiError.response.status;
    const data = apiError.response.data;

        switch (status) {
            case 400:
                return {
                    message:
                        data?.message ||
                        "Invalid request. Please ensure data is properly loaded.",
                    type: "validation",
                };
            case 404:
                return {
                    message:
                        "Recommendations service not found. Please contact support.",
                    type: "not_found",
                };
            case 500:
                return {
                    message:
                        data?.message ||
                        "Server error occurred while calculating recommendations.",
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
                        data?.message ||
                        `Unexpected error (${status}). Please try again.`,
                    type: "unknown",
                };
        }
    };

    const retryCountRef = React.useRef(retryCount);

    // keep ref in sync
    React.useEffect(() => {
        retryCountRef.current = retryCount;
    }, [retryCount]);

    const fetchRecommendations = React.useCallback(async (isRetry: boolean = false) => {
        if (!isRetry) {
            setLoading(true);
            setError(null);
            setErrorType(null);
        }

        try {
            const res = await api.get("/api/missing-data-recommendations", {
                timeout: 30000, // 30 second timeout
                headers: {
                    "Cache-Control": "no-cache",
                    Pragma: "no-cache",
                },
            });

            if (res.data.success) {
                setRecommendations(res.data.recommendations || []);
                setError(null);
                setErrorType(null);
                setRetryCount(0);
            } else {
                const errorMsg =
                    res.data.message || "Failed to fetch recommendations";
                setError(errorMsg);
                setErrorType("api_error");
                console.warn("API returned success=false:", res.data);
            }
        } catch (err: unknown) {
            const errorInfo = getErrorMessage(err);
            setError(errorInfo.message);
            setErrorType(errorInfo.type);

            // Enhanced error logging
            console.error("Error fetching recommendations:", {
                error: err,
                message: errorInfo.message,
                type: errorInfo.type,
                status: (err as { response?: { status?: number } })?.response?.status,
                data: (err as { response?: { data?: unknown } })?.response?.data,
                retryCount: retryCount,
            });

            // Auto-retry for certain error types (max 2 retries)
            if (
                retryCountRef.current < 2 &&
                ["timeout", "network", "service_unavailable"].includes(
                    errorInfo.type
                )
            ) {
                setTimeout(() => {
                    setRetryCount((prev) => prev + 1);
                    fetchRecommendations(true);
                }, Math.pow(2, retryCountRef.current) * 1000); // Exponential backoff: 1s, 2s
            }
        } finally {
            setLoading(false);
        }
    }, [retryCount]);

    useEffect(() => {
        const handleMissingDataTableReady = () => {
            fetchRecommendations();
        };

        window.addEventListener('missingDataTableReady', handleMissingDataTableReady);
        return () => window.removeEventListener('missingDataTableReady', handleMissingDataTableReady);
    }, [fetchRecommendations]);

    useEffect(() => {
        const handleDataTypeChange = () => {
            fetchRecommendations();
        };

        window.addEventListener('dataTypeChanged', handleDataTypeChange);
        return () => window.removeEventListener('dataTypeChanged', handleDataTypeChange);
    }, [fetchRecommendations]);


    const formatFeatureList = (features: string[]): React.ReactElement => {
        if (features.length === 0) return <span className="text-gray-400">No features</span>;
        
        return (
            <div className="flex flex-wrap gap-1 justify-center">
                {features.map((feature, index) => (
                    <span
                        key={index}
                        className="inline-block px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full border border-blue-200 font-medium"
                        title={feature}
                    >
                        {feature}
                    </span>
                ))}
            </div>
        );
    };

    return (
        <div className="rounded-2xl bg-gray-100 p-6 w-full">
            {/* Header Section */}
            <div className="font-semibold mb-4 flex items-center gap-2">
                Missing Data Treatment Recommendations
            </div>

            {loading ? (
                <div className="text-center text-gray-400 py-8">
                    <div className="flex items-center justify-center">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                        <span className="ml-2 text-sm">
                            Loading recommendations...
                        </span>
                    </div>
                </div>
            ) : error ? (
                <div className="text-center py-8">
                    <div className="text-red-500 mb-4">
                        <div className="text-sm font-medium mb-2">
                            {errorType === "validation"
                                ? "Data Not Available"
                                : errorType === "network" ||
                                  errorType === "connection"
                                ? "Connection Error"
                                : errorType === "timeout"
                                ? "Request Timeout"
                                : errorType === "server_error"
                                ? "Server Error"
                                : "Error Loading Recommendations"}
                        </div>
                        <div className="text-xs text-red-400 mb-3 max-w-md mx-auto">
                            {error}
                        </div>
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
                            onClick={() => fetchRecommendations()}
                            disabled={loading}
                            className="px-4 py-2 text-sm bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? "Retrying..." : "Try Again"}
                        </button>
                    )}

                    {/* Help text for specific error types */}
                    {errorType === "validation" && (
                        <div className="text-xs text-gray-500 mt-2">
                            Please ensure your dataset is properly uploaded and
                            contains features with missing data.
                        </div>
                    )}

                    {retryCount > 0 && (
                        <div className="text-xs text-gray-500 mt-2">
                            Retry attempt {retryCount} of 2
                        </div>
                    )}
                </div>
            ) : recommendations.length === 0 ? (
                <div className="text-center text-gray-400 py-8">
                    <div className="text-sm font-medium mb-1">
                        No recommendations available
                    </div>
                    <div className="text-xs">
                        No features with missing data found
                    </div>
                </div>
            ) : (
                <div className="overflow-x-auto">
                    <table className="w-full text-sm bg-white">
                        <thead>
                            <tr className="border-b">
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-sm">
                                        Features with missing data
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-sm">
                                        Recommended missing data treatment
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-sm">
                                        Reasons
                                    </div>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {recommendations
                                .slice(0, 4)
                                .map((recommendation, index) => (
                                    <tr
                                        key={index}
                                        className="border-b hover:bg-gray-50 transition-colors duration-150"
                                    >
                                        <td className="py-3 px-2 border text-center align-top">
                                            <div className="min-w-0">
                                                {formatFeatureList(
                                                    recommendation.features
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 border text-center align-top">
                                            <div className="text-xs sm:text-sm break-words">
                                                <ModalLink
                                                    text={`${recommendation.recommendation_type}`}
                                                    onClick={() => {
                                                        onInfoClick?.(
                                                            (recommendationExplanations[recommendation.recommendation_type] || "No explanation available"),
                                                            recommendation.recommendation_type
                                                        );
                                                    }}
                                                />
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 border text-left align-top">
                                            <div className="text-xs sm:text-sm break-words">
                                                {recommendation.reason}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default RecommendationTableCard;
