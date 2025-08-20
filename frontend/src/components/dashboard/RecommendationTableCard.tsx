import React, { useEffect, useState } from "react";
import axios, { AxiosError } from "axios";

interface RecommendationData {
    recommendation_type: string;
    features: string[];
    reason: string;
}

interface RecommendationTableCardProps {
    onInfoClick?: (message: string) => void;
}

// Enhanced error types for better error handling
interface ApiErrorResponse {
    success: boolean;
    message: string;
    error_type?: string;
}

const RecommendationTableCard: React.FC<RecommendationTableCardProps> = ({
    onInfoClick,
}) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [errorType, setErrorType] = useState<string | null>(null);
    const [recommendations, setRecommendations] = useState<
        RecommendationData[]
    >([]);
    const [retryCount, setRetryCount] = useState(0);

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
                    "Unable to connect to the server. Please check your connection and try again.",
                type: "connection",
            };
        }

        // Server responded with error status
        const status = error.response.status;
        const data = error.response.data as ApiErrorResponse;

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

    const fetchRecommendations = async (isRetry: boolean = false) => {
        if (!isRetry) {
            setLoading(true);
            setError(null);
            setErrorType(null);
        }

        try {
            const res = await axios.get("/api/missing-data-recommendations", {
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
        } catch (err: any) {
            const errorInfo = getErrorMessage(err);
            setError(errorInfo.message);
            setErrorType(errorInfo.type);

            // Enhanced error logging
            console.error("Error fetching recommendations:", {
                error: err,
                message: errorInfo.message,
                type: errorInfo.type,
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
                    fetchRecommendations(true);
                }, Math.pow(2, retryCount) * 1000); // Exponential backoff: 1s, 2s
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchRecommendations();
    }, []);

    const formatFeatureList = (features: string[]): string => {
        if (features.length === 0) return "";
        if (features.length === 1) return features[0];
        if (features.length === 2) return `${features[0]} and ${features[1]}`;

        // For 3 or more features: "Feature 1, Feature 2, and Feature 3"
        const lastFeature = features[features.length - 1];
        const otherFeatures = features.slice(0, -1);
        return `${otherFeatures.join(", ")}, and ${lastFeature}`;
    };

    return (
        <div className="rounded-2xl border bg-white shadow-sm p-6 w-full">
            {/* Header Section */}
            <div className="text-lg font-semibold mb-4 flex items-center gap-2">
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
                    <table className="w-full text-sm">
                        <thead>
                            <tr className="border-b">
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-xs sm:text-sm lg:text-base">
                                        Features with missing data
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-xs sm:text-sm lg:text-base">
                                        Recommended missing data treatment
                                    </div>
                                </th>
                                <th className="text-center py-3 px-2 font-medium border">
                                    <div className="text-xs sm:text-sm lg:text-base">
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
                                            <div className="text-xs sm:text-sm break-words">
                                                {formatFeatureList(
                                                    recommendation.features
                                                )}
                                            </div>
                                        </td>
                                        <td className="py-3 px-2 border text-center align-top">
                                            <div className="text-xs sm:text-sm break-words">
                                                {
                                                    recommendation.recommendation_type
                                                }
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
