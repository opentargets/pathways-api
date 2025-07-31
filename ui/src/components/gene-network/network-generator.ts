import type { Pathway } from '../../lib/api';
import type {
  GeneData,
  NetworkSettings,
  GeneNode,
  PathwayEdge,
  NetworkData,
  PathwayHierarchy,
  PathwayGroupNode
} from './types';

// Color palette for pathway groups
const COLOR_PALETTE = [
  '#2196f3', '#f44336', '#4caf50', '#ff9800', '#9c27b0',
  '#00bcd4', '#ff5722', '#8bc34a', '#e91e63', '#3f51b5',
  '#009688', '#ffc107', '#795548', '#607d8b', '#ff4081',
  '#00bcd4', '#ff9800', '#4caf50', '#9c27b0', '#f44336',
  '#3f51b5', '#e91e63', '#8bc34a', '#ff5722', '#00bcd4',
  '#9c27b0', '#4caf50', '#ff9800', '#f44336', '#2196f3'
];

/**
 * Extract genes from pathways and build gene-centric network
 */
export function buildGeneNetwork(pathways: Pathway[]): Map<string, GeneData> {
  const geneMap = new Map<string, GeneData>();

  pathways.forEach(pathway => {
    const genes = pathway['Leading edge genes'] || pathway['genes'] || [];
    const geneList = Array.isArray(genes) ? genes : typeof genes === 'string' ? genes.split(',').map(g => g.trim()) : [];
    const pValue = pathway['P-value'] || pathway['p_value'] || pathway['pvalue'];
    const fdr = pathway['FDR'] || pathway['fdr'];

    geneList.forEach(gene => {
      if (!gene || gene.trim() === '') return;

      const geneId = gene.trim();
      if (!geneMap.has(geneId)) {
        geneMap.set(geneId, {
          geneId,
          geneName: geneId,
          pathways: [],
          pValues: [],
          fdrValues: [],
        });
      }

      const geneData = geneMap.get(geneId)!;
      geneData.pathways.push(pathway);
      if (pValue) geneData.pValues.push(typeof pValue === 'number' ? pValue : parseFloat(pValue) || 0);
      if (fdr) geneData.fdrValues.push(typeof fdr === 'number' ? fdr : parseFloat(fdr) || 0);
    });
  });

  return geneMap;
}

/**
 * Build pathway hierarchy to find root pathways
 */
