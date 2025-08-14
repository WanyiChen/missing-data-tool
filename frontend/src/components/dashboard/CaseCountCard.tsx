import React, { useEffect, useState } from "react";
import axios from "axios";
import { BaseCard } from "./base";

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
        <BaseCard title="Total Number of Cases with Missing Data">
            {loading ? (
                <div className="text-gray-400 text-center">Loading...</div>
            ) : error ? (
                <div className="text-red-500 text-center">{error}</div>
            ) : (
                <div className="text-2xl font-semibold mb-1 text-center">
                    {caseCount} ({missingPercent}%)
                </div>
            )}
        </BaseCard>
    );
};

export default CaseCountCard;
