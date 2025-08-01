import React, { useEffect, useState } from "react";
import axios from "axios";

const CaseCountCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [caseCount, setCaseCount] = useState<number | null>(null);
    const [missingPercent, setMissingPercent] = useState<number | null>(null);

    useEffect(() => {
        const fetchCaseCount = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/case-count");
                if (res.data.success) {
                    setCaseCount(res.data.total_cases);
                    setMissingPercent(res.data.missing_percentage);
                } else {
                    setError(res.data.message || "Failed to fetch data");
                }
            } catch (err: any) {
                setError("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchCaseCount();
    }, []);

    return (
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 min-h-[150px]">
            <div className="text-xs text-gray-500 mb-2 text-center">
                Total number of cases with missing data
            </div>
            {loading ? (
                <div className="text-gray-400 text-center">Loading...</div>
            ) : error ? (
                <div className="text-red-500 text-center">{error}</div>
            ) : (
                <div className="text-2xl font-semibold mb-1 text-center">
                    {caseCount} ({missingPercent}%)
                </div>
            )}
        </div>
    );
};

export default CaseCountCard;
