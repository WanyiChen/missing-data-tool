import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import { BaseCard } from "./base";

const MechanismCard: React.FC = () => (
    <BaseCard title="Possible missing data mechanisms">
        <div className="text-xl font-semibold mb-1 text-center flex items-center justify-center gap-1">
            MAR or MNAR
            <InfoOutlinedIcon
                fontSize="small"
                className="text-gray-400 cursor-pointer"
                titleAccess="Missing at Random or Missing Not at Random"
            />
        </div>
        <div className="text-xs text-gray-500 text-center">
            (Missing at Random or Missing Not at Random)
        </div>
    </BaseCard>
);

export default MechanismCard;
