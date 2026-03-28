import React, { useState, useEffect } from "react";
import api from "../../config.js";
import styles from "../common/Button.module.css";

interface SecondQuestionProps {
    missingDataOptions: {
        blanks: boolean;
        na: boolean;
        other: boolean;
        otherText: string;
        featureSpecific?: {
            [featureName: string]: {
                blanks: boolean;
                na: boolean;
                other: boolean;
                otherText: string;
            };
        };
    };
    setMissingDataOptions: (opts: {
        blanks: boolean;
        na: boolean;
        other: boolean;
        otherText: string;
        featureSpecific?: {
            [featureName: string]: {
                blanks: boolean;
                na: boolean;
                other: boolean;
                otherText: string;
            };
        };
    }) => void;
    featureNames: boolean;
    onBack: () => void;
    onNext: () => void;
    onError: (message: string) => void;
}

interface DatasetPreview {
    title_row: string[];
    data_rows: any[][];
    original_data_rows?: any[][];
    missing_mask?: boolean[][];
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


    console.log(loadingAnalysis);
    console.log(backendAnalysis);
    
    const [detectedMissing, setDetectedMissing] = useState<{
        blanks: boolean;
        na: boolean;
    } | null>({blanks: false, na: false});
    const [availableFeatures, setAvailableFeatures] = useState<string[]>([]);
    const [selectedFeature, setSelectedFeature] = useState<string>("");
    const [specificFeatureText, setSpecificFeatureText] = useState<string>("");

    const [featureSpecificOptions, setFeatureSpecificOptions] = useState<{
        [featureName: string]: {
            blanks: boolean;
            na: boolean;
            other: boolean;
            otherText: string;
        };
    }>({});

