import React from "react";
import UploadIcon from "@mui/icons-material/Upload";
import DownloadIcon from "@mui/icons-material/Download";
import MechanismCard from "../components/dashboard/MechanismCard";
import CaseCountCard from "../components/dashboard/CaseCountCard";
import FeatureCountCard from "../components/dashboard/FeatureCountCard";
import MissingFeaturesTableCard from "../components/dashboard/MissingFeaturesTableCard";
import InfoModal from "../components/common/InfoModal";

const DashboardPage: React.FC = () => {
    const [infoModal, setInfoModal] = React.useState<{
        open: boolean;
        message: string;
    }>({ open: false, message: "" });
    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top Bar */}
            <header className="w-full border-b flex items-center justify-between px-6 py-3 sticky top-0 bg-white z-10">
                <div className="text-sm font-medium">The Missing Data Tool</div>
                <div className="flex gap-6">
                    <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium">
                        <UploadIcon fontSize="small" />
                        Upload New Dataset
                    </button>
                    <button className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium">
                        <DownloadIcon fontSize="small" />
                        Download Report
                    </button>
                </div>
            </header>
            {/* Dashboard Content */}
            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full">
                {infoModal.open && (
                    <InfoModal
                        message={infoModal.message}
                        onClose={() =>
                            setInfoModal({ open: false, message: "" })
                        }
                    />
                )}
                <div className="w-full max-w-6xl space-y-8">
                    {/* Top Row Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <MechanismCard />
                        <CaseCountCard />
                        <FeatureCountCard />
                    </div>

                    {/* Missing Features Table */}
                    <MissingFeaturesTableCard
                        onInfoClick={(message) =>
                            setInfoModal({ open: true, message })
                        }
                    />
                </div>
            </main>
        </div>
    );
};

export default DashboardPage;
