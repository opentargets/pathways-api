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

// Helper function to wrap text after 20 characters, breaking at word boundaries
const wrapText = (text: string, maxLength: number = 20): string => {
	if (text.length <= maxLength) return text;
	
	const words = text.split(/\s+/);
	const lines: string[] = [];
	let currentLine = "";
	
	words.forEach((word) => {
		// If adding this word would exceed maxLength, start a new line
		if (currentLine.length + word.length + 1 > maxLength && currentLine.length > 0) {
			lines.push(currentLine);
			currentLine = word;
		} else {
			currentLine = currentLine ? `${currentLine} ${word}` : word;
		}
	});
	
	if (currentLine) {
		lines.push(currentLine);
	}
	
	return lines.join("\n");
};

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
		let rootPathways = getEffectiveRootPathways(limitedPathways);

		// Separate root pathways into those with children and those without (leaf pathways)
		const rootPathwaysWithChildren: Pathway[] = [];
		const rootPathwaysWithoutChildren: Pathway[] = [];

		rootPathways.forEach((pathway) => {
			const pathwayId = pathway["ID"] || pathway["id"] || "";
			const hasChildren = childrenMap.has(pathwayId) && (childrenMap.get(pathwayId)?.length || 0) > 0;
			
			if (hasChildren) {
				rootPathwaysWithChildren.push(pathway);
			} else {
				rootPathwaysWithoutChildren.push(pathway);
			}
		});

		// Create "Others" pathway if there are leaf pathways to merge
		if (rootPathwaysWithoutChildren.length > 0) {
			// Calculate average NES and FDR for the merged pathways
			let totalNES = 0;
			let totalFDR = 0;
			let nesCount = 0;
			let fdrCount = 0;

			rootPathwaysWithoutChildren.forEach((pathway) => {
				const nes = pathway["NES"] || pathway["nes"];
				const fdr = pathway["FDR"] || pathway["fdr"];

				if (nes !== undefined && nes !== null) {
					totalNES += nes;
					nesCount++;
				}
				if (fdr !== undefined && fdr !== null) {
					totalFDR += fdr;
					fdrCount++;
				}
			});

			const othersPathway: Pathway = {
				ID: "others",
				id: "others",
				Pathway: "Others",
				pathway: "Others",
				NES: nesCount > 0 ? totalNES / nesCount : 0,
				nes: nesCount > 0 ? totalNES / nesCount : 0,
				FDR: fdrCount > 0 ? totalFDR / fdrCount : null,
				fdr: fdrCount > 0 ? totalFDR / fdrCount : null,
			};

			// Replace root pathways: keep those with children, add "Others"
			rootPathways = [...rootPathwaysWithChildren, othersPathway];
		}

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
		nodes.labels.push("Reactome\npathways");
		nodes.parents.push("");
		nodes.values.push(1);
		nodes.customdata.push([null, null]); // [nes, fdr] for root node
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
		
		// If "Others" pathway exists, add its NES to the collection for color scaling
		const othersPathway = rootPathways.find(p => (p["ID"] || p["id"]) === "others");
		if (othersPathway) {
			collectNESValues(othersPathway);
		}

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
			const pathwayName = pathway["Pathway"] || pathway["pathway"] || `Pathway ${index + 1}`;
			nodes.labels.push(wrapText(pathwayName, 20));
			nodes.parents.push("root");
			nodes.values.push(width);
			// Store as [nes, fdr] for hover template access
			nodes.customdata.push([
				nes !== undefined && nes !== null ? nes : null,
				fdr !== undefined && fdr !== null ? fdr : null,
			]);

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
				const childPathwayName = pathway["Pathway"] || pathway["pathway"] || childId;
				nodes.labels.push(wrapText(childPathwayName, 20));
				nodes.parents.push(parentPath);
				nodes.values.push(width);
				// Store as [nes, fdr] for hover template access
				nodes.customdata.push([
					nes !== undefined && nes !== null ? nes : null,
					fdr !== undefined && fdr !== null ? fdr : null,
				]);

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
			"<b>%{label}</b><br>" +
			"Width: %{value}<br>" +
			"NES: %{customdata[0]:.3f}<br>" +
			"FDR: %{customdata[1]:.4f}<br>" +
			"<extra></extra>";

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
			font: {
				family: "Helvetica-Bold, Helvetica, Arial Black, Arial, sans-serif",
				size: 14,
				color: "#1A1A1A",
			},
			plot_bgcolor: "rgba(0,0,0,0)",
			paper_bgcolor: "rgba(0,0,0,0)",
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
			toImageButtonOptions: {
				format: "png",
				filename: "sunburst-chart",
				height: undefined,
				width: undefined,
				scale: 4.167, // 400 DPI (400/96 = 4.167, where 96 is default browser DPI)
			},
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
					textfont: {
						size: 16,
						family: "Helvetica-Bold, Helvetica, Arial Black, Arial, sans-serif",
						color: "#1A1A1A",
					},
					insidetextorientation: "radial", // Options: "radial" | "horizontal" | "tangential" | "auto"
					textinfo: "label",
					textposition: "inside",
				},
			];

			Plotly.newPlot(plotElement, plotData, layout, config).then(
				(plotDiv: any) => {
					plotRef.current = plotDiv;

					// Apply custom CSS to make text bold and fill branch space
					// Use a unique ID to avoid duplicate styles
					if (!document.getElementById("sunburst-text-styles")) {
						const style = document.createElement("style");
						style.id = "sunburst-text-styles";
						style.textContent = `
							.sunburst-plot text {
								font-weight: bold !important;
								font-size: 14px !important;
								fill: #1A1A1A !important;
								text-anchor: middle !important;
								dominant-baseline: middle !important;
								white-space: pre-line !important;
							}
							.sunburst-plot .slice text,
							.sunburst-plot .sunburstlayer text {
								font-weight: bold !important;
								font-size: 14px !important;
								fill: #1A1A1A !important;
								white-space: pre-line !important;
							}
							.sunburst-plot text tspan {
								font-weight: bold !important;
								fill: #1A1A1A !important;
							}
						`;
						document.head.appendChild(style);
					}

					// Add class to plot container for styling
					if (plotElement) {
						plotElement.classList.add("sunburst-plot");
					}

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
