import html2pdf from 'html2pdf.js';
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
// import DownloadIcon from "@mui/icons-material/Download";
import styles from "../components/common/Button.module.css";

interface ReportSection {
  id: string;
  title: string;
  checked: boolean;
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
  missingFeatures: any[];
  completeFeatures: any[];
  recommendations: any[];
  hasTargetFeature: boolean;
  targetFeatureName?: string;
}

const ReportPage: React.FC = () => {
  const navigate = useNavigate();
  const previewRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [sections, setSections] = useState<ReportSection[]>([
    { id: "summary", title: "Summary of missing data", checked: true },
    { id: "missing-features", title: '"Features with missing data" table', checked: true },
    { id: "complete-features", title: '"Features with complete data" table', checked: false },
    { id: "recommendations", title: "Recommendations on missing data treatment", checked: true },
  ]);

  const getStoredThresholds = () => {
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
          pearson_threshold: (parsed.pearsonThreshold || defaults.pearsonThreshold).toString(),
          cramer_v_threshold: (parsed.cramerVThreshold || defaults.cramerVThreshold).toString(),
          eta_threshold: (parsed.etaThreshold || defaults.etaThreshold).toString(),
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
  };

  useEffect(() => {
    fetchReportData();

  }, []);

  const fetchReportData = async () => {
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
        axios.get("/api/missing-mechanism"),
        axios.get("/api/case-count"),
        axios.get("/api/feature-count"),
        axios.get("/api/missing-features-table?page=0&limit=1000"),
        axios.get("/api/complete-features-table?page=0&limit=1000"),
        axios.get("/api/missing-data-recommendations"),
        axios.get("/api/target-feature-status"),
      ]);
      

      const fileName = sessionStorage.getItem("uploadedFileName") || "dataset";

      console.log("target feature: ", targetFeatureRes);
      
      // Get basic missing features data
      let missingFeatures = [];
      if (missingFeaturesRes.status === "fulfilled" && missingFeaturesRes.value.data.success) {
        const basicFeatures = missingFeaturesRes.value.data.features;
        
        // Fetch detailed analysis for each missing feature
        const detailedAnalysisPromises = basicFeatures.map(async (feature: any) => {
          try {
            const thresholds = getStoredThresholds();
            const params = new URLSearchParams(thresholds);
            const res = await axios.get(`/api/feature-details/${encodeURIComponent(feature.feature_name)}?${params}`);
            if (res.data.success) {
              return {
                ...feature,
                most_correlated_with: res.data.correlated_features.length > 0 ? res.data.correlated_features[0] : null,
                correlated_features: res.data.correlated_features,
                informative_missingness: res.data.informative_missingness
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
          result.status === 'fulfilled' ? result.value : basicFeatures[index]
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
        completeFeatures:
          completeFeaturesRes.status === "fulfilled" && completeFeaturesRes.value.data.success
            ? completeFeaturesRes.value.data.features
            : [],
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
  };

  const handleSectionToggle = (sectionId: string) => {
    setSections((prev) =>
      prev.map((section) =>
        section.id === sectionId ? { ...section, checked: !section.checked } : section
      )
    );
  };

//   const handleDownloadPDF = async () => {
//     if (!reportData) return;

//     try {
//       // Create a new window for printing
//       const printWindow = window.open('', '_blank');
//       if (!printWindow) {
//         // If popup blocked, fallback to text download
//         downloadTextReport();
//         return;
//       }

//       // Generate the complete HTML content for the report
//       const reportHTML = generateReportHTML();
      
//       printWindow.document.write(reportHTML);
//       printWindow.document.close();
      
//       // Wait for content to load, then trigger print dialog
//       printWindow.onload = () => {
//         setTimeout(() => {
//           printWindow.print();
//           // Close the window after printing (user can cancel)
//           printWindow.onafterprint = () => printWindow.close();
//         }, 500);
//       };
      
//     } catch (error) {
//       console.error('Error generating PDF:', error);
//       downloadTextReport();
//     }
//   };

const handleDownloadPDF = async () => {
  if (!reportData) return;

  try {
    // Generate the complete HTML content for the report
    const reportHTML = generateReportHTML();
    
    // Create a temporary div with the HTML content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = reportHTML;
    
    // Configure PDF options
    const options: any = {
      margin: 0.75,
      filename: `missing-data-report-${reportData.fileName.replace(/\.[^/.]+$/, "")}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'in', format: 'a4', orientation: 'portrait' }
    };
    
    // Generate and download PDF
    await html2pdf().set(options).from(tempDiv).save();
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    downloadTextReport();
  }
};


  const downloadTextReport = () => {
    const reportText = generateTextReport();
    const blob = new Blob([reportText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `missing-data-report-${reportData?.fileName.replace(/\.[^/.]+$/, "") || 'dataset'}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const generateReportHTML = (): string => {
    if (!reportData) return "";
    
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Missing Data Report - ${reportData.fileName}</title>
        <meta charset="utf-8">
        <style>
          body {
            margin: 0;
            padding: 40px;
            font-family: Calibri, 'Segoe UI', sans-serif;
            font-size: 13px;
            color: #000;
            line-height: 1.5;
            background: white;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          @media print {
            body { padding: 20px; }
            @page { margin: 0.75in; size: A4; }
            * {
              -webkit-print-color-adjust: exact !important;
              color-adjust: exact !important;
              print-color-adjust: exact !important;
            }
          }
          .doc-header {
            text-align: center;
            margin-bottom: 20px;
          }
          .doc-title {
            font-size: 16px;
            font-weight: 700;
            margin: 0 0 4px 0;
          }
          .doc-subtitle {
            font-size: 13px;
            margin: 0;
            color: #333;
          }
          .section {
            margin-bottom: 28px;
          }
          .section-heading {
            font-size: 13.5px;
            font-weight: 700;
            margin-bottom: 6px;
            margin-top: 0;
          }
          .summary-body {
            font-size: 13px;
            line-height: 1.3;
          }
          .summary-body p {
            margin: 0;
          }
          .summary-body .indent {
            padding-left: 16px;
            margin: 0;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            font-size: 12px;
            margin-bottom: 6px;
          }
          th {
            border: 1px solid #999;
            padding: 8px 12px;
            font-weight: 700;
            background-color: #f2f2f2 !important;
            text-align: left;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          td {
            border: 1px solid #bbb;
            padding: 8px 12px;
            vertical-align: top;
          }
          .highlight {
            background-color: #FFFFC5 !important;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .informative {
            color: #c0392b !important;
            font-weight: 600;
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          .empty-note {
            font-size: 12px;
            color: #666;
            font-style: italic;
          }
          .footnote {
            font-size: 11px;
            margin-top: 6px;
            color: #333;
          }
        </style>
      </head>
      <body>
        <div class="doc-header">
          <h1 class="doc-title">Missing data report</h1>
          <p class="doc-subtitle">File: ${reportData.fileName}</p>
        </div>
        ${generateSectionsHTML()}
      </body>
      </html>
    `;
  };

  const generateSectionsHTML = (): string => {
    let html = "";
    
    if (sections.find(s => s.id === "summary")?.checked) {
      html += generateSummaryHTML();
    }
    
    if (sections.find(s => s.id === "missing-features")?.checked) {
      html += generateMissingFeaturesHTML();
    }
    
    if (sections.find(s => s.id === "complete-features")?.checked) {
      html += generateCompleteFeaturesHTML();
    }
    
    if (sections.find(s => s.id === "recommendations")?.checked) {
      html += generateRecommendationsHTML();
    }
    
    return html;
  };

  const generateSummaryHTML = (): string => {
    if (!reportData) return "";
    const { mechanism, caseCount, featureCount } = reportData;
    
    let html = `<div class="section"><h2 class="section-heading">Summary of missing data</h2><div class="summary-body">`;
    
    if (mechanism) {
      html += `<p>Possible missing data mechanisms: ${mechanism.mechanism_full}</p>`;
      html += `<p class="indent">- Little's MCAR test: p-value = ${mechanism.p_value === 0 ? "0.0" : mechanism.p_value.toExponential(2)}</p>`;
    }
    
    if (caseCount) {
      html += `<p>Total number of cases: ${caseCount.total_cases?.toLocaleString() ?? "—"}</p>`;
      html += `<p>Total number of cases with missing data: ${caseCount.total_missing_cases?.toLocaleString()} (${caseCount.missing_percentage}%)</p>`;
    }
    
    if (featureCount) {
      html += `<p>Total number of features: ${featureCount.total_features?.toLocaleString() ?? "—"}</p>`;
      html += `<p style="margin: 0;">Total number of features with missing data: ${featureCount.features_with_missing} (${featureCount.missing_feature_percentage}%)</p>`;
    }
    
    html += `</div></div>`;
    return html;
  };

  const generateMissingFeaturesHTML = (): string => {
    if (!reportData) return "";
    const { missingFeatures, hasTargetFeature, targetFeatureName } = reportData;
    
    let html = `<div class="section"><h2 class="section-heading">Features with missing data</h2>`;
    
    if (missingFeatures.length > 0) {
      html += `<table><thead><tr>`;
      html += `<th>Data type</th><th>Feature name</th><th>Number missing</th><th>Percentage missing</th><th>Most correlated with</th>`;
      if (hasTargetFeature) {
        html += `<th>Informative missingness*</th>`;
      }
      html += `</tr></thead><tbody>`;
      
      missingFeatures.forEach(feature => {
        const isInformative = feature.informative_missingness?.is_informative;
        html += `<tr>`;
        html += `<td>${feature.data_type === "N" ? "Numerical" : "Categorical"}</td>`;
        html += `<td>${feature.feature_name}</td>`;
        html += `<td>${feature.number_missing?.toLocaleString()}</td>`;
        html += `<td>${feature.percentage_missing?.toFixed(0)}%</td>`;
        html += `<td>${feature.most_correlated_with ? `${feature.most_correlated_with.feature_name} (${feature.most_correlated_with.correlation_type} = ${feature.most_correlated_with.correlation_value?.toFixed(3)})` : "—"}</td>`;
        
        if (hasTargetFeature) {
            if (isInformative) {
                html += `<td class="highlight">Yes (p = ${feature.informative_missingness?.p_value?.toFixed(2) ?? "—"})</td>`;
            } else {
                html += `<td>No${feature.informative_missingness?.p_value !== undefined ? ` (p = ${feature.informative_missingness.p_value.toFixed(2)})` : ""}</td>`;
            }
        }
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
      
      if (hasTargetFeature && targetFeatureName) {
        html += `<p class="footnote">*Target feature: ${targetFeatureName}</p>`;
      }
    } else {
      html += `<p class="empty-note">No features with missing data found.</p>`;
    }
    
    html += `</div>`;
    return html;
  };

  const generateCompleteFeaturesHTML = (): string => {
    if (!reportData) return "";
    const { completeFeatures } = reportData;
    
    let html = `<div class="section"><h2 class="section-heading">Features with complete data</h2>`;
    
    if (completeFeatures.length > 0) {
      html += `<table><thead><tr><th>Data type</th><th>Feature name</th></tr></thead><tbody>`;
      
      completeFeatures.forEach(feature => {
        html += `<tr>`;
        html += `<td>${feature.data_type === "N" ? "Numerical" : "Categorical"}</td>`;
        html += `<td>${feature.feature_name}</td>`;
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
    } else {
      html += `<p class="empty-note">No features with complete data found.</p>`;
    }
    
    html += `</div>`;
    return html;
  };

  const generateRecommendationsHTML = (): string => {
    if (!reportData) return "";
    const { recommendations } = reportData;
    
    let html = `<div class="section"><h2 class="section-heading">Missing data treatment recommendations</h2>`;
    
    if (recommendations.length > 0) {
      html += `<table><thead><tr><th>Features with missing data</th><th>Recommended missing data treatment</th><th>Reasons</th></tr></thead><tbody>`;
      
      recommendations.forEach(rec => {
        html += `<tr>`;
        html += `<td>${Array.isArray(rec.features) ? rec.features.join(", ") : rec.features}</td>`;
        html += `<td>${rec.recommendation_type}</td>`;
        html += `<td>${rec.reason}</td>`;
        html += `</tr>`;
      });
      
      html += `</tbody></table>`;
    } else {
      html += `<p class="empty-note">No recommendations available.</p>`;
    }
    
    html += `</div>`;
    return html;
  };

  const generateTextReport = (): string => {
    if (!reportData) return "No data available";
    
    let report = `Missing Data Analysis Report\n`;
    report += `File: ${reportData.fileName}\n`;
    report += `Generated: ${new Date().toLocaleDateString()}\n\n`;
    
    if (sections.find(s => s.id === "summary")?.checked) {
      report += `SUMMARY OF MISSING DATA\n`;
      report += `========================\n`;
      if (reportData.mechanism) {
        report += `Possible missing data mechanisms: ${reportData.mechanism.mechanism_full}\n`;
        report += `- Little's MCAR test: p-value = ${reportData.mechanism.p_value.toExponential(2)}\n`;
      }
      if (reportData.caseCount) {
        report += `Total number of cases: ${reportData.caseCount.total_cases?.toLocaleString() ?? "—"}\n`;
        report += `Total number of cases with missing data: ${reportData.caseCount.total_missing_cases?.toLocaleString()} (${reportData.caseCount.missing_percentage}%)\n`;
      }
      if (reportData.featureCount) {
        report += `Total number of features: ${reportData.featureCount.total_features?.toLocaleString() ?? "—"}\n`;
        report += `Total number of features with missing data: ${reportData.featureCount.features_with_missing} (${reportData.featureCount.missing_feature_percentage}%)\n`;
      }
      report += `\n`;
    }
    
    if (sections.find(s => s.id === "missing-features")?.checked && reportData.missingFeatures.length > 0) {
      report += `FEATURES WITH MISSING DATA\n`;
      report += `===========================\n`;
      reportData.missingFeatures.forEach(feature => {
        report += `${feature.feature_name} (${feature.data_type === "N" ? "Numerical" : "Categorical"}): ${feature.number_missing?.toLocaleString()} missing (${feature.percentage_missing?.toFixed(0)}%)\n`;
      });
      report += `\n`;
    }
    
    if (sections.find(s => s.id === "recommendations")?.checked && reportData.recommendations.length > 0) {
      report += `MISSING DATA TREATMENT RECOMMENDATIONS\n`;
      report += `=======================================\n`;
      reportData.recommendations.forEach(rec => {
        const features = Array.isArray(rec.features) ? rec.features.join(", ") : rec.features;
        report += `Features: ${features}\n`;
        report += `Treatment: ${rec.recommendation_type}\n`;
        report += `Reason: ${rec.reason}\n\n`;
      });
    }
    
    return report;
  };

  const renderSummarySection = () => {
    if (!reportData) return null;
    const { mechanism, caseCount, featureCount } = reportData;

    const mechanismLine = mechanism
      ? `Possible missing data mechanisms: ${mechanism.mechanism_full}`
      : null;

    return (
      <section style={{ marginBottom: "28px" }}>
        <h2 style={docStyles.sectionHeading}>Summary of missing data</h2>
        <div style={docStyles.summaryBody}>
          {mechanismLine && <p style={{ margin: "0 0 4px 0" }}>{mechanismLine}</p>}
          {mechanism && (
            <p style={{ margin: "0 0 4px 0", paddingLeft: "16px" }}>
              - Little's MCAR test: p-value = {mechanism.p_value === 0 ? "0.0" : mechanism.p_value.toExponential(2)}
            </p>
          )}
          {caseCount && (
            <>
              <p style={{ margin: "0 0 4px 0" }}>
                Total number of cases: {caseCount.total_cases?.toLocaleString() ?? "—"}
              </p>
              <p style={{ margin: "0 0 4px 0" }}>
                Total number of cases with missing data:{" "}
                {caseCount.total_missing_cases?.toLocaleString()} ({caseCount.missing_percentage}%)
              </p>
            </>
          )}
          {featureCount && (
            <>
              <p style={{ margin: "0 0 4px 0" }}>
                Total number of features: {featureCount.total_features?.toLocaleString() ?? "—"}
              </p>
              <p style={{ margin: "0" }}>
                Total number of features with missing data:{" "}
                {featureCount.features_with_missing} ({featureCount.missing_feature_percentage}%)
              </p>
            </>
          )}
        </div>
      </section>
    );
  };

  const renderMissingFeaturesSection = () => {
    if (!reportData) return null;
    const { missingFeatures, hasTargetFeature, targetFeatureName } = reportData;

    return (
      <section style={{ marginBottom: "28px" }}>
        <h2 style={docStyles.sectionHeading}>Features with missing data</h2>
        {missingFeatures.length > 0 ? (
          <>
            <table style={docStyles.table}>
              <thead>
                <tr>
                  <th style={docStyles.th}>Data type</th>
                  <th style={docStyles.th}>Feature name</th>
                  <th style={docStyles.th}>Number missing</th>
                  <th style={docStyles.th}>Percentage missing</th>
                  <th style={docStyles.th}>Most correlated with</th>
                  {hasTargetFeature && (
                    <th style={{ ...docStyles.th, color: "#000" }}>
                      Informative missingness*
                    </th>
                  )}
                </tr>
              </thead>
              <tbody>
                {missingFeatures.map((feature, index) => {
                  const isInformative = feature.informative_missingness?.is_informative;
                  return (
                    <tr key={index}>
                      <td style={docStyles.td}>
                        {feature.data_type === "N" ? "Numerical" : "Categorical"}
                      </td>
                      <td style={docStyles.td}>{feature.feature_name}</td>
                      <td style={docStyles.td}>{feature.number_missing?.toLocaleString()}</td>
                      <td style={docStyles.td}>{feature.percentage_missing?.toFixed(0)}%</td>
                      <td style={docStyles.td}>
                        {feature.most_correlated_with
                          ? `${feature.most_correlated_with.feature_name} (${feature.most_correlated_with.correlation_type} = ${feature.most_correlated_with.correlation_value?.toFixed(3)})`
                          : "—"}
                      </td>
                      {hasTargetFeature && (
                        <td style={isInformative ? docStyles.tdHighlight : docStyles.td}>
                          {isInformative ? (
                            <span>
                              Yes (p = {feature.informative_missingness?.p_value?.toFixed(2) ?? "—"})
                            </span>
                          ) : (
                            <span>
                              No{" "}
                              {feature.informative_missingness?.p_value !== undefined &&
                                `(p = ${feature.informative_missingness.p_value.toFixed(2)})`}
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
            {hasTargetFeature && targetFeatureName && (
              <p style={{ fontSize: "11px", marginTop: "6px", color: "#333" }}>
                *Target feature: {targetFeatureName}
              </p>
            )}
          </>
        ) : (
          <p style={docStyles.emptyNote}>No features with missing data found.</p>
        )}
      </section>
    );
  };

  const renderCompleteFeaturesSection = () => {
    if (!reportData) return null;
    const { completeFeatures } = reportData;

    return (
      <section style={{ marginBottom: "28px" }}>
        <h2 style={docStyles.sectionHeading}>Features with complete data</h2>
        {completeFeatures.length > 0 ? (
          <table style={docStyles.table}>
            <thead>
              <tr>
                <th style={docStyles.th}>Data type</th>
                <th style={docStyles.th}>Feature name</th>
              </tr>
            </thead>
            <tbody>
              {completeFeatures.map((feature, index) => (
                <tr key={index}>
                  <td style={docStyles.td}>
                    {feature.data_type === "N" ? "Numerical" : "Categorical"}
                  </td>
                  <td style={docStyles.td}>{feature.feature_name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={docStyles.emptyNote}>No features with complete data found.</p>
        )}
      </section>
    );
  };

  const renderRecommendationsSection = () => {
    if (!reportData) return null;
    const { recommendations } = reportData;

    return (
      <section style={{ marginBottom: "28px" }}>
        <h2 style={docStyles.sectionHeading}>Missing data treatment recommendations</h2>
        {recommendations.length > 0 ? (
          <table style={docStyles.table}>
            <thead>
              <tr>
                <th style={docStyles.th}>Features with missing data</th>
                <th style={docStyles.th}>Recommended missing data treatment</th>
                <th style={docStyles.th}>Reasons</th>
              </tr>
            </thead>
            <tbody>
              {recommendations.map((rec, index) => (
                <tr key={index}>
                  <td style={docStyles.td}>
                    {Array.isArray(rec.features)
                      ? rec.features.join(", ")
                      : rec.features}
                  </td>
                  <td style={docStyles.td}>{rec.recommendation_type}</td>
                  <td style={docStyles.td}>{rec.reason}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p style={docStyles.emptyNote}>No recommendations available.</p>
        )}
      </section>
    );
  };

  if (loading) {
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
            <p style={{ ...pageStyles.checkboxGroupLabel, margin: "0", fontWeight: "bold" }}>PDF preview</p>
          </div>
        </div>

        {/* Bottom Panel - PDF Preview */}
        <div style={pageStyles.rightPanel}>
          <div style={{ marginBottom: "24px" }}></div>
        <div style={pageStyles.previewBox}>
          <div ref={previewRef} style={pageStyles.previewArea}>
            {/* White "paper" document */}
            <div style={docStyles.paper} data-pdf-content>
              {/* Document header */}
              <div style={docStyles.docHeader}>
                <h1 style={docStyles.docTitle}>Missing data report</h1>
                <p style={docStyles.docSubtitle}>File: {reportData?.fileName ?? "[file name]"}</p>
              </div>

              {/* Conditional sections */}
              {sections.find((s) => s.id === "summary")?.checked && renderSummarySection()}
              {sections.find((s) => s.id === "missing-features")?.checked &&
                renderMissingFeaturesSection()}
              {sections.find((s) => s.id === "complete-features")?.checked &&
                renderCompleteFeaturesSection()}
              {sections.find((s) => s.id === "recommendations")?.checked &&
                renderRecommendationsSection()}
            </div>
          </div>
        </div>
        </div>
      </div>

      {/* Footer */}
      <div style={pageStyles.footer}>
        <button
          onClick={() => navigate("/dashboard")}
          className={`${styles.button} ${styles.secondary}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          <ArrowBackIcon style={{ fontSize: "16px" }} />
          Back
        </button>
        <button 
          onClick={handleDownloadPDF} 
          className={`${styles.button} ${styles.primary}`}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
        >
          Download
        </button>
      </div>
    </div>
  );


//   return (
//     <div style={pageStyles.root}>
//       {/* Page title */}
//       <div style={pageStyles.titleBar}>
//         <span style={pageStyles.titleText}>Download report</span>
//       </div>

//       <div style={pageStyles.body}>
//         {/* Left Panel */}
//         <div style={pageStyles.leftPanel}>
//           <p style={pageStyles.checkboxGroupLabel}>What would you like to include in your report?</p>
//           <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
//             {sections.map((section) => (
//               <label key={section.id} style={pageStyles.checkboxLabel}>
//                 <input
//                   type="checkbox"
//                   checked={section.checked}
//                   onChange={() => handleSectionToggle(section.id)}
//                   style={{ width: "15px", height: "15px", cursor: "pointer", flexShrink: 0, marginTop: "1px" }}
//                 />
//                 <span style={{ fontSize: "13.5px", color: "#111", lineHeight: "1.4" }}>
//                   {section.title}
//                 </span>
//               </label>
//             ))}
//           </div>

//           <div style={{ marginTop: "24px" }}>
//             <p style={{ ...pageStyles.checkboxGroupLabel, marginBottom: "0" }}>PDF preview</p>
//           </div>
//         </div>

//         {/* Right Panel - PDF Preview */}
//         <div style={pageStyles.rightPanel}>
//           <div ref={previewRef} style={pageStyles.previewArea}>
//             {/* White "paper" document */}
//             <div style={docStyles.paper} data-pdf-content>
//               {/* Document header */}
//               <div style={docStyles.docHeader}>
//                 <h1 style={docStyles.docTitle}>Missing data report</h1>
//                 <p style={docStyles.docSubtitle}>File: {reportData?.fileName ?? "[file name]"}</p>
//               </div>


//               {/* Conditional sections */}
//               {sections.find((s) => s.id === "summary")?.checked && renderSummarySection()}
//               {sections.find((s) => s.id === "missing-features")?.checked &&
//                 renderMissingFeaturesSection()}
//               {sections.find((s) => s.id === "complete-features")?.checked &&
//                 renderCompleteFeaturesSection()}
//               {sections.find((s) => s.id === "recommendations")?.checked &&
//                 renderRecommendationsSection()}
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Footer */}
//       <div style={pageStyles.footer}>
//         <button
//           onClick={() => navigate("/dashboard")}
//           className={`${styles.button} ${styles.secondary}`}
//           style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
//         >
//           <ArrowBackIcon style={{ fontSize: "16px" }} />
//           Back
//         </button>
//         <button 
//           onClick={handleDownloadPDF} 
//           className={`${styles.button} ${styles.primary}`}
//           style={{ display: "inline-flex", alignItems: "center", gap: "6px" }}
//         >
//           <DownloadIcon style={{ fontSize: "16px" }} />
//           Download PDF
//         </button>
//       </div>
//     </div>
//   );
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
    padding: "14px 20px",
    borderBottom: "3px solid #d1d5db",
    backgroundColor: "#fff",
  },
  titleText: {
    fontWeight: 600,
    fontSize: "15px",
    color: "#111",
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
    borderBottom: "1px solid #d1d5db",
    padding: "20px 24px",
    backgroundColor: "#fff",
  },
  checkboxGroupLabel: {
    fontWeight: 500,
    fontSize: "13px",
    color: "#111",
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
    backgroundColor: "#e5e7eb",
    padding: "0 24px 24px 24px",
  },
  previewBox: {
  height: "800px",            
  overflowY: "auto",
  border: "1px solid #d1d5db",
  borderRadius: "6px",
  backgroundColor: "#e5e7eb", 
  padding: "24px",
  display: "flex",
  justifyContent: "center",
},
  previewArea: {
    minHeight: "100%",
    display: "flex",
    justifyContent: "center",
  },
  footer: {
    borderTop: "1px solid #d1d5db",
    padding: "12px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: "#fff",
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

const docStyles: Record<string, React.CSSProperties> = {
  paper: {
    backgroundColor: "#fff",
    width: "680px",
    minHeight: "960px",
    padding: "56px 64px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
    fontFamily: "Calibri, 'Segoe UI', sans-serif",
    fontSize: "13px",
    color: "#000",
    lineHeight: "1.5",
  },
  docHeader: {
    textAlign: "center",
    marginBottom: "20px",
  },
  docTitle: {
    fontSize: "16px",
    fontWeight: 700,
    margin: "0 0 4px 0",
  },
  docSubtitle: {
    fontSize: "13px",
    margin: 0,
    color: "#333",
  },
  sectionHeading: {
    fontSize: "13.5px",
    fontWeight: 700,
    marginBottom: "10px",
    marginTop: 0,
  },
  summaryBody: {
    fontSize: "13px",
    lineHeight: "1.7",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "12px",
  },
  th: {
    border: "1px solid #999",
    padding: "5px 8px",
    fontWeight: 700,
    backgroundColor: "#f2f2f2",
    textAlign: "left" as const,
  },
  td: {
    border: "1px solid #bbb",
    padding: "8px 12px",
    verticalAlign: "top" as const,
  },
  tdHighlight: {
    border: "1px solid #bbb",
    padding: "8px 12px",
    verticalAlign: "top" as const,
    backgroundColor: "#FFFFC5",
  },
  emptyNote: {
    fontSize: "12px",
    color: "#666",
    fontStyle: "italic",
  },
};

export default ReportPage;