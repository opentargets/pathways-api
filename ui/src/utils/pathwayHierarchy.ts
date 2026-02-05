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

  // Always check for pathways whose parents are not in the dataset
  // These should be treated as "second level" pathways and displayed at root level
  pathways.forEach((pathway) => {
    const id = pathway["ID"] || pathway["id"] || "";
    // Skip if already in rootPathways (has no parent)
    if (rootPathways.includes(pathway)) return;
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

  // If no root pathways and no second-level pathways found, use all pathways as fallback
  if (rootPathways.length === 0 && secondLevelPathways.length === 0) {
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

  // Use root pathways and second-level pathways (pathways with missing parents)
  // Both should be displayed at the top level
  const topLevelPathways = [...rootPathways, ...secondLevelPathways];
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
 * Returns root pathways and pathways with missing parents (second-level pathways).
 * Both should be displayed at the top level.
 * 
 * @param pathways - Array of pathway objects
 * @returns Array of pathway objects that should be displayed as top-level
 */
export const getEffectiveRootPathways = (pathways: Pathway[]): Pathway[] => {
  const { rootPathways, secondLevelPathways } = buildPathwayHierarchy(pathways);
  // Return both root pathways and pathways with missing parents
  return [...rootPathways, ...secondLevelPathways];
};
