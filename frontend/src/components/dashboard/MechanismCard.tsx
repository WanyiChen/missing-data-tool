import React, { useEffect, useState } from "react";
import axios from "axios";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

const MechanismCard: React.FC = () => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [mechanism, setMechanism] = useState<{
        mechanism_acronym: string;
        mechanism_full: string;
        p_value: number;
    } | null>(null);

    useEffect(() => {
        setLoading(true);
        setError(null);
        const fetchMissingDataMechanism = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await axios.get("/api/missing-mechanism");
                if (res.data.success) {
                    if (Number.isNaN(res.data.p_value)) {
                        setError(
                            res.data.message ||
                                "Failed to conduct test, mcar p_value is NaN"
                        );
                    } else {
                        setMechanism(res.data);
                    }
                } else {
                    setError(res.data.message || "Failed to fetch data");
                }
            } catch (err: any) {
                setError("Failed to fetch data");
            } finally {
                setLoading(false);
            }
        };
        fetchMissingDataMechanism();
    }, []);

    return (
        <div className="rounded-2xl border bg-white shadow-sm flex flex-col items-center p-6 min-h-[150px]">
            <div className="text-xs text-gray-500 mb-2 text-center">
                Possible missing data mechanisms
            </div>
            {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
            ) : error ? (
                <div className="text-center text-red-500 text-xs">{error}</div>
            ) : mechanism ? (
                <>
                    <div className="text-xl font-semibold mb-1 text-center flex items-center justify-center gap-1">
                        {mechanism.mechanism_acronym}
                        <InfoOutlinedIcon
                            fontSize="small"
                            className="text-gray-400 cursor-pointer"
                            titleAccess={mechanism.mechanism_full}
                        />
                    </div>
                    <div className="text-xs text-gray-500 text-center">
                        {mechanism.mechanism_full}
                    </div>
                    <div className="text-xs text-gray-400 text-center mt-1">
                        p-value: {mechanism.p_value.toExponential(2)}
                    </div>
                </>
            ) : null}
        </div>
    );
};

export default MechanismCard;
