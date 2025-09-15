import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
// @ts-expect-error - Plotly types are not available for plotly.js-dist
import Plotly from "plotly.js-dist";
import {
	Box,
	Typography,
	Paper,
	Chip,
	IconButton,
	Tooltip,
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Slider,
	FormControlLabel,
	Switch,
	Alert,
} from "@mui/material";
import {
	Settings as SettingsIcon,
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Home as HomeIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";
import { buildPathwayHierarchy } from "../../utils/pathwayHierarchy";
import { 
	mapToSignificanceColorLog, 
	mapToGeneCountColor, 
	mapToPrioritizationColor,
	PLOTLY_COLOR_PALETTES,
	ROOT_NODE_COLORS
} from "../../utils/colorPalettes";

interface PathwaysHierarchyTreeMapProps {
	pathways: Pathway[];
}

interface TreeMapNode {
	ids: string[];
	labels: string[];
	parents: string[];
	values: number[];
	customdata: Array<{
		type: string;
		pathway: Pathway;
		pValue: number;
		fdr?: number;
		geneCount: number;
		genes: string[];
	}>;
	hovertemplate: string;
	marker: {
		colors: string[];
		line: { color: string; width: number };
	};
}

const PathwaysHierarchyTreeMap: React.FC<PathwaysHierarchyTreeMapProps> = ({
	pathways,
}) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const plotContainerRef = useRef<HTMLDivElement>(null);
	const plotRef = useRef<Plotly.PlotlyHTMLElement | null>(null);
	const [settings, setSettings] = useState({
		maxPathways: pathways.length,
		showPValues: true,
		showFDR: true,
		showGenes: false,
		colorBy: "nes" as "pvalue" | "fdr" | "genes" | "nes",
		layout: "squarify" as
			| "squarify"
			| "binary"
			| "dice"
			| "slice"
			| "slice-dice",
	});


	// Build hierarchy from parent pathway relationships
	const buildHierarchy = useCallback((pathways: Pathway[]) => {
		const { pathwayMap, childrenMap, rootPathways, secondLevelPathways } = buildPathwayHierarchy(pathways);
		const effectiveRootPathways = rootPathways.length > 0 ? rootPathways : secondLevelPathways;
		return { pathwayMap, childrenMap, rootPathways: effectiveRootPathways };
	}, []);

	// Memoized treemap data generation
	const treemapData = useMemo(() => {
		if (pathways.length === 0) return null;

		const limitedPathways = pathways.slice(0, settings.maxPathways);
		const { pathwayMap, childrenMap, rootPathways } =
			buildHierarchy(limitedPathways);

		// Collect all NES values for color scaling (if using NES colors)
		const allNESValues: number[] = [];
		if (settings.colorBy === "nes") {
			limitedPathways.forEach((pathway) => {
				const nes = pathway["NES"] || pathway["nes"] || 0;
				allNESValues.push(nes);
			});
		}

		const nodes: TreeMapNode = {
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
		nodes.values.push(limitedPathways.length);
		nodes.customdata.push({
			type: "root",
			pathway: {} as Pathway,
			pValue: 1,
			geneCount: 0,
			genes: [],
		});
		nodes.marker.colors.push(ROOT_NODE_COLORS.primary);

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

			// Calculate area based on significance (more significant = larger area)
			const significance = 1 / (pValue || 1);
			const area = Math.max(1, Math.log(significance) * 10);

			nodes.ids.push(pathwayId);
			nodes.labels.push(
				pathway["Pathway"] || pathway["pathway"] || `Pathway ${index + 1}`,
			);
			nodes.parents.push("root");
			nodes.values.push(area);
			nodes.customdata.push({
				type: "pathway",
				pathway,
				pValue,
				fdr,
				geneCount,
				genes: Array.isArray(genes)
					? genes
					: typeof genes === "string"
						? genes.split(",").map((g: string) => g.trim())
						: [],
			});

			// Color based on settings
			if (settings.colorBy === "nes") {
				const maxNES = Math.max(...allNESValues);
				const minNES = Math.min(...allNESValues);
				nodes.marker.colors.push(mapToPrioritizationColor(nes || 0, minNES, maxNES));
			} else if (settings.colorBy === "genes") {
				nodes.marker.colors.push(mapToGeneCountColor(geneCount));
			} else if (settings.colorBy === "fdr") {
				nodes.marker.colors.push(mapToSignificanceColorLog(fdr || 1));
			} else {
				nodes.marker.colors.push(mapToSignificanceColorLog(pValue || 1));
			}
		});

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

				// Calculate area based on significance
				const significance = 1 / (pValue || 1);
				const area = Math.max(1, Math.log(significance) * 10);

				nodes.ids.push(childId);
				nodes.labels.push(pathway["Pathway"] || pathway["pathway"] || childId);
				nodes.parents.push(parentPath);
				nodes.values.push(area);
				nodes.customdata.push({
					type: "pathway",
					pathway,
					pValue,
					fdr,
					geneCount,
					genes: Array.isArray(genes)
						? genes
						: typeof genes === "string"
							? genes.split(",").map((g: string) => g.trim())
							: [],
				});

				// Color based on settings
				if (settings.colorBy === "nes") {
					const maxNES = Math.max(...allNESValues);
					const minNES = Math.min(...allNESValues);
					nodes.marker.colors.push(mapToPrioritizationColor(nes || 0, minNES, maxNES));
				} else if (settings.colorBy === "genes") {
					nodes.marker.colors.push(mapToGeneCountColor(geneCount));
				} else if (settings.colorBy === "fdr") {
					nodes.marker.colors.push(mapToSignificanceColorLog(fdr || 1));
				} else {
					nodes.marker.colors.push(mapToSignificanceColorLog(pValue || 1));
				}

				// Recursively add children of this pathway
				addChildren(childId, childId);
			});
		};

		// Add children for each root pathway
		rootPathways.forEach((pathway) => {
			const pathwayId = pathway["ID"] || pathway["id"] || "";
			addChildren(pathwayId, pathwayId);
		});

		// Set hover template with more detailed information
		nodes.hovertemplate =
			"<b>%{label}</b><br>" +
			"Area: %{value}<br>" +
			"<extra></extra>";

		return nodes;
	}, [pathways, settings.maxPathways, settings.colorBy, buildHierarchy]);

	// Plotly layout configuration
	const layout = useMemo(
		() => ({
			width: undefined,
			height: 700,
			treemapcolorway: PLOTLY_COLOR_PALETTES.treemap,
			extendsunburstcolors: true,
			margin: { l: 0, r: 0, t: 0, b: 0 },
			treemap: {
				tiling: {
					packing: settings.layout,
					squarifyratio: 1,
				},
			},
		}),
		[settings.layout],
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

	// Initialize plot
	useEffect(() => {
		if (plotContainerRef.current && treemapData) {
			const plotElement = plotContainerRef.current;

			const plotData = [
				{
					type: "treemap",
					...treemapData,
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
	}, [treemapData, layout, config]);

	// Handle settings change
	const handleSettingsChange = useCallback((key: string, value: unknown) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	}, []);

	// Zoom controls
	const handleZoomIn = useCallback(() => {
		if (plotRef.current) {
			Plotly.relayout(plotRef.current, {
				"treemap.level": 1,
			});
		}
	}, []);

	const handleZoomOut = useCallback(() => {
		if (plotRef.current) {
			Plotly.relayout(plotRef.current, {
				"treemap.level": 0,
			});
		}
	}, []);

	const handleReset = useCallback(() => {
		if (plotRef.current) {
			Plotly.relayout(plotRef.current, {
				"treemap.level": "",
			});
		}
	}, []);

	if (pathways.length === 0) {
		return (
			<Box textAlign="center" py={4}>
				<Typography color="text.secondary">
					No pathways to display in treemap.
				</Typography>
			</Box>
		);
	}

	return (
		<Box sx={{ height: "1000px", width: "100%" }}>
			<Paper sx={{ p: 2, mb: 2 }}>
				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						mb: 2,
					}}
				>
					<Typography variant="h6" component="h2">
						Pathways Hierarchy (TreeMap)
					</Typography>
					<Box sx={{ display: "flex", gap: 1 }}>
						<Tooltip title="Zoom In">
							<IconButton onClick={handleZoomIn} size="small">
								<ZoomInIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title="Zoom Out">
							<IconButton onClick={handleZoomOut} size="small">
								<ZoomOutIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title="Reset View">
							<IconButton onClick={handleReset} size="small">
								<HomeIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title="Settings">
							<IconButton onClick={() => setSettingsOpen(true)}>
								<SettingsIcon />
							</IconButton>
						</Tooltip>
					</Box>
				</Box>

				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Chip
						label={`${pathways.length} total pathways`}
						color="primary"
						size="small"
					/>
					<Chip
						label={`${settings.maxPathways} displayed`}
						color="secondary"
						size="small"
					/>
					<Chip
						label={`Color by: ${settings.colorBy}`}
						variant="outlined"
						size="small"
					/>
					<Chip label="TreeMap Chart" variant="outlined" size="small" />
				</Box>

				<Alert severity="info" sx={{ mt: 2 }}>
					<Typography variant="body2">
						Click on pathway rectangles to view details. Larger rectangles
						indicate more significant pathways. Hierarchy is based on parent
						pathway relationships.
					</Typography>
				</Alert>
			</Paper>

			<Paper sx={{ height: "800px", position: "relative" }}>
				<div ref={plotContainerRef} style={{ width: "100%", height: "100%" }} />
			</Paper>

			{/* Settings Dialog */}
			<Dialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>TreeMap Hierarchy Settings</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
						<FormControl fullWidth>
							<InputLabel>Color By</InputLabel>
							<Select
								value={settings.colorBy}
								onChange={(e) =>
									handleSettingsChange("colorBy", e.target.value)
								}
								label="Color By"
							>
								<MenuItem value="nes">NES (Prioritization)</MenuItem>
								<MenuItem value="pvalue">P-Value</MenuItem>
								<MenuItem value="fdr">FDR</MenuItem>
								<MenuItem value="genes">Gene Count</MenuItem>
							</Select>
						</FormControl>

						<FormControl fullWidth>
							<InputLabel>Layout Algorithm</InputLabel>
							<Select
								value={settings.layout}
								onChange={(e) => handleSettingsChange("layout", e.target.value)}
								label="Layout Algorithm"
							>
								<MenuItem value="squarify">Squarify (Default)</MenuItem>
								<MenuItem value="binary">Binary</MenuItem>
								<MenuItem value="dice">Dice</MenuItem>
								<MenuItem value="slice">Slice</MenuItem>
								<MenuItem value="slice-dice">Slice-Dice</MenuItem>
							</Select>
						</FormControl>

						<Box>
							<Typography gutterBottom>
								Max Pathways: {settings.maxPathways}
							</Typography>
							<Slider
								value={settings.maxPathways}
								onChange={(_, value) =>
									handleSettingsChange("maxPathways", value)
								}
								min={10}
								max={300}
								step={5}
								marks
								valueLabelDisplay="auto"
							/>
						</Box>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showPValues}
									onChange={(e) =>
										handleSettingsChange("showPValues", e.target.checked)
									}
								/>
							}
							label="Show P-Values"
						/>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showFDR}
									onChange={(e) =>
										handleSettingsChange("showFDR", e.target.checked)
									}
								/>
							}
							label="Show FDR"
						/>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showGenes}
									onChange={(e) =>
										handleSettingsChange("showGenes", e.target.checked)
									}
								/>
							}
							label="Show Gene Lists"
						/>
					</Box>
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setSettingsOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>

		</Box>
	);
};

export default PathwaysHierarchyTreeMap;
