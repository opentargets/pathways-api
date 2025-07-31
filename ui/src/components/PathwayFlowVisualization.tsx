import React, { useState, useCallback, useMemo, useEffect } from "react";
import ReactFlow, {
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	Handle,
	Position,
} from "reactflow";
import type { Node, Edge, Connection } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import {
	Box,
	Typography,
	Paper,
	Chip,
	IconButton,
	Button,
	Slider,
	FormControlLabel,
	Switch,
	TextField,
	Collapse,
	Divider,
	Accordion,
	AccordionSummary,
	AccordionDetails,
} from "@mui/material";
import {
	FilterList as FilterListIcon,
	Clear as ClearIcon,
	Visibility as VisibilityIcon,
	VisibilityOff as VisibilityOffIcon,
	ExpandMore as ExpandMoreIcon,
	Search as SearchIcon,
} from "@mui/icons-material";

// Types for the pathway data structure
interface PathwayData {
	ID: string;
	Pathway: string;
	ES: number;
	NES: number;
	FDR: number;
	"p-value": number;
	"Number of input genes": number;
	"Leading edge genes": string;
	"Pathway size": number;
	"Parent pathway": string;
}

// Filter state interface
interface FilterState {
	nesRange: [number, number];
	pValueThreshold: number;
	geneCountRange: [number, number];
	pathwaySizeRange: [number, number];
	searchText: string;
	fdrThreshold: number;
	showStandalone: boolean;
	showParentChild: boolean;
	showSignificantOnly: boolean;
}

// Custom Pathway Node Component
const PathwayNode: React.FC<{
	data: {
		id: string;
		pathway: string;
		nes: number;
		geneCount: number;
		pathwaySize: number;
		pvalue: number;
	};
}> = ({ data }) => {
	const getScoreColor = (nes: number) => {
		if (nes > 2.5) return "#22c55e"; // green
		if (nes > 2) return "#84cc16"; // lime
		if (nes > 1.5) return "#eab308"; // yellow
		if (nes > 0) return "#f97316"; // orange
		return "#ef4444"; // red
	};

	const isSignificant = data.pvalue < 0.05;
	const nesColor = getScoreColor(data.nes);

	return (
		<Box
			sx={{
				px: 2,
				py: 1.5,
				boxShadow: 3,
				borderRadius: 2,
				bgcolor: "white",
				border: isSignificant ? "3px solid #22c55e" : "2px solid #e5e7eb",
				minWidth: 280,
				transition: "all 0.2s ease",
				"&:hover": {
					boxShadow: 6,
				},
				cursor: "pointer",
			}}
			onClick={(e) => {
				e.stopPropagation();
				console.log("Pathway node clicked:", data);
			}}
		>
			<Handle type="target" position={Position.Top} className="w-3 h-3" />

			<Typography
				variant="subtitle2"
				sx={{
					fontWeight: "bold",
					mb: 1,
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
				}}
				title={data.pathway}
			>
				{data.pathway}
			</Typography>

			<Box
				sx={{
					fontSize: "0.75rem",
					color: "text.secondary",
					"& > *": { mb: 0.5 },
				}}
			>
				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<span>ID:</span>
					<Box component="span" sx={{ fontFamily: "monospace" }}>
						{data.id}
					</Box>
				</Box>

				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<span>NES:</span>
					<Box
						component="span"
						sx={{
							fontWeight: 600,
							px: 1,
							py: 0.5,
							borderRadius: 1,
							backgroundColor: `${nesColor}20`,
							color: nesColor,
						}}
					>
						{data.nes.toFixed(2)}
					</Box>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<span>Genes:</span>
					<span>{data.geneCount}</span>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<span>Size:</span>
					<span>{data.pathwaySize}</span>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<span>p-value:</span>
					<Box component="span" sx={{ fontFamily: "monospace" }}>
						{data.pvalue.toExponential(2)}
					</Box>
				</Box>
			</Box>

			<Handle type="source" position={Position.Bottom} className="w-3 h-3" />
		</Box>
	);
};

