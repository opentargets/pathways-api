import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
} from 'reactflow';
import type {
  Node,
  Edge,
  Connection,
  EdgeTypes,
  NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import dagre from 'dagre';
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
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  FitScreen as FitScreenIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import type { Pathway } from '../lib/api';

interface PathwaysHierarchyProps {
  pathways: Pathway[];
}

type HierarchyNode = Node & {
  data: {
    label: string;
    pathway: Pathway;
    pValue?: number;
    fdr?: number;
    genes?: string[];
  };
};

type HierarchyEdge = Edge & {
  data?: {
    label?: string;
    weight?: number;
  };
};

// Build hierarchy from parent pathway relationships
const buildHierarchy = (pathways: Pathway[]) => {
  const pathwayMap = new Map<string, Pathway>();
  const childrenMap = new Map<string, string[]>();
  const rootPathways: Pathway[] = [];

  // Create pathway map and collect children
  pathways.forEach(pathway => {
    const id = pathway['ID'] || pathway['id'] || '';
    pathwayMap.set(id, pathway);
    
    const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';
    if (parentPathway) {
      const parents = parentPathway.split(',').map((p: string) => p.trim());
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

// Generate edges based on parent-child relationships
const generateHierarchicalEdges = (nodes: HierarchyNode[], maxEdges: number = 200): HierarchyEdge[] => {
  const edges: HierarchyEdge[] = [];
  const nodeCount = nodes.length;
  
  if (nodeCount === 0) return edges;

  // Build hierarchy from the pathways
  const pathways = nodes.map(node => node.data.pathway);
  const { childrenMap } = buildHierarchy(pathways);

  // Create edges based on parent-child relationships
  for (let i = 0; i < nodeCount && edges.length < maxEdges; i++) {
    const sourceNode = nodes[i];
    const sourcePathway = sourceNode.data.pathway;
    const sourceId = sourcePathway['ID'] || sourcePathway['id'] || sourceNode.id;

    // Find children of this pathway
    const children = childrenMap.get(sourceId) || [];
    
    for (const childId of children) {
      if (edges.length >= maxEdges) break;
      
      // Find the target node that matches this child
      const targetNode = nodes.find(node => {
        const pathway = node.data.pathway;
        const nodeId = pathway['ID'] || pathway['id'] || node.id;
        return nodeId === childId;
      });

      if (targetNode) {
        edges.push({
          id: `edge-${sourceNode.id}-${targetNode.id}`,
          source: sourceNode.id,
          target: targetNode.id,
          type: 'smoothstep',
          style: {
            stroke: '#2196f3',
            strokeWidth: 2,
            opacity: 0.8,
          },
          data: {
            label: 'Parent-Child',
            weight: 1,
          },
        } as HierarchyEdge);
      }
    }
  }

  return edges;
};

const PathwaysHierarchy: React.FC<PathwaysHierarchyProps> = ({ pathways }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<HierarchyNode | null>(null);
  const reactFlowRef = useRef<any>(null);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [settings, setSettings] = useState({
    nodeSpacing: 200,
    maxNodes: 50,
    maxEdges: 200,
    showPValues: true,
    showFDR: true,
    showGenes: false,
    layout: 'hierarchical' as 'hierarchical' | 'force' | 'circular',
  });

  // Use default node types
  const nodeTypes = useMemo(() => ({}), []);

  // Memoized layout function
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction });

    // Set nodes with consistent sizing
    nodes.forEach((node) => {
      dagreGraph.setNode(node.id, { width: 200, height: 120 });
    });

    // Set edges
    edges.forEach((edge) => {
      dagreGraph.setEdge(edge.source, edge.target);
    });

    dagre.layout(dagreGraph);

    return {
      nodes: nodes.map((node) => {
        const nodeWithPosition = dagreGraph.node(node.id);
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - 100,
            y: nodeWithPosition.y - 60,
          },
        };
      }),
      edges,
    };
  }, []);

  // Memoized layout application
  const applyLayout = useCallback((layoutType: string) => {
    if (nodes.length === 0) return;

    let direction = 'TB';
    if (layoutType === 'hierarchical') {
      direction = 'TB';
    } else if (layoutType === 'circular') {
      // For circular layout, we'll use a different approach
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

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges]);

  // Memoized node generation
  const generateNodes = useCallback((pathways: Pathway[], maxNodes: number): HierarchyNode[] => {
    return pathways.slice(0, maxNodes).map((pathway, index) => {
      const nodeId = `pathway-${index}`;
      const pValue = pathway['P-value'] || pathway['p_value'] || pathway['pvalue'];
      const fdr = pathway['FDR'] || pathway['fdr'];
      const genes = pathway['Leading edge genes'] || pathway['genes'] || [];

      return {
        id: nodeId,
        type: 'default',
        position: { x: 0, y: 0 }, // Will be calculated by layout
        data: {
          label: pathway['Pathway'] || pathway['pathway'] || `Pathway ${index + 1}`,
          pathway,
          pValue: typeof pValue === 'number' ? pValue : parseFloat(pValue) || 0,
          fdr: typeof fdr === 'number' ? fdr : parseFloat(fdr) || 0,
          genes: Array.isArray(genes) ? genes : typeof genes === 'string' ? genes.split(',').map(g => g.trim()) : [],
        },
      };
    });
  }, []);

  // Memoized flow elements generation with performance tracking
  const flowElements = useMemo(() => {
    const startTime = performance.now();
    
    if (pathways.length === 0) return { nodes: [], edges: [] };

    const newNodes = generateNodes(pathways, settings.maxNodes);
    const newEdges = generateHierarchicalEdges(newNodes, settings.maxEdges);

    const endTime = performance.now();
    setRenderTime(endTime - startTime);

    return { nodes: newNodes, edges: newEdges };
  }, [pathways, settings.maxNodes, settings.maxEdges, generateNodes]);

  // Initialize flow elements only when they change
  useEffect(() => {
    setNodes(flowElements.nodes);
    setEdges(flowElements.edges);
  }, [flowElements, setNodes, setEdges]);

  // Apply layout only when necessary
  useEffect(() => {
    if (nodes.length > 0) {
      // Debounce layout application
      const timeoutId = setTimeout(() => applyLayout(settings.layout), 150);
      return () => clearTimeout(timeoutId);
    }
  }, [nodes.length, settings.layout, applyLayout]);

  const onConnect = useCallback(
    (params: Connection) => setEdges((eds) => addEdge(params, eds)),
    [setEdges]
  );

  const onNodeClick = useCallback((event: React.MouseEvent, node: Node) => {
    setSelectedNode(node as HierarchyNode);
    setNodeDetailsOpen(true);
  }, []);

  const handleSettingsChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  if (pathways.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No pathways to display in hierarchy.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '1000px', width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Pathways Hierarchy (Network)
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
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${nodes.length} pathways`} 
            color="primary" 
            size="small" 
          />
          <Chip 
            label={`${edges.length} parent-child relationships`} 
            color="secondary" 
            size="small" 
          />
          <Chip 
            label={`${settings.layout} layout`} 
            variant="outlined" 
            size="small" 
          />
          {renderTime > 0 && (
            <Chip 
              label={`${renderTime.toFixed(1)}ms render`} 
              color={renderTime < 16 ? 'success' : renderTime < 33 ? 'warning' : 'error'}
              size="small" 
            />
          )}
        </Box>
      </Paper>

      <Paper sx={{ height: '800px', position: 'relative' }}>
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
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Hierarchical Network Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Layout Type</InputLabel>
              <Select
                value={settings.layout}
                onChange={(e) => handleSettingsChange('layout', e.target.value)}
                label="Layout Type"
              >
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
                <MenuItem value="force">Force-Directed</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography gutterBottom>Max Nodes: {settings.maxNodes}</Typography>
              <Slider
                value={settings.maxNodes}
                onChange={(_, value) => handleSettingsChange('maxNodes', value)}
                min={10}
                max={100}
                step={5}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>Max Edges: {settings.maxEdges}</Typography>
              <Slider
                value={settings.maxEdges}
                onChange={(_, value) => handleSettingsChange('maxEdges', value)}
                min={50}
                max={500}
                step={50}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <Box>
              <Typography gutterBottom>Node Spacing: {settings.nodeSpacing}</Typography>
              <Slider
                value={settings.nodeSpacing}
                onChange={(_, value) => handleSettingsChange('nodeSpacing', value)}
                min={100}
                max={400}
                step={50}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPValues}
                  onChange={(e) => handleSettingsChange('showPValues', e.target.checked)}
                />
              }
              label="Show P-Values"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showFDR}
                  onChange={(e) => handleSettingsChange('showFDR', e.target.checked)}
                />
              }
              label="Show FDR"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGenes}
                  onChange={(e) => handleSettingsChange('showGenes', e.target.checked)}
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
      <Dialog open={nodeDetailsOpen} onClose={() => setNodeDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            Pathway Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedNode.data.label}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip 
                  label={`P-value: ${selectedNode.data.pValue?.toExponential(2) || 'N/A'}`}
                  color={(selectedNode.data.pValue || 1) < 0.05 ? 'success' : 'default'}
                />
                <Chip 
                  label={`FDR: ${selectedNode.data.fdr?.toExponential(2) || 'N/A'}`}
                  color={(selectedNode.data.fdr || 1) < 0.05 ? 'success' : 'default'}
                />
                <Chip 
                  label={`${selectedNode.data.genes?.length || 0} genes`}
                  color="primary"
                />
              </Box>

              {settings.showGenes && selectedNode.data.genes && selectedNode.data.genes.length > 0 && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Leading Edge Genes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selectedNode.data.genes.slice(0, 20).map((gene: string, index: number) => (
                      <Chip key={index} label={gene} size="small" variant="outlined" />
                    ))}
                    {selectedNode.data.genes.length > 20 && (
                      <Chip label={`+${selectedNode.data.genes.length - 20} more`} size="small" />
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  All Pathway Data:
                </Typography>
                <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                  {Object.entries(selectedNode.data.pathway).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {key}:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 2, maxWidth: '60%' }}>
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