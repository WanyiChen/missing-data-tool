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
    onBack,
    onNext,
    onError,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(
        null
    );
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Fetch dataset preview from backend
    useEffect(() => {
        setIsLoadingPreview(true);
        fetchLivePreview(missingDataOptions);
        // eslint-disable-next-line
    }, [missingDataOptions.blanks, missingDataOptions.na]);

    const fetchLivePreview = async (opts: typeof missingDataOptions) => {
        try {
            const formData = new FormData();
            formData.append("missingDataOptions", JSON.stringify(opts));
            const response = await axios.post(
                "/api/dataset-preview-live",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
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
            setIsLoadingPreview(false);
        }
    };

    const handleCheckbox = (key: "blanks" | "na" | "other") => {
        const newOptions = {
            ...missingDataOptions,
            [key]: !missingDataOptions[key],
            ...(key === "other" && missingDataOptions.other
                ? { otherText: "" }
                : {}),
        };
        setMissingDataOptions(newOptions);
        if (key === "blanks" || key === "na") {
            setIsLoadingPreview(true);
            fetchLivePreview(newOptions);
        }
    };

    const handleOtherText = (e: React.ChangeEvent<HTMLInputElement>) => {
        setMissingDataOptions({
            ...missingDataOptions,
            otherText: e.target.value,
        });
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
                        {isLoadingPreview ? (
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
                <div className="text-xs text-red-500 mt-2">
                    Missing data is highlighted with red boxes.
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
