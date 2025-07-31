import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import ReactFlow, {
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  addEdge,
  ReactFlowProvider,
  Handle,
  Position,
} from 'reactflow';
import type {
  Node,
  Edge,
  Connection,
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
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
} from '@mui/material';
import {
  FitScreen as FitScreenIcon,
  Settings as SettingsIcon,
  Info as InfoIcon,
  AccountTree as AccountTreeIcon,
  Hub as HubIcon,
  TrendingUp as TrendingUpIcon,
  Group as GroupIcon,
} from '@mui/icons-material';
import type { Pathway } from '../lib/api';




const pathwayData = [
  {"ID":"R-HSA-109582","Link":"https://reactome.org/content/detail/R-HSA-109582","Pathway":"Hemostasis","ES":0.34738745066125665,"NES":2.8921271267638167,"FDR":0.18810247075153202,"p-value":0.0038264308286026782,"Sidak's p-value":0.9126889228929147,"Number of input genes":40,"Leading edge genes":"GATA3,MYB,ABL1,NRAS,PTPN11,IRF1,RASGRP1","Pathway size":706,"Parent pathway":""},
  {"ID":"R-HSA-109606","Link":"https://reactome.org/content/detail/R-HSA-109606","Pathway":"Intrinsic Pathway for Apoptosis","ES":0.5399566603929127,"NES":1.8312915568208958,"FDR":0.4028364131702627,"p-value":0.06705703719661393,"Sidak's p-value":1.0,"Number of input genes":8,"Leading edge genes":"CDKN2A","Pathway size":54,"Parent pathway":"R-HSA-109581"},
  {"ID":"R-HSA-109704","Link":"https://reactome.org/content/detail/R-HSA-109704","Pathway":"PI3K Cascade","ES":0.5239149726703267,"NES":1.8462875724469,"FDR":0.4028364131702627,"p-value":0.06485046125198535,"Sidak's p-value":1.0,"Number of input genes":9,"Leading edge genes":"FGFR3,FGFR4,FGFR2,PIK3CA,PTPN11,PIK3CB,FGFR1","Pathway size":43,"Parent pathway":"R-HSA-112399"},
  {"ID":"R-HSA-112382","Link":"https://reactome.org/content/detail/R-HSA-112382","Pathway":"Formation of RNA Pol II elongation complex","ES":0.7150593638488858,"NES":2.8906171631261803,"FDR":0.18810247075153202,"p-value":0.003844861823537604,"Sidak's p-value":0.9137103127118035,"Number of input genes":6,"Leading edge genes":"MLLT1,ELL,MLLT3,ERCC2","Pathway size":57,"Parent pathway":"R-HSA-75955"},
  {"ID":"R-HSA-112399","Link":"https://reactome.org/content/detail/R-HSA-112399","Pathway":"IRS-mediated signalling","ES":0.4725520199186646,"NES":1.8776609653439156,"FDR":0.4028364131702627,"p-value":0.06042755988460069,"Sidak's p-value":1.0,"Number of input genes":12,"Leading edge genes":"FGFR3,FGFR4,FGFR2,NRAS,PIK3CA,PTPN11,PIK3R1,PIK3CB,FGFR1","Pathway size":47,"Parent pathway":"R-HSA-74751,R-HSA-2428928"},
  {"ID":"R-HSA-1168372","Link":"https://reactome.org/content/detail/R-HSA-1168372","Pathway":"Downstream signaling events of B Cell Receptor (BCR)","ES":0.4991593877482401,"NES":1.9290309128510537,"FDR":0.4028364131702627,"p-value":0.05372702469248791,"Sidak's p-value":0.9999999999999994,"Number of input genes":11,"Leading edge genes":"NRAS,RASGRP1,NFKB1","Pathway size":67,"Parent pathway":"R-HSA-983705"},
  {"ID":"R-HSA-1226099","Link":"https://reactome.org/content/detail/R-HSA-1226099","Pathway":"Signaling by FGFR in disease","ES":0.3985898188620801,"NES":1.7152415363323181,"FDR":0.42548376545417227,"p-value":0.08630095242702551,"Sidak's p-value":1.0,"Number of input genes":17,"Leading edge genes":"CEP43,FGFR3,FGFR4,FGFR2,PIK3CA,NRAS,CUX1,BCR,PIK3R1,STAT5B,FGFR1","Pathway size":62,"Parent pathway":"R-HSA-5663202"},
  {"ID":"R-HSA-1236394","Link":"https://reactome.org/content/detail/R-HSA-1236394","Pathway":"Signaling by ERBB4","ES":0.4659961341195714,"NES":1.8324081369759073,"FDR":0.4028364131702627,"p-value":0.06689063666902939,"Sidak's p-value":1.0,"Number of input genes":12,"Leading edge genes":"NCOR1,ESR1,PIK3CA,NRAS,PIK3R1,ERBB4,EGFR,ERBB3,NRG1","Pathway size":57,"Parent pathway":"R-HSA-9006934"},
  {"ID":"R-HSA-1250196","Link":"https://reactome.org/content/detail/R-HSA-1250196","Pathway":"SHC1 events in ERBB2 signaling","ES":0.5896845849057232,"NES":2.126480915414598,"FDR":0.4028364131702627,"p-value":0.033463236672603536,"Sidak's p-value":0.9999999996029107,"Number of input genes":8,"Leading edge genes":"NRAS,ERBB3,ERBB2,EGFR,ERBB4","Pathway size":21,"Parent pathway":"R-HSA-1227986"},
  {"ID":"R-HSA-1257604","Link":"https://reactome.org/content/detail/R-HSA-1257604","Pathway":"PIP3 activates AKT signaling","ES":0.2572904448861119,"NES":2.36514508221133,"FDR":0.3473525361892423,"p-value":0.018023008953215403,"Sidak's p-value":0.9999905281604821,"Number of input genes":56,"Leading edge genes":"PIP4K2A,SALL4,EZH2,FGFR2,CHD4,NTRK3,TP53,PTPN11,MDM2,PIK3R1,KIT,ERBB2,EGFR,NRG1,JUN,MTOR,SUZ12,PREX2,ERBB4,PTEN,FOXO3,FOXO1,PIK3CA,PML,PDGFRA,AKT1,PIK3CB,ERBB3,FGFR3,FGFR4,MECOM,ESR1,MET,HGF,CDKN1B,CREB1,FGFR1","Pathway size":283,"Parent pathway":"R-HSA-9006925"},
  {"ID":"R-HSA-1266738","Link":"https://reactome.org/content/detail/R-HSA-1266738","Pathway":"Developmental Biology","ES":0.264512554293628,"NES":2.4886731695051756,"FDR":0.3137739720917969,"p-value":0.012822077675281207,"Sidak's p-value":0.9997274187026247,"Number of input genes":152,"Leading edge genes":"GATA3,CDKN2A,PBX1,ABL1,NRAS,TCF3,PTPN11,KMT2A,RUNX1,NFKB1,MYB,BRCA1,CREBBP,MAFB,MITF,RET,TAL1,CDH1,FOXP1,FOXO3,PIK3CA,RPL5,SMARCA4,ARID1B,PIK3CB,TFE3,MECOM,CACNA1D,FOXA1,CXCR4,CREB1,ARID1A,KMT2C,CCND3,FGFR1,DNM2,SMARCB1,SALL4,EZH2,CHD4,TBX3,KLF4,MYC,ERBB2,EGFR,NOTCH1,TCF7L2,TET2,SMAD2,JUN,TRIM33,ARHGEF12,SUZ12,BCL2,GATA2,SOX2,MED12,RHOA,CBFB,SMAD4,PRDM16,RPL10,FOXO1,EBF1,KMT2D,FLI1,PML,AKT1,WWTR1,RPL22,PTPRC,XPO1,MYH9,DICER1,MET,MYOD1,NCOR2,NCOR1,ZNF521,NCOA2,CLTC,TP53,PIK3R1,KDM6A,TBL1XR1,KIT,KRAS,CLTCL1,PAX3,LEF1,COL2A1,CNOT3,EP300,ACVR2A","Pathway size":1423,"Parent pathway":""},
  {"ID":"R-HSA-1428517","Link":"https://reactome.org/content/detail/R-HSA-1428517","Pathway":"Aerobic respiration and respiratory electron transport","ES":-0.6154383376448693,"NES":-2.221066802444873,"FDR":0.3975377946388765,"p-value":0.02634643713395013,"Sidak's p-value":0.9999999578075348,"Number of input genes":8,"Leading edge genes":"TIMMDC1,NDUFB1,COX6C","Pathway size":260,"Parent pathway":"R-HSA-1430728"},
  {"ID":"R-HSA-1430728","Link":"https://reactome.org/content/detail/R-HSA-1430728","Pathway":"Metabolism","ES":-0.3153678558650422,"NES":-1.9333628543981183,"FDR":0.4028364131702627,"p-value":0.05319151381917386,"Sidak's p-value":0.9999999999999992,"Number of input genes":67,"Leading edge genes":"PNMT,CYP2C8,SLC22A5,CCNC,HSP90AA1,NDUFB1,GPHN,TIMMDC1,COX6C,MANBA,OAT,GMPS,ORMDL3","Pathway size":2189,"Parent pathway":""}
];

