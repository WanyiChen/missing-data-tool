import React, { useState, useRef, useEffect } from "react";
import axios from "axios";
import styles from "../common/Button.module.css";

interface ThirdQuestionProps {
    targetFeature: string | null;
    setTargetFeature: (feature: string | null) => void;
    targetType: "numerical" | "categorical" | null;
    setTargetType: (type: "numerical" | "categorical" | null) => void;
    missingDataOptions: {
        blanks: boolean;
        na: boolean;
        other: boolean;
        otherText: string;
    };
    featureNames: boolean;
    onBack: () => void;
    onNext: () => void;
    onError: (message: string) => void;
}

interface DatasetPreview {
    title_row: string[];
    data_rows: any[][];
}

const ThirdQuestion: React.FC<ThirdQuestionProps> = ({
    targetFeature,
    setTargetFeature,
    targetType,
    setTargetType,
    missingDataOptions,
    featureNames,
    onBack,
    onNext,
    onError,
}) => {
    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [datasetPreview, setDatasetPreview] = useState<DatasetPreview | null>(
        null
    );
    const [selectedColIndex, setSelectedColIndex] = useState<number | null>(
        null
    );
    const [isLoadingPreview, setIsLoadingPreview] = useState(true);
    const dropdownRef = useRef<HTMLDivElement>(null);

    // Fetch dataset preview from backend
    useEffect(() => {
        const fetchPreview = async () => {
            try {
                const formData = new FormData();
                formData.append(
                    "missingDataOptions",
                    JSON.stringify(missingDataOptions)
                );
                formData.append(
                    "featureNames",
                    featureNames ? "true" : "false"
                );
                const response = await axios.post(
                    "/api/dataset-preview-live",
                    formData,
                    { headers: { "Content-Type": "multipart/form-data" } }
                );
                if (response.data.success) {
                    setDatasetPreview(response.data);
                } else {
                    onError(
                        response.data.message ||
                            "Failed to load dataset preview."
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

        fetchPreview();
    }, [missingDataOptions, featureNames, onError]);

    const columnNames: string[] = datasetPreview?.title_row || [];
    const filteredColumns = columnNames.filter((name) =>
        name.toLowerCase().includes(search.toLowerCase())
    );

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setDropdownOpen(false);
            }
        }
        if (dropdownOpen) {
            document.addEventListener("mousedown", handleClickOutside);
        } else {
            document.removeEventListener("mousedown", handleClickOutside);
        }
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [dropdownOpen]);

    const canProceed = !!targetFeature && !!targetType;

    const handleFeatureSelect = (name: string) => {
        setTargetFeature(name);
        setSelectedColIndex(columnNames.indexOf(name));
        setDropdownOpen(false);
        setSearch("");
        if (targetType === null && datasetPreview) {
            const colValues = datasetPreview.data_rows.map(
                (row) => row[selectedColIndex !== null ? selectedColIndex : 0]
            );
            const isCategorical = colValues.some(
                (val) =>
                    typeof val === "string" &&
                    val !== null &&
                    val !== undefined &&
                    val.trim() !== "" &&
                    isNaN(Number(val))
            );
            const isNumerical = colValues.every(
                (val) =>
                    val === undefined ||
                    val === null ||
                    val === "" ||
                    (!isNaN(Number(val)) && val !== "")
            );
            if (isCategorical) {
                setTargetType("categorical");
            } else if (isNumerical) {
                setTargetType("numerical");
            } else {
                setTargetType(null);
            }
        }
    };

    const handleNext = async () => {
        if (!canProceed) return;

        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("targetFeature", targetFeature);
            formData.append("targetType", targetType);

            const response = await axios.post(
                "/api/submit-target-feature",
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
                        "Failed to save target feature configuration."
                );
            }
        } catch (error: any) {
            let message = "Failed to save target feature configuration.";
            if (error.response?.data?.message) {
                message = error.response.data.message;
            }
            onError(message);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleSkip = async () => {
        setIsSubmitting(true);
        try {
            const formData = new FormData();
            formData.append("targetFeature", "");
            formData.append("targetType", "");

            const response = await axios.post(
                "/api/submit-target-feature",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );

            if (response.data.success) {
                setTargetFeature(null);
                setTargetType(null);
                onNext();
            } else {
                onError(
                    response.data.message ||
                        "Failed to skip target feature configuration."
                );
            }
        } catch (error: any) {
            let message = "Failed to skip target feature configuration.";
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
                    <span>3</span>
                    <span className="text-gray-400">/3</span>
                    <span className="text-base font-normal ml-4 text-gray-400">
                        Just three questions to get started.
                    </span>
                </div>
                <div className="mb-6 mt-8">
                    <label className="block text-lg font-medium mb-2">
                        What is your target feature? If you are training machine
                        learning models, your target feature is the feature you
                        are trying to predict.
                    </label>
                    <div className="relative w-full max-w-xs" ref={dropdownRef}>
                        <button
                            type="button"
                            className="w-full border rounded-lg px-4 py-2 text-left bg-white focus:outline-none focus:ring-2 focus:ring-black flex items-center justify-between"
                            onClick={() => setDropdownOpen((v) => !v)}
                        >
                            {targetFeature || (
                                <span className="text-gray-400">
                                    Type to search
                                </span>
                            )}
                            <span className="ml-2">▼</span>
                        </button>
                        {dropdownOpen && (
                            <div className="absolute z-10 mt-1 w-full bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border-b outline-none text-sm"
                                    placeholder="Type to search..."
                                    value={search}
                                    onChange={(e) => setSearch(e.target.value)}
                                    autoFocus
                                />
                                {filteredColumns.length === 0 ? (
                                    <div className="px-4 py-2 text-gray-400 text-sm">
                                        No features found
                                    </div>
                                ) : (
                                    filteredColumns.map((name, i) => (
                                        <div
                                            key={i}
                                            className={`px-4 py-2 cursor-pointer hover:bg-gray-100 text-sm ${
                                                targetFeature === name
                                                    ? "bg-gray-200 font-semibold"
                                                    : ""
                                            }`}
                                            onClick={() =>
                                                handleFeatureSelect(name)
                                            }
                                        >
                                            {name}
                                        </div>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="mb-6 mt-8">
                    <label className="block text-lg font-medium mb-2">
                        What is the data type of your target feature?
                    </label>
                    <div className="flex gap-8 items-center mb-2">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="targetType"
                                checked={targetType === "numerical"}
                                onChange={() => setTargetType("numerical")}
                            />
                            <span>Numerical</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="targetType"
                                checked={targetType === "categorical"}
                                onChange={() => setTargetType("categorical")}
                            />
                            <span>Categorical</span>
                        </label>
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
                                            (col, i) => (
                                                <th
                                                    key={i}
                                                    className={`px-3 py-2 border font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50
                                                        ${
                                                            i ===
                                                            selectedColIndex
                                                                ? "italic font-medium"
                                                                : ""
                                                        }`}
                                                >
                                                    {col}
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
                                                    className={`px-3 py-2 border text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300
                                                        ${
                                                            cell === null ||
                                                            cell === undefined
                                                                ? "bg-red-100 border-red-200 text-red-600 font-semibold"
                                                                : ""
                                                        } ${
                                                        j === selectedColIndex
                                                            ? "italic font-medium"
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
                    Missing data is shown by red boxes, target feature is
                    italicized.
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
                    <div className="flex gap-4">
                        <button
                            className={`${styles.button} ${styles.secondary} ml-2`}
                            onClick={handleSkip}
                            disabled={isSubmitting}
                            style={{ minWidth: 80 }}
                        >
                            {isSubmitting ? "Saving..." : "Skip"}
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
        </div>
    );
};

export default ThirdQuestion;
