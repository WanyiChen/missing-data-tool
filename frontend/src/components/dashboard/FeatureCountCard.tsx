import React, { useEffect, useState } from "react";
import axios from "axios";

const FeatureCountCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [featureCount, setFeatureCount] = useState<number | null>(null);
    const [missingPercent, setMissingPercent] = useState<number | null>(null);

    useEffect(() => {
        const fetchFeatureCount = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/feature-count");
                if (res.data.success) {
                    setFeatureCount(res.data.features_with_missing);
                    setMissingPercent(res.data.missing_feature_percentage);
                } else {
                    setError(res.data.message || "Failed to fetch data");
                }
            } catch (err: any) {
                setError("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchFeatureCount();
    }, []);

    return (
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 min-h-[150px]">
            <div className="text-xs text-gray-500 mb-2 text-center">
                Total number of Features with missing data
            </div>
            {loading ? (
                <div className="text-gray-400 text-center">Loading...</div>
            ) : error ? (
                <div className="text-red-500 text-center">{error}</div>
            ) : (
                <div className="text-2xl font-semibold mb-1 text-center">
                    {featureCount} ({missingPercent}%)
                </div>
            )}
        </div>
    );
};

export default FeatureCountCard;