// Custom node component for pathways
const PathwayNodex = ({ data }) => {
  const getScoreColor = (nes) => {
    if (nes > 2.5) return '#22c55e'; // green
    if (nes > 2) return '#84cc16'; // lime
    if (nes > 1.5) return '#eab308'; // yellow
    if (nes > 0) return '#f97316'; // orange
    return '#ef4444'; // red
  };

  return (
    <div className="px-4 py-3 shadow-lg rounded-lg bg-white border-2 border-gray-200 min-w-[250px]">
      <Handle type="target" position={Position.Top} className="w-3 h-3" />
      <div className="font-bold text-sm text-gray-800 mb-2">
        {data.pathway}
      </div>
      <div className="text-xs text-gray-600 space-y-1">
        <div>ID: {data.id}</div>
        <div>NES: <span style={{color: getScoreColor(data.nes)}} className="font-semibold">{data.nes.toFixed(2)}</span></div>
        <div>Genes: {data.geneCount}</div>
        <div>Size: {data.pathwaySize}</div>
        <div>p-value: {data.pvalue.toExponential(2)}</div>
      </div>
      <Handle type="source" position={Position.Bottom} className="w-3 h-3" />
    </div>
  );
};

const nodeTypes = {
  pathway: PathwayNodex,
};

 function PathwayFlowVisualization() {
  const { nodes, edges } = useMemo(() => {
    // Create a map of parent pathways and their children
    const parentGroups = new Map();
    const standalonePathways = [];
    
    pathwayData.forEach(pathway => {
      const parents = pathway["Parent pathway"] ? pathway["Parent pathway"].split(',').map(p => p.trim()) : [];
      
      if (parents.length === 0 || parents[0] === '') {
        standalonePathways.push(pathway);
      } else {
        parents.forEach(parent => {
          if (!parentGroups.has(parent)) {
            parentGroups.set(parent, []);
          }
          parentGroups.get(parent).push(pathway);
        });
      }
    });

    const nodes = [];
    const edges = [];
    let yPos = 50;
    let nodeId = 0;

    // Create nodes for standalone pathways (top-level)
    standalonePathways.forEach((pathway, index) => {
      nodes.push({
        id: pathway.ID,
        type: 'pathway',
        position: { x: index * 300 + 50, y: yPos },
        data: {
          id: pathway.ID,
          pathway: pathway.Pathway,
          nes: pathway.NES,
          geneCount: pathway["Number of input genes"],
          pathwaySize: pathway["Pathway size"],
          pvalue: pathway["p-value"]
        }
      });
    });

    yPos += 200;

    // Create group nodes for parent pathways and their children
    Array.from(parentGroups.entries()).forEach(([parentId, children], groupIndex) => {
      const groupXStart = groupIndex * 600 + 50;
      
      // Create parent pathway node (if it exists in our data)
      const parentPathway = pathwayData.find(p => p.ID === parentId);
      if (parentPathway) {
        nodes.push({
          id: parentId,
          type: 'pathway',
          position: { x: groupXStart + 150, y: yPos },
          data: {
            id: parentPathway.ID,
            pathway: parentPathway.Pathway,
            nes: parentPathway.NES,
            geneCount: parentPathway["Number of input genes"],
            pathwaySize: parentPathway["Pathway size"],
            pvalue: parentPathway["p-value"]
          }
        });
      } else {
        // Create a placeholder node for unknown parent
        nodes.push({
          id: parentId,
          type: 'pathway',
          position: { x: groupXStart + 150, y: yPos },
          data: {
            id: parentId,
            pathway: parentId.replace('R-HSA-', 'Pathway '),
            nes: 0,
            geneCount: 0,
            pathwaySize: 0,
            pvalue: 1
          }
        });
      }

      // Create child pathway nodes
      children.forEach((child, childIndex) => {
        const childId = `${child.ID}`;
        nodes.push({
          id: childId,
          type: 'pathway',
          position: { x: groupXStart + (childIndex * 300), y: yPos + 200 },
          data: {
            id: child.ID,
            pathway: child.Pathway,
            nes: child.NES,
            geneCount: child["Number of input genes"],
            pathwaySize: child["Pathway size"],
            pvalue: child["p-value"]
          }
        });

        // Create edge from parent to child
        edges.push({
          id: `${parentId}-${childId}`,
          source: parentId,
          target: childId,
          type: 'smoothstep',
          style: { stroke: '#64748b', strokeWidth: 2 }
        });
      });

      yPos += 400;
    });

    return { nodes, edges };
  }, []);

  const [flowNodes, setNodes, onNodesChange] = useNodesState(nodes);
  const [flowEdges, setEdges, onEdgesChange] = useEdgesState(edges);

  return (
    <div className="w-full h-screen">
      <div className="p-4 bg-gray-50 border-b">
        <h1 className="text-xl font-bold text-gray-800">Pathway Relationships Visualization</h1>
        <p className="text-sm text-gray-600">Showing pathway hierarchies with enrichment scores</p>
      </div>
      
      <Box sx={{ width: '800px', height: '800px' }}>
        

        <ReactFlow
          nodes={flowNodes}
          edges={flowEdges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          className="bg-gray-50"
        >
          <Controls />
          <Background color="#e2e8f0" gap={16} />
        </ReactFlow>

      </Box>
    </div>
  );
}

interface PathwaysNetworkProps {
  pathways: Pathway[];
}

interface TreeNode {
  id: string;
  pathway: Pathway;
  children: TreeNode[];
  level: number;
  isExpanded: boolean;
}

interface NetworkSettings {
  nodeSpacing: number;
  showPValues: boolean;
  showFDR: boolean;
  showGenes: boolean;
  showGeneCount: boolean;
  showPathwaySize: boolean;
  showES: boolean;
  showNES: boolean;
  layout: 'hierarchical' | 'force' | 'circular';
  showSubflows: boolean;
  compactMode: boolean;
  showInternalHierarchy: boolean;
  subflowGrouping: 'by_root' | 'by_level' | 'by_significance';
}

type NetworkNode = Node & {
  data: {
    label: string;
    pathway: Pathway;
    pValue?: number;
    fdr?: number;
    genes?: string[];
    nodeType: 'pathway' | 'subflow' | 'root';
    subflowId?: string;
    significance?: number;
    geneCount?: number;
    level?: number;
    isSignificant?: boolean;
    pathwayCount?: number;
    totalGenes?: number;
  };
};

type NetworkEdge = Edge & {
  data?: {
    label?: string;
    weight?: number;
    relationship?: string;
  };
};

// Build tree structure from pathways (same logic as PathwaysHierarchy)
const buildPathwayTree = (pathways: Pathway[]): TreeNode[] => {
  const pathwayMap = new Map<string, Pathway>();
  const childrenMap = new Map<string, string[]>();
  const rootNodes: TreeNode[] = [];
  const allPathways = new Set<string>();

  // Create pathway map and collect children
  pathways.forEach(pathway => {
    const id = pathway['ID'] || pathway['id'] || '';
    pathwayMap.set(id, pathway);
    allPathways.add(id);
    
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
      // This is a root pathway
      rootNodes.push({
        id,
        pathway,
        children: [],
        level: 0,
        isExpanded: true,
      });
    }
  });

  // Recursive function to build tree
  const buildChildren = (parentId: string, level: number): TreeNode[] => {
    const children = childrenMap.get(parentId) || [];
    return children.map(childId => {
      const childPathway = pathwayMap.get(childId);
      if (!childPathway) return null;
      
      return {
        id: childId,
        pathway: childPathway,
        children: buildChildren(childId, level + 1),
        level,
        isExpanded: level < 2, // Auto-expand first 2 levels
      };
    }).filter(Boolean) as TreeNode[];
  };

  // Build children for root nodes
  rootNodes.forEach(rootNode => {
    rootNode.children = buildChildren(rootNode.id, 1);
  });

  // If there are pathways without parents that aren't in rootNodes, add them
  const processedIds = new Set<string>();
  const collectAllIds = (nodes: TreeNode[]) => {
    nodes.forEach(node => {
      processedIds.add(node.id);
      collectAllIds(node.children);
    });
  };
  collectAllIds(rootNodes);

  const unprocessedPathways = Array.from(allPathways).filter(id => !processedIds.has(id));
  unprocessedPathways.forEach(id => {
    const pathway = pathwayMap.get(id);
    if (pathway) {
      rootNodes.push({
        id,
        pathway,
        children: buildChildren(id, 1),
        level: 0,
        isExpanded: true,
      });
    }
  });

  return rootNodes;
};

