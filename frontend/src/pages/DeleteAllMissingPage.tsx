import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "../components/common/Button.module.css";
import ChartDisplay from "../components/common/ChartDisplay";

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
            const response = await fetch("/api/delete-missing-data-analysis", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(
                    errorData.detail || `HTTP error! status: ${response.status}`
                );
            }

            const data: AnalysisResult = await response.json();
            setAnalysisData(data);
        } catch (err) {
            const errorMessage =
                err instanceof Error
                    ? err.message
                    : "An unexpected error occurred";
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
        setChartLoading(true);
        setChartError(null);
        setSelectedFeature(featureName);
        setChartLoading(false);
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
                                    <p className="text-red-700 text-sm">
                                        {error}
                                    </p>
                                    <button
                                        onClick={
                                            performDeleteMissingDataAnalysis
                                        }
                                        className="mt-2 text-red-600 hover:text-red-800 text-sm underline"
                                    >
                                        Try again
                                    </button>
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

                                    {analysisData.affected_features.length >
                                    0 ? (
                                        <>
                                            <p className="mb-4">
                                                The following features will have
                                                significant changes in data
                                                distribution. Click on each
                                                feature to learn more.
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
                                                            className={`text-blue-600 hover:underline text-base text-left w-fit p-0 bg-transparent border-none cursor-pointer ${
                                                                selectedFeature ===
                                                                feature.feature_name
                                                                    ? "font-semibold"
                                                                    : ""
                                                            }`}
                                                        >
                                                            {
                                                                feature.feature_name
                                                            }{" "}
                                                            (
                                                            {
                                                                feature.feature_type
                                                            }
                                                            ) - p-value:{" "}
                                                            {feature.p_value.toFixed(
                                                                4
                                                            )}
                                                        </button>
                                                    )
                                                )}
                                            </div>
                                        </>
                                    ) : (
                                        <p className="mb-4 text-green-700">
                                            No features have significant
                                            distribution changes after deleting
                                            missing data.
                                        </p>
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
                        {selectedFeature && analysisData ? (
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
                                        <div className="flex items-center justify-center h-full">
                                            <span className="text-red-500 text-lg">
                                                Feature not found
                                            </span>
                                        </div>
                                    );
                                })()}
                            </div>
                        ) : (
                            <div className="flex items-center justify-center h-full">
                                <span className="text-gray-400 text-lg">
                                    {loading
                                        ? "Loading analysis..."
                                        : error
                                        ? "Error loading data"
                                        : analysisData
                                        ? "Select a feature to view its distribution changes"
                                        : "Data visualizations will appear here"}
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