    useEffect(() => {
        api.get("/api/detect-missing-data-options").then((res: any) => {
            if (res.data.success && res.data.suggestions) {
                setMissingDataOptions({
                    ...missingDataOptions,
                    blanks: res.data.suggestions.blanks,
                    na: res.data.suggestions.na,
                });
                setDetectedMissing({
                    blanks: res.data.suggestions.blanks,
                    na: res.data.suggestions.na,
                });
            }
        });

        // Fetch available feature names from dataset preview
        if (datasetPreview && datasetPreview.title_row) {
            setAvailableFeatures(datasetPreview.title_row);
        }
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
        featureSpecificOptions,
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

    useEffect(() => {
        if (datasetPreview && datasetPreview.title_row) {
            setAvailableFeatures(datasetPreview.title_row);
        }
    }, [datasetPreview]);

    const fetchLivePreview = async (
        opts: typeof missingDataOptions,
        showLoading: boolean
    ) => {
        if (showLoading) setIsLoadingPreview(true);
        try {
            const formData = new FormData();
            const optionsWithFeatureSpecific = {
                ...opts,
                other: false, // Don't send "other" to backend to preserve original values
                otherText: "",
                featureSpecific: Object.fromEntries(
                    Object.entries(featureSpecificOptions).map(([key, value]) => [
                        key,
                        { ...value, other: false, otherText: "" } // Don't send "other" to backend
                    ])
                )
            };
            formData.append("missingDataOptions", JSON.stringify(optionsWithFeatureSpecific));
            formData.append("featureNames", featureNames ? "true" : "false");
            const response = await api.post(
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
            const res = await api.get("/api/missing-data-analysis");
            if (res.data.success) {
                return res.data;
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

    const handleApplyFeatureSpecific = () => {
        if (!selectedFeature || !specificFeatureText.trim()) return;

        const newFeatureOptions = {
            ...featureSpecificOptions,
            [selectedFeature]: {
                blanks: false,
                na: false,
                other: true,
                otherText: specificFeatureText.trim(),
            },
        };
        setFeatureSpecificOptions(newFeatureOptions);
        setSelectedFeature("");
        setSpecificFeatureText("");
    };

    const handleRemoveFeature = (featureName: string) => {
        const newOptions = { ...featureSpecificOptions };
        delete newOptions[featureName];
        setFeatureSpecificOptions(newOptions);
    };

    const handleFeatureSpecificOtherText = (featureName: string, value: string) => {
        const newFeatureOptions = {
            ...featureSpecificOptions,
            [featureName]: {
                ...featureSpecificOptions[featureName],
                otherText: value
            }
        };
        setFeatureSpecificOptions(newFeatureOptions);
    };

    const isCellMissing = (cell: any, columnIndex: number) => {
        if (cell === null || cell === undefined) return true;

        const featureName = datasetPreview?.title_row[columnIndex];
        const featureOptions = featureName ? featureSpecificOptions[featureName] : null;

        // Check feature-specific "other" values
        if (featureOptions?.other && featureOptions.otherText) {
            const otherValues = featureOptions.otherText.split(",").map(v => v.trim().toLowerCase());
            if (otherValues.includes(String(cell).toLowerCase())) return true;
        }

        // Check global "other" values
        if (missingDataOptions.other && missingDataOptions.otherText) {
            const otherValues = missingDataOptions.otherText.split(",").map(v => v.trim().toLowerCase());
            if (otherValues.includes(String(cell).toLowerCase())) return true;
        }

        return false;
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
            const optionsWithFeatureSpecific = {
                ...missingDataOptions,
                featureSpecific: featureSpecificOptions
            };
            formData.append(
                "missingDataOptions",
                JSON.stringify(optionsWithFeatureSpecific)
            );

            const response = await api.post(
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

                <div className="mb-6 mt-8">
                    <p className="text-base font-medium mb-4">
                        How is missing data represented in this dataset?
                    </p>

                    <div className="text-sm mb-2">
                        Apply to all features (you can select multiple answers):
                    </div>
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mb-1">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.blanks}
                                onChange={() => handleCheckbox("blanks")}
                            />
                            <span className="text-sm">Blanks{detectedMissing?.blanks ? " (auto-detected)" : ""}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.na}
                                onChange={() => handleCheckbox("na")}
                            />
                            <span className="text-sm">N/A{detectedMissing?.na ? " (auto-detected)" : ""}</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={missingDataOptions.other}
                                onChange={() => handleCheckbox("other")}
                            />
                            <span className="text-sm">Other:</span>
                        </label>
                        <input
                            type="text"
                            className="border rounded px-2 py-1 text-sm min-w-[160px] italic"
                            placeholder="please indicate"
                            value={missingDataOptions.otherText}
                            onChange={handleOtherText}
                            onBlur={handleOtherTextBlur}
                            disabled={!missingDataOptions.other}
                        />
                        <span className="text-xs text-gray-500">
                            (Separate by commas if more than one answer.)
                        </span>
                    </div>

                    <p className="text-sm text-black-600 mt-4 mb-3">
                        For example, if you select &ldquo;blanks&rdquo; above, all the blanks in the dataset will be recognized as missing data.
                    </p>
                    <p className="text-sm text-black-600 mb-4">
                        Sometimes, some features may have specific codes for representing missingness. For example, &ldquo;99&rdquo; might mean missing or unknown in one feature but be a valid value in other features. If that is the case, please specify the feature-specific codes of missingness below. If you are unsure whether your dataset has any feature-specific codes, please check your dataset&rsquo;s documentation.
                    </p>

                    <div className="text-sm mb-2">
                        Apply to specific features:
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                        <select
                            value={selectedFeature}
                            onChange={(e) => setSelectedFeature(e.target.value)}
                            className="border rounded px-3 py-2 text-sm min-w-[160px]"
                        >
                            <option value="">Select feature</option>
                            {availableFeatures
                                .filter(f => !featureSpecificOptions[f])
                                .map(f => (
                                    <option key={f} value={f}>{f}</option>
                                ))
                            }
                        </select>
                        <input
                            type="text"
                            className="border rounded px-2 py-2 text-sm min-w-[160px] italic"
                            placeholder="please indicate"
                            value={specificFeatureText}
                            onChange={(e) => setSpecificFeatureText(e.target.value)}
                            onKeyDown={(e) => { if (e.key === "Enter") handleApplyFeatureSpecific(); }}
                        />
                        <button
                            onClick={handleApplyFeatureSpecific}
                            disabled={!selectedFeature || !specificFeatureText.trim()}
                            className="px-4 py-2 border border-gray-400 rounded text-sm hover:bg-gray-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                        >
                            Apply
                        </button>
                    </div>
                    <div className="text-xs text-gray-500 mb-3">
                        (Separate by commas if more than one answer.)
                    </div>

                    {Object.entries(featureSpecificOptions).length > 0 && (
                        <div className="mt-2 flex flex-col gap-1">
                            {Object.entries(featureSpecificOptions).map(([featureName, options]) => (
                                <div key={featureName} className="flex items-center gap-3 text-sm">
                                    <span className="font-medium text-gray-700">{featureName}:</span>
                                    <span className="text-gray-600 italic">{options.otherText}</span>
                                    <input
                                        type="text"
                                        className="border rounded px-2 py-1 text-xs min-w-[120px] italic"
                                        placeholder="edit values"
                                        value={options.otherText}
                                        onChange={(e) => handleFeatureSpecificOtherText(featureName, e.target.value)}
                                    />
                                    <button
                                        onClick={() => handleRemoveFeature(featureName)}
                                        className="text-gray-400 hover:text-red-500 text-xs cursor-pointer"
                                    >
                                        ✕
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                <div className="mb-6 mt-8">
                    <div className="text-gray-500 text-sm mb-2">
                        Dataset preview (first 10 rows)
                    </div>
                    <div className="overflow-x-auto border bg-white shadow max-w-fit">
                        {isLoadingPreview && isInitialPreviewLoad ? (
                            <div className="p-8 text-center text-gray-500">
                                Loading dataset preview...
                            </div>
                        ) : datasetPreview ? (
                            <table className="min-w-fit border-collapse">
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
                                            {row.map((cell: any, j: number) => (
                                                <td
                                                    key={j}
                                                    className={`px-3 py-2 border text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300 ${
                                                        isCellMissing(cell, j)
                                                            ? "bg-red-100 border-red-200 text-red-600 font-semibold"
                                                            : ""
                                                    }`}
                                                >
                                                    {cell === null || cell === undefined ? "" : String(cell)}
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
                    <div className="text-xs text-red-500 mt-1">
                        Missing data is shown by red boxes.
                    </div>
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