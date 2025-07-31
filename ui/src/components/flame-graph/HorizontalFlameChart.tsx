import React, { useEffect, useRef, useMemo } from "react";
// @ts-expect-error - Plotly types are not available for plotly.js-dist
import Plotly from "plotly.js-dist";
import { Box } from "@mui/material";
import type { Pathway } from "../../lib/api";

// Prioritization color palette for -1 to 1 scale
const PRIORITISATION_COLORS = [
	"#a01813", // -1 (red)
	"#bc3a19",
	"#d65a1f",
	"#e08145",
	"#e3a772",
	"#e6ca9c",
	"#eceada", // 0 (neutral)
	"#c5d2c1",
	"#9ebaa8",
	"#78a290",
	"#528b78",
	"#2f735f",
	"#2e5943", // 1 (green)
];

interface IcicleData {
	ids: string[];
	labels: string[];
	parents: string[];
	values: number[];
	customdata: Array<{
		type: string;
		pathway: Pathway;
		pValue: number;
		fdr?: number;
		nes?: number;
		geneCount: number;
		genes: string[];
	}>;
	marker: {
		colors: string[];
		line: { color: string; width: number };
	};
	hovertemplate: string;
}

interface HorizontalFlameChartProps {
	pathways: Pathway[];
	maxPathways: number;
	onPathwayClick: (pathway: Pathway) => void;
}

