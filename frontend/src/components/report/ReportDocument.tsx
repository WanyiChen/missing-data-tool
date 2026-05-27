import React from "react";
import { Document, Page, Text, View, StyleSheet } from "@react-pdf/renderer";

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

export interface ReportData {
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

export interface ReportSection {
  id: string;
  title: string;
  checked: boolean;
}

interface Props {
  reportData: ReportData;
  sections: ReportSection[];
}

const formatCorrelation = (c: CorrelatedFeature | null | undefined): string => {
  if (!c) return "—";
  return `${c.feature_name} (${c.correlation_type} = ${c.correlation_value?.toFixed(3)})`;
};

const s = StyleSheet.create({
  page: {
    fontFamily: "Helvetica",
    fontSize: 10,
    color: "#000",
    paddingTop: 54,
    paddingBottom: 54,
    paddingHorizontal: 54,
  },
  docHeader: { textAlign: "center", marginBottom: 16 },
  docTitle: { fontSize: 14, fontFamily: "Helvetica-Bold", marginBottom: 4 },
  docSubtitle: { fontSize: 10, color: "#333" },
  section: { marginBottom: 18 },
  sectionHeading: { fontSize: 11, fontFamily: "Helvetica-Bold", marginBottom: 6 },
  summaryText: { fontSize: 10, marginBottom: 3, lineHeight: 1.5 },
  summaryIndent: { fontSize: 10, marginBottom: 3, paddingLeft: 14, lineHeight: 1.5 },
  emptyNote: { fontSize: 9, color: "#666" },
  footnote: { fontSize: 8, color: "#333", marginTop: 4 },
  // Tables: outer View provides top+left border; each cell provides right+bottom
  table: {
    borderTopWidth: 1,
    borderLeftWidth: 1,
    borderColor: "#bbb",
    marginBottom: 4,
  },
  tableRow: { flexDirection: "row" },
  th: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#999",
    backgroundColor: "#f2f2f2",
    padding: 5,
    fontSize: 9,
    fontFamily: "Helvetica-Bold",
  },
  td: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#bbb",
    padding: 5,
    fontSize: 9,
  },
  tdHighlight: {
    borderRightWidth: 1,
    borderBottomWidth: 1,
    borderColor: "#bbb",
    backgroundColor: "#FFFFC5",
    padding: 5,
    fontSize: 9,
  },
  informativeText: {
    color: "#c0392b",
    fontFamily: "Helvetica-Bold",
    fontSize: 9,
  },
});

