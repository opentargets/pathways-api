import type { Pathway } from "../lib/api";

export interface TreeNode {
  id: string;
  pathway: Pathway;
  children: TreeNode[];
  level: number;
}

export interface HierarchyData {
  pathwayMap: Map<string, Pathway>;
  childrenMap: Map<string, string[]>;
  rootPathways: Pathway[];
  secondLevelPathways: Pathway[];
}

/**
 * Builds a pathway hierarchy with fallback logic for when no root pathways exist.
 * 
 * @param pathways - Array of pathway objects
 * @returns HierarchyData containing pathway maps and categorized pathways
 */
export const buildPathwayHierarchy = (pathways: Pathway[]): HierarchyData => {
  const pathwayMap = new Map<string, Pathway>();
  const childrenMap = new Map<string, string[]>();
  const rootPathways: Pathway[] = [];
  const secondLevelPathways: Pathway[] = [];
  const processedIds = new Set<string>();

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
      rootPathways.push(pathway);
    }
  });

  // If we have root pathways, return them
  if (rootPathways.length > 0) {
    return { pathwayMap, childrenMap, rootPathways, secondLevelPathways: [] };
  }

  // If no root pathways, find pathways whose parents are not in the dataset
  // These will be treated as "second level" pathways
  pathways.forEach((pathway) => {
    const id = pathway["ID"] || pathway["id"] || "";
    if (processedIds.has(id)) return;

    const parentPathway =
      pathway["Parent pathway"] || pathway["parent_pathway"] || "";

    if (parentPathway) {
      const parents = parentPathway.split(",").map((p: string) => p.trim());
      // Check if any parent is not in our dataset
      const hasUnknownParent = parents.some((parent: string) => !pathwayMap.has(parent));

      if (hasUnknownParent) {
        secondLevelPathways.push(pathway);
        processedIds.add(id);
      }
    }
  });

  // If still no second-level pathways found, use all pathways as fallback
  if (secondLevelPathways.length === 0) {
    secondLevelPathways.push(...pathways);
  }

  return { pathwayMap, childrenMap, rootPathways, secondLevelPathways };
};

/**
 * Builds a tree structure from pathways with fallback logic.
 * 
 * @param pathways - Array of pathway objects
 * @returns Array of TreeNode objects representing the hierarchy
 */
export const buildPathwayTree = (pathways: Pathway[]): TreeNode[] => {
  const { pathwayMap, childrenMap, rootPathways, secondLevelPathways } = buildPathwayHierarchy(pathways);

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
        };
      })
      .filter(Boolean) as TreeNode[];
  };

  // Use root pathways if available, otherwise use second-level pathways
  const topLevelPathways = rootPathways.length > 0 ? rootPathways : secondLevelPathways;
  const rootNodes: TreeNode[] = [];

  topLevelPathways.forEach((pathway) => {
    const id = pathway["ID"] || pathway["id"] || "";
    rootNodes.push({
      id,
      pathway,
      children: buildChildren(id, 1),
      level: 0,
    });
  });

  return rootNodes;
};

/**
 * Gets the effective root pathways for display purposes.
 * Returns root pathways if available, otherwise returns second-level pathways.
 * 
 * @param pathways - Array of pathway objects
 * @returns Array of pathway objects that should be displayed as top-level
 */
export const getEffectiveRootPathways = (pathways: Pathway[]): Pathway[] => {
  const { rootPathways, secondLevelPathways } = buildPathwayHierarchy(pathways);
  return rootPathways.length > 0 ? rootPathways : secondLevelPathways;
};