// Custom Subflow Node Component for parent pathways
const SubflowNode: React.FC<{
	data: {
		id: string;
		pathway: string;
		nes: number;
		geneCount: number;
		pathwaySize: number;
		pvalue: number;
		childCount: number;
	};
}> = ({ data }) => {
	const getScoreColor = (nes: number) => {
		if (nes > 2.5) return "#22c55e"; // green
		if (nes > 2) return "#84cc16"; // lime
		if (nes > 1.5) return "#eab308"; // yellow
		if (nes > 0) return "#f97316"; // orange
		return "#ef4444"; // red
	};

	const isSignificant = data.pvalue < 0.05;
	const nesColor = getScoreColor(data.nes);

	return (
		<Box
			sx={{
				p: 2,
				boxShadow: 4,
				borderRadius: 3,
				bgcolor: "white",
				border: isSignificant ? "4px solid #22c55e" : "3px solid #3b82f6", // Made border thicker and blue for subflows
				minWidth: 320,
				minHeight: 200,
				transition: "all 0.2s ease",
				"&:hover": {
					boxShadow: 8,
				},
				position: "relative",
				cursor: "pointer",
			}}
			onClick={(e) => {
				e.stopPropagation();
				console.log("Subflow node clicked:", data);
			}}
		>
			<Handle type="target" position={Position.Top} className="w-3 h-3" />

			<Typography
				variant="h6"
				sx={{
					fontWeight: "bold",
					mb: 1,
					textAlign: "center",
					overflow: "hidden",
					textOverflow: "ellipsis",
					whiteSpace: "nowrap",
					color: "#1e40af", // Blue color for subflow titles
				}}
				title={data.pathway}
			>
				{data.pathway}
			</Typography>

			<Box
				sx={{
					fontSize: "0.75rem",
					color: "text.secondary",
					textAlign: "center",
				}}
			>
				<Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
					<span>ID:</span>
					<Box component="span" sx={{ fontFamily: "monospace" }}>
						{data.id}
					</Box>
				</Box>

				<Box
					sx={{
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
						mb: 1,
					}}
				>
					<span>NES:</span>
					<Box
						component="span"
						sx={{
							fontWeight: 600,
							px: 1,
							py: 0.5,
							borderRadius: 1,
							backgroundColor: `${nesColor}20`,
							color: nesColor,
						}}
					>
						{data.nes.toFixed(2)}
					</Box>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
					<span>Children:</span>
					<span>{data.childCount}</span>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between", mb: 1 }}>
					<span>Size:</span>
					<span>{data.pathwaySize}</span>
				</Box>

				<Box sx={{ display: "flex", justifyContent: "space-between" }}>
					<span>p-value:</span>
					<Box component="span" sx={{ fontFamily: "monospace" }}>
						{data.pvalue.toExponential(2)}
					</Box>
				</Box>
			</Box>

			<Handle type="source" position={Position.Bottom} className="w-3 h-3" />
		</Box>
	);
};

const nodeTypes = {
	pathway: PathwayNode,
	subflow: SubflowNode,
};

