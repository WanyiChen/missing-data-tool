import React, { useEffect, useState } from "react";
import axios from "axios";
import { BaseCard } from "./base";

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
        <BaseCard title="Total Number of Features with Missing Data">
            {loading ? (
                <div className="text-gray-400 text-center">Loading...</div>
            ) : error ? (
                <div className="text-red-500 text-center">{error}</div>
            ) : (
                <div className="text-2xl font-semibold mb-1 text-center">
                    {featureCount} ({missingPercent}%)
                </div>
            )}
        </BaseCard>
    );
};

export default FeatureCountCard;