// Generate network nodes from tree structure
const generateNetworkNodes = (treeData: TreeNode[]): NetworkNode[] => {
  const nodes: NetworkNode[] = [];
  let nodeIndex = 0;

  // Build hierarchical structure with multiple levels
  const createHierarchicalGroups = () => {
    const groups = new Map<string, TreeNode[]>();
    
    // Find root pathways (those with empty Parent pathway)
    const rootPathways = treeData.filter(node => {
      const parentPathway = node.pathway['Parent pathway'] || node.pathway['parent_pathway'] || '';
      return parentPathway === '';
    });
    
    // Create groups for each root pathway and their descendants
    rootPathways.forEach(rootNode => {
      const rootId = rootNode.pathway['ID'] || rootNode.pathway['id'] || rootNode.id;
      const groupPathways = [rootNode];
      
      // Find all descendants of this root
      const findDescendants = (parentId: string) => {
        treeData.forEach(node => {
          const parentPathway = node.pathway['Parent pathway'] || node.pathway['parent_pathway'] || '';
          if (parentPathway.includes(parentId)) {
            groupPathways.push(node);
            // Recursively find descendants of this node
            const nodeId = node.pathway['ID'] || node.pathway['id'] || node.id;
            findDescendants(nodeId);
          }
        });
      };
      
      findDescendants(rootId);
      groups.set(rootId, groupPathways);
    });
    
    // If no groups were created, create a single default group
    if (groups.size === 0) {
      groups.set('default', treeData);
    }

    return groups;
  };

  const hierarchicalGroups = createHierarchicalGroups();

  // Create nodes for each hierarchical group
  hierarchicalGroups.forEach((groupPathways, groupId) => {
    const rootPathway = groupPathways[0];
    const totalGenes = groupPathways.reduce((sum, pathway) => {
      const genes = pathway.pathway['Leading edge genes'] || pathway.pathway['genes'] || '';
      const geneCount = typeof genes === 'string' ? genes.split(',').length : Array.isArray(genes) ? genes.length : 0;
      return sum + geneCount;
    }, 0);
    
    const significantCount = groupPathways.filter(p => {
      const pValue = p.pathway['p-value'] || p.pathway['p_value'] || 1;
      return pValue < 0.05;
    }).length;

    // Create a group node for this hierarchy
    const groupNodeId = `group-${groupId}`;
    nodes.push({
      id: groupNodeId,
      type: 'subflow',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: {
        label: rootPathway.pathway['Pathway'] || rootPathway.pathway['pathway'] || `Group ${nodeIndex + 1}`,
        pathway: rootPathway.pathway,
        nodeType: 'subflow',
        subflowId: groupId,
        geneCount: totalGenes,
        level: 0,
        isSignificant: significantCount > 0,
        pathwayCount: groupPathways.length,
        totalGenes,
      },
      style: {
        width: 500,
        height: 400,
        backgroundColor: 'rgba(255, 255, 255, 0.05)',
        border: '3px dashed #ccc',
        borderRadius: '20px',
        padding: '20px',
      },
    });
    
    // Add ALL pathway nodes within the group
    groupPathways.forEach((treeNode, pathwayIndex) => {
      const pathway = treeNode.pathway;
      const pathwayId = pathway['ID'] || pathway['id'] || `pathway-${nodeIndex}-${pathwayIndex}`;
      const pValue = pathway['p-value'] || pathway['p_value'] || pathway['pvalue'];
      const fdr = pathway['FDR'] || pathway['fdr'];
      const genes = pathway['Leading edge genes'] || pathway['genes'] || '';
      const geneCount = pathway['Number of input genes'] || 0;
      const significance = pValue ? -Math.log10(pValue) / 10 : 0;
      const isSignificant = pValue < 0.05;
      
      // Calculate relative position within the group container
      const cols = Math.ceil(Math.sqrt(groupPathways.length));
      const row = Math.floor(pathwayIndex / cols);
      const col = pathwayIndex % cols;
      const relativeX = (col - (cols - 1) / 2) * 150;
      const relativeY = (row - (groupPathways.length - 1) / cols / 2) * 100;
      
      nodes.push({
        id: pathwayId,
        type: 'pathway',
        position: { x: relativeX, y: relativeY },
        data: {
          label: pathway['Pathway'] || pathway['pathway'] || `Pathway ${pathwayIndex + 1}`,
          pathway,
          pValue: typeof pValue === 'number' ? pValue : parseFloat(pValue) || 0,
          fdr: typeof fdr === 'number' ? fdr : parseFloat(fdr) || 0,
          genes: typeof genes === 'string' ? genes.split(',').map(g => g.trim()) : Array.isArray(genes) ? genes : [],
          nodeType: 'pathway',
          subflowId: groupId,
          significance,
          geneCount,
          level: treeNode.level,
          isSignificant,
        },
        style: {
          width: 120,
          height: 100,
        },
        parentNode: groupNodeId, // This makes it a child of the group
        extent: 'parent', // This makes it constrained to the parent
      });
    });
    
    nodeIndex++;
  });
  
  return nodes;
};