// Filter panel component
const FilterPanel: React.FC<{
	filters: FilterState;
	onFilterChange: (
		key: keyof FilterState,
		value: string | number | boolean | number[],
	) => void;
	onClearFilters: () => void;
	visibleCount: number;
	totalCount: number;
}> = ({
	filters,
	onFilterChange,
	onClearFilters,
	visibleCount,
	totalCount,
}) => {
	const [expanded, setExpanded] = useState(true);

	return (
		<Paper sx={{ width: 320, height: "100%", overflow: "auto" }}>
			<Box sx={{ p: 2 }}>
				<Box
					sx={{
						display: "flex",
						alignItems: "center",
						justifyContent: "space-between",
						mb: 2,
					}}
				>
					<Typography
						variant="h6"
						sx={{ display: "flex", alignItems: "center", gap: 1 }}
					>
						<FilterListIcon />
						Filters
					</Typography>
					<IconButton onClick={() => setExpanded(!expanded)} size="small">
						{expanded ? <VisibilityOffIcon /> : <VisibilityIcon />}
					</IconButton>
				</Box>

				<Collapse in={expanded}>
					<Box sx={{ "& > *": { mb: 2 } }}>
						{/* Filter count indicator */}
						<Chip
							label={`${visibleCount} of ${totalCount} pathways visible`}
							color={visibleCount === totalCount ? "default" : "primary"}
							variant={visibleCount === totalCount ? "outlined" : "filled"}
							sx={{ width: "100%" }}
						/>

						{/* Search */}
						<TextField
							fullWidth
							size="small"
							label="Search pathways"
							value={filters.searchText}
							onChange={(e) => onFilterChange("searchText", e.target.value)}
							InputProps={{
								startAdornment: (
									<SearchIcon sx={{ color: "text.disabled", mr: 1 }} />
								),
							}}
						/>

						{/* NES Score Range */}
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								NES Score Range: {filters.nesRange[0].toFixed(1)} -{" "}
								{filters.nesRange[1].toFixed(1)}
							</Typography>
							<Slider
								value={filters.nesRange}
								onChange={(_, value) => onFilterChange("nesRange", value)}
								min={-3}
								max={3}
								step={0.1}
								valueLabelDisplay="auto"
								marks={[
									{ value: -3, label: "-3" },
									{ value: 0, label: "0" },
									{ value: 3, label: "3" },
								]}
							/>
						</Box>

						{/* P-value Threshold */}
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								P-value Threshold: {filters.pValueThreshold.toExponential(2)}
							</Typography>
							<Slider
								value={filters.pValueThreshold}
								onChange={(_, value) =>
									onFilterChange("pValueThreshold", value)
								}
								min={0.001}
								max={0.1}
								step={0.001}
								valueLabelDisplay="auto"
								marks={[
									{ value: 0.001, label: "0.001" },
									{ value: 0.01, label: "0.01" },
									{ value: 0.05, label: "0.05" },
									{ value: 0.1, label: "0.1" },
								]}
							/>
						</Box>

						{/* Gene Count Range */}
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Gene Count: {filters.geneCountRange[0]} -{" "}
								{filters.geneCountRange[1]}
							</Typography>
							<Slider
								value={filters.geneCountRange}
								onChange={(_, value) => onFilterChange("geneCountRange", value)}
								min={0}
								max={200}
								step={1}
								valueLabelDisplay="auto"
							/>
						</Box>

						{/* Pathway Size Range */}
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								Pathway Size: {filters.pathwaySizeRange[0]} -{" "}
								{filters.pathwaySizeRange[1]}
							</Typography>
							<Slider
								value={filters.pathwaySizeRange}
								onChange={(_, value) =>
									onFilterChange("pathwaySizeRange", value)
								}
								min={0}
								max={3000}
								step={50}
								valueLabelDisplay="auto"
							/>
						</Box>

						{/* FDR Threshold */}
						<Box>
							<Typography variant="subtitle2" gutterBottom>
								FDR Threshold: {filters.fdrThreshold.toFixed(3)}
							</Typography>
							<Slider
								value={filters.fdrThreshold}
								onChange={(_, value) => onFilterChange("fdrThreshold", value)}
								min={0}
								max={1}
								step={0.01}
								valueLabelDisplay="auto"
								marks={[
									{ value: 0, label: "0" },
									{ value: 0.05, label: "0.05" },
									{ value: 0.1, label: "0.1" },
									{ value: 1, label: "1" },
								]}
							/>
						</Box>

						<Divider />

						{/* Show/Hide toggles */}
						<Accordion>
							<AccordionSummary expandIcon={<ExpandMoreIcon />}>
								<Typography variant="subtitle2">Display Options</Typography>
							</AccordionSummary>
							<AccordionDetails>
								<Box sx={{ "& > *": { mb: 1 } }}>
									<FormControlLabel
										control={
											<Switch
												checked={filters.showStandalone}
												onChange={(e) =>
													onFilterChange("showStandalone", e.target.checked)
												}
											/>
										}
										label="Show standalone pathways"
									/>
									<FormControlLabel
										control={
											<Switch
												checked={filters.showParentChild}
												onChange={(e) =>
													onFilterChange("showParentChild", e.target.checked)
												}
											/>
										}
										label="Show parent-child relationships"
									/>
									<FormControlLabel
										control={
											<Switch
												checked={filters.showSignificantOnly}
												onChange={(e) =>
													onFilterChange(
														"showSignificantOnly",
														e.target.checked,
													)
												}
											/>
										}
										label="Show only significant (p < 0.05)"
									/>
								</Box>
							</AccordionDetails>
						</Accordion>

						{/* Clear filters button */}
						<Button
							variant="outlined"
							onClick={onClearFilters}
							startIcon={<ClearIcon />}
							fullWidth
						>
							Clear All Filters
						</Button>
					</Box>
				</Collapse>
			</Box>
		</Paper>
	);
};

