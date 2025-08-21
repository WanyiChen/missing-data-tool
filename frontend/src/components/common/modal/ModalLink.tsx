import React from "react";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";

interface ModalLinkProps {
    text: string;
    onClick?: () => void;
    className?: string;
}

const ModalLink: React.FC<ModalLinkProps> = ({ text, onClick, className }) => (
    <span
        className={`inline-flex items-center gap-1 transition-colors duration-150 cursor-pointer text-blue-600 hover:text-blue-800 ${
            className || ""
        }`}
        onClick={onClick}
        tabIndex={0}
        role="button"
        aria-label={`More info about ${text}`}
    >
        {text}
        <InfoOutlinedIcon fontSize="small" />
    </span>
);

export default ModalLink;
