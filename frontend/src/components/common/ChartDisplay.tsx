import React, { useEffect, useRef } from "react";
import Plotly from "plotly.js";

// Interfaces for distribution data
interface CategoricalDistribution {
    [key: string]: number;
}

interface NumericalDistribution {
    bins: number[];
    counts: number[];
}

interface DistributionData {
    before: CategoricalDistribution | NumericalDistribution;
    after: CategoricalDistribution | NumericalDistribution;
}

interface ChartDisplayProps {
    featureName: string;
    featureType: "categorical" | "numerical";
    pValue: number;
    distributionData: DistributionData;
    loading?: boolean;
    error?: string | null;
}

const ChartDisplay: React.FC<ChartDisplayProps> = ({
    featureName,
    featureType,
    pValue,
    distributionData,
    loading = false,
    error = null,
}) => {
    const chartRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!chartRef.current || loading || error) return;

        const renderChart = async () => {
            try {
                if (featureType === "categorical") {
                    await renderPieCharts();
                } else {
                    await renderHistograms();
                }
            } catch (err) {
                console.error("Error rendering chart:", err);
            }
        };

        renderChart();

        // Cleanup function to purge the plot when component unmounts
        return () => {
            if (chartRef.current) {
                Plotly.purge(chartRef.current);
            }
        };
    }, [featureName, featureType, distributionData, loading, error]);

    const renderPieCharts = async () => {
        if (!chartRef.current) return;

        const beforeData = distributionData.before as CategoricalDistribution;
        const afterData = distributionData.after as CategoricalDistribution;

        // Prepare data for before pie chart
        const beforeLabels = Object.keys(beforeData);
        const beforeValues = Object.values(beforeData);

        // Prepare data for after pie chart
        const afterLabels = Object.keys(afterData);
        const afterValues = Object.values(afterData);

        const data = [
            {
                values: beforeValues,
                labels: beforeLabels,
                type: "pie" as const,
                name: "Before",
                domain: { x: [0, 0.48] },
                title: {
                    text: "Before Deletion",
                    font: { size: 14 },
                },
                textinfo: "label+percent",
                textposition: "auto",
                marker: {
                    colors: [
                        "#1f77b4",
                        "#ff7f0e",
                        "#2ca02c",
                        "#d62728",
                        "#9467bd",
                        "#8c564b",
                        "#e377c2",
                        "#7f7f7f",
                        "#bcbd22",
                        "#17becf",
                    ],
                },
            },
            {
                values: afterValues,
                labels: afterLabels,
                type: "pie" as const,
                name: "After",
                domain: { x: [0.52, 1] },
                title: {
                    text: "After Deletion",
                    font: { size: 14 },
                },
                textinfo: "label+percent",
                textposition: "auto",
                marker: {
                    colors: [
                        "#1f77b4",
                        "#ff7f0e",
                        "#2ca02c",
                        "#d62728",
                        "#9467bd",
                        "#8c564b",
                        "#e377c2",
                        "#7f7f7f",
                        "#bcbd22",
                        "#17becf",
                    ],
                },
            },
        ];

        const layout = {
            title: {
                text: `${featureName} Distribution Comparison<br><sub>p-value: ${pValue.toFixed(
                    4
                )}</sub>`,
                font: { size: 16 },
            },
            showlegend: false,
            height: 400,
            margin: { t: 80, b: 40, l: 40, r: 40 },
            annotations: [
                {
                    text: "Before",
                    x: 0.24,
                    y: -0.1,
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: { size: 14, color: "#666" },
                },
                {
                    text: "After",
                    x: 0.76,
                    y: -0.1,
                    xref: "paper",
                    yref: "paper",
                    showarrow: false,
                    font: { size: 14, color: "#666" },
                },
            ],
        };

        const config = {
            responsive: true,
            displayModeBar: false,
        };

        await Plotly.newPlot(chartRef.current, data, layout, config);
    };

    const renderHistograms = async () => {
        if (!chartRef.current) return;

        const beforeData = distributionData.before as NumericalDistribution;
        const afterData = distributionData.after as NumericalDistribution;

        // Create bin centers for x-axis
        const beforeBinCenters = beforeData.bins
            .slice(0, -1)
            .map((bin, i) => (bin + beforeData.bins[i + 1]) / 2);
        const afterBinCenters = afterData.bins
            .slice(0, -1)
            .map((bin, i) => (bin + afterData.bins[i + 1]) / 2);

        const data = [
            {
                x: beforeBinCenters,
                y: beforeData.counts,
                type: "bar" as const,
                name: "Before Deletion",
                marker: { color: "#1f77b4", opacity: 0.7 },
                width: beforeBinCenters.map((_, i) =>
                    i < beforeData.bins.length - 1
                        ? beforeData.bins[i + 1] - beforeData.bins[i]
                        : 0
                ),
            },
            {
                x: afterBinCenters,
                y: afterData.counts,
                type: "bar" as const,
                name: "After Deletion",
                marker: { color: "#ff7f0e", opacity: 0.7 },
                width: afterBinCenters.map((_, i) =>
                    i < afterData.bins.length - 1
                        ? afterData.bins[i + 1] - afterData.bins[i]
                        : 0
                ),
            },
        ];

        const layout = {
            title: {
                text: `${featureName} Distribution Comparison<br><sub>p-value: ${pValue.toFixed(
                    4
                )}</sub>`,
                font: { size: 16 },
            },
            xaxis: {
                title: featureName,
                overlaying: false,
            },
            yaxis: {
                title: "Frequency",
            },
            barmode: "group",
            height: 400,
            margin: { t: 80, b: 60, l: 60, r: 40 },
            legend: {
                x: 0.7,
                y: 1,
                bgcolor: "rgba(255,255,255,0.8)",
                bordercolor: "#ccc",
                borderwidth: 1,
            },
        };

        const config = {
            responsive: true,
            displayModeBar: false,
        };

        await Plotly.newPlot(chartRef.current, data, layout, config);
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <span className="ml-3 text-gray-600">Loading chart...</span>
            </div>
        );
    }

    if (error) {
        return (
            <div className="flex items-center justify-center h-64">
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                    <p className="text-red-700 text-sm">
                        Error loading chart: {error}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="w-full">
            <div ref={chartRef} className="w-full" />
            <div className="mt-4 text-sm text-gray-600 text-center">
                <p>
                    Statistical significance:{" "}
                    {pValue < 0.05 ? "Significant" : "Not significant"}
                    {pValue < 0.001
                        ? " (p < 0.001)"
                        : ` (p = ${pValue.toFixed(4)})`}
                </p>
            </div>
        </div>
    );
};

export default ChartDisplay;