// Main component
const PathwayFlowVisualization: React.FC<{ data?: PathwayData[] }> = ({
	data = [],
}) => {
	// Use provided data or sample data if none provided
	const pathwayData =
		data.length > 0
			? data
			: [
					{
						ID: "R-HSA-109582",
						Pathway: "Hemostasis",
						ES: 0.347,
						NES: 2.892,
						FDR: 0.188,
						"p-value": 0.0038,
						"Number of input genes": 40,
						"Leading edge genes": "GATA3,MYB,ABL1,NRAS,PTPN11,IRF1,RASGRP1",
						"Pathway size": 706,
						"Parent pathway": "",
					},
					{
						ID: "R-HSA-109606",
						Pathway: "Intrinsic Pathway for Apoptosis",
						ES: 0.54,
						NES: 1.831,
						FDR: 0.403,
						"p-value": 0.067,
						"Number of input genes": 8,
						"Leading edge genes": "CDKN2A",
						"Pathway size": 54,
						"Parent pathway": "R-HSA-109581",
					},
					{
						ID: "R-HSA-109704",
						Pathway: "PI3K Cascade",
						ES: 0.524,
						NES: 1.846,
						FDR: 0.403,
						"p-value": 0.065,
						"Number of input genes": 9,
						"Leading edge genes":
							"FGFR3,FGFR4,FGFR2,PIK3CA,PTPN11,PIK3CB,FGFR1",
						"Pathway size": 43,
						"Parent pathway": "R-HSA-112399",
					},
					{
						ID: "R-HSA-112382",
						Pathway: "Formation of RNA Pol II elongation complex",
						ES: 0.715,
						NES: 2.891,
						FDR: 0.188,
						"p-value": 0.0038,
						"Number of input genes": 6,
						"Leading edge genes": "MLLT1,ELL,MLLT3,ERCC2",
						"Pathway size": 57,
						"Parent pathway": "R-HSA-75955",
					},
					{
						ID: "R-HSA-112399",
						Pathway: "IRS-mediated signalling",
						ES: 0.473,
						NES: 1.878,
						FDR: 0.403,
						"p-value": 0.06,
						"Number of input genes": 12,
						"Leading edge genes":
							"FGFR3,FGFR4,FGFR2,NRAS,PIK3CA,PTPN11,PIK3R1,PIK3CB,FGFR1",
						"Pathway size": 47,
						"Parent pathway": "R-HSA-74751,R-HSA-2428928",
					},
					{
						ID: "R-HSA-1266738",
						Pathway: "Developmental Biology",
						ES: 0.265,
						NES: 2.489,
						FDR: 0.314,
						"p-value": 0.013,
						"Number of input genes": 152,
						"Leading edge genes":
							"GATA3,CDKN2A,PBX1,ABL1,NRAS,TCF3,PTPN11,KMT2A,RUNX1,NFKB1,MYB,BRCA1,CREBBP,MAFB,MITF,RET,TAL1,CDH1,FOXP1,FOXO3,PIK3CA,RPL5,SMARCA4,ARID1B,PIK3CB,TFE3,MECOM,CACNA1D,FOXA1,CXCR4,CREB1,ARID1A,KMT2C,CCND3,FGFR1,DNM2,SMARCB1,SALL4,EZH2,CHD4,TBX3,KLF4,MYC,ERBB2,EGFR,NOTCH1,TCF7L2,TET2,SMAD2,JUN,TRIM33,ARHGEF12,SUZ12,BCL2,GATA2,SOX2,MED12,RHOA,CBFB,SMAD4,PRDM16,RPL10,FOXO1,EBF1,KMT2D,FLI1,PML,AKT1,WWTR1,RPL22,PTPRC,XPO1,MYH9,DICER1,MET,MYOD1,NCOR2,NCOR1,ZNF521,NCOA2,CLTC,TP53,PIK3R1,KDM6A,TBL1XR1,KIT,KRAS,CLTCL1,PAX3,LEF1,COL2A1,CNOT3,EP300,ACVR2A",
						"Pathway size": 1423,
						"Parent pathway": "",
					},
					{
						ID: "R-HSA-1428517",
						Pathway: "Aerobic respiration and respiratory electron transport",
						ES: -0.615,
						NES: -2.221,
						FDR: 0.398,
						"p-value": 0.026,
						"Number of input genes": 8,
						"Leading edge genes": "TIMMDC1,NDUFB1,COX6C",
						"Pathway size": 260,
						"Parent pathway": "R-HSA-1430728",
					},
					{
						ID: "R-HSA-1430728",
						Pathway: "Metabolism",
						ES: -0.315,
						NES: -1.933,
						FDR: 0.403,
						"p-value": 0.053,
						"Number of input genes": 67,
						"Leading edge genes":
							"PNMT,CYP2C8,SLC22A5,CCNC,HSP90AA1,NDUFB1,GPHN,TIMMDC1,COX6C,MANBA,OAT,GMPS,ORMDL3",
						"Pathway size": 2189,
						"Parent pathway": "",
					},
				];

	// Filter state
	const [filters, setFilters] = useState<FilterState>({
		nesRange: [-3, 3],
		pValueThreshold: 0.1,
		geneCountRange: [0, 200],
		pathwaySizeRange: [0, 3000],
		searchText: "",
		fdrThreshold: 1,
		showStandalone: true,
		showParentChild: true,
		showSignificantOnly: false,
	});

	// React Flow state
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);

	// Filter data based on current filters
	const filteredData = useMemo(() => {
		return pathwayData.filter((pathway) => {
			// NES score range
			if (
				pathway.NES < filters.nesRange[0] ||
				pathway.NES > filters.nesRange[1]
			)
				return false;

			// P-value threshold
			if (pathway["p-value"] > filters.pValueThreshold) return false;

			// Gene count range
			if (
				pathway["Number of input genes"] < filters.geneCountRange[0] ||
				pathway["Number of input genes"] > filters.geneCountRange[1]
			)
				return false;

			// Pathway size range
			if (
				pathway["Pathway size"] < filters.pathwaySizeRange[0] ||
				pathway["Pathway size"] > filters.pathwaySizeRange[1]
			)
				return false;

			// FDR threshold
			if (pathway.FDR > filters.fdrThreshold) return false;

			// Search text
			if (
				filters.searchText &&
				!pathway.Pathway.toLowerCase().includes(
					filters.searchText.toLowerCase(),
				) &&
				!pathway.ID.toLowerCase().includes(filters.searchText.toLowerCase())
			)
				return false;

			// Show only significant
			if (filters.showSignificantOnly && pathway["p-value"] >= 0.05)
				return false;

			// Show/hide standalone
			if (!filters.showStandalone && !pathway["Parent pathway"]) return false;

			// Show/hide parent-child relationships
			if (!filters.showParentChild && pathway["Parent pathway"]) return false;

			return true;
		});
	}, [pathwayData, filters]);

	// Generate nodes and edges from filtered data
	const flowElements = useMemo(() => {
		const nodes: Node[] = [];
		const edges: Edge[] = [];

		// Create a map of parent pathways and their children
		const parentGroups = new Map<string, PathwayData[]>();
		const standalonePathways: PathwayData[] = [];

		filteredData.forEach((pathway) => {
			const parents = pathway["Parent pathway"]
				? pathway["Parent pathway"].split(",").map((p) => p.trim())
				: [];

			if (parents.length === 0 || parents[0] === "") {
				standalonePathways.push(pathway);
			} else {
				parents.forEach((parent) => {
					if (!parentGroups.has(parent)) {
						parentGroups.set(parent, []);
					}
					parentGroups.get(parent)!.push(pathway);
				});
			}
		});

		// Calculate grid layout parameters
		const maxNodesPerRow = 6; // Reduced from 8 to 6 for tighter layout
		const nodeSpacing = 280; // Reduced spacing between nodes
		const groupSpacing = 350; // Reduced spacing between groups

		let yPos = 50;

		// Create nodes for standalone pathways in a grid layout
		const standaloneRows = Math.ceil(
			standalonePathways.length / maxNodesPerRow,
		);
		standalonePathways.forEach((pathway, index) => {
			const row = Math.floor(index / maxNodesPerRow);
			const col = index % maxNodesPerRow;
			const x = col * nodeSpacing + 50;
			const y = row * 120 + yPos; // Reduced row height

			nodes.push({
				id: pathway.ID,
				type: "pathway",
				position: { x, y },
				data: {
					id: pathway.ID,
					pathway: pathway.Pathway,
					nes: pathway.NES,
					geneCount: pathway["Number of input genes"],
					pathwaySize: pathway["Pathway size"],
					pvalue: pathway["p-value"],
				},
			});
		});

		yPos += standaloneRows * 120 + 80; // Reduced spacing

		// Create subflow nodes for parent pathways and their children in a grid layout
		const groupEntries = Array.from(parentGroups.entries());

		groupEntries.forEach(([parentId, children], groupIndex) => {
			const row = Math.floor(groupIndex / 2); // Changed from 3 to 2 groups per row
			const col = groupIndex % 2; // Changed from 3 to 2 groups per row
			const groupXStart = col * groupSpacing + 50;
			const groupY = row * 250 + yPos; // Reduced row height

			// Create parent pathway subflow node
			const parentPathway = filteredData.find((p) => p.ID === parentId);
			const parentData = parentPathway
				? {
						id: parentPathway.ID,
						pathway: parentPathway.Pathway,
						nes: parentPathway.NES,
						geneCount: parentPathway["Number of input genes"],
						pathwaySize: parentPathway["Pathway size"],
						pvalue: parentPathway["p-value"],
						childCount: children.length,
					}
				: {
						id: parentId,
						pathway: parentId.replace("R-HSA-", "Pathway "),
						nes: 0,
						geneCount: 0,
						pathwaySize: 0,
						pvalue: 1,
						childCount: children.length,
					};

			// Create subflow container node
			const subflowId = `subflow-${parentId}`;
			const subflowWidth = Math.max(400, Math.min(600, children.length * 120)); // Increased width for better visibility
			const subflowHeight = 220; // Increased height for better visibility

			nodes.push({
				id: subflowId,
				type: "subflow",
				position: { x: groupXStart, y: groupY },
				data: parentData,
				style: {
					width: subflowWidth,
					height: subflowHeight,
				},
			});

			// Create child pathway nodes within the subflow in a compact grid
			const maxChildrenPerRow = 3; // Reduced from 4 to 3 for better spacing
			children.forEach((child, childIndex) => {
				const childId = `${child.ID}`;
				const childRow = Math.floor(childIndex / maxChildrenPerRow);
				const childCol = childIndex % maxChildrenPerRow;
				const childX = groupXStart + 20 + childCol * 110; // Increased spacing
				const childY = groupY + 80 + childRow * 90; // Increased spacing

				nodes.push({
					id: childId,
					type: "pathway",
					position: { x: childX, y: childY },
					data: {
						id: child.ID,
						pathway: child.Pathway,
						nes: child.NES,
						geneCount: child["Number of input genes"],
						pathwaySize: child["Pathway size"],
						pvalue: child["p-value"],
					},
					parentNode: subflowId,
					extent: "parent",
				});

				// Create edge from parent to child within subflow
				edges.push({
					id: `${subflowId}-${childId}`,
					source: subflowId,
					target: childId,
					type: "smoothstep",
					style: { stroke: "#64748b", strokeWidth: 2 },
				});
			});

			// Create edges from standalone pathways to subflow containers if they reference this parent
			standalonePathways.forEach((standalonePathway) => {
				const standaloneId = standalonePathway.ID;
				edges.push({
					id: `${standaloneId}-${subflowId}`,
					source: standaloneId,
					target: subflowId,
					type: "smoothstep",
					style: {
						stroke: "#3b82f6",
						strokeWidth: 3,
						strokeDasharray: "5,5",
					},
				});
			});
		});

		return { nodes, edges };
	}, [filteredData]);

	// Apply layout using dagre
	const applyLayout = useCallback((nodes: Node[], edges: Edge[]) => {
		const dagreGraph = new dagre.graphlib.Graph();
		dagreGraph.setDefaultEdgeLabel(() => ({}));

		// Adjust spacing based on number of nodes for better large dataset handling
		const nodeCount = nodes.length;
		const ranksep = nodeCount > 100 ? 200 : nodeCount > 50 ? 150 : 120;
		const nodesep = nodeCount > 100 ? 100 : nodeCount > 50 ? 80 : 60;

		dagreGraph.setGraph({ rankdir: "TB", ranksep, nodesep });

		// Set node sizes based on type
		nodes.forEach((node) => {
			if (node.type === "subflow") {
				dagreGraph.setNode(node.id, { width: 350, height: 200 });
			} else {
				dagreGraph.setNode(node.id, { width: 280, height: 120 });
			}
		});

		// Only add edges between standalone nodes and subflow containers
		edges.forEach((edge) => {
			// Only add edges that don't connect to child nodes within subflows
			const targetNode = nodes.find((n) => n.id === edge.target);
			if (!targetNode?.parentNode) {
				dagreGraph.setEdge(edge.source, edge.target);
			}
		});

		dagre.layout(dagreGraph);

		return {
			nodes: nodes.map((node) => {
				const nodeWithPosition = dagreGraph.node(node.id);
				if (node.type === "subflow") {
					return {
						...node,
						position: {
							x: nodeWithPosition.x - 175,
							y: nodeWithPosition.y - 100,
						},
					};
				} else {
					return {
						...node,
						position: {
							x: nodeWithPosition.x - 140,
							y: nodeWithPosition.y - 60,
						},
					};
				}
			}),
			edges,
		};
	}, []);

	// Update flow elements when filtered data changes
	useEffect(() => {
		const { nodes: newNodes, edges: newEdges } = flowElements;
		const { nodes: layoutedNodes, edges: layoutedEdges } = applyLayout(
			newNodes,
			newEdges,
		);
		setNodes(layoutedNodes);
		setEdges(layoutedEdges);
	}, [flowElements, applyLayout, setNodes, setEdges]);

	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	const handleFilterChange = useCallback(
		(key: keyof FilterState, value: string | number | boolean | number[]) => {
			setFilters((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	const handleClearFilters = useCallback(() => {
		setFilters({
			nesRange: [-3, 3],
			pValueThreshold: 0.1,
			geneCountRange: [0, 200],
			pathwaySizeRange: [0, 3000],
			searchText: "",
			fdrThreshold: 1,
			showStandalone: true,
			showParentChild: true,
			showSignificantOnly: false,
		});
	}, []);

	return (
		<Box sx={{ width: "100%", height: "900px", display: "flex" }}>
			{/* Filter Panel */}
			<FilterPanel
				filters={filters}
				onFilterChange={handleFilterChange}
				onClearFilters={handleClearFilters}
				visibleCount={filteredData.length}
				totalCount={pathwayData.length}
			/>

			{/* Flow Visualization */}
			<Box sx={{ flex: 1, height: "100%" }}>
				<Box
					sx={{
						p: 2,
						bgcolor: "grey.50",
						borderBottom: 1,
						borderColor: "grey.300",
						display: "flex",
						justifyContent: "space-between",
						alignItems: "center",
					}}
				>
					<Box>
						<Typography
							variant="h5"
							sx={{ fontWeight: "bold", color: "text.primary" }}
						>
							Pathway Flow Visualization
						</Typography>
						<Typography variant="body2" sx={{ color: "text.secondary" }}>
							Hierarchical pathway relationships with filtering capabilities
						</Typography>
					</Box>
				</Box>

				<Box sx={{ height: "calc(100% - 80px)" }}>
					<ReactFlow
						nodes={nodes}
						edges={edges}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						nodeTypes={nodeTypes}
						fitView
						fitViewOptions={{ padding: 0.1, includeHiddenNodes: false }}
						style={{ backgroundColor: "#f5f5f5" }}
						nodesDraggable={false}
						nodesConnectable={false}
						elementsSelectable={true}
						selectNodesOnDrag={false}
						minZoom={0.1}
						maxZoom={2}
						defaultViewport={{ x: 0, y: 0, zoom: 0.5 }}
						onNodeClick={(event, node) => {
							console.log("Node clicked:", node);
							// You can add custom click handling here
						}}
					>
						<Controls
							showZoom={true}
							showFitView={true}
							showInteractive={false}
						/>
						<Background color="#e2e8f0" gap={16} />
					</ReactFlow>
				</Box>
			</Box>
		</Box>
	);
};

export default PathwayFlowVisualization;
