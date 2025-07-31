import React, {
	useState,
	useCallback,
	useMemo,
	useEffect,
	useRef,
} from "react";
import ReactFlow, {
	Controls,
	Background,
	useNodesState,
	useEdgesState,
	addEdge,
	ReactFlowProvider,
} from "reactflow";
import type { Connection } from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import {
	Box,
	Typography,
	Paper,
	Chip,
	IconButton,
	Tooltip,
} from "@mui/material";
import {
	FitScreen as FitScreenIcon,
	Settings as SettingsIcon,
	Biotech as BiotechIcon,
	Science as ScienceIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";
import type { NetworkSettings, GeneNode } from "./types";
import { generateNetworkData } from "./network-generator";
import GeneNodeComponent from "./gene-node";
import PathwayGroupNodeComponent from "./pathway-group-node";
import NetworkSettingsDialog from "./network-settings";
import NodeDetailsDialog from "./node-details";

interface PathwaysGeneNetworkProps {
	pathways: Pathway[];
}

const PathwaysGeneNetwork: React.FC<PathwaysGeneNetworkProps> = ({
	pathways,
}) => {
	const [nodes, setNodes, onNodesChange] = useNodesState([]);
	const [edges, setEdges, onEdgesChange] = useEdgesState([]);
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
	const [selectedNode, setSelectedNode] = useState<GeneNode | null>(null);
	const reactFlowRef = useRef<any>(null);
	const [networkData, setNetworkData] = useState({
		renderTime: 0,
		geneCount: 0,
		edgeCount: 0,
		topLevelParents: new Set<string>(),
		colorMapping: new Map<string, string>(),
	});

	const [settings, setSettings] = useState<NetworkSettings>({
		nodeSpacing: 200,
		showPValues: true,
		showFDR: true,
		showPathways: true,
		layout: "subflow",
		minGeneCount: 2,
		maxGenes: 100,
		showEdgeLabels: false,
		maxEdges: 500,
		minSignificance: 0.0,
		hierarchyDepth: 2,
	});

	// Custom node types
	const nodeTypes = useMemo(
		() => ({
			gene: GeneNodeComponent,
			"pathway-group": PathwayGroupNodeComponent,
		}),
		[],
	);

	// Memoized layout function
	const getLayoutedElements = useCallback(
		(nodes: any[], edges: any[], direction = "TB") => {
			const dagreGraph = new dagre.graphlib.Graph();
			dagreGraph.setDefaultEdgeLabel(() => ({}));
			dagreGraph.setGraph({
				rankdir: direction,
				ranksep: settings.nodeSpacing,
				nodesep: 80,
			});

			// Set nodes with different sizing based on type
			nodes.forEach((node) => {
				if (node.data?.nodeType === "pathway-group") {
					dagreGraph.setNode(node.id, { width: 280, height: 200 });
				} else {
					dagreGraph.setNode(node.id, { width: 80, height: 80 });
				}
			});

			// Set edges
			edges.forEach((edge) => {
				dagreGraph.setEdge(edge.source, edge.target);
			});

			dagre.layout(dagreGraph);

			return {
				nodes: nodes.map((node) => {
					const nodeWithPosition = dagreGraph.node(node.id);
					const isGroup = node.data?.nodeType === "pathway-group";
					return {
						...node,
						position: {
							x: nodeWithPosition.x - (isGroup ? 140 : 40),
							y: nodeWithPosition.y - (isGroup ? 100 : 40),
						},
					};
				}),
				edges,
			};
		},
		[settings.nodeSpacing],
	);

	// Memoized layout application
	const applyLayout = useCallback(
		(layoutType: string) => {
			if (nodes.length === 0) return;

			let direction = "TB";
			if (layoutType === "hierarchical") {
				direction = "TB";
			} else if (layoutType === "circular") {
				// Circular layout
				const centerX = 400;
				const centerY = 300;
				const radius = 200;
				const angleStep = (2 * Math.PI) / nodes.length;

				const newNodes = nodes.map((node, index) => ({
					...node,
					position: {
						x: centerX + radius * Math.cos(index * angleStep),
						y: centerY + radius * Math.sin(index * angleStep),
					},
				}));

				setNodes(newNodes);
				return;
			}

			const { nodes: layoutedNodes, edges: layoutedEdges } =
				getLayoutedElements(nodes, edges, direction);
			setNodes(layoutedNodes);
			setEdges(layoutedEdges);
		},
		[nodes, edges, getLayoutedElements, setNodes, setEdges],
	);

	// Memoized network data generation
	const flowElements = useMemo(() => {
		const networkData = generateNetworkData(pathways, settings);
		setNetworkData({
			renderTime: networkData.renderTime,
			geneCount: networkData.geneCount,
			edgeCount: networkData.edgeCount,
			topLevelParents: networkData.topLevelParents,
			colorMapping: networkData.colorMapping,
		});
		return { nodes: networkData.nodes, edges: networkData.edges };
	}, [pathways, settings]);

	// Initialize flow elements only when they change
	useEffect(() => {
		setNodes(flowElements.nodes);
		setEdges(flowElements.edges);
	}, [flowElements, setNodes, setEdges]);

	// Apply layout only when necessary - disabled for Sub Flow
	useEffect(() => {
		if (nodes.length > 0 && settings.layout !== "subflow") {
			// Debounce layout application
			const timeoutId = setTimeout(() => applyLayout(settings.layout), 150);
			return () => clearTimeout(timeoutId);
		}
	}, [nodes.length, settings.layout, applyLayout]);

	const onConnect = useCallback(
		(params: Connection) => setEdges((eds) => addEdge(params, eds)),
		[setEdges],
	);

	const onNodeClick = useCallback((_: React.MouseEvent, node: any) => {
		setSelectedNode(node as GeneNode);
		setNodeDetailsOpen(true);
	}, []);

	const handleSettingsChange = useCallback(
		(key: string, value: string | number | boolean) => {
			setSettings((prev) => ({ ...prev, [key]: value }));
		},
		[],
	);

	if (pathways.length === 0) {
		return (
			<Box textAlign="center" py={4}>
				<Typography color="text.secondary">
					No pathways to display in gene network.
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
						Gene Network View
					</Typography>
					<Box>
						<Tooltip title="Settings">
							<IconButton onClick={() => setSettingsOpen(true)}>
								<SettingsIcon />
							</IconButton>
						</Tooltip>
						<Tooltip title="Apply Layout">
							<IconButton onClick={() => applyLayout(settings.layout)}>
								<FitScreenIcon />
							</IconButton>
						</Tooltip>
					</Box>
				</Box>

				<Box
					sx={{
						display: "flex",
						gap: 1,
						flexWrap: "wrap",
						alignItems: "center",
					}}
				>
					<Chip
						label={`${networkData.geneCount} genes`}
						color="primary"
						size="small"
						icon={<BiotechIcon />}
					/>
					<Chip
						label={`${networkData.topLevelParents.size} pathway groups`}
						color="info"
						size="small"
						icon={<ScienceIcon />}
					/>
					<Chip
						label={`${networkData.edgeCount} pathway edges`}
						color="secondary"
						size="small"
						icon={<ScienceIcon />}
					/>
					<Chip
						label={`${settings.layout} layout`}
						variant="outlined"
						size="small"
					/>
					{networkData.renderTime > 0 && (
						<Chip
							label={`${networkData.renderTime.toFixed(1)}ms render`}
							color={
								networkData.renderTime < 16
									? "success"
									: networkData.renderTime < 33
										? "warning"
										: "error"
							}
							size="small"
						/>
					)}

					{/* Pathway Edge Color Legend */}
					{edges.length > 0 && (
						<Box
							sx={{ display: "flex", gap: 0.5, alignItems: "center", ml: 2 }}
						>
							<Typography variant="caption" sx={{ mr: 1 }}>
								Pathway Families:
							</Typography>
							{Array.from(networkData.colorMapping.values())
								.slice(0, 8)
								.map((color, index) => (
									<Box
										key={index}
										sx={{
											width: 12,
											height: 12,
											borderRadius: "50%",
											backgroundColor: color,
											border: "1px solid #ccc",
										}}
									/>
								))}
							{networkData.colorMapping.size > 8 && (
								<Typography variant="caption" sx={{ ml: 0.5 }}>
									+{networkData.colorMapping.size - 8}
								</Typography>
							)}
						</Box>
					)}
				</Box>
			</Paper>

			<Paper sx={{ height: "800px", position: "relative" }}>
				<ReactFlowProvider>
					<ReactFlow
						ref={reactFlowRef}
						nodes={nodes}
						edges={edges}
						nodeTypes={nodeTypes}
						onNodesChange={onNodesChange}
						onEdgesChange={onEdgesChange}
						onConnect={onConnect}
						onNodeClick={onNodeClick}
						fitView
						attributionPosition="bottom-left"
						// Performance optimizations
						nodesDraggable={false}
						nodesConnectable={false}
						elementsSelectable={true}
						selectNodesOnDrag={false}
						// Additional performance settings
						minZoom={0.1}
						maxZoom={2}
						defaultViewport={{ x: 0, y: 0, zoom: 1 }}
						proOptions={{ hideAttribution: true }}
					>
						<Background />
						<Controls />
					</ReactFlow>
				</ReactFlowProvider>
			</Paper>

			{/* Settings Dialog */}
			<NetworkSettingsDialog
				open={settingsOpen}
				onClose={() => setSettingsOpen(false)}
				settings={settings}
				onSettingsChange={handleSettingsChange}
			/>

			{/* Node Details Dialog */}
			<NodeDetailsDialog
				open={nodeDetailsOpen}
				onClose={() => setNodeDetailsOpen(false)}
				selectedNode={selectedNode}
				settings={settings}
			/>
		</Box>
	);
};

export default PathwaysGeneNetwork;
