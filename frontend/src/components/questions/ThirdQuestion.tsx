import React, { useState, useRef, useEffect } from "react";

interface ThirdQuestionProps {
    previewRows: any[][];
    targetFeature: string | null;
    setTargetFeature: (feature: string | null) => void;
    targetType: "numerical" | "categorical" | null;
    setTargetType: (type: "numerical" | "categorical" | null) => void;
    onBack: () => void;
    onNext: () => void;
}

const ThirdQuestion: React.FC<ThirdQuestionProps> = ({
    previewRows,
    targetFeature,
    setTargetFeature,
    targetType,
    setTargetType,
    onBack,
    onNext,
}) => {
    const [search, setSearch] = useState("");
    const [dropdownOpen, setDropdownOpen] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const columnNames: string[] =
        previewRows[0]?.map((col: any, i: number) => String(col)) || [];
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
        setDropdownOpen(false);
        setSearch("");
        if (targetType === null) {
            const colIdx = columnNames.indexOf(name);
            const colValues = previewRows.slice(1).map((row) => row[colIdx]);
            const isCategorical = colValues.some(
                (val) =>
                    typeof val === "string" &&
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
                    <div className="overflow-x-auto border rounded-xl bg-white shadow max-w-full">
                        <table className="min-w-[600px] border-collapse">
                            <thead>
                                <tr>
                                    {columnNames.map((col, i) => (
                                        <th
                                            key={i}
                                            className="px-3 py-2 border-b font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50"
                                        >
                                            {col}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {previewRows.slice(1, 11).map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => (
                                            <td
                                                key={j}
                                                className="px-3 py-2 border-b text-xs text-gray-800 whitespace-nowrap"
                                            >
                                                {cell === undefined
                                                    ? ""
                                                    : String(cell)}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
                <div className="flex justify-between mt-8">
                    <button
                        className="bg-gray-100 text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-200 transition-colors"
                        onClick={onBack}
                    >
                        &larr; Back
                    </button>
                    <div className="flex gap-4">
                        <button
                            className="bg-gray-200 text-black px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-300 transition-colors"
                            onClick={() => {
                                setTargetFeature(null);
                                setTargetType(null);
                                onNext();
                            }}
                        >
                            Skip &rarr;
                        </button>
                        <button
                            className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                            disabled={!canProceed}
                            onClick={onNext}
                        >
                            Next &rarr;
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ThirdQuestion;