export function buildPathwayHierarchy(pathways: Pathway[]): PathwayHierarchy {
  const pathwayMap = new Map<string, Pathway>();
  const childrenMap = new Map<string, string[]>();
  const rootPathways: Pathway[] = [];
  const pathwayToRoot = new Map<string, string>();

  // Create pathway map and collect children
  pathways.forEach(pathway => {
    const id = pathway['ID'] || pathway['id'] || '';
    pathwayMap.set(id, pathway);

    const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';

    if (parentPathway && parentPathway.trim() !== '') {
      const parents = parentPathway.split(',').map((p: string) => p.trim()).filter((p: string) => p !== '');
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

  // Find root pathway for each pathway (recursively traverse up the hierarchy)
  const findRootPathway = (pathwayId: string, visited: Set<string> = new Set()): string => {
    if (visited.has(pathwayId)) return pathwayId; // Prevent cycles
    visited.add(pathwayId);

    const pathway = pathwayMap.get(pathwayId);
    if (!pathway) return pathwayId;

    const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';

    if (!parentPathway || parentPathway.trim() === '') {
      return pathwayId; // This is a root pathway
    }

    const parents = parentPathway.split(',').map((p: string) => p.trim()).filter((p: string) => p !== '');
    if (parents.length === 0) {
      return pathwayId; // No valid parents
    }

    // Use the first parent as the root
    const firstParent = parents[0];
    return findRootPathway(firstParent, visited);
  };

  // Build the pathway to root mapping
  pathways.forEach(pathway => {
    const pathwayId = pathway['ID'] || pathway['id'] || '';
    const rootId = findRootPathway(pathwayId);
    pathwayToRoot.set(pathwayId, rootId);
  });

  return { pathwayMap, childrenMap, rootPathways, pathwayToRoot };
}

/**
 * Find the actual top-level parent for a pathway
 */
export function findTopLevelParent(pathwayId: string, pathwayMap: Map<string, Pathway>): string {
  const pathway = pathwayMap.get(pathwayId);
  if (!pathway) return pathwayId;

  const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';
  if (!parentPathway || parentPathway.trim() === '') {
    return pathwayId; // This is already a top-level pathway
  }

  const parents = parentPathway.split(',').map((p: string) => p.trim()).filter((p: string) => p !== '');
  if (parents.length === 0) {
    return pathwayId; // No valid parents
  }

  // Recursively find the top-level parent
  const firstParent = parents[0];
  return findTopLevelParent(firstParent, pathwayMap);
}

/**
 * Generate gene nodes from gene data
 */
export function generateGeneNodes(geneMap: Map<string, GeneData>): GeneNode[] {
  const nodes: GeneNode[] = [];

  geneMap.forEach((geneData, geneId) => {
    const avgPValue = geneData.pValues.length > 0 ?
      geneData.pValues.reduce((sum: number, val: number) => sum + val, 0) / geneData.pValues.length : 0;
    const avgFDR = geneData.fdrValues.length > 0 ?
      geneData.fdrValues.reduce((sum: number, val: number) => sum + val, 0) / geneData.fdrValues.length : 0;
    const significance = avgPValue ? -Math.log10(avgPValue) / 10 : 0;

    nodes.push({
      id: geneId,
      type: 'gene',
      position: { x: 0, y: 0 }, // Will be calculated by layout
      data: {
        label: geneData.geneName,
        geneId,
        nodeType: 'gene',
        pathways: geneData.pathways,
        pathwayCount: geneData.pathways.length,
        significance,
        avgPValue,
        avgFDR,
      },
    });
  });

  return nodes;
}

/**
 * Generate pathway edges between genes with optimized filtering
 * Each edge represents a pathway that connects two genes
 */
export function generatePathwayEdges(
  geneMap: Map<string, GeneData>,
  settings: NetworkSettings,
  pathwayMap: Map<string, Pathway>
): PathwayEdge[] {
  const edges: PathwayEdge[] = [];
  const processedPathways = new Set<string>();
  const maxEdges = settings.maxEdges || 500;

  // Create a map of pathway to genes for efficient lookup
  const pathwayToGenes = new Map<string, { genes: string[], pathway: Pathway }>();

  geneMap.forEach((geneData, geneId) => {
    geneData.pathways.forEach((pathway: Pathway) => {
      const pathwayId = pathway['ID'] || pathway['id'] || '';
      if (!pathwayToGenes.has(pathwayId)) {
        pathwayToGenes.set(pathwayId, { genes: [], pathway });
      }
      pathwayToGenes.get(pathwayId)!.genes.push(geneId);
    });
  });

  // Generate consistent colors for top-level parent pathways
  const topLevelParentColors = new Map<string, string>();
  const topLevelParents = new Set<string>();

  // Find the actual top-level parent for each pathway
  pathwayToGenes.forEach((_, pathwayId) => {
    const topLevelParentId = findTopLevelParent(pathwayId, pathwayMap);
    topLevelParents.add(topLevelParentId);
  });

  // Assign colors to top-level parents
  let colorIndex = 0;
  topLevelParents.forEach((topLevelParentId) => {
    const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    topLevelParentColors.set(topLevelParentId, color);
    colorIndex++;
  });

  // Create pathway objects with top-level parent information
  const allPathways = Array.from(pathwayToGenes.entries())
    .map(([pathwayId, data]) => {
      const pValue = data.pathway['P-value'] || data.pathway['p_value'] || data.pathway['pvalue'];
      const significance = pValue ? -Math.log10(pValue) : 0;
      const topLevelParentId = findTopLevelParent(pathwayId, pathwayMap);

      return { pathwayId, data, significance, topLevelParentId };
    })
    .sort((a, b) => {
      // Sort by significance first, then by gene count
      if (Math.abs(a.significance - b.significance) > 0.1) {
        return b.significance - a.significance;
      }
      return b.data.genes.length - a.data.genes.length;
    });

  // Create edges from most significant pathways first
  for (const { pathwayId, data, significance } of allPathways) {
    if (edges.length >= maxEdges) break;

    // Skip if below significance threshold
    if (settings.minSignificance > 0 && significance < settings.minSignificance) {
      continue;
    }

    const geneIds = data.genes;
    const pathway = data.pathway;
    const pValue = pathway['P-value'] || pathway['p_value'] || pathway['pvalue'];
    const fdr = pathway['FDR'] || pathway['fdr'];

    // Get color from top-level parent pathway
    const topLevelParentId = findTopLevelParent(pathwayId, pathwayMap);
    const topLevelParentColor = topLevelParentColors.get(topLevelParentId) || '#2196f3';

    // Only create edges for pathways that connect at least 2 genes
    if (geneIds.length >= 2) {
      // Create edges between all gene pairs in this pathway
      for (let i = 0; i < geneIds.length && edges.length < maxEdges; i++) {
        for (let j = i + 1; j < geneIds.length && edges.length < maxEdges; j++) {
          const geneId1 = geneIds[i];
          const geneId2 = geneIds[j];

          // Skip if we've already processed this pathway
          if (processedPathways.has(pathwayId)) continue;

          const edgeWeight = Math.max(1, Math.min(5, Math.floor(significance / 2) + 1));

          edges.push({
            id: `edge-${pathwayId}-${geneId1}-${geneId2}`,
            source: geneId1,
            target: geneId2,
            type: 'smoothstep',
            style: {
              stroke: topLevelParentColor,
              strokeWidth: edgeWeight,
              opacity: 0.7,
            },
            data: {
              label: pathway['Pathway'] || pathway['pathway'] || 'Pathway',
              pathway,
              relationship: 'pathway-connection',
              pValue: typeof pValue === 'number' ? pValue : parseFloat(pValue) || 0,
              fdr: typeof fdr === 'number' ? fdr : parseFloat(fdr) || 0,
              pathwayColor: topLevelParentColor,
              topLevelParentId,
              connectedGenes: geneIds,
            },
          } as PathwayEdge);
        }
      }

      processedPathways.add(pathwayId);
    }
  }

  return edges;
}

/**
 * Generate pathway group nodes for Sub Flow with proper containment
 */
export function generatePathwayGroupNodes(
  geneMap: Map<string, GeneData>,
  pathwayMap: Map<string, Pathway>,
  colorMapping: Map<string, string>
): { groupNodes: PathwayGroupNode[], geneNodes: GeneNode[] } {
  const groupNodes: PathwayGroupNode[] = [];
  const geneNodes: GeneNode[] = [];
  const pathwayGroups = new Map<string, { genes: string[], pathway: Pathway }>();

  // Group genes by their top-level parent pathway
  geneMap.forEach((geneData, geneId) => {
    geneData.pathways.forEach((pathway: Pathway) => {
      const pathwayId = pathway['ID'] || pathway['id'] || '';
      const topLevelParentId = findTopLevelParent(pathwayId, pathwayMap);

      if (!pathwayGroups.has(topLevelParentId)) {
        const topLevelPathway = pathwayMap.get(topLevelParentId);
        pathwayGroups.set(topLevelParentId, {
          genes: [],
          pathway: topLevelPathway || pathway
        });
      }

      if (!pathwayGroups.get(topLevelParentId)!.genes.includes(geneId)) {
        pathwayGroups.get(topLevelParentId)!.genes.push(geneId);
      }
    });
  });

  // Create group nodes and position genes within them
  let groupIndex = 0;
  pathwayGroups.forEach((groupData, topLevelParentId) => {
    const pathway = groupData.pathway;
    const color = colorMapping.get(topLevelParentId) || '#2196f3';

    // Calculate group position - spread them out more
    const groupX = 50 + (groupIndex % 2) * 600;
    const groupY = 50 + Math.floor(groupIndex / 2) * 400;

    // Create group node
    groupNodes.push({
      id: `group-${topLevelParentId}`,
      type: 'pathway-group',
      position: { x: groupX, y: groupY },
      data: {
        label: pathway['Pathway'] || pathway['pathway'] || 'Pathway Group',
        pathwayId: topLevelParentId,
        nodeType: 'pathway-group',
        pathway,
        geneCount: groupData.genes.length,
        color,
      },
    });

    // Create gene nodes positioned within the group
    groupData.genes.forEach((geneId, geneIndex) => {
      const geneData = geneMap.get(geneId);
      if (geneData) {
        const avgPValue = geneData.pValues.length > 0 ?
          geneData.pValues.reduce((sum: number, val: number) => sum + val, 0) / geneData.pValues.length : 0;
        const avgFDR = geneData.fdrValues.length > 0 ?
          geneData.fdrValues.reduce((sum: number, val: number) => sum + val, 0) / geneData.fdrValues.length : 0;
        const significance = avgPValue ? -Math.log10(avgPValue) / 10 : 0;

        // Position genes in a grid within the group - relative to group position
        const genesPerRow = 5;
        const geneX = (geneIndex % genesPerRow) * 70 + 30; // Relative to group
        const geneY = Math.floor(geneIndex / genesPerRow) * 70 + 80; // Relative to group

        geneNodes.push({
          id: geneId,
          type: 'gene',
          position: { x: geneX, y: geneY }, // Relative position within group
          parentNode: `group-${topLevelParentId}`, // This makes it a child of the group
          extent: 'parent', // This ensures it stays within the parent
          data: {
            label: geneData.geneName,
            geneId,
            nodeType: 'gene',
            pathways: geneData.pathways,
            pathwayCount: geneData.pathways.length,
            significance,
            avgPValue,
            avgFDR,
          },
        });
      }
    });

    groupIndex++;
  });

  return { groupNodes, geneNodes };
}

/**
 * Main function to generate the complete network data with Sub Flow groups
 */
export function generateNetworkData(pathways: Pathway[], settings: NetworkSettings): NetworkData {
  const startTime = performance.now();

  if (pathways.length === 0) {
    return {
      nodes: [],
      edges: [],
      renderTime: 0,
      geneCount: 0,
      edgeCount: 0,
      topLevelParents: new Set(),
      colorMapping: new Map(),
    };
  }

  const geneMap = buildGeneNetwork(pathways);

  // Filter genes by minimum pathway count
  const filteredGeneMap = new Map();
  geneMap.forEach((geneData, geneId) => {
    if (geneData.pathways.length >= settings.minGeneCount) {
      filteredGeneMap.set(geneId, geneData);
    }
  });

  // Limit number of genes if needed
  const limitedGeneMap = new Map();
  const sortedGenes = Array.from(filteredGeneMap.entries())
    .sort((a, b) => b[1].pathways.length - a[1].pathways.length)
    .slice(0, settings.maxGenes);

  sortedGenes.forEach(([geneId, geneData]) => {
    limitedGeneMap.set(geneId, geneData);
  });

  // Build pathway hierarchy
  const { pathwayMap } = buildPathwayHierarchy(pathways);

  // Generate color mapping first
  const topLevelParents = new Set<string>();
  const colorMapping = new Map<string, string>();

  // Find all top-level parents and assign colors
  limitedGeneMap.forEach((geneData) => {
    geneData.pathways.forEach((pathway: Pathway) => {
      const pathwayId = pathway['ID'] || pathway['id'] || '';
      const topLevelParentId = findTopLevelParent(pathwayId, pathwayMap);
      topLevelParents.add(topLevelParentId);
    });
  });

  let colorIndex = 0;
  topLevelParents.forEach((topLevelParentId) => {
    const color = COLOR_PALETTE[colorIndex % COLOR_PALETTE.length];
    colorMapping.set(topLevelParentId, color);
    colorIndex++;
  });

  const { groupNodes, geneNodes } = generatePathwayGroupNodes(limitedGeneMap, pathwayMap, colorMapping);
  const edges = generatePathwayEdges(limitedGeneMap, settings, pathwayMap);

  // Combine all nodes
  const nodes = [...groupNodes, ...geneNodes];

  const endTime = performance.now();
  const renderTime = endTime - startTime;

  return {
    nodes,
    edges,
    renderTime,
    geneCount: geneNodes.length,
    edgeCount: edges.length,
    topLevelParents,
    colorMapping,
  };
} 