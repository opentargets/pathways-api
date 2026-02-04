import React, { useEffect, useRef, useMemo } from "react";
// @ts-ignore
import Plotly from "plotly.js-dist";
import { Box } from "@mui/material";
import type { Pathway } from "../../lib/api";
import { buildPathwayHierarchy, getEffectiveRootPathways } from "../../utils/pathwayHierarchy";
import { 
	PRIORITISATION_COLORS, 
	mapToPrioritizationColor, 
	PLOTLY_COLOR_PALETTES,
	ROOT_NODE_COLORS
} from "../../utils/colorPalettes";

interface FlameGraphNode {
	ids: string[];
	labels: string[];
	parents: string[];
	values: number[];
	customdata: any[];
	hovertemplate: string;
	marker: {
		colors: string[];
		line: { color: string; width: number };
	};
}

interface SunburstChartProps {
	pathways: Pathway[];
	maxPathways: number;
	orientation: "h" | "v";
	branchvalues: "total" | "remainder";
}

const SunburstChart: React.FC<SunburstChartProps> = ({
	pathways,
	maxPathways,
	orientation,
	branchvalues,
}) => {
	const plotContainerRef = useRef<HTMLDivElement>(null);
	const plotRef = useRef<any>(null);

	// Memoized flame graph data generation
	const flameGraphData = useMemo(() => {
		if (pathways.length === 0) return null;

		const limitedPathways = pathways.slice(0, maxPathways);
		const { pathwayMap, childrenMap } = buildPathwayHierarchy(limitedPathways);
		const rootPathways = getEffectiveRootPathways(limitedPathways);

		const nodes: FlameGraphNode = {
			ids: [],
			labels: [],
			parents: [],
			values: [],
			customdata: [],
			hovertemplate: "",
			marker: {
				colors: [],
				line: { color: "#333", width: 1 },
			},
		};

		// Add root node
		nodes.ids.push("root");
		nodes.labels.push("All Pathways");
		nodes.parents.push("");
		nodes.values.push(1);
		nodes.customdata.push({ type: "root" });
		nodes.marker.colors.push(ROOT_NODE_COLORS.primary);

		// Collect all NES values for color scaling
		const allNESValues: number[] = [];
		const allPathways: Pathway[] = [];

		// Helper function to collect NES values
		const collectNESValues = (pathway: Pathway) => {
			const nes = pathway["NES"] || pathway["nes"] || 0;
			allNESValues.push(nes);
			allPathways.push(pathway);
		};

		// Collect all NES values first
		limitedPathways.forEach(collectNESValues);

		// let rootNodeWidth = 0;
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

			// Calculate width based on significance (more significant = wider)
			// const significance = 1 / (pValue || 1);
			const width = 1; //Math.max(1, Math.log(significance) * 5);
			// rootNodeWidth += width;
			
			nodes.ids.push(pathwayId);
			nodes.labels.push(
				pathway["Pathway"] || pathway["pathway"] || `Pathway ${index + 1}`,
			);
			nodes.parents.push("root");
			nodes.values.push(width);
			nodes.customdata.push({
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
			const maxNES = Math.max(...allNESValues);
			const minNES = Math.min(...allNESValues);
			nodes.marker.colors.push(
				mapToPrioritizationColor(nes || 0, minNES, maxNES)
			);
		});

		// nodes.values[0] = 1;

		// Add child pathways
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

				// Calculate width based on significance
				// const significance = 1 / (pValue || 1);
				const width = 1; //Math.max(1, Math.log(significance) * 5);

				nodes.ids.push(childId);
				nodes.labels.push(pathway["Pathway"] || pathway["pathway"] || childId);
				nodes.parents.push(parentPath);
				nodes.values.push(width);
				nodes.customdata.push({
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
				const maxNES = Math.max(...allNESValues);
				const minNES = Math.min(...allNESValues);
				nodes.marker.colors.push(
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
		nodes.hovertemplate =
			"<b>%{label}</b><br>" + "Width: %{value}<br>" + "<extra></extra>";

		return nodes;
	}, [pathways, maxPathways]);

	// Plotly layout configuration for sunburst
	const layout = useMemo(
		() => ({
			width: undefined,
			height: 700,
			sunburstcolorway: PLOTLY_COLOR_PALETTES.sunburst,
			extendsunburstcolors: true,
			margin: { l: 0, r: 0, t: 0, b: 0 },
			sunburst: {
				branchvalues,
				maxdepth: 10, // Allow deeper levels
			},
		}),
		[branchvalues],
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

	// Initialize sunburst plot
	useEffect(() => {
		if (plotContainerRef.current && flameGraphData) {
			const plotElement = plotContainerRef.current;

			const plotData = [
				{
					type: "sunburst",
					...flameGraphData,
					orientation,
				},
			];

			Plotly.newPlot(plotElement, plotData, layout, config).then(
				(plotDiv: any) => {
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
	}, [flameGraphData, layout, config, orientation]);

	if (pathways.length === 0) {
		return null;
	}

	return (
		<Box sx={{ flex: 1, position: "relative", minHeight: "600px" }}>
			<div ref={plotContainerRef} style={{ width: "100%", height: "100%" }} />
		</Box>
	);
};

export default SunburstChart;
