import React from "react";
import { useNavigate } from "react-router-dom";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import styles from "../components/common/Button.module.css";


const DeleteAllMissingPage: React.FC = () => {
    const navigate = useNavigate();

    const handleBackToDashboard = () => {
        navigate("/dashboard");
    };

    return (
        <div className="min-h-screen bg-white flex flex-col">
            {/* Top Bar */}
            <header className="w-full border-b flex items-center justify-between px-6 py-3 sticky top-0 bg-white z-10">
                <div className="text-sm font-medium">The Missing Data Tool</div>
                <div className="flex gap-6">
                    <button
                        className="flex items-center gap-2 text-sm text-gray-700 hover:text-black font-medium cursor-pointer"
                        onClick={handleBackToDashboard}
                    >
                        <ArrowBackIcon fontSize="small" />
                        Back
                    </button>
                </div>
            </header>
            {/* Split Cards Layout */}
            <main className="flex-1 flex flex-col items-center px-4 py-8 w-full">
                <div className="w-full max-w-6xl flex flex-1 gap-8 h-[70vh] min-h-[500px]">
                    {/* Left Card: Info Panel */}
                    <div className="flex flex-col justify-between rounded-2xl shadow-md p-8 flex-1 border border-black-200">
                        <div>
                            <h1 className="text-xl font-semibold mb-6">What if I delete all cases with missing data?</h1>
                            <div className="text-black text-base mb-6">
                                <p className="mb-2">
                                    Deleting all cases with missing data will delete 100 (10%) cases.<br />
                                    The resulting dataset will have 900 cases. Models trained on the resulting dataset will only be applicable to the subpopulation.
                                </p>
                                <p className="mb-4">
                                    The following features will have significant changes in data distribution. Click on each feature to learn more.
                                </p>
                                <div className="flex flex-col gap-2 mb-4">
                                    <button className="text-blue-600 hover:underline text-base text-left w-fit p-0 bg-transparent border-none cursor-pointer">Gender</button>
                                    <button className="text-blue-600 hover:underline text-base text-left w-fit p-0 bg-transparent border-none cursor-pointer">Age</button>
                                </div>
                            </div>
                        </div>
                        <button
                            className={`${styles.button} ${styles.primary}`}
                            style={{ minWidth: 160 }}    
                            onClick={handleBackToDashboard}
                        >
                            Return to Homepage
                        </button>
                    </div>
                    {/* Right Card: Placeholder for Data Visualizations */}
                    <div className="flex flex-col justify-center items-center rounded-2xl shadow-md p-8 flex-1 border border-black-200">
                        <span className="text-black-400 text-lg">[Data visualizations will appear here]</span>
                    </div>
                </div>
            </main>
        </div>
    );
};

export default DeleteAllMissingPage;