const HorizontalFlameChart: React.FC<HorizontalFlameChartProps> = ({
	pathways,
	maxPathways,
	onPathwayClick,
}) => {
	const plotContainerRef = useRef<HTMLDivElement>(null);
	const plotRef = useRef<Plotly.PlotlyHTMLElement | null>(null);

	// Memoized icicle chart data generation
	const icicleData = useMemo(() => {
		if (pathways.length === 0) return null;

		const limitedPathways = pathways.slice(0, maxPathways);

		// Sort pathways by significance (p-value) for better visualization
		const sortedPathways = [...limitedPathways].sort((a, b) => {
			const aPValue = a["p-value"] || a["p_value"] || a["pvalue"] || 1;
			const bPValue = b["p-value"] || b["p_value"] || b["pvalue"] || 1;
			return aPValue - bPValue;
		});

		// Collect all NES values for color scaling
		const allNESValues = sortedPathways.map((p) => p["NES"] || p["nes"] || 0);
		const maxNES = Math.max(...allNESValues);
		const minNES = Math.min(...allNESValues);

		const data: IcicleData = {
			ids: [],
			labels: [],
			parents: [],
			values: [],
			customdata: [],
			marker: {
				colors: [],
				line: { color: "#333", width: 1 },
			},
			hovertemplate: "",
		};

		// Build hierarchy from parent pathway relationships (like sunburst)
		const buildHierarchy = (pathways: Pathway[]) => {
			const pathwayMap = new Map<string, Pathway>();
			const childrenMap = new Map<string, string[]>();
			const rootPathways: Pathway[] = [];

			// Create pathway map and collect children
			pathways.forEach((pathway) => {
				const id = pathway["ID"] || pathway["id"] || "";
				pathwayMap.set(id, pathway);

				const parentPathway =
					pathway["Parent pathway"] || pathway["parent_pathway"] || "";
				if (parentPathway) {
					const parents = parentPathway.split(",").map((p: string) => p.trim());
					parents.forEach((parent: string) => {
						if (!childrenMap.has(parent)) {
							childrenMap.set(parent, []);
						}
						childrenMap.get(parent)!.push(id);
					});
				} else {
					rootPathways.push(pathway);
				}
			});

			return { pathwayMap, childrenMap, rootPathways };
		};

		const { pathwayMap, childrenMap, rootPathways } =
			buildHierarchy(sortedPathways);

		// Add root node
		data.ids.push("root");
		data.labels.push("Pathways");
		data.parents.push("");
		data.values.push(sortedPathways.length);
		data.customdata.push({
			type: "root",
			pathway: {} as Pathway,
			pValue: 1,
			geneCount: 0,
			genes: [],
		});
		data.marker.colors.push("#f0f0f0");

		// Add root pathways (those without parents)
		rootPathways.forEach((pathway, index) => {
			const pathwayId = pathway["ID"] || pathway["id"] || `root-${index}`;
			const pValue =
				pathway["p-value"] || pathway["p_value"] || pathway["pvalue"];
			const fdr = pathway["FDR"] || pathway["fdr"];
			const nes = pathway["NES"] || pathway["nes"];
			const genes = pathway["Leading edge genes"] || pathway["genes"] || [];
			const geneCount = Array.isArray(genes)
				? genes.length
				: typeof genes === "string"
					? genes.split(",").length
					: 0;

			// Calculate value based on significance (more significant = larger value)
			const significance = 1 / (pValue || 1);
			const value = Math.max(1, Math.log(significance) * 10);

			data.ids.push(pathwayId);
			data.labels.push(
				pathway["Pathway"] || pathway["pathway"] || `Pathway ${index + 1}`,
			);
			data.parents.push("root");
			data.values.push(value);
			data.customdata.push({
				type: "pathway",
				pathway,
				pValue,
				fdr,
				nes,
				geneCount,
				genes: Array.isArray(genes)
					? genes
					: typeof genes === "string"
						? genes.split(",").map((g: string) => g.trim())
						: [],
			});

			// Color based on NES using prioritization colors
			const normalized = ((nes || 0) - minNES) / (maxNES - minNES);
			const colorIndex = Math.floor(
				normalized * (PRIORITISATION_COLORS.length - 1),
			);
			data.marker.colors.push(
				PRIORITISATION_COLORS[
					Math.max(0, Math.min(colorIndex, PRIORITISATION_COLORS.length - 1))
				],
			);
		});

		// Add child pathways (only if parent exists in our dataset)
		const processedIds = new Set<string>();

		const addChildren = (parentId: string, parentPath: string) => {
			const children = childrenMap.get(parentId) || [];

			children.forEach((childId) => {
				if (processedIds.has(childId)) return;
				processedIds.add(childId);

				const pathway = pathwayMap.get(childId);
				if (!pathway) return;

				const pValue =
					pathway["p-value"] || pathway["p_value"] || pathway["pvalue"];
				const fdr = pathway["FDR"] || pathway["fdr"];
				const nes = pathway["NES"] || pathway["nes"];
				const genes = pathway["Leading edge genes"] || pathway["genes"] || [];
				const geneCount = Array.isArray(genes)
					? genes.length
					: typeof genes === "string"
						? genes.split(",").length
						: 0;

				// Calculate value based on significance
				const significance = 1 / (pValue || 1);
				const value = Math.max(1, Math.log(significance) * 10);

				data.ids.push(childId);
				data.labels.push(pathway["Pathway"] || pathway["pathway"] || childId);
				data.parents.push(parentPath);
				data.values.push(value);
				data.customdata.push({
					type: "pathway",
					pathway,
					pValue,
					fdr,
					nes,
					geneCount,
					genes: Array.isArray(genes)
						? genes
						: typeof genes === "string"
							? genes.split(",").map((g: string) => g.trim())
							: [],
				});

				// Color based on NES using prioritization colors
				const normalized = ((nes || 0) - minNES) / (maxNES - minNES);
				const colorIndex = Math.floor(
					normalized * (PRIORITISATION_COLORS.length - 1),
				);
				data.marker.colors.push(
					PRIORITISATION_COLORS[
						Math.max(0, Math.min(colorIndex, PRIORITISATION_COLORS.length - 1))
					],
				);

				// Recursively add children of this pathway
				addChildren(childId, childId);
			});
		};

		// Add children for each root pathway
		rootPathways.forEach((pathway) => {
			const pathwayId = pathway["ID"] || pathway["id"] || "";
			addChildren(pathwayId, pathwayId);
		});

		// Set hover template
		data.hovertemplate =
			"<b>%{label}</b><br>" + "Value: %{value}<br>" + "<extra></extra>";

		return data;
	}, [pathways, maxPathways]);

	// Plotly layout configuration for icicle chart
	const layout = useMemo(
		() => ({
			width: undefined,
			height: 700,
			margin: { l: 50, r: 50, t: 50, b: 50 },
			plot_bgcolor: "white",
			paper_bgcolor: "white",
		}),
		[],
	);

	// Plotly config
	const config = useMemo(
		() => ({
			displayModeBar: true,
			modeBarButtonsToRemove: ["pan2d", "lasso2d", "select2d"],
			displaylogo: false,
			responsive: true,
		}),
		[],
	);

	// Initialize icicle chart plot
	useEffect(() => {
		if (plotContainerRef.current && icicleData) {
			const plotElement = plotContainerRef.current;

			const plotData = [
				{
					type: "icicle",
					...icicleData,
				},
			];

			Plotly.newPlot(plotElement, plotData, layout, config).then(
				(plotDiv: Plotly.PlotlyHTMLElement) => {
					plotRef.current = plotDiv;

					// Add click event listener
					plotDiv.on("plotly_click", (event: Plotly.PlotMouseEvent) => {
						if (event.points && event.points.length > 0) {
							const point = event.points[0];
							const customData = point.customdata as {
								type: string;
								pathway: Pathway;
								pValue: number;
								fdr?: number;
								nes?: number;
								geneCount: number;
								genes: string[];
							};

							if (customData && customData.type === "pathway") {
								onPathwayClick(customData.pathway);
							}
						}
					});
				},
			);

			return () => {
				if (plotRef.current) {
					Plotly.purge(plotRef.current);
				}
			};
		}
	}, [icicleData, layout, config, onPathwayClick]);

	if (pathways.length === 0) {
		return null;
	}

	return (
		<Box sx={{ flex: 1, position: "relative", minHeight: "600px" }}>
			<div ref={plotContainerRef} style={{ width: "100%", height: "100%" }} />
		</Box>
	);
};

export default HorizontalFlameChart;
