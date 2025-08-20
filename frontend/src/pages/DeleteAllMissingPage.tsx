import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "../components/common/Button.module.css";
import ChartDisplay from "../components/common/ChartDisplay";
import axios from "axios";

// Interfaces for analysis data
interface DistributionData {
    before: { [key: string]: number } | { bins: number[]; counts: number[] };
    after: { [key: string]: number } | { bins: number[]; counts: number[] };
}

interface AffectedFeature {
    feature_name: string;
    feature_type: "categorical" | "numerical";
    p_value: number;
    distribution_data: DistributionData;
}

interface AnalysisResult {
    rows_deleted: number;
    rows_remaining: number;
    total_original_rows: number;
    affected_features: AffectedFeature[];
}

const DeleteAllMissingPage: React.FC = () => {
    const navigate = useNavigate();

    // State management for analysis data
    const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(
        null
    );
    const [selectedFeature, setSelectedFeature] = useState<string | null>(null);
    const [loading, setLoading] = useState<boolean>(true); // Start with loading true
    const [error, setError] = useState<string | null>(null);
    const [chartLoading, setChartLoading] = useState<boolean>(false);
    const [chartError, setChartError] = useState<string | null>(null);

    const handleBackToDashboard = () => {
        navigate("/dashboard");
    };

    const performDeleteMissingDataAnalysis = async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await axios.get("/api/delete-missing-data-analysis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.data.success) {
                let errorMessage = "Failed to analyze data";

                try {
                    errorMessage = response.data.message || "Failed to fetch data"
                } catch (parseError) {
                    // If we can't parse the error response, use status-based messages
                    switch (response.status) {
                        case 400:
                            errorMessage =
                                "Invalid data or no dataset available. Please upload a valid dataset first.";
                            break;
                        case 413:
                            errorMessage =
                                "Dataset is too large to process. Please try with a smaller dataset.";
                            break;
                        case 500:
                            errorMessage =
                                "Server error occurred during analysis. Please try again.";
                            break;
                        case 503:
                            errorMessage =
                                "Service temporarily unavailable. Please try again later.";
                            break;
                        default:
                            errorMessage = `Analysis failed with status ${response.status}. Please try again.`;
                    }
                }

                throw new Error(errorMessage);
            }

            const data = response.data;

            // Validate response structure
            if (!data || typeof data !== "object") {
                throw new Error(
                    "Invalid response format received from server."
                );
            }

            // Validate required fields
            if (
                typeof data.rows_deleted !== "number" ||
                typeof data.rows_remaining !== "number" ||
                typeof data.total_original_rows !== "number" ||
                !Array.isArray(data.affected_features)
            ) {
                throw new Error(
                    "Invalid analysis results received from server."
                );
            }

            setAnalysisData(data);
        } catch (err) {
            let errorMessage = "An unexpected error occurred during analysis.";

            if (err instanceof TypeError && err.message.includes("fetch")) {
                errorMessage =
                    "Network error: Unable to connect to the server. Please check your connection and try again.";
            } else if (err instanceof Error) {
                errorMessage = err.message;
            }

            setError(errorMessage);
            console.error(
                "Error performing delete missing data analysis:",
                err
            );
        } finally {
            setLoading(false);
        }
    };

    // Feature selection handler
    const handleFeatureClick = (featureName: string) => {
        try {
            setChartLoading(true);
            setChartError(null);

            // Validate that the feature exists in the analysis data
            if (!analysisData || !analysisData.affected_features) {
                throw new Error("Analysis data is not available");
            }

            const feature = analysisData.affected_features.find(
                (f) => f.feature_name === featureName
            );

            if (!feature) {
                throw new Error(
                    `Feature "${featureName}" not found in analysis results`
                );
            }

            // Validate feature data structure
            if (
                !feature.distribution_data ||
                typeof feature.distribution_data !== "object" ||
                !feature.distribution_data.before ||
                !feature.distribution_data.after
            ) {
                throw new Error(
                    `Invalid distribution data for feature "${featureName}"`
                );
            }

            setSelectedFeature(featureName);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "Failed to load feature data";
            setChartError(errorMessage);
            console.error("Error selecting feature:", err);
        } finally {
            setChartLoading(false);
        }
    };

    // Calculate percentage for display
    const getDeletedPercentage = () => {
        if (!analysisData) return 0;
        return Math.round(
            (analysisData.rows_deleted / analysisData.total_original_rows) * 100
        );
    };

    useEffect(() => {
        performDeleteMissingDataAnalysis();
    }, []);

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top Bar */}
            <header className="w-full border-b flex items-center justify-between px-6 py-3 sticky top-0 bg-white z-10">
                <div className="text-sm font-medium">The Missing Data Tool</div>
                <div className="flex gap-6">
                    <button
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium cursor-pointer"
                        onClick={handleBackToDashboard}
                    >
                        <ArrowBackIcon fontSize="small" />
                        Back
                    </button>
                </div>
            </header>
            {/* Split Cards Layout */}
            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full">
                <div className="w-full max-w-6xl flex flex-1 gap-8 h-[70vh] min-h-[500px]">
                    {/* Left Card: Info Panel */}
                    <div className="flex flex-col justify-between rounded-2xl shadow-md p-8 flex-1 border border-black-200">
                        <div>
                            <h1 className="text-xl font-semibold mb-6">
                                What if I delete all cases with missing data?
                            </h1>

                            {loading && (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                    <span className="ml-3 text-gray-600">
                                        Analyzing data...
                                    </span>
                                </div>
                            )}

                            {error && (
                                <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                                    <div className="flex items-start">
                                        <div className="flex-shrink-0">
                                            <svg
                                                className="h-5 w-5 text-red-400"
                                                viewBox="0 0 20 20"
                                                fill="currentColor"
                                            >
                                                <path
                                                    fillRule="evenodd"
                                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                                    clipRule="evenodd"
                                                />
                                            </svg>
                                        </div>
                                        <div className="ml-3 flex-1">
                                            <h3 className="text-sm font-medium text-red-800 mb-1">
                                                Analysis Error
                                            </h3>
                                            <p className="text-red-700 text-sm">
                                                {error}
                                            </p>
                                            <button
                                                onClick={
                                                    performDeleteMissingDataAnalysis
                                                }
                                                className="mt-3 bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
                                                disabled={loading}
                                            >
                                                {loading
                                                    ? "Retrying..."
                                                    : "Try Again"}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {analysisData && !loading && (
                                <div className="text-black text-base mb-6">
                                    <p className="mb-2">
                                        Deleting all cases with missing data
                                        will delete {analysisData.rows_deleted}{" "}
                                        ({getDeletedPercentage()}%) cases.
                                        <br />
                                        The resulting dataset will have{" "}
                                        {analysisData.rows_remaining} cases.
                                        Models trained on the resulting dataset
                                        will only be applicable to the
                                        subpopulation.
                                    </p>

                                    {analysisData.rows_deleted === 0 ? (
                                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg
                                                        className="h-5 w-5 text-blue-400"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-blue-800 mb-1">
                                                        No Missing Data Found
                                                    </h3>
                                                    <p className="text-blue-700 text-sm">
                                                        Your dataset doesn't
                                                        contain any missing
                                                        values. No rows need to
                                                        be deleted.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    ) : analysisData.affected_features.length >
                                      0 ? (
                                        <>
                                            <p className="mb-4">
                                                The following features will have
                                                significant changes in data
                                                distribution (p-value &lt;
                                                0.05). Click on each feature to
                                                view the distribution changes.
                                            </p>
                                            <div className="flex flex-col gap-2 mb-4">
                                                {analysisData.affected_features.map(
                                                    (feature) => (
                                                        <button
                                                            key={
                                                                feature.feature_name
                                                            }
                                                            onClick={() =>
                                                                handleFeatureClick(
                                                                    feature.feature_name
                                                                )
                                                            }
                                                            className={`text-blue-600 hover:underline text-base text-left w-fit p-0 bg-transparent border-none cursor-pointer transition-colors ${
                                                                selectedFeature ===
                                                                feature.feature_name
                                                                    ? "font-semibold text-blue-800"
                                                                    : "hover:text-blue-800"
                                                            }`}
                                                        >
                                                            {
                                                                feature.feature_name
                                                            }{" "}
                                                            <span className="text-gray-600">
                                                                (
                                                                {
                                                                    feature.feature_type
                                                                }
                                                                )
                                                            </span>
                                                            <span className="text-sm text-gray-500 ml-2">
                                                                p ={" "}
                                                                {feature.p_value.toFixed(
                                                                    4
                                                                )}
                                                            </span>
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                                            <div className="flex items-start">
                                                <div className="flex-shrink-0">
                                                    <svg
                                                        className="h-5 w-5 text-green-400"
                                                        viewBox="0 0 20 20"
                                                        fill="currentColor"
                                                    >
                                                        <path
                                                            fillRule="evenodd"
                                                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                                            clipRule="evenodd"
                                                        />
                                                    </svg>
                                                </div>
                                                <div className="ml-3">
                                                    <h3 className="text-sm font-medium text-green-800 mb-1">
                                                        No Significant
                                                        Distribution Changes
                                                    </h3>
                                                    <p className="text-green-700 text-sm">
                                                        While{" "}
                                                        {
                                                            analysisData.rows_deleted
                                                        }{" "}
                                                        rows were deleted, no
                                                        features show
                                                        statistically
                                                        significant changes in
                                                        their distributions (all
                                                        p-values ≥ 0.05). The
                                                        remaining data appears
                                                        to be representative of
                                                        the original dataset.
                                                    </p>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                        <button
                            className={`${styles.button} ${styles.primary}`}
                            style={{ minWidth: 160 }}
                            onClick={handleBackToDashboard}
                        >
                            Return to Homepage
                        </button>
                    </div>
                    {/* Right Card: Data Visualizations */}
                    <div className="flex flex-col rounded-2xl shadow-md p-8 flex-1 border border-black-200">
                        {loading ? (
                            <div className="flex flex-col items-center justify-center h-full">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-3"></div>
                                <span className="text-gray-600 text-lg">
                                    Loading analysis...
                                </span>
                            </div>
                        ) : error ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <svg
                                    className="h-12 w-12 text-red-400 mb-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.5 0L4.268 16.5c-.77.833.192 2.5 1.732 2.5z"
                                    />
                                </svg>
                                <span className="text-red-500 text-lg mb-2">
                                    Unable to load visualizations
                                </span>
                                <span className="text-gray-500 text-sm">
                                    Please resolve the analysis error and try
                                    again
                                </span>
                            </div>
                        ) : selectedFeature && analysisData ? (
                            <div className="w-full h-full">
                                {(() => {
                                    const feature =
                                        analysisData.affected_features.find(
                                            (f) =>
                                                f.feature_name ===
                                                selectedFeature
                                        );
                                    if (feature) {
                                        return (
                                            <ChartDisplay
                                                featureName={
                                                    feature.feature_name
                                                }
                                                featureType={
                                                    feature.feature_type
                                                }
                                                pValue={feature.p_value}
                                                distributionData={
                                                    feature.distribution_data
                                                }
                                                loading={chartLoading}
                                                error={chartError}
                                            />
                                        );
                                    }
                                    return (
                                        <div className="flex flex-col items-center justify-center h-full">
                                            <svg
                                                className="h-12 w-12 text-red-400 mb-4"
                                                fill="none"
                                                viewBox="0 0 24 24"
                                                stroke="currentColor"
                                            >
                                                <path
                                                    strokeLinecap="round"
                                                    strokeLinejoin="round"
                                                    strokeWidth={2}
                                                    d="M9.172 16.172a4 4 0 015.656 0M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                                                />
                                            </svg>
                                            <span className="text-red-500 text-lg mb-2">
                                                Feature not found
                                            </span>
                                            <span className="text-gray-500 text-sm">
                                                The selected feature is no
                                                longer available
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : analysisData &&
                          analysisData.affected_features.length === 0 ? (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <svg
                                    className="h-12 w-12 text-green-400 mb-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <span className="text-green-600 text-lg mb-2">
                                    No Significant Changes
                                </span>
                                <span className="text-gray-500 text-sm">
                                    {analysisData.rows_deleted === 0
                                        ? "No missing data was found in your dataset"
                                        : "All features maintained their distributions after deletion"}
                                </span>
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-full text-center px-4">
                                <svg
                                    className="h-12 w-12 text-gray-400 mb-4"
                                    fill="none"
                                    viewBox="0 0 24 24"
                                    stroke="currentColor"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v4a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                                    />
                                </svg>
                                <span className="text-gray-400 text-lg mb-2">
                                    Select a Feature
                                </span>
                                <span className="text-gray-500 text-sm">
                                    Choose a feature from the left panel to view
                                    its distribution changes
                                </span>
                            </div>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeleteAllMissingPage;