const ReportDocument: React.FC<Props> = ({ reportData, sections }) => {
  const showSummary = sections.find((sec) => sec.id === "summary")?.checked;
  const showMissing = sections.find((sec) => sec.id === "missing-features")?.checked;
  const showComplete = sections.find((sec) => sec.id === "complete-features")?.checked;
  const showRecommendations = sections.find((sec) => sec.id === "recommendations")?.checked;

  const { mechanism, caseCount, featureCount, missingFeatures, completeFeatures, recommendations, hasTargetFeature, targetFeatureName, fileName } = reportData;

  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.docHeader}>
          <Text style={s.docTitle}>Missing data report</Text>
          <Text style={s.docSubtitle}>File: {fileName}</Text>
        </View>

        {/* Summary */}
        {showSummary && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Summary of missing data</Text>
            {mechanism && (
              <View>
                <Text style={s.summaryText}>
                  Possible missing data mechanisms: {mechanism.mechanism_full}
                </Text>
                <Text style={s.summaryIndent}>
                  {"- Little’s MCAR test: p-value = "}
                  {mechanism.p_value === 0 ? "0.0" : mechanism.p_value.toExponential(2)}
                </Text>
              </View>
            )}
            {caseCount && (
              <View>
                <Text style={s.summaryText}>
                  Total number of cases: {caseCount.total_cases?.toLocaleString() ?? "—"}
                </Text>
                <Text style={s.summaryText}>
                  Total number of cases with missing data:{" "}
                  {caseCount.total_missing_cases?.toLocaleString()} ({caseCount.missing_percentage}%)
                </Text>
              </View>
            )}
            {featureCount && (
              <View>
                <Text style={s.summaryText}>
                  Total number of features: {featureCount.total_features?.toLocaleString() ?? "—"}
                </Text>
                <Text style={s.summaryText}>
                  Total number of features with missing data:{" "}
                  {featureCount.features_with_missing} ({featureCount.missing_feature_percentage}%)
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Missing features table */}
        {showMissing && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Features with missing data</Text>
            {missingFeatures.length > 0 ? (
              <View>
                <View style={s.table}>
                  <View style={s.tableRow}>
                    <View style={[s.th, { flex: 1.2 }]}><Text>Data type</Text></View>
                    <View style={[s.th, { flex: 2 }]}><Text>Feature name</Text></View>
                    <View style={[s.th, { flex: 1 }]}><Text>Number missing</Text></View>
                    <View style={[s.th, { flex: 1 }]}><Text>% missing</Text></View>
                    <View style={[s.th, { flex: 2 }]}><Text>Most correlated with</Text></View>
                    {hasTargetFeature && (
                      <View style={[s.th, { flex: 1.5 }]}><Text>Informative missingness*</Text></View>
                    )}
                  </View>
                  {missingFeatures.map((feature, i) => {
                    const isInformative = feature.informative_missingness?.is_informative;
                    return (
                      <View key={i} style={s.tableRow} wrap={false}>
                        <View style={[s.td, { flex: 1.2 }]}>
                          <Text>{feature.data_type === "N" ? "Numerical" : "Categorical"}</Text>
                        </View>
                        <View style={[s.td, { flex: 2 }]}>
                          <Text>{feature.feature_name}</Text>
                        </View>
                        <View style={[s.td, { flex: 1 }]}>
                          <Text>{feature.number_missing?.toLocaleString()}</Text>
                        </View>
                        <View style={[s.td, { flex: 1 }]}>
                          <Text>{feature.percentage_missing?.toFixed(0)}%</Text>
                        </View>
                        <View style={[s.td, { flex: 2 }]}>
                          <Text>{formatCorrelation(feature.most_correlated_with)}</Text>
                        </View>
                        {hasTargetFeature && (
                          <View style={[isInformative ? s.tdHighlight : s.td, { flex: 1.5 }]}>
                            {isInformative ? (
                              <Text style={s.informativeText}>
                                Yes (p = {feature.informative_missingness?.p_value?.toFixed(2) ?? "—"})
                              </Text>
                            ) : (
                              <Text>
                                No
                                {feature.informative_missingness?.p_value !== undefined
                                  ? ` (p = ${feature.informative_missingness.p_value.toFixed(2)})`
                                  : ""}
                              </Text>
                            )}
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
                {hasTargetFeature && targetFeatureName && (
                  <Text style={s.footnote}>*Target feature: {targetFeatureName}</Text>
                )}
              </View>
            ) : (
              <Text style={s.emptyNote}>No features with missing data found.</Text>
            )}
          </View>
        )}

        {/* Complete features table */}
        {showComplete && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Features with complete data</Text>
            {completeFeatures.length > 0 ? (
              <View style={s.table}>
                <View style={s.tableRow}>
                  <View style={[s.th, { flex: 1 }]}><Text>Data type</Text></View>
                  <View style={[s.th, { flex: 2 }]}><Text>Feature name</Text></View>
                  <View style={[s.th, { flex: 3 }]}><Text>Most correlated with</Text></View>
                </View>
                {completeFeatures.map((feature, i) => (
                  <View key={i} style={s.tableRow} wrap={false}>
                    <View style={[s.td, { flex: 1 }]}>
                      <Text>{feature.data_type === "N" ? "Numerical" : "Categorical"}</Text>
                    </View>
                    <View style={[s.td, { flex: 2 }]}>
                      <Text>{feature.feature_name}</Text>
                    </View>
                    <View style={[s.td, { flex: 3 }]}>
                      <Text>{formatCorrelation(feature.most_correlated_with)}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyNote}>No features with complete data found.</Text>
            )}
          </View>
        )}

        {/* Recommendations table */}
        {showRecommendations && (
          <View style={s.section}>
            <Text style={s.sectionHeading}>Missing data treatment recommendations</Text>
            {recommendations.length > 0 ? (
              <View style={s.table}>
                <View style={s.tableRow}>
                  <View style={[s.th, { flex: 2 }]}><Text>Features with missing data</Text></View>
                  <View style={[s.th, { flex: 2 }]}><Text>Recommended treatment</Text></View>
                  <View style={[s.th, { flex: 3 }]}><Text>Reasons</Text></View>
                </View>
                {recommendations.map((rec, i) => (
                  <View key={i} style={s.tableRow} wrap={false}>
                    <View style={[s.td, { flex: 2 }]}>
                      <Text>
                        {Array.isArray(rec.features) ? rec.features.join(", ") : rec.features}
                      </Text>
                    </View>
                    <View style={[s.td, { flex: 2 }]}>
                      <Text>{rec.recommendation_type}</Text>
                    </View>
                    <View style={[s.td, { flex: 3 }]}>
                      <Text>{rec.reason}</Text>
                    </View>
                  </View>
                ))}
              </View>
            ) : (
              <Text style={s.emptyNote}>No recommendations available.</Text>
            )}
          </View>
        )}
      </Page>
    </Document>
  );
};

export default ReportDocument;
