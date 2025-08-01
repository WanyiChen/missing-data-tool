import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import styles from "../components/common/Button.module.css";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import MechanismCard from "../components/dashboard/MechanismCard";
import CaseCountCard from "../components/dashboard/CaseCountCard";
import FeatureCountCard from "../components/dashboard/FeatureCountCard";

function ConfirmationModal({
    onClose,
    onProceed,
}: {
    onClose: () => void;
    onProceed: () => void;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Background overlay */}
            <div className="absolute inset-0 bg-black/20" />
            {/* Modal content */}
            <div
                className="relative bg-white border-2 border-black rounded-lg shadow-2xl mx-4 p-4"
                style={{ width: "489px", height: "152px" }}
            >
                {/* Close X button */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 w-4 h-4 flex items-center justify-center text-black hover:text-gray-600 text-lg font-normal cursor-pointer"
                >
                    ×
                </button>

                {/* Content */}
                <div className="pr-6 h-full flex flex-col justify-between">
                    <p className="text-black text-sm leading-normal mb-4">
                        Are you sure you want to upload a new dataset? The
                        current analysis won't be saved. Consider downloading
                        the report before uploading a new dataset.
                    </p>

                    {/* Buttons */}
                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onProceed}
                            className={`${styles.button} ${styles.secondary}`}
                            style={{ minWidth: 80 }}
                        >
                            Proceed to upload
                        </button>
                        <button
                            onClick={onClose}
                            className={`${styles.button} ${styles.primary}`}
                        >
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

const DashboardPage: React.FC = () => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const navigate = useNavigate();

    const handleUploadNewDataset = () => {
        setShowConfirmModal(true);
    };

    const handleProceedToUpload = () => {
        setShowConfirmModal(false);
        navigate("/");
    };

    const handleCloseModal = () => {
        setShowConfirmModal(false);
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {showConfirmModal && (
                <ConfirmationModal
                    onClose={handleCloseModal}
                    onProceed={handleProceedToUpload}
                />
            )}
            {/* Top Bar */}
            <header className="w-full border-b flex items-center justify-between px-6 py-3 sticky top-0 bg-white z-10">
                <div className="text-sm font-medium">The Missing Data Tool</div>
                <div className="flex gap-6">
                    <button
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium cursor-pointer"
                        onClick={handleUploadNewDataset}
                    >
                        <UploadIcon fontSize="small" />
                        Upload new dataset
                    </button>
                    <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium cursor-pointer">
                        <DownloadIcon fontSize="small" />
                        Download report
                    </button>
                </div>
            </header>
            {/* Dashboard Top Row */}
            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full">
                <div className="w-full max-w-6xl grid grid-cols-1 md:grid-cols-3 gap-6">
                    <MechanismCard />
                    <CaseCountCard />
                    <FeatureCountCard />
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
