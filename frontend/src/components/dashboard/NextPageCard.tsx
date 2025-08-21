import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import React from "react";
import { useNavigate } from "react-router-dom";
import { BaseCard } from "./base";
import { ModalLink } from "../common/modal";

const NextPageCard: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/delete-all-missing");
    };

    return (
        <BaseCard className="w-full p-4" minHeight="70px">
            <div className="flex items-center justify-center gap-2">
                <ModalLink
                    text={"What if I delete all pages with missing data?"}
                    className="font-medium text-sm"
                    onClick={handleClick}
                />
            </div>
        </BaseCard>
    );
};

export default NextPageCard;