// Generate edges connecting subflows and pathways
const generateNetworkEdges = (nodes: NetworkNode[]): NetworkEdge[] => {
  const edges: NetworkEdge[] = [];
  const groupNodes = nodes.filter(node => node.data.nodeType === 'subflow');
  const pathwayNodes = nodes.filter(node => node.data.nodeType === 'pathway');
  
  // Create edges between groups (if we have multiple groups)
  if (groupNodes.length > 1) {
    for (let i = 0; i < groupNodes.length - 1; i++) {
      edges.push({
        id: `edge-group-${groupNodes[i].id}-${groupNodes[i + 1].id}`,
        source: groupNodes[i].id,
        target: groupNodes[i + 1].id,
        type: 'smoothstep',
        style: {
          stroke: '#2196f3',
          strokeWidth: 3,
          opacity: 0.7,
        },
        data: {
          label: 'Group Connection',
          relationship: 'group-hierarchy',
        },
      } as NetworkEdge);
    }
  }
  
  // Create internal parent-child relationships within each group
  groupNodes.forEach(groupNode => {
    const groupId = groupNode.data.subflowId;
    const relatedPathways = pathwayNodes.filter(pathwayNode => 
      pathwayNode.data.subflowId === groupId
    );
    
    // Create parent-child relationships within the group
    relatedPathways.forEach(pathwayNode => {
      const pathway = pathwayNode.data.pathway;
      const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';
      
      if (parentPathway) {
        const parents = parentPathway.split(',').map((p: string) => p.trim());
        parents.forEach((parent: string) => {
          const parentPathwayNode = relatedPathways.find(pNode => {
            const pPathway = pNode.data.pathway;
            const pId = pPathway['ID'] || pPathway['id'] || pNode.id;
            return pId === parent;
          });
          
          if (parentPathwayNode) {
            edges.push({
              id: `edge-${parentPathwayNode.id}-${pathwayNode.id}`,
              source: parentPathwayNode.id,
              target: pathwayNode.id,
              type: 'smoothstep',
              style: {
                stroke: '#ff9800',
                strokeWidth: 2,
                opacity: 0.6,
              },
              data: {
                label: 'Parent-Child',
                relationship: 'pathway-hierarchy',
              },
            } as NetworkEdge);
          }
        });
      }
    });
  });
  
  return edges;
};

