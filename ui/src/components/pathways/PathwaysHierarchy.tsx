import React, { useState, useCallback, useMemo } from "react";
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
	FormControlLabel,
	Switch,
	Collapse,
	List,
	ListItem,
	ListItemButton,
	ListItemIcon,
	ListItemText,
	Divider,
} from "@mui/material";
import {
	Settings as SettingsIcon,
	Info as InfoIcon,
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
	AccountTree as AccountTreeIcon,
	Hub as HubIcon,
	Science as ScienceIcon,
	TrendingUp as TrendingUpIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

interface PathwaysHierarchyProps {
	pathways: Pathway[];
}

interface TreeNode {
	id: string;
	pathway: Pathway;
	children: TreeNode[];
	level: number;
}

interface TreeViewSettings {
	showPValues: boolean;
	showFDR: boolean;
	showGenes: boolean;
	showGeneCount: boolean;
	showPathwaySize: boolean;
	showES: boolean;
	showNES: boolean;
	compactMode: boolean;
	sortBy: "name" | "pvalue" | "fdr" | "es" | "nes";
	sortDirection: "asc" | "desc";
}

// Build tree structure from pathways
const buildPathwayTree = (pathways: Pathway[]): TreeNode[] => {
	const pathwayMap = new Map<string, Pathway>();
	const childrenMap = new Map<string, string[]>();
	const rootNodes: TreeNode[] = [];

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
			// This is a root pathway
			rootNodes.push({
				id,
				pathway,
				children: [],
				level: 0,
			});
		}
	});

	// Recursive function to build tree
	const buildChildren = (parentId: string, level: number): TreeNode[] => {
		const children = childrenMap.get(parentId) || [];
		return children
			.map((childId) => {
				const childPathway = pathwayMap.get(childId);
				if (!childPathway) return null;

				return {
					id: childId,
					pathway: childPathway,
					children: buildChildren(childId, level + 1),
					level,
					isExpanded: false, // We'll manage this externally now
				};
			})
			.filter(Boolean) as TreeNode[];
	};

	// Build children for root nodes
	rootNodes.forEach((rootNode) => {
		rootNode.children = buildChildren(rootNode.id, 1);
	});

	return rootNodes;
};

// Sort tree nodes
const sortTreeNodes = (
	nodes: TreeNode[],
	settings: TreeViewSettings,
): TreeNode[] => {
	const sortFunction = (a: TreeNode, b: TreeNode) => {
		let aValue: string | number, bValue: string | number;

		switch (settings.sortBy) {
			case "name":
				aValue = a.pathway["Pathway"] || a.pathway["pathway"] || "";
				bValue = b.pathway["Pathway"] || b.pathway["pathway"] || "";
				break;
			case "pvalue":
				aValue = a.pathway["p-value"] || a.pathway["p_value"] || 1;
				bValue = b.pathway["p-value"] || b.pathway["p_value"] || 1;
				break;
			case "fdr":
				aValue = a.pathway["FDR"] || a.pathway["fdr"] || 1;
				bValue = b.pathway["FDR"] || b.pathway["fdr"] || 1;
				break;
			case "es":
				aValue = a.pathway["ES"] || a.pathway["es"] || 0;
				bValue = b.pathway["ES"] || b.pathway["es"] || 0;
				break;
			case "nes":
				aValue = a.pathway["NES"] || a.pathway["nes"] || 0;
				bValue = b.pathway["NES"] || b.pathway["nes"] || 0;
				break;
			default:
				return 0;
		}

		if (settings.sortDirection === "asc") {
			return aValue > bValue ? 1 : -1;
		} else {
			return aValue < bValue ? 1 : -1;
		}
	};

	const sortRecursive = (nodes: TreeNode[]): TreeNode[] => {
		return nodes.sort(sortFunction).map((node) => ({
			...node,
			children: sortRecursive(node.children),
		}));
	};

	return sortRecursive(nodes);
};

