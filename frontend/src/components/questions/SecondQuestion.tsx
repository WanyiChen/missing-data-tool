import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "../common/Button.module.css";

interface SecondQuestionProps {
    missingDataOptions: {
        blanks: boolean;
        na: boolean;
        other: boolean;
        otherText: string;
    };
    setMissingDataOptions: (opts: {
        blanks: boolean;
        na: boolean;
        other: boolean;
        otherText: string;
    }) => void;
    featureNames: boolean;
    onBack: () => void;
    onNext: () => void;
    onError: (message: string) => void;
}

interface DatasetPreview {
    title_row: string[];
    data_rows: any[][];
}

const SecondQuestion: React.FC<SecondQuestionProps> = ({
    missingDataOptions,
    setMissingDataOptions,
    featureNames,
    onBack,
    onNext,
    onError,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(
        null
    );
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const [isInitialPreviewLoad, setIsInitialPreviewLoad] = useState(true);
    const [backendAnalysis, setBackendAnalysis] = useState<{
        missing_cells: number;
        missing_percentage: number;
        missing_patterns: {
            null_values: number;
            empty_strings: number;
            whitespace_only: number;
        };
        pattern_percentages: {
            null_percentage: number;
            empty_string_percentage: number;
            whitespace_percentage: number;
        };
        columns_with_missing: Record<string, number>;
    } | null>(null);
    const [loadingAnalysis, setLoadingAnalysis] = useState(false);

    useEffect(() => {
        axios.get("/api/detect-missing-data-options").then((res) => {
            if (res.data.success && res.data.suggestions) {
                setMissingDataOptions({
                    ...missingDataOptions,
                    blanks: res.data.suggestions.blanks,
                    na: res.data.suggestions.na,
                });
            }
        });
    }, []);

    // Fetch dataset preview from backend
    useEffect(() => {
        setIsInitialPreviewLoad(true);
        setIsLoadingPreview(true);
        fetchLivePreview(missingDataOptions, true);
        // eslint-disable-next-line
    }, []);

    useEffect(() => {
        if (!isInitialPreviewLoad) {
            fetchLivePreview(missingDataOptions, false);
        }
    }, [
        missingDataOptions.blanks,
        missingDataOptions.na,
        missingDataOptions.other,
        missingDataOptions.otherText,
    ]);

    useEffect(() => {
        if (datasetPreview) {
            // Fetch detailed analysis from backend
            setLoadingAnalysis(true);
            fetchMissingDataAnalysis()
                .then((analysis) => {
                    setBackendAnalysis(analysis);
                    setLoadingAnalysis(false);
                })
                .catch(() => {
                    setLoadingAnalysis(false);
                });
        }
    }, [datasetPreview]);

    const fetchLivePreview = async (
        opts: typeof missingDataOptions,
        showLoading: boolean
    ) => {
        if (showLoading) setIsLoadingPreview(true);
        try {
            const formData = new FormData();
            formData.append("missingDataOptions", JSON.stringify(opts));
            formData.append("featureNames", featureNames ? "true" : "false"); // Pass current featureNames value
            const response = await axios.post(
                "/api/dataset-preview-live",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            if (response.data.success) {
                setDatasetPreview(response.data);
            } else {
                onError(
                    response.data.message || "Failed to load dataset preview."
                );
            }
        } catch (error: any) {
            let message = "Failed to load dataset preview.";
            if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            onError(message);
        } finally {
            if (showLoading) setIsLoadingPreview(false);
            setIsInitialPreviewLoad(false);
        }
    };

    // Function to fetch detailed missing data analysis from backend
    const fetchMissingDataAnalysis = async (): Promise<{
        missing_cells: number;
        missing_percentage: number;
        missing_patterns: {
            null_values: number;
            empty_strings: number;
            whitespace_only: number;
        };
        pattern_percentages: {
            null_percentage: number;
            empty_string_percentage: number;
            whitespace_percentage: number;
        };
        columns_with_missing: Record<string, number>;
    } | null> => {
        try {
            const response = await fetch("/api/missing-data-analysis");
            if (response.ok) {
                const data = await response.json();
                return data;
            }
        } catch (error) {
            console.log(
                "Backend analysis not available, using frontend detection only"
            );
        }
        return null;
    };

    const handleCheckbox = (key: "blanks" | "na" | "other") => {
        const newOptions = {
            ...missingDataOptions,
            [key]: !missingDataOptions[key],
            ...(key === "other" && !missingDataOptions.other
                ? { otherText: "" }
                : {}),
        };
        setMissingDataOptions(newOptions);

        if (key === "blanks" || key === "na" || key === "other") {
            setIsLoadingPreview(true);
            fetchLivePreview(newOptions, false);
        }
    };

    const handleOtherText = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setMissingDataOptions({
            ...missingDataOptions,
            otherText: value,
        });

        // If comma is typed, update preview
        if (missingDataOptions.other && value.includes(",")) {
            setIsLoadingPreview(true);
            fetchLivePreview(
                {
                    ...missingDataOptions,
                    otherText: value,
                },
                false
            );
        }
    };

    const handleOtherTextBlur = () => {
        if (
            missingDataOptions.other &&
            missingDataOptions.otherText.trim() !== ""
        ) {
            setIsLoadingPreview(true);
            fetchLivePreview(missingDataOptions, false);
        }
    };

    const canProceed =
        missingDataOptions.blanks ||
        missingDataOptions.na ||
        (missingDataOptions.other &&
            missingDataOptions.otherText.trim() !== "");

    const handleNext = async () => {
        if (!canProceed) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append(
                "missingDataOptions",
                JSON.stringify(missingDataOptions)
            );

            const response = await axios.post(
                "/api/submit-missing-data-options",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (response.data.success) {
                onNext();
            } else {
                onError(
                    response.data.message ||
                        "Failed to save missing data options."
                );
            }
        } catch (error: any) {
            let message = "Failed to save missing data options.";
            if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            onError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="w-full max-w-4xl px-4 py-8">
                <div className="mb-2 text-5xl font-semibold flex items-end">
                    <span>2</span>
                    <span className="text-gray-400">/3</span>
                    <span className="text-base font-normal ml-4 text-gray-400">
                        Just three questions to get started.
                    </span>
                </div>

                {/* Missing Data Detection Section */}
                {backendAnalysis && backendAnalysis.missing_cells > 0 && (
                    <div className="mb-6 mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                        <h3 className="text-lg font-semibold text-blue-800 mb-2">
                            Missing Data Detected
                        </h3>
                        <p className="text-blue-700 text-sm mb-3">
                            We found {backendAnalysis.missing_cells} missing
                            values in your dataset with the following patterns:
                        </p>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                            {backendAnalysis.missing_patterns.empty_strings >
                                0 && (
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-blue-500 rounded-full"></span>
                                    <span className="text-blue-800">
                                        Empty strings:{" "}
                                        {
                                            backendAnalysis.missing_patterns
                                                .empty_strings
                                        }
                                    </span>
                                </div>
                            )}
                            {backendAnalysis.missing_patterns.null_values >
                                0 && (
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-red-500 rounded-full"></span>
                                    <span className="text-red-800">
                                        Null values:{" "}
                                        {
                                            backendAnalysis.missing_patterns
                                                .null_values
                                        }
                                    </span>
                                </div>
                            )}
                            {backendAnalysis.missing_patterns.whitespace_only >
                                0 && (
                                <div className="flex items-center gap-2">
                                    <span className="w-3 h-3 bg-green-500 rounded-full"></span>
                                    <span className="text-green-800">
                                        Whitespace-only:{" "}
                                        {
                                            backendAnalysis.missing_patterns
                                                .whitespace_only
                                        }
                                    </span>
                                </div>
                            )}
                        </div>

                        {/* Backend Analysis Section */}
                        {backendAnalysis && (
                            <div className="mt-4 pt-4 border-t border-blue-200">
                                <h4 className="text-sm font-semibold text-blue-800 mb-2">
                                    Detailed Analysis
                                </h4>
                                <div className="grid grid-cols-3 gap-4 text-xs">
                                    <div className="bg-white p-2 rounded border">
                                        <div className="font-semibold text-blue-800">
                                            Total Missing
                                        </div>
                                        <div className="text-lg font-bold text-blue-600">
                                            {backendAnalysis.missing_cells}
                                        </div>
                                        <div className="text-gray-500">
                                            (
                                            {backendAnalysis.missing_percentage}
                                            %)
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded border">
                                        <div className="font-semibold text-red-800">
                                            Null Values
                                        </div>
                                        <div className="text-lg font-bold text-red-600">
                                            {
                                                backendAnalysis.missing_patterns
                                                    .null_values
                                            }
                                        </div>
                                        <div className="text-gray-500">
                                            (
                                            {
                                                backendAnalysis
                                                    .pattern_percentages
                                                    .null_percentage
                                            }
                                            %)
                                        </div>
                                    </div>
                                    <div className="bg-white p-2 rounded border">
                                        <div className="font-semibold text-green-800">
                                            Empty Strings
                                        </div>
                                        <div className="text-lg font-bold text-green-600">
                                            {
                                                backendAnalysis.missing_patterns
                                                    .empty_strings
                                            }
                                        </div>
                                        <div className="text-gray-500">
                                            (
                                            {
                                                backendAnalysis
                                                    .pattern_percentages
                                                    .empty_string_percentage
                                            }
                                            %)
                                        </div>
                                    </div>
                                </div>
                                {backendAnalysis.columns_with_missing &&
                                    Object.keys(
                                        backendAnalysis.columns_with_missing
                                    ).length > 0 && (
                                        <div className="mt-3">
                                            <div className="text-xs font-semibold text-blue-800 mb-1">
                                                Columns with missing data:
                                            </div>
                                            <div className="text-xs text-blue-700">
                                                {Object.entries(
                                                    backendAnalysis.columns_with_missing
                                                )
                                                    .slice(0, 3)
                                                    .map(([col, count]) => (
                                                        <span
                                                            key={col}
                                                            className="inline-block bg-blue-100 px-2 py-1 rounded mr-2 mb-1"
                                                        >
                                                            {col}: {count}
                                                        </span>
                                                    ))}
                                                {Object.keys(
                                                    backendAnalysis.columns_with_missing
                                                ).length > 3 && (
                                                    <span className="text-gray-500">
                                                        +
                                                        {Object.keys(
                                                            backendAnalysis.columns_with_missing
                                                        ).length - 3}{" "}
                                                        more
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                            </div>
                        )}
                    </div>
                )}

                {loadingAnalysis && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                        <div className="text-xs text-blue-600">
                            Loading detailed analysis...
                        </div>
                    </div>
                )}

                <div className="mb-6 mt-8">
                    <label className="block text-lg font-medium mb-2">
                        How is missing data represented in this dataset? You can
                        select multiple answers.
                    </label>
                    <div className="flex flex-col gap-2 mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.blanks}
                                onChange={() => handleCheckbox("blanks")}
                            />
                            <span>Blanks (auto-detected)</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.na}
                                onChange={() => handleCheckbox("na")}
                            />
                            <span>N/A</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.other}
                                onChange={() => handleCheckbox("other")}
                            />
                            <span>Other:</span>
                            <input
                                type="text"
                                className="border rounded px-2 py-1 text-sm min-w-[180px] italic"
                                placeholder="Please Indicate"
                                value={missingDataOptions.otherText}
                                onChange={handleOtherText}
                                onBlur={handleOtherTextBlur}
                                disabled={!missingDataOptions.other}
                            />
                        </label>
                    </div>
                    <div className="text-xs text-gray-500 mt-1 mb-2">
                        (Separate by commas if more than one answer.)
                    </div>
                </div>
                <div className="mb-6 mt-8">
                    <div className="text-gray-500 text-sm mb-2">
                        Dataset preview (first 10 rows)
                    </div>
                    <div className="overflow-x-auto border bg-white shadow max-w-full">
                        {isLoadingPreview && isInitialPreviewLoad ? (
                            <div className="p-8 text-center text-gray-500">
                                Loading dataset preview...
                            </div>
                        ) : datasetPreview ? (
                            <table className="min-w-[600px] border-collapse">
                                <thead>
                                    <tr>
                                        {datasetPreview.title_row.map(
                                            (col: any, i: number) => (
                                                <th
                                                    key={i}
                                                    className="px-3 py-2 border font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50"
                                                >
                                                    {String(col)}
                                                </th>
                                            )
                                        )}
                                    </tr>
                                </thead>
                                <tbody>
                                    {datasetPreview.data_rows.map((row, i) => (
                                        <tr key={i}>
                                            {row.map((cell, j) => (
                                                <td
                                                    key={j}
                                                    className={`px-3 py-2 border text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300 ${
                                                        cell === null ||
                                                        cell === undefined
                                                            ? "bg-red-100 border-red-200 text-red-600 font-semibold"
                                                            : ""
                                                    }`}
                                                >
                                                    {cell === null ||
                                                    cell === undefined
                                                        ? ""
                                                        : String(cell)}
                                                </td>
                                            ))}
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        ) : (
                            <div className="p-8 text-center text-gray-500">
                                Failed to load dataset preview
                            </div>
                        )}
                    </div>
                </div>
                <div className="text-xs text-red-500">
                    Missing data is shown by red boxes.
                </div>
                <div className="flex justify-between mt-8">
                    <button
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={onBack}
                        disabled={isSubmitting}
                        style={{ minWidth: 80 }}
                    >
                        &larr; Back
                    </button>
                    <button
                        className={`${styles.button} ${styles.primary} ml-2`}
                        disabled={!canProceed || isSubmitting}
                        onClick={handleNext}
                        style={{ minWidth: 80 }}
                    >
                        {isSubmitting ? "Saving..." : "Next"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecondQuestion;