// Custom Pathway Node Component
const PathwayNode: React.FC<{ data: NetworkNode['data'] }> = ({ data }) => {
  const significance = data.significance || 0;
  const geneCount = data.geneCount || 0;
  const isSignificant = data.isSignificant || false;
  
  // Color based on significance
  const getNodeColor = () => {
    if (isSignificant) return '#4caf50'; // Green for significant
    return '#f44336'; // Red for not significant
  };

  const nodeColor = getNodeColor();
  const nodeSize = Math.max(80, Math.min(150, 80 + significance * 50));

  return (
    <div
      style={{
        background: nodeColor,
        borderRadius: '12px',
        padding: '12px',
        minWidth: `${nodeSize}px`,
        minHeight: `${nodeSize}px`,
        border: '2px solid #fff',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <Typography variant="caption" sx={{ fontSize: '0.7rem', lineHeight: 1.2 }}>
        {data.label.length > 20 ? `${data.label.substring(0, 20)}...` : data.label}
      </Typography>
      
      <Box sx={{ mt: 1, display: 'flex', flexDirection: 'column', gap: 0.5 }}>
        <Chip 
          label={`P: ${(data.pValue || 0).toExponential(2)}`}
          size="small"
          sx={{ 
            height: '16px', 
            fontSize: '0.6rem',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white'
          }}
        />
        <Chip 
          label={`${geneCount} genes`}
          size="small"
          sx={{ 
            height: '16px', 
            fontSize: '0.6rem',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'white'
          }}
        />
      </Box>

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

// Custom Subflow Node Component
const SubflowNode: React.FC<{ data: NetworkNode['data'] }> = ({ data }) => {
  const isSignificant = data.isSignificant || false;
  
  return (
    <div
      style={{
        background: isSignificant 
          ? 'linear-gradient(135deg, rgba(76, 175, 80, 0.1) 0%, rgba(139, 195, 74, 0.1) 100%)'
          : 'linear-gradient(135deg, rgba(102, 126, 234, 0.1) 0%, rgba(118, 75, 162, 0.1) 100%)',
        borderRadius: '20px',
        padding: '20px',
        minWidth: '400px',
        minHeight: '300px',
        border: isSignificant 
          ? '3px solid #4caf50' 
          : '3px solid #667eea',
        boxShadow: '0 6px 16px rgba(0,0,0,0.1)',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 8px 20px rgba(0,0,0,0.2)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 6px 16px rgba(0,0,0,0.1)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <GroupIcon sx={{ fontSize: '2rem', mb: 1, color: isSignificant ? '#4caf50' : '#667eea' }} />
      <Typography variant="subtitle2" sx={{ fontWeight: 'bold', mb: 1, color: 'text.primary' }}>
        {data.label}
      </Typography>
      
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', justifyContent: 'center' }}>
        <Chip 
          label={`${data.pathwayCount || 0} pathways`}
          size="small"
          sx={{ 
            height: '20px', 
            fontSize: '0.7rem',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'text.primary'
          }}
        />
        <Chip 
          label={`${data.totalGenes || 0} genes`}
          size="small"
          sx={{ 
            height: '20px', 
            fontSize: '0.7rem',
            backgroundColor: 'rgba(255,255,255,0.2)',
            color: 'text.primary'
          }}
        />
      </Box>

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

const PathwaysNetwork: React.FC<PathwaysNetworkProps> = ({ pathways }) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [selectedNode, setSelectedNode] = useState<NetworkNode | null>(null);
  const reactFlowRef = useRef<any>(null);
  const [renderTime, setRenderTime] = useState<number>(0);
  const [settings, setSettings] = useState<NetworkSettings>({
    nodeSpacing: 250,
    showPValues: true,
    showFDR: true,
    showGenes: false,
    showGeneCount: true,
    showPathwaySize: false,
    showES: false,
    showNES: false,
    layout: 'hierarchical',
    showSubflows: true,
    compactMode: false,
    showInternalHierarchy: true,
    subflowGrouping: 'by_root',
  });

  // Custom node types
  const nodeTypes = useMemo(() => ({
    pathway: PathwayNode,
    subflow: SubflowNode,
  }), []);

  // Memoized layout function
  const getLayoutedElements = useCallback((nodes: Node[], edges: Edge[], direction = 'TB') => {
    const dagreGraph = new dagre.graphlib.Graph();
    dagreGraph.setDefaultEdgeLabel(() => ({}));
    dagreGraph.setGraph({ rankdir: direction, ranksep: settings.nodeSpacing, nodesep: 100 });

    // Set nodes with different sizes based on type
    nodes.forEach((node) => {
      if (node.data?.nodeType === 'subflow') {
        dagreGraph.setNode(node.id, { width: 250, height: 150 });
      } else {
        dagreGraph.setNode(node.id, { width: 150, height: 120 });
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
        const width = node.data?.nodeType === 'subflow' ? 250 : 150;
        const height = node.data?.nodeType === 'subflow' ? 150 : 120;
        
        return {
          ...node,
          position: {
            x: nodeWithPosition.x - width / 2,
            y: nodeWithPosition.y - height / 2,
          },
        };
      }),
      edges,
    };
  }, [settings.nodeSpacing]);

  // Memoized layout application
  const applyLayout = useCallback((layoutType: string) => {
    if (nodes.length === 0) return;

    let direction = 'TB';
    if (layoutType === 'hierarchical') {
      direction = 'TB';
    } else if (layoutType === 'circular') {
      // Circular layout for subflows
      const subflowNodes = nodes.filter(node => node.data?.nodeType === 'subflow');
      const centerX = 400;
      const centerY = 300;
      const radius = 250;
      const angleStep = (2 * Math.PI) / subflowNodes.length;
      
      const newNodes = nodes.map((node) => {
        if (node.data?.nodeType === 'subflow') {
          const index = subflowNodes.indexOf(node);
          return {
            ...node,
            position: {
              x: centerX + radius * Math.cos(index * angleStep),
              y: centerY + radius * radius * Math.sin(index * angleStep),
            },
          };
        }
        return node;
      });
      
      setNodes(newNodes);
      return;
    }

    const { nodes: layoutedNodes, edges: layoutedEdges } = getLayoutedElements(nodes, edges, direction);
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
  }, [nodes, edges, getLayoutedElements, setNodes, setEdges]);

  // Memoized flow elements generation with performance tracking
  const flowElements = useMemo(() => {
    const startTime = performance.now();
    
    if (pathways.length === 0) return { nodes: [], edges: [] };

    const treeData = buildPathwayTree(pathways);
    
    // Debug: Log tree data to see what we're working with
    console.log('Tree data:', treeData);
    console.log('Total pathways:', pathways.length);
    
    const newNodes = generateNetworkNodes(treeData);
    const newEdges = generateNetworkEdges(newNodes);

    // Debug: Log generated nodes to see what was created
    console.log('Generated nodes:', newNodes.length);
    console.log('Subflow nodes:', newNodes.filter(n => n.data?.nodeType === 'subflow').length);
    console.log('Pathway nodes:', newNodes.filter(n => n.data?.nodeType === 'pathway').length);

    const endTime = performance.now();
    setRenderTime(endTime - startTime);

    return { nodes: newNodes, edges: newEdges };
  }, [pathways, settings]);

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
    setSelectedNode(node as NetworkNode);
    setNodeDetailsOpen(true);
  }, []);

  const handleSettingsChange = useCallback((key: keyof NetworkSettings, value: string | boolean | number) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  if (pathways.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No pathways to display in network view.
        </Typography>
      </Box>
    );
  }

  const subflowCount = nodes.filter(node => node.data?.nodeType === 'subflow').length;
  const pathwayCount = nodes.filter(node => node.data?.nodeType === 'pathway').length;
  const significantPathways = pathways.filter(p => (p['p-value'] || p['p_value'] || 1) < 0.05).length;

  return (
    <Box sx={{ height: '1000px', width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Pathways Network with Subflows
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
            label={`${subflowCount} subflows`} 
            color="primary" 
            size="small" 
            icon={<AccountTreeIcon />}
          />
          <Chip 
            label={`${pathwayCount} pathways`} 
            color="secondary" 
            size="small" 
            icon={<HubIcon />}
          />
          <Chip 
            label={`${significantPathways} significant`} 
            color="success" 
            size="small" 
            icon={<TrendingUpIcon />}
          />
          <Chip 
            label={`${edges.length} connections`} 
            variant="outlined" 
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
        <DialogTitle>Network Settings</DialogTitle>
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

            <FormControl fullWidth>
              <InputLabel>Subflow Grouping</InputLabel>
              <Select
                value={settings.subflowGrouping}
                onChange={(e) => handleSettingsChange('subflowGrouping', e.target.value)}
                label="Subflow Grouping"
              >
                <MenuItem value="by_root">By Root Pathways</MenuItem>
                <MenuItem value="by_level">By Hierarchy Level</MenuItem>
                <MenuItem value="by_significance">By Significance</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography gutterBottom>Node Spacing: {settings.nodeSpacing}</Typography>
              <Slider
                value={settings.nodeSpacing}
                onChange={(_, value) => handleSettingsChange('nodeSpacing', value)}
                min={150}
                max={400}
                step={50}
                marks
                valueLabelDisplay="auto"
              />
            </Box>

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showSubflows}
                  onChange={(e) => handleSettingsChange('showSubflows', e.target.checked)}
                />
              }
              label="Show Subflows"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.compactMode}
                  onChange={(e) => handleSettingsChange('compactMode', e.target.checked)}
                />
              }
              label="Compact Mode"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showInternalHierarchy}
                  onChange={(e) => handleSettingsChange('showInternalHierarchy', e.target.checked)}
                />
              }
              label="Show Internal Hierarchy"
            />

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
                  checked={settings.showES}
                  onChange={(e) => handleSettingsChange('showES', e.target.checked)}
                />
              }
              label="Show Enrichment Score"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showNES}
                  onChange={(e) => handleSettingsChange('showNES', e.target.checked)}
                />
              }
              label="Show Normalized ES"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGeneCount}
                  onChange={(e) => handleSettingsChange('showGeneCount', e.target.checked)}
                />
              }
              label="Show Gene Count"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showPathwaySize}
                  onChange={(e) => handleSettingsChange('showPathwaySize', e.target.checked)}
                />
              }
              label="Show Pathway Size"
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
            {selectedNode?.data?.nodeType === 'subflow' ? 'Subflow Details' : 'Pathway Details'}
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedNode && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedNode.data.label}
              </Typography>
              
              {selectedNode.data.nodeType === 'subflow' ? (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                    <Chip 
                      label={`${selectedNode.data.pathwayCount || 0} pathways`}
                      color="primary"
                    />
                    <Chip 
                      label={`${selectedNode.data.totalGenes || 0} total genes`}
                      color="secondary"
                    />
                  </Box>
                  
                  <Typography variant="subtitle2" gutterBottom>
                    Root Pathway: {selectedNode.data.pathway['Pathway'] || selectedNode.data.pathway['pathway']}
                  </Typography>
                </Box>
              ) : (
                <Box>
                  <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                    <Chip 
                      label={`P-value: ${(selectedNode.data.pValue || 0).toExponential(2)}`}
                      color={(selectedNode.data.pValue || 1) < 0.05 ? 'success' : 'default'}
                    />
                    <Chip 
                      label={`FDR: ${(selectedNode.data.fdr || 0).toExponential(2)}`}
                      color={(selectedNode.data.fdr || 1) < 0.05 ? 'success' : 'default'}
                    />
                    <Chip 
                      label={`ES: ${(selectedNode.data.pathway['ES'] || selectedNode.data.pathway['es'] || 0).toFixed(3)}`}
                      color={(selectedNode.data.pathway['ES'] || selectedNode.data.pathway['es'] || 0) > 0.2 ? 'success' : 'default'}
                    />
                    <Chip 
                      label={`NES: ${(selectedNode.data.pathway['NES'] || selectedNode.data.pathway['nes'] || 0).toFixed(3)}`}
                      color={(selectedNode.data.pathway['NES'] || selectedNode.data.pathway['nes'] || 0) > 1.5 ? 'success' : 'default'}
                    />
                    <Chip 
                      label={`${selectedNode.data.geneCount || 0} genes`}
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
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
      <PathwayFlowVisualization />
    </Box>
  );
};

export default PathwaysNetwork; 