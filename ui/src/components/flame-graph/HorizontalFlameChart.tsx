import React, { useEffect, useRef, useMemo } from "react";
// @ts-expect-error - Plotly types are not available for plotly.js-dist
import Plotly from "plotly.js-dist";
import { Box } from "@mui/material";
import type { Pathway } from "../../lib/api";
import { buildPathwayHierarchy, getEffectiveRootPathways } from "../../utils/pathwayHierarchy";
import { 
	PRIORITISATION_COLORS, 
	mapToPrioritizationColor,
	ROOT_NODE_COLORS
} from "../../utils/colorPalettes";

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
}

const HorizontalFlameChart: React.FC<HorizontalFlameChartProps> = ({
	pathways,
	maxPathways,
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

		const { pathwayMap, childrenMap } = buildPathwayHierarchy(sortedPathways);
		const rootPathways = getEffectiveRootPathways(sortedPathways);

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
		data.marker.colors.push(ROOT_NODE_COLORS.primary);

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
			data.marker.colors.push(
				mapToPrioritizationColor(nes || 0, minNES, maxNES)
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
				data.marker.colors.push(
					mapToPrioritizationColor(nes || 0, minNES, maxNES)
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

					// Note: Click events are now handled by tooltips on hover
				},
			);

			return () => {
				if (plotRef.current) {
					Plotly.purge(plotRef.current);
				}
			};
		}
	}, [icicleData, layout, config]);

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
