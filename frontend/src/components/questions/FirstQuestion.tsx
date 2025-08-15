import React, { useState, useEffect } from "react";
import axios from "axios";
import styles from "../common/Button.module.css";

type FirstQuestionProps = {
    featureNames: boolean | null;
    setFeatureNames: (val: boolean) => void;
    onNext: () => void;
    onError: (message: string) => void;
};

const FirstQuestion: React.FC<FirstQuestionProps> = ({
    featureNames,
    setFeatureNames,
    onNext,
    onError,
}) => {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [datasetPreview, setDatasetPreview] = useState<{
        title_row: string[];
        data_rows: any[][];
    } | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);

    // Fetch preview on mount and whenever featureNames changes
    useEffect(() => {
        if (featureNames === null) return;
        setIsLoadingPreview(true);
        const fetchPreview = async () => {
            try {
                const formData = new FormData();
                formData.append(
                    "featureNames",
                    featureNames ? "true" : "false"
                );
                formData.append("missingDataOptions", JSON.stringify({}));
                const response = await axios.post(
                    "/api/dataset-preview-live",
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                if (response.data.success) {
                    setDatasetPreview({
                        title_row: response.data.title_row,
                        data_rows: response.data.data_rows,
                    });
                } else {
                    onError(response.data.message || "Failed to load preview.");
                }
            } catch (error: any) {
                let message = "Failed to load preview.";
                if (error.response?.data?.message) {
                    message = error.response.data.message;
                }
                onError(message);
            } finally {
                setIsLoadingPreview(false);
            }
        };
        fetchPreview();
    }, [featureNames, onError]);

    const handleNext = async () => {
        if (featureNames === null) return;
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("featureNames", featureNames ? "true" : "false");
            const response = await axios.post(
                "/api/submit-feature-names",
                formData,
                { headers: { "Content-Type": "multipart/form-data" } }
            );
            if (response.data.success) {
                onNext();
            } else {
                onError(
                    response.data.message ||
                        "Failed to save feature names configuration."
                );
            }
        } catch (error: any) {
            let message = "Failed to save feature names configuration.";
            if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            onError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleFeatureNamesChange = (val: boolean) => {
        setFeatureNames(val);
        // Preview will update automatically via useEffect
    };

    return (
        <div className="min-h-screen flex flex-col items-center justify-center bg-white">
            <div className="w-full max-w-4xl px-4 py-8">
                <div className="mb-2 text-5xl font-semibold flex items-end">
                    <span>1</span>
                    <span className="text-gray-400">/3</span>
                    <span className="text-base font-normal ml-4 text-gray-400">
                        Just three questions to get started.
                    </span>
                </div>
                <div className="mb-6 mt-8">
                    <label className="block text-lg font-medium mb-2">
                        Is your first row feature names?
                    </label>
                    <div className="flex gap-8 items-center mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="featureNames"
                                checked={featureNames === true}
                                onChange={() => handleFeatureNamesChange(true)}
                            />
                            <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="featureNames"
                                checked={featureNames === false}
                                onChange={() => handleFeatureNamesChange(false)}
                            />
                            <span>No</span>
                        </label>
                    </div>
                    <p className="text-gray-500 text-sm mt-2">
                        If you choose "no," feature names will automatically be
                        assigned. The first column will be named "Feature 1,"
                        the second column will be named "Feature 2," etc.
                    </p>
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
                                                        cell === undefined ||
                                                        cell === null ||
                                                        cell === "" ||
                                                        (typeof cell ===
                                                            "number" &&
                                                            isNaN(cell))
                                                            ? "bg-red-100 border-red-200 text-red-600 font-semibold"
                                                            : ""
                                                    }`}
                                                >
                                                    {cell === undefined ||
                                                    cell === null ||
                                                    cell === "" ||
                                                    (typeof cell === "number" &&
                                                        isNaN(cell))
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
                <div className="flex justify-end">
                    <button
                        className={`${styles.button} ${styles.primary} ml-2`}
                        disabled={featureNames === null || isSubmitting}
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

export default FirstQuestion;
