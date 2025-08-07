import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import React from "react";
import { useNavigate } from "react-router-dom";
import { BaseCard } from "./base";

const NextPageCard: React.FC = () => {
    const navigate = useNavigate();

    const handleClick = () => {
        navigate("/delete-all-missing");
    };

    return (
        <BaseCard className="w-full p-4" minHeight="70px">
            <div className="flex items-center justify-center gap-2">
                <a
                    onClick={handleClick}
                    className="text-blue-600 hover:text-blue-800 font-medium text-sm cursor-pointer"
                >
                    What if I Delete All Pages With Missing Data?
                    <InfoOutlinedIcon
                        fontSize="small"
                        className="ml-0.5 text-blue-600 hover:text-blue-800cursor-pointer"
                    />
                </a>
                
            </div>
        </BaseCard>
    );
};

export default NextPageCard; 