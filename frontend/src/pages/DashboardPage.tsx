import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Modal } from "../components/common/modal";
import styles from "../components/common/Button.module.css";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import MechanismCard from "../components/dashboard/MechanismCard";
import CaseCountCard from "../components/dashboard/CaseCountCard";
import FeatureCountCard from "../components/dashboard/FeatureCountCard";
import MissingFeaturesTableCard from "../components/dashboard/MissingFeaturesTableCard";
import RecommendationTableCard from "../components/dashboard/RecommendationTableCard";
import NextPageCard from "../components/dashboard/NextPageCard";

function ConfirmationModal({
    onClose,
    onProceed,
}: {
    onClose: () => void;
    onProceed: () => void;
}) {
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            overlayClassName="bg-black/20"
            contentClassName="border-2 border-black rounded-lg shadow-2xl mx-4 p-4"
            showCloseButton={true}
            style={{ width: "489px", height: "152px" }}
        >
            {/* Content */}
            <div className="pr-6 h-full flex flex-col justify-between">
                <p className="text-black text-sm leading-normal mb-4">
                    Are you sure you want to upload a new dataset? The current
                    analysis won't be saved. Consider downloading the report
                    before uploading a new dataset.
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
        </Modal>
    );
}

function InfoModal({
    message,
    onClose,
}: {
    message: string;
    onClose: () => void;
}) {
    return (
        <Modal
            isOpen={true}
            onClose={onClose}
            overlayClassName="bg-black/30 backdrop-blur-sm"
            contentClassName="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8 flex flex-col items-center justify-center min-h-[200px]"
            showCloseButton={true}
        >
            <div className="text-gray-800 text-left">{message}</div>
        </Modal>
    );
}

const DashboardPage: React.FC = () => {
    const [showConfirmModal, setShowConfirmModal] = useState(false);
    const [infoModal, setInfoModal] = useState<{
        open: boolean;
        message: string;
    }>({
        open: false,
        message: "",
    });
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

    const handleInfoClick = (message: string) => {
        setInfoModal({ open: true, message });
    };

    const handleCloseInfoModal = () => {
        setInfoModal({ open: false, message: "" });
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {showConfirmModal && (
                <ConfirmationModal
                    onClose={handleCloseModal}
                    onProceed={handleProceedToUpload}
                />
            )}
            {infoModal.open && (
                <InfoModal
                    message={infoModal.message}
                    onClose={handleCloseInfoModal}
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
            {/* Dashboard Content */}
            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full">
                <div className="w-full max-w-6xl space-y-6">
                    {/* Top Row - Three Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MechanismCard />
                        <CaseCountCard />
                        <FeatureCountCard />
                    </div>
                    {/* Missing Features Table */}
                    <MissingFeaturesTableCard onInfoClick={handleInfoClick} />
                    {/* Recommendation Table */}
                    <RecommendationTableCard onInfoClick={handleInfoClick} />
                    {/* Full Width Card */}
                    <NextPageCard />
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