// Tree Node Component
const TreeNodeComponent: React.FC<{
	node: TreeNode;
	settings: TreeViewSettings;
	expandedNodes: Set<string>;
	onToggle: (nodeId: string) => void;
	onNodeClick: (node: TreeNode) => void;
}> = ({ node, settings, expandedNodes, onToggle, onNodeClick }) => {
	const pathway = node.pathway;
	const pValue = pathway["p-value"] || pathway["p_value"] || 1;
	const fdr = pathway["FDR"] || pathway["fdr"] || 1;
	const es = pathway["ES"] || pathway["es"] || 0;
	const nes = pathway["NES"] || pathway["nes"] || 0;
	const genes = pathway["Leading edge genes"] || pathway["genes"] || "";
	const geneCount = pathway["Number of input genes"] || 0;
	const pathwaySize = pathway["Pathway size"] || 0;

	const geneList =
		typeof genes === "string"
			? genes.split(",").map((g) => g.trim())
			: Array.isArray(genes)
				? genes
				: [];

	const hasChildren = node.children.length > 0;
	const isSignificant = pValue < 0.05;
	const isExpanded = expandedNodes.has(node.id);

	return (
		<Box>
			<ListItem
				sx={{
					pl: node.level * 3 + 2,
					backgroundColor: isSignificant
						? "rgba(76, 175, 80, 0.1)"
						: "transparent",
					borderLeft: isSignificant
						? "4px solid #4caf50"
						: "4px solid transparent",
					"&:hover": {
						backgroundColor: "rgba(0, 0, 0, 0.04)",
					},
				}}
			>
				<ListItemButton
					onClick={() => onNodeClick(node)}
					sx={{ borderRadius: 1 }}
				>
					<ListItemIcon sx={{ minWidth: 40 }}>
						{hasChildren ? (
							<IconButton
								size="small"
								onClick={(e) => {
									e.stopPropagation();
									onToggle(node.id);
								}}
							>
								{isExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
							</IconButton>
						) : (
							<ScienceIcon color={isSignificant ? "success" : "disabled"} />
						)}
					</ListItemIcon>

					<ListItemText
						primary={
							<Box
								sx={{
									display: "flex",
									alignItems: "center",
									gap: 1,
									flexWrap: "wrap",
								}}
							>
								<Typography
									variant="body1"
									sx={{
										fontWeight: isSignificant ? "bold" : "normal",
										color: isSignificant ? "primary.main" : "text.primary",
									}}
								>
									{pathway["Pathway"] ||
										pathway["pathway"] ||
										"Unknown Pathway"}
								</Typography>

								<Box sx={{ display: "flex", gap: 0.5, flexWrap: "wrap" }}>
									{settings.showPValues && (
										<Chip
											label={`P: ${pValue.toExponential(2)}`}
											size="small"
											color={pValue < 0.05 ? "success" : "default"}
											variant={pValue < 0.05 ? "filled" : "outlined"}
										/>
									)}

									{settings.showFDR && (
										<Chip
											label={`FDR: ${fdr.toExponential(2)}`}
											size="small"
											color={fdr < 0.05 ? "success" : "default"}
											variant={fdr < 0.05 ? "filled" : "outlined"}
										/>
									)}

									{settings.showES && (
										<Chip
											label={`ES: ${es.toFixed(3)}`}
											size="small"
											color={es > 0.2 ? "success" : "default"}
											variant={es > 0.2 ? "filled" : "outlined"}
										/>
									)}

									{settings.showNES && (
										<Chip
											label={`NES: ${nes.toFixed(3)}`}
											size="small"
											color={nes > 1.5 ? "success" : "default"}
											variant={nes > 1.5 ? "filled" : "outlined"}
										/>
									)}

									{settings.showGeneCount && (
										<Chip
											label={`${geneCount} genes`}
											size="small"
											color="primary"
											variant="outlined"
										/>
									)}

									{settings.showPathwaySize && (
										<Chip
											label={`Size: ${pathwaySize}`}
											size="small"
											color="secondary"
											variant="outlined"
										/>
									)}
								</Box>
							</Box>
						}
						secondary={
							settings.showGenes &&
							geneList.length > 0 && (
								<Box sx={{ mt: 1 }}>
									<Typography variant="caption" color="text.secondary">
										Leading edge genes:
									</Typography>
									<Box
										sx={{
											display: "flex",
											flexWrap: "wrap",
											gap: 0.5,
											mt: 0.5,
										}}
									>
										{geneList.slice(0, 10).map((gene, index) => (
											<Chip
												key={`${node.id}-gene-${index}`}
												label={gene}
												size="small"
												variant="outlined"
												sx={{ fontSize: "0.6rem" }}
											/>
										))}
										{geneList.length > 10 && (
											<Chip
												label={`+${geneList.length - 10} more`}
												size="small"
												variant="outlined"
												sx={{ fontSize: "0.6rem" }}
											/>
										)}
									</Box>
								</Box>
							)
						}
					/>
				</ListItemButton>
			</ListItem>

			{hasChildren && isExpanded && (
				<Collapse in={isExpanded} timeout="auto" unmountOnExit>
					<List component="div" disablePadding>
						{node.children.map((childNode) => (
							<TreeNodeComponent
								key={childNode.id}
								node={childNode}
								settings={settings}
								expandedNodes={expandedNodes}
								onToggle={onToggle}
								onNodeClick={onNodeClick}
							/>
						))}
					</List>
				</Collapse>
			)}
		</Box>
	);
};

const PathwaysHierarchy: React.FC<PathwaysHierarchyProps> = ({ pathways }) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
	const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);
	const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
	const [settings, setSettings] = useState<TreeViewSettings>({
		showPValues: true,
		showFDR: true,
		showGenes: false,
		showGeneCount: true,
		showPathwaySize: false,
		showES: false,
		showNES: false,
		compactMode: false,
		sortBy: "pvalue",
		sortDirection: "asc",
	});

	// Build and sort tree
	const treeData = useMemo(() => {
		const tree = buildPathwayTree(pathways);
		return sortTreeNodes(tree, settings);
	}, [pathways, settings]);

	// Handle node toggle
	const handleNodeToggle = useCallback((nodeId: string) => {
		setExpandedNodes((prev) => {
			const newSet = new Set(prev);
			if (newSet.has(nodeId)) {
				newSet.delete(nodeId);
			} else {
				newSet.add(nodeId);
			}
			return newSet;
		});
	}, []);

	// Handle node click for details
	const handleNodeClick = useCallback((node: TreeNode) => {
		setSelectedNode(node);
		setNodeDetailsOpen(true);
	}, []);

	// Handle settings change
	const handleSettingsChange = useCallback(
		(key: keyof TreeViewSettings, value: string | boolean) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	if (pathways.length === 0) {
		return (
			<Box textAlign="center" py={4}>
				<Typography color="text.secondary">
					No pathways to display in tree view.
				</Typography>
			</Box>
		);
	}

	const significantPathways = pathways.filter(
		(p) => (p["p-value"] || p["p_value"] || 1) < 0.05,
	).length;
	const totalPathways = pathways.length;

	return (
		<Box sx={{ height: "100%", width: "100%" }}>
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
						Pathways Tree View
					</Typography>
					<Box>
						<Tooltip title="Settings">
							<IconButton onClick={() => setSettingsOpen(true)}>
								<SettingsIcon />
							</IconButton>
						</Tooltip>
					</Box>
				</Box>

				<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
					<Chip
						label={`${totalPathways} total pathways`}
						color="primary"
						size="small"
						icon={<AccountTreeIcon />}
					/>
					<Chip
						label={`${significantPathways} significant`}
						color="success"
						size="small"
						icon={<TrendingUpIcon />}
					/>
					<Chip
						label={`${treeData.length} root pathways`}
						color="secondary"
						size="small"
						icon={<HubIcon />}
					/>
					<Chip
						label={`Sorted by ${settings.sortBy}`}
						variant="outlined"
						size="small"
					/>
				</Box>
			</Paper>

			<Paper sx={{ height: "800px", overflow: "auto" }}>
				<List>
					{treeData.map((node) => (
						<TreeNodeComponent
							key={node.id}
							node={node}
							settings={settings}
							expandedNodes={expandedNodes}
							onToggle={handleNodeToggle}
							onNodeClick={handleNodeClick}
						/>
					))}
				</List>
			</Paper>

			{/* Settings Dialog */}
			<Dialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				maxWidth="sm"
				fullWidth
			>
				<DialogTitle>Tree View Settings</DialogTitle>
				<DialogContent>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
						<FormControl fullWidth>
							<InputLabel>Sort By</InputLabel>
							<Select
								value={settings.sortBy}
								onChange={(e) => handleSettingsChange("sortBy", e.target.value)}
								label="Sort By"
							>
								<MenuItem value="name">Name</MenuItem>
								<MenuItem value="pvalue">P-Value</MenuItem>
								<MenuItem value="fdr">FDR</MenuItem>
								<MenuItem value="es">Enrichment Score</MenuItem>
								<MenuItem value="nes">Normalized ES</MenuItem>
							</Select>
						</FormControl>

						<FormControl fullWidth>
							<InputLabel>Sort Direction</InputLabel>
							<Select
								value={settings.sortDirection}
								onChange={(e) =>
									handleSettingsChange("sortDirection", e.target.value)
								}
								label="Sort Direction"
							>
								<MenuItem value="asc">Ascending</MenuItem>
								<MenuItem value="desc">Descending</MenuItem>
							</Select>
						</FormControl>

						<Divider />

						<Typography variant="subtitle2" gutterBottom>
							Display Options
						</Typography>

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
									checked={settings.showES}
									onChange={(e) =>
										handleSettingsChange("showES", e.target.checked)
									}
								/>
							}
							label="Show Enrichment Score"
						/>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showNES}
									onChange={(e) =>
										handleSettingsChange("showNES", e.target.checked)
									}
								/>
							}
							label="Show Normalized ES"
						/>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showGeneCount}
									onChange={(e) =>
										handleSettingsChange("showGeneCount", e.target.checked)
									}
								/>
							}
							label="Show Gene Count"
						/>

						<FormControlLabel
							control={
								<Switch
									checked={settings.showPathwaySize}
									onChange={(e) =>
										handleSettingsChange("showPathwaySize", e.target.checked)
									}
								/>
							}
							label="Show Pathway Size"
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

			{/* Node Details Dialog */}
			<Dialog
				open={nodeDetailsOpen}
				onClose={() => setNodeDetailsOpen(false)}
				maxWidth="md"
				fullWidth
			>
				<DialogTitle>
					<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
						<InfoIcon />
						Pathway Details
					</Box>
				</DialogTitle>
				<DialogContent>
					{selectedNode && (
						<Box sx={{ mt: 2 }}>
							<Typography variant="h6" gutterBottom>
								{selectedNode.pathway["Pathway"] ||
									selectedNode.pathway["pathway"]}
							</Typography>

							<Box sx={{ display: "flex", gap: 2, mb: 2, flexWrap: "wrap" }}>
								<Chip
									label={`P-value: ${(selectedNode.pathway["p-value"] || selectedNode.pathway["p_value"] || 1).toExponential(2)}`}
									color={
										(selectedNode.pathway["p-value"] ||
											selectedNode.pathway["p_value"] ||
											1) < 0.05
											? "success"
											: "default"
									}
								/>
								<Chip
									label={`FDR: ${(selectedNode.pathway["FDR"] || selectedNode.pathway["fdr"] || 1).toExponential(2)}`}
									color={
										(selectedNode.pathway["FDR"] ||
											selectedNode.pathway["fdr"] ||
											1) < 0.05
											? "success"
											: "default"
									}
								/>
								<Chip
									label={`ES: ${(selectedNode.pathway["ES"] || selectedNode.pathway["es"] || 0).toFixed(3)}`}
									color={
										(selectedNode.pathway["ES"] ||
											selectedNode.pathway["es"] ||
											0) > 0.2
											? "success"
											: "default"
									}
								/>
								<Chip
									label={`NES: ${(selectedNode.pathway["NES"] || selectedNode.pathway["nes"] || 0).toFixed(3)}`}
									color={
										(selectedNode.pathway["NES"] ||
											selectedNode.pathway["nes"] ||
											0) > 1.5
											? "success"
											: "default"
									}
								/>
								<Chip
									label={`${selectedNode.pathway["Number of input genes"] || 0} input genes`}
									color="primary"
								/>
								<Chip
									label={`Pathway size: ${selectedNode.pathway["Pathway size"] || 0}`}
									color="secondary"
								/>
							</Box>

							{selectedNode.children.length > 0 && (
								<Box sx={{ mb: 2 }}>
									<Typography variant="subtitle1" gutterBottom>
										Child Pathways ({selectedNode.children.length}):
									</Typography>
									<Box sx={{ display: "flex", flexWrap: "wrap", gap: 1 }}>
										{selectedNode.children.map((child) => (
											<Chip
												key={child.id}
												label={
													child.pathway["Pathway"] || child.pathway["pathway"]
												}
												size="small"
												variant="outlined"
												onClick={() => {
													setSelectedNode(child);
												}}
												sx={{ cursor: "pointer" }}
											/>
										))}
									</Box>
								</Box>
							)}

							<Box>
								<Typography variant="subtitle1" gutterBottom>
									Leading Edge Genes:
								</Typography>
								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
									{(() => {
										const genes =
											selectedNode.pathway["Leading edge genes"] ||
											selectedNode.pathway["genes"] ||
											"";
										const geneList =
											typeof genes === "string"
												? genes.split(",").map((g) => g.trim())
												: Array.isArray(genes)
													? genes
													: [];
										return (
											<>
												{geneList
													.slice(0, 20)
													.map((gene: string, index: number) => (
														<Chip
															key={`${selectedNode.id}-gene-${index}`}
															label={gene}
															size="small"
															variant="outlined"
														/>
													))}
												{geneList.length > 20 && (
													<Chip
														label={`+${geneList.length - 20} more`}
														size="small"
													/>
												)}
											</>
										);
									})()}
								</Box>
							</Box>

							<Box sx={{ mt: 2 }}>
								<Typography variant="subtitle2" gutterBottom>
									All Pathway Data:
								</Typography>
								<Box sx={{ maxHeight: "200px", overflow: "auto" }}>
									{Object.entries(selectedNode.pathway).map(([key, value]) => (
										<Box
											key={key}
											sx={{
												display: "flex",
												justifyContent: "space-between",
												py: 0.5,
											}}
										>
											<Typography variant="body2" sx={{ fontWeight: "bold" }}>
												{key}:
											</Typography>
											<Typography
												variant="body2"
												sx={{ ml: 2, maxWidth: "60%" }}
											>
												{String(value)}
											</Typography>
										</Box>
									))}
								</Box>
							</Box>
						</Box>
					)}
				</DialogContent>
				<DialogActions>
					<Button onClick={() => setNodeDetailsOpen(false)}>Close</Button>
				</DialogActions>
			</Dialog>
		</Box>
	);
};

export default PathwaysHierarchy;
