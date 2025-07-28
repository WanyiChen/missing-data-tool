import React from "react";

type FirstQuestionProps = {
    previewRows: any[][];
    featureNames: boolean | null;
    setFeatureNames: (val: boolean) => void;
    onNext: () => void;
};

const FirstQuestion: React.FC<FirstQuestionProps> = ({
    previewRows,
    featureNames,
    setFeatureNames,
    onNext,
}) => {
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
                                onChange={() => setFeatureNames(true)}
                            />
                            <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="radio"
                                name="featureNames"
                                checked={featureNames === false}
                                onChange={() => setFeatureNames(false)}
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
                        Dataset preview{" "}
                        {featureNames === true
                            ? "(first 11 rows)"
                            : "(first 10 rows)"}
                    </div>
                    <div className="overflow-x-auto border rounded-xl bg-white shadow max-w-full">
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
                                            className="px-3 py-2 border-b font-semibold text-xs text-gray-700 whitespace-nowrap bg-gray-50"
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
                <div className="flex justify-end">
                    <button
                        className="bg-black text-white px-8 py-3 rounded-lg font-semibold text-lg hover:bg-gray-800 transition-colors disabled:opacity-50"
                        disabled={featureNames === null}
                        onClick={onNext}
                    >
                        Next &rarr;
                    </button>
                </div>
            </div>
        </div>
    );
};

export default FirstQuestion;
