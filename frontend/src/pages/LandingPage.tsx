import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import FirstQuestion from "../components/FirstQuestion";
import SecondQuestion from "../components/SecondQuestion";
import ThirdQuestion from "../components/ThirdQuestion";
import styles from "../components/Button.module.css";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" />
            <div className="relative bg-white rounded-2xl shadow-xl max-w-md w-full p-8 flex flex-col items-center justify-center min-h-[300px]">
                <h2 className="text-xl font-bold mb-4 text-center">
                    Upload Error
                </h2>
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
            </div>
        </div>
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
    const [step, setStep] = useState(0); // 0: upload, 1: question
    const [previewRows, setPreviewRows] = useState<any[][] | null>(null);
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
            await axios.post("/api/validate-upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            // Parse file in browser for preview
            const parseFilePreview = (file: File): Promise<any[][]> => {
                return new Promise((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        try {
                            const data = e.target?.result;
                            let workbook;
                            if (file.name.endsWith(".csv")) {
                                workbook = XLSX.read(data, { type: "string" });
                            } else {
                                workbook = XLSX.read(data, { type: "array" });
                            }
                            const sheet =
                                workbook.Sheets[workbook.SheetNames[0]];
                            const rows = XLSX.utils.sheet_to_json(sheet, {
                                header: 1,
                                blankrows: false,
                            }) as any[][];
                            resolve(rows.slice(0, 12));
                        } catch (err) {
                            reject(err);
                        }
                    };
                    if (file.name.endsWith(".csv")) {
                        reader.readAsText(file);
                    } else {
                        reader.readAsArrayBuffer(file);
                    }
                });
            };
            const rows = await parseFilePreview(file);
            setPreviewRows(rows);
            const firstRow = rows[0];
            const allStrings = firstRow.every(
                (cell) => typeof cell === "string"
            );
            if (allStrings) {
                setFeatureNames(true);
            } else {
                setFeatureNames(false);
            }
            setStep(1);
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

    if (step === 1 && previewRows) {
        const handleFirstQuestionNext = () => {
            if (!previewRows) return;
            setStep(2);
        };
        return (
            <FirstQuestion
                previewRows={previewRows || []}
                featureNames={featureNames}
                setFeatureNames={setFeatureNames}
                onBack={() => setStep(0)}
                onNext={handleFirstQuestionNext}
            />
        );
    }

    if (step === 2 && previewRows) {
        const handleSecondQuestionBack = () => setStep(1);
        const handleSecondQuestionNext = () => setStep(3);
        return (
            <SecondQuestion
                featureNames={featureNames}
                previewRows={previewRows}
                missingDataOptions={missingDataOptions}
                setMissingDataOptions={setMissingDataOptions}
                onBack={handleSecondQuestionBack}
                onNext={handleSecondQuestionNext}
            />
        );
    }

    if (step === 3 && previewRows) {
        const handleThirdQuestionBack = () => setStep(2);
        const handleThirdQuestionNext = async () => {
            setUploading(true);
            const formData = new FormData();
            formData.append(
                "missingDataOptions",
                JSON.stringify(missingDataOptions)
            );
            formData.append("targetFeature", targetFeature || "");
            formData.append("targetType", targetType || "");
            try {
                await axios.post("/api/submit-data", formData, {
                    headers: { "Content-Type": "multipart/form-data" },
                });
                navigate("/dashboard");
            } catch (error: any) {
                let message = "Failed to submit data.";
                if (
                    error.response &&
                    error.response.data &&
                    error.response.data.message
                ) {
                    message = error.response.data.message;
                }
                setErrorModal({ open: true, message });
            } finally {
                setUploading(false);
            }
        };
        return (
            <ThirdQuestion
                featureNames={featureNames}
                previewRows={previewRows}
                targetFeature={targetFeature}
                setTargetFeature={setTargetFeature}
                targetType={targetType}
                setTargetType={setTargetType}
                onBack={handleThirdQuestionBack}
                onNext={handleThirdQuestionNext}
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
