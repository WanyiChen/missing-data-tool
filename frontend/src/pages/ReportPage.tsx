import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { PDFViewer, pdf } from "@react-pdf/renderer";
import api from "../config";
import styles from "../components/common/Button.module.css";
import ReportDocument from "../components/report/ReportDocument";

interface ReportSection {
  id: string;
  title: string;
  checked: boolean;
}

interface CorrelatedFeature {
  feature_name: string;
  correlation_value: number;
  correlation_type: "r" | "V" | "η";
}

interface InformativeMissingness {
  is_informative: boolean;
  p_value: number;
}

interface MissingFeatureReportRow {
  feature_name: string;
  data_type: "N" | "C";
  number_missing: number;
  percentage_missing: number;
  most_correlated_with: CorrelatedFeature | null;
  correlated_features?: CorrelatedFeature[];
  informative_missingness?: InformativeMissingness;
}

interface CompleteFeatureReportRow {
  feature_name: string;
  data_type: "N" | "C";
  most_correlated_with: CorrelatedFeature | null;
  correlated_features?: CorrelatedFeature[];
}

interface RecommendationReportRow {
  features: string[] | string;
  recommendation_type: string;
  reason: string;
}

interface ReportData {
  fileName: string;
  mechanism: {
    mechanism_acronym: string;
    mechanism_full: string;
    p_value: number;
  } | null;
  caseCount: {
    total_cases: number;
    total_missing_cases: number;
    missing_percentage: number;
  } | null;
  featureCount: {
    total_features: number;
    features_with_missing: number;
    missing_feature_percentage: number;
  } | null;
  missingFeatures: MissingFeatureReportRow[];
  completeFeatures: CompleteFeatureReportRow[];
  recommendations: RecommendationReportRow[];
  hasTargetFeature: boolean;
  targetFeatureName?: string;
}




