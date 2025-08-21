import React, { useEffect, useState } from "react";
import axios from "axios";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { BaseCard } from "./base";
import { ModalLink } from "../common/modal";

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
        <BaseCard title="Possible missing data mechanisms">
            {loading ? (
                <div className="text-center text-gray-400">Loading...</div>
            ) : error ? (
                <div className="text-center text-red-500 text-xs">{error}</div>
            ) : mechanism ? (
                <>
                    <ModalLink
                        text={mechanism.mechanism_acronym}
                        className="font-semibold text-xl mb-1"
                        onClick={() => {} /* MDT-26 */}
                    />
                    <div className="text-xs text-gray-500 text-center">
                        {mechanism.mechanism_full}
                    </div>
                    <div className="text-xs text-gray-400 text-center mt-1">
                        p-value: {mechanism.p_value.toExponential(2)}
                    </div>
                </>
            ) : null}
        </BaseCard>
    );
};

export default MechanismCard;
