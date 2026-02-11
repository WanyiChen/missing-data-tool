import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import FirstQuestion from "../components/questions/FirstQuestion";
import SecondQuestion from "../components/questions/SecondQuestion";
import ThirdQuestion from "../components/questions/ThirdQuestion";
import { Modal } from "../components/common/modal";
import styles from "../components/common/Button.module.css";
import * as XLSX from "xlsx";

const MAX_SIZE_MB = 100;
const ACCEPTED_FORMATS = [".csv", ".xls", ".xlsx"];

function ErrorModal({
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
            contentClassName="max-w-md w-full p-8 flex flex-col items-center justify-center min-h-[300px]"
        >
            <h2 className="text-xl font-bold mb-4 text-center">Upload Error</h2>
            <p className="text-gray-700 mb-8 text-center">{message}</p>
            <div className="absolute bottom-6 left-0 w-full flex justify-center">
                <button
                    onClick={onClose}
                    className={`${styles.button} ${styles.secondary}`}
                    style={{ minWidth: 80 }}
                >
                    OK
                </button>
            </div>
        </Modal>
    );
}

function truncateFileName(name: string, maxLength = 28) {
    if (name.length <= maxLength) return name;
    const extIndex = name.lastIndexOf(".");
    const ext = extIndex !== -1 ? name.slice(extIndex) : "";
    const base = name.slice(0, maxLength - ext.length - 3);
    return `${base}...${ext}`;
}

export default function LandingPage() {
    const [uploading, setUploading] = useState(false);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [errorModal, setErrorModal] = useState<{
        open: boolean;
        message: string;
    }>({ open: false, message: "" });
    const [uploadSuccess, setUploadSuccess] = useState(false);
    const [step, setStep] = useState(0);
    const [featureNames, setFeatureNames] = useState<null | boolean>(null);
    const [missingDataOptions, setMissingDataOptions] = useState({
        blanks: true,
        na: false,
        other: false,
        otherText: "",
    });
    const [targetFeature, setTargetFeature] = useState<string | null>(null);
    const [targetType, setTargetType] = useState<
        "numerical" | "categorical" | null
    >(null);

    const navigate = useNavigate();
    const [searchParams] = useSearchParams();

    // Check for step parameter in URL
    useEffect(() => {
        const stepParam = searchParams.get('step');
        if (stepParam === '3') {
            setStep(3);
            setFeatureNames(true); // Assume feature names exist for step 3
        }
    }, [searchParams]);

    const handleError = (message: string) => {
        setErrorModal({ open: true, message });
    };

    // Only allow file selection via button
    const fileInputRef = React.useRef<HTMLInputElement>(null);
    const onBrowseClick = () => {
        if (fileInputRef.current) fileInputRef.current.value = "";
        fileInputRef.current?.click();
    };

    const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
        if (!ACCEPTED_FORMATS.includes(ext)) {
            setErrorModal({
                open: true,
                message: `File type not supported. Please upload a CSV, XLS, or XLSX file.`,
            });
            return;
        }
        if (file.size > MAX_SIZE_MB * 1024 * 1024) {
            setErrorModal({
                open: true,
                message: `File exceeds the ${MAX_SIZE_MB} MB size limit.`,
            });
            return;
        }
        setSelectedFile(file);
        setUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        try {
            const response = await axios.post(
                "/api/validate-upload",
                formData,
                {
                    headers: { "Content-Type": "multipart/form-data" },
                }
            );
            if (response.data.success) {
                setFeatureNames(response.data.has_feature_names);
                setStep(1);
            } else {
                setErrorModal({ open: true, message: response.data.message });
                setSelectedFile(null);
            }
        } catch (error: any) {
            let message = "An unknown error occurred.";
            if (
                error.response &&
                error.response.data &&
                error.response.data.message
            ) {
                message = error.response.data.message;
            }
            setErrorModal({ open: true, message });
            setSelectedFile(null);
        } finally {
            setUploading(false);
        }
    };

    if (step === 1) {
        const handleFirstQuestionNext = () => {
            setStep(2);
        };

        return (
            <FirstQuestion
                featureNames={featureNames}
                setFeatureNames={setFeatureNames}
                onNext={handleFirstQuestionNext}
                onError={handleError}
            />
        );
    }

    if (step === 2) {
        const handleSecondQuestionBack = () => setStep(1);
        const handleSecondQuestionNext = () => setStep(3);
        return (
            <SecondQuestion
                missingDataOptions={missingDataOptions}
                setMissingDataOptions={setMissingDataOptions}
                featureNames={featureNames!}
                onBack={handleSecondQuestionBack}
                onNext={handleSecondQuestionNext}
                onError={handleError}
            />
        );
    }

    if (step === 3) {
        const handleThirdQuestionBack = () => setStep(2);
        const handleThirdQuestionNext = () => {
            navigate("/dashboard");
        };
        return (
            <ThirdQuestion
                targetFeature={targetFeature}
                setTargetFeature={setTargetFeature}
                targetType={targetType}
                setTargetType={setTargetType}
                missingDataOptions={missingDataOptions}
                featureNames={featureNames!}
                onBack={handleThirdQuestionBack}
                onNext={handleThirdQuestionNext}
                onError={handleError}
            />
        );
    }

    return (
        <div
            className={`min-h-screen flex flex-col items-center justify-center bg-white ${
                errorModal.open ? "overflow-hidden h-screen" : ""
            }`}
        >
            {errorModal.open && (
                <ErrorModal
                    message={errorModal.message}
                    onClose={() => setErrorModal({ open: false, message: "" })}
                />
            )}
            <h1 className="text-4xl font-bold mb-2">The Missing Data Tool</h1>
            <h2 className="text-lg text-gray-600 mb-8">
                Explore patterns of missing data and get actionable insights.
            </h2>
            <div className="w-[90vw] max-w-xl h-[350px] sm:h-[450px] flex flex-col items-center justify-center mb-6 px-4">
                <div
                    className={`border-2 border-dashed rounded-3xl w-full h-full flex flex-col items-center justify-center transition-colors duration-200 ${
                        uploading ? "pointer-events-none opacity-60" : ""
                    }`}
                >
                    <input
                        ref={fileInputRef}
                        type="file"
                        accept={ACCEPTED_FORMATS.join(",")}
                        style={{ display: "none" }}
                        onChange={onFileChange}
                    />
                    <h3 className="text-xl font-medium mb-2">
                        Drag &amp; drop dataset here
                    </h3>
                    <p className="mb-2 text-gray-700">or</p>
                    <button
                        type="button"
                        className={`${styles.button} ${styles.primary} text-lg font-semibold mb-2`}
                        onClick={onBrowseClick}
                        disabled={uploading}
                        style={{ minWidth: 120 }}
                    >
                        {uploading ? "Uploading..." : "Browse file"}
                    </button>
                    <p className="text-sm text-gray-500 text-center">
                        Supported formats: csv, xls, xlsx
                        <br />
                        File size limit: {MAX_SIZE_MB} MB
                    </p>
                </div>
            </div>
            <p className="text-sm text-gray-500 mt-2 text-center max-w-xl">
                Developers won't have access to your files. The analysis won't
                be saved once you close the browser window.
            </p>
        </div>
    );
}
