import React from "react";
import styles from "./Button.module.css";

interface SecondQuestionProps {
    featureNames: boolean | null;
    previewRows: any[][];
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
}

const SecondQuestion: React.FC<SecondQuestionProps> = ({
    featureNames,
    previewRows,
    missingDataOptions,
    setMissingDataOptions,
    onBack,
    onNext,
}) => {
    const handleCheckbox = (key: "blanks" | "na" | "other") => {
        setMissingDataOptions({
            ...missingDataOptions,
            [key]: !missingDataOptions[key],
            ...(key === "other" && missingDataOptions.other
                ? { otherText: "" }
                : {}),
        });
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
                        Dataset preview{" "}
                        {featureNames === true
                            ? "(first 11 rows)"
                            : "(first 10 rows)"}
                    </div>
                    <div className="overflow-x-auto border bg-white shadow max-w-full">
                        <table className="min-w-[600px] border-collapse">
                            <thead>
                                <tr>
                                    {(featureNames === false
                                        ? Array.from(
                                              {
                                                  length: Math.max(
                                                      ...previewRows.map(
                                                          (r) => r.length
                                                      )
                                                  ),
                                              },
                                              (_, i) => `Feature ${i + 1}`
                                          )
                                        : previewRows[0]
                                    ).map((col: any, i: number) => (
                                        <th
                                            key={i}
                                            className="px-3 py-2 border font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50"
                                        >
                                            {String(col)}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {(featureNames === false
                                    ? previewRows.slice(0, 10)
                                    : previewRows.slice(1, 11)
                                ).map((row, i) => (
                                    <tr key={i}>
                                        {row.map((cell, j) => (
                                            <td
                                                key={j}
                                                className="px-3 py-2 border text-xs text-gray-800 whitespace-nowrap border-b-2 border-gray-300"
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
                        className={`${styles.button} ${styles.secondary}`}
                        onClick={onBack}
                        style={{ minWidth: 80 }}
                    >
                        &larr; Back
                    </button>
                    <button
                        className={`${styles.button} ${styles.primary} ml-2`}
                        disabled={!canProceed}
                        onClick={onNext}
                        style={{ minWidth: 80 }}
                    >
                        Next &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default SecondQuestion;