const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([
    { id: "summary", title: "Summary of missing data", checked: true },
    { id: "missing-features", title: '"Features with missing data" table', checked: true },
    { id: "complete-features", title: '"Features with complete data" table', checked: false },
    { id: "recommendations", title: "Recommendations on missing data treatment", checked: true },
  ]);

  const getStoredThresholds = useCallback(() => {
    const saved = localStorage.getItem('correlationThresholds');
    const defaults = {
      pearsonThreshold: 0.7,
      cramerVThreshold: 0.7,
      etaThreshold: 0.7,
    };

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        return {
          pearson_threshold: (parsed.pearsonThreshold ?? defaults.pearsonThreshold).toString(),
          cramer_v_threshold: (parsed.cramerVThreshold ?? defaults.cramerVThreshold).toString(),
          eta_threshold: (parsed.etaThreshold ?? defaults.etaThreshold).toString(),
        };
      } catch {
        return {
          pearson_threshold: defaults.pearsonThreshold.toString(),
          cramer_v_threshold: defaults.cramerVThreshold.toString(),
          eta_threshold: defaults.etaThreshold.toString(),
        };
      }
    }

    return {
      pearson_threshold: defaults.pearsonThreshold.toString(),
      cramer_v_threshold: defaults.cramerVThreshold.toString(),
      eta_threshold: defaults.etaThreshold.toString(),
    };
  }, []);

  const fetchReportData = useCallback(async () => {
    setLoading(true);
    try {
      const [
        mechanismRes,
        caseCountRes,
        featureCountRes,
        missingFeaturesRes,
        completeFeaturesRes,
        recommendationsRes,
        targetFeatureRes,
      ] = await Promise.allSettled([
        api.get("/api/missing-mechanism"),
        api.get("/api/case-count"),
        api.get("/api/feature-count"),
        api.get("/api/missing-features-table?page=0&limit=1000"),
        api.get("/api/complete-features-table?page=0&limit=1000"),
        api.get("/api/missing-data-recommendations"),
        api.get("/api/target-feature-status"),
      ]);
      

      const fileName = sessionStorage.getItem("uploadedFileName") || "dataset";
      const thresholds = getStoredThresholds();
      const params = new URLSearchParams(thresholds);

      // Get basic missing features data
      let missingFeatures: MissingFeatureReportRow[] = [];
      if (missingFeaturesRes.status === "fulfilled" && missingFeaturesRes.value.data.success) {
        const basicFeatures: MissingFeatureReportRow[] = missingFeaturesRes.value.data.features;

        const detailedAnalysisPromises = basicFeatures.map(async (feature: MissingFeatureReportRow) => {
          try {
            const res = await api.get(`/api/feature-details/${encodeURIComponent(feature.feature_name)}?${params}`);
            if (res.data.success) {
              return {
                ...feature,
                most_correlated_with: res.data.correlated_features.length > 0 ? res.data.correlated_features[0] : null,
                correlated_features: res.data.correlated_features,
                informative_missingness: res.data.informative_missingness,
              };
            }
            return feature;
          } catch (error) {
            console.error(`Error fetching details for ${feature.feature_name}:`, error);
            return feature;
          }
        });

        const detailedResults = await Promise.allSettled(detailedAnalysisPromises);
        missingFeatures = detailedResults.map((result, index) =>
          result.status === "fulfilled" ? result.value : basicFeatures[index]
        );
      }

      // Get complete features with correlation details filtered by the same thresholds as dashboard controls
      let completeFeatures: CompleteFeatureReportRow[] = [];
      if (completeFeaturesRes.status === "fulfilled" && completeFeaturesRes.value.data.success) {
        const basicCompleteFeatures: CompleteFeatureReportRow[] = completeFeaturesRes.value.data.features;

        const completeAnalysisPromises = basicCompleteFeatures.map(async (feature: CompleteFeatureReportRow) => {
          try {
            const res = await api.get(`/api/feature-details/${encodeURIComponent(feature.feature_name)}?${params}`);
            if (res.data.success) {
              return {
                ...feature,
                most_correlated_with: res.data.correlated_features.length > 0 ? res.data.correlated_features[0] : null,
                correlated_features: res.data.correlated_features,
              };
            }
            return feature;
          } catch (error) {
            console.error(`Error fetching complete feature details for ${feature.feature_name}:`, error);
            return feature;
          }
        });

        const completeResults = await Promise.allSettled(completeAnalysisPromises);
        completeFeatures = completeResults.map((result, index) =>
          result.status === "fulfilled" ? result.value : basicCompleteFeatures[index]
        );
      }

      setReportData({
        fileName,
        mechanism:
          mechanismRes.status === "fulfilled" && mechanismRes.value.data.success
            ? mechanismRes.value.data
            : null,
        caseCount:
          caseCountRes.status === "fulfilled" && caseCountRes.value.data.success
            ? caseCountRes.value.data
            : null,
        featureCount:
          featureCountRes.status === "fulfilled" && featureCountRes.value.data.success
            ? featureCountRes.value.data
            : null,
        missingFeatures,
        completeFeatures,
        recommendations:
          recommendationsRes.status === "fulfilled" && recommendationsRes.value.data.success
            ? recommendationsRes.value.data.recommendations
            : [],
        hasTargetFeature:
          targetFeatureRes.status === "fulfilled" && targetFeatureRes.value.data.success
            ? targetFeatureRes.value.data.has_target_feature
            : false,
        targetFeatureName:
          targetFeatureRes.status === "fulfilled" && targetFeatureRes.value.data.success
            ? targetFeatureRes.value.data.target_feature
            : undefined,
      });
    } catch (error) {
      console.error("Error fetching report data:", error);
    } finally {
      setLoading(false);
    }
  }, [getStoredThresholds]);

  useEffect(() => {
    void fetchReportData();
  }, [fetchReportData]);

  const handleSectionToggle = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, checked: !section.checked } : section
      )
    );
  };

  const handleDownloadPDF = async () => {
    if (!reportData) return;
    const blob = await pdf(
      <ReportDocument reportData={reportData} sections={sections} />
    ).toBlob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `missing-data-report-${reportData.fileName.replace(/\.[^/.]+$/, "")}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };



  if (loading || !reportData) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#fff" }}>
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              width: "32px",
              height: "32px",
              border: "3px solid #e5e7eb",
              borderTopColor: "#3b82f6",
              borderRadius: "50%",
              animation: "spin 0.8s linear infinite",
              margin: "0 auto 16px",
            }}
          />
          <p style={{ color: "#6b7280", fontFamily: "sans-serif" }}>Loading report data…</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  return (
    <div style={pageStyles.root}>
      {/* Page title */}
      <div style={pageStyles.titleBar}>
        <span style={{ ...pageStyles.titleText, fontWeight: "bold" }}>Download report</span>
      </div>

      <div style={pageStyles.body}>
        {/* Top Panel - Checkboxes */}
        <div style={pageStyles.leftPanel}>
          <p style={pageStyles.checkboxGroupLabel}>What would you like to include in your report?</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {sections.map((section) => (
              <label key={section.id} style={pageStyles.checkboxLabel}>
                <input
                  type="checkbox"
                  checked={section.checked}
                  onChange={() => handleSectionToggle(section.id)}
                  style={{ width: "15px", height: "15px", cursor: "pointer", flexShrink: 0, marginTop: "1px", accentColor: "#222" }}
                />
                <span style={{ fontSize: "13.5px", color: "#111", lineHeight: "1.4" }}>
                  {section.title}
                </span>
              </label>
            ))}
          </div>
        </div>

        <div style={pageStyles.footer}>
          <button
            onClick={() => navigate("/dashboard")}
            className={`${styles.button} ${styles.secondary}`}
          >
            Back
          </button>
          <button
            onClick={handleDownloadPDF}
            className={`${styles.button} ${styles.primary}`}
          >
            Download
          </button>
        </div>

        {/* PDF Preview */}
        <div style={pageStyles.rightPanel}>
          <p style={{ ...pageStyles.checkboxGroupLabel, margin: "0 0 12px 0", fontWeight: "bold" }}>PDF preview</p>
          <div style={pageStyles.previewBox}>
            <PDFViewer width="100%" height="100%" style={{ border: "none", minHeight: "1000px" }}>
              <ReportDocument reportData={reportData} sections={sections} />
            </PDFViewer>
          </div>
        </div>
      </div>
    </div>
  );
};

const pageStyles: Record<string, React.CSSProperties> = {
  root: {
    minHeight: "100vh",
    backgroundColor: "#fff",
    display: "flex",
    flexDirection: "column",
    fontFamily: "'Segoe UI', system-ui, sans-serif",
    fontSize: "14px",
    color: "#111",
  },
  titleBar: {
    padding: "16px 24px",
    borderBottom: "1px solid #d1d5db",
  },
  titleText: {
    fontWeight: 600,
    fontSize: "18px"
  },
  body: {
    display: "flex",
    flexDirection: "column",
    flex: 1,
    overflow: "hidden",
  },
  leftPanel: {
    width: "100%",
    flexShrink: 0,
    padding: "20px 24px",
    borderBottom: "1px solid #d1d5db",
  },
  checkboxGroupLabel: {
    fontWeight: 500,
    fontSize: "14px",
    marginBottom: "12px",
    lineHeight: "1.4",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "8px",
    cursor: "pointer",
  },
  rightPanel: {
    flex: 1,
    backgroundColor: "#f3f4f6",
    padding: "16px 24px",
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  previewBox: {
    flex: 1,
    backgroundColor: "#fff",
    borderRadius: "8px",
    overflow: "hidden",
    display: "flex",
    boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
  },
  footer: {
    padding: "16px 24px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottom: "1px solid #d1d5db",
    gap: "12px",
  },
};




// const pageStyles: Record<string, React.CSSProperties> = {
//   root: {
//     minHeight: "100vh",
//     backgroundColor: "#fff",
//     display: "flex",
//     flexDirection: "column",
//     fontFamily: "'Segoe UI', system-ui, sans-serif",
//     fontSize: "14px",
//     color: "#111",
//   },
//   titleBar: {
//     padding: "14px 20px",
//     borderBottom: "1px solid #d1d5db",
//     backgroundColor: "#fff",
//   },
//   titleText: {
//     fontWeight: 600,
//     fontSize: "15px",
//     color: "#111",
//   },
//   body: {
//     display: "flex",
//     flex: 1,
//     overflow: "hidden",
//   },
//   leftPanel: {
//     width: "260px",
//     flexShrink: 0,
//     borderRight: "1px solid #d1d5db",
//     padding: "20px 18px",
//     backgroundColor: "#fff",
//     overflowY: "auto",
//   },
//   checkboxGroupLabel: {
//     fontWeight: 500,
//     fontSize: "13px",
//     color: "#111",
//     marginBottom: "12px",
//     lineHeight: "1.4",
//   },
//   checkboxLabel: {
//     display: "flex",
//     alignItems: "flex-start",
//     gap: "8px",
//     cursor: "pointer",
//   },
//   rightPanel: {
//     flex: 1,
//     backgroundColor: "#e5e7eb",
//     overflowY: "auto",
//     padding: "24px",
//   },
//   previewArea: {
//     minHeight: "100%",
//     display: "flex",
//     justifyContent: "center",
//   },
//   footer: {
//     borderTop: "1px solid #d1d5db",
//     padding: "12px 20px",
//     display: "flex",
//     justifyContent: "space-between",
//     alignItems: "center",
//     backgroundColor: "#fff",
//   },
// };


export default ReportPage;