import type { Node, Edge } from 'reactflow';
import type { Pathway } from '../../lib/api';

// Gene network data types
export interface GeneData {
  geneId: string;
  geneName: string;
  pathways: Pathway[];
  pValues: number[];
  fdrValues: number[];
}

export interface NetworkSettings {
  nodeSpacing: number;
  showPValues: boolean;
  showFDR: boolean;
  showPathways: boolean;
  layout: 'hierarchical' | 'force' | 'circular' | 'subflow';
  minGeneCount: number;
  maxGenes: number;
  showEdgeLabels: boolean;
  maxEdges: number;
  minSignificance: number;
  hierarchyDepth: number;
}

// ReactFlow node and edge types
export type GeneNode = Node & {
  data: {
    label: string;
    geneId: string;
    nodeType: 'gene';
    pathways: Pathway[];
    pathwayCount: number;
    significance: number;
    avgPValue: number;
    avgFDR: number;
  };
};

export type PathwayGroupNode = Node & {
  data: {
    label: string;
    pathwayId: string;
    nodeType: 'pathway-group';
    pathway: Pathway;
    geneCount: number;
    color: string;
  };
};

export type PathwayEdge = Edge & {
  data?: {
    label?: string;
    pathway: Pathway;
    relationship?: string;
    pValue?: number;
    fdr?: number;
    pathwayColor?: string;
    topLevelParentId?: string;
    connectedGenes?: string[];
  };
};

// Network generation result types
export interface NetworkData {
  nodes: GeneNode[];
  edges: PathwayEdge[];
  renderTime: number;
  geneCount: number;
  edgeCount: number;
  topLevelParents: Set<string>;
  colorMapping: Map<string, string>;
}

// Pathway hierarchy types
export interface PathwayHierarchy {
  pathwayMap: Map<string, Pathway>;
  childrenMap: Map<string, string[]>;
  rootPathways: Pathway[];
  pathwayToRoot: Map<string, string>;
} 