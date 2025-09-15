// Color palettes and utilities for pathway visualizations

/**
 * Prioritization color palette for -1 to 1 scale (NES values)
 * Used in flame graphs and other visualizations that need to show prioritization
 */
export const PRIORITISATION_COLORS = [
  "#a01813", // -1 (red)
  "#bc3a19",
  "#d65a1f",
  "#e08145",
  "#e3a772",
  "#e6ca9c",
  "#eceada", // 0 (neutral)
  "#c5d2c1",
  "#9ebaa8",
  "#78a290",
  "#528b78",
  "#2f735f",
  "#2e5943", // 1 (green)
];

/**
 * Significance color palette for p-values and FDR
 * Used in treemaps and other visualizations that show significance
 */
export const SIGNIFICANCE_COLORS = {
  high: "#4caf50", // Green for significant
  moderate: "#ff9800", // Orange for moderate
  low: "#f44336", // Red for not significant
};

/**
 * Gene count color palette
 * Used for visualizations that color by gene count
 */
export const GENE_COUNT_COLORS = {
  base: "#2196f3", // Blue base color
  gradient: true, // Indicates this uses a gradient
};

/**
 * Root node colors
 */
export const ROOT_NODE_COLORS = {
  primary: "#f0f0f0", // Soft grey for root nodes
  secondary: "#e0e0e0", // Slightly darker grey for secondary root nodes
};

/**
 * Default Plotly color palettes
 */
export const PLOTLY_COLOR_PALETTES = {
  treemap: ["#636efa", "#ef553b", "#00cc96", "#ab63fa", "#ffa15a"],
  sunburst: PRIORITISATION_COLORS,
};

/**
 * Color mapping functions
 */

/**
 * Maps a value to a color from the prioritization palette
 * @param value - The value to map (typically NES)
 * @param minValue - Minimum value in the range
 * @param maxValue - Maximum value in the range
 * @returns Color string from the prioritization palette
 */
export const mapToPrioritizationColor = (
  value: number,
  minValue: number,
  maxValue: number,
): string => {
  const normalized = (value - minValue) / (maxValue - minValue);
  const colorIndex = Math.floor(
    normalized * (PRIORITISATION_COLORS.length - 1),
  );
  return PRIORITISATION_COLORS[
    Math.max(0, Math.min(colorIndex, PRIORITISATION_COLORS.length - 1))
  ];
};

/**
 * Maps a p-value or FDR to a significance color
 * @param value - The p-value or FDR value
 * @param threshold - The significance threshold (default: 0.05)
 * @returns Color string based on significance
 */
export const mapToSignificanceColor = (
  value: number,
  threshold: number = 0.05,
): string => {
  if (value < threshold) {
    return SIGNIFICANCE_COLORS.high;
  } else if (value < threshold * 2) {
    return SIGNIFICANCE_COLORS.moderate;
  } else {
    return SIGNIFICANCE_COLORS.low;
  }
};

/**
 * Maps a p-value or FDR to a significance color using log scale
 * @param value - The p-value or FDR value
 * @param maxLog - Maximum log value for normalization (default: 3)
 * @returns Color string based on significance
 */
export const mapToSignificanceColorLog = (
  value: number,
  maxLog: number = 3,
): string => {
  const normalized = -Math.log10(value || 1) / maxLog;
  if (normalized > 0.7) return SIGNIFICANCE_COLORS.high;
  else if (normalized > 0.4) return SIGNIFICANCE_COLORS.moderate;
  else return SIGNIFICANCE_COLORS.low;
};

/**
 * Maps gene count to a color using a gradient
 * @param geneCount - Number of genes
 * @param maxGenes - Maximum gene count for normalization (default: 50)
 * @returns RGB color string
 */
export const mapToGeneCountColor = (
  geneCount: number,
  maxGenes: number = 50,
): string => {
  const normalized = geneCount / maxGenes;
  return `rgb(${Math.round(255 * (1 - normalized))}, ${Math.round(255 * normalized)}, 100)`;
};

/**
 * Maps NES values to prioritization colors for a set of pathways
 * @param pathways - Array of pathway objects
 * @param nesField - Field name for NES values (default: "NES")
 * @returns Array of color strings
 */
export const mapPathwaysToPrioritizationColors = (
  pathways: Array<Record<string, any>>,
  nesField: string = "NES",
): string[] => {
  const nesValues = pathways.map((p) => p[nesField] || p[nesField.toLowerCase()] || 0);
  const maxNES = Math.max(...nesValues);
  const minNES = Math.min(...nesValues);

  return nesValues.map((nes) => mapToPrioritizationColor(nes, minNES, maxNES));
};

/**
 * Maps p-values to significance colors for a set of pathways
 * @param pathways - Array of pathway objects
 * @param pValueField - Field name for p-values (default: "p-value")
 * @param useLogScale - Whether to use log scale (default: true)
 * @returns Array of color strings
 */
export const mapPathwaysToSignificanceColors = (
  pathways: Array<Record<string, any>>,
  pValueField: string = "p-value",
  useLogScale: boolean = true,
): string[] => {
  return pathways.map((pathway) => {
    const pValue = pathway[pValueField] || pathway[pValueField.replace("-", "_")] || 1;
    return useLogScale
      ? mapToSignificanceColorLog(pValue)
      : mapToSignificanceColor(pValue);
  });
};

/**
 * Maps gene counts to colors for a set of pathways
 * @param pathways - Array of pathway objects
 * @param geneField - Field name for genes (default: "Leading edge genes")
 * @param maxGenes - Maximum gene count for normalization (default: 50)
 * @returns Array of color strings
 */
export const mapPathwaysToGeneCountColors = (
  pathways: Array<Record<string, any>>,
  geneField: string = "Leading edge genes",
  maxGenes: number = 50,
): string[] => {
  return pathways.map((pathway) => {
    const genes = pathway[geneField] || pathway["genes"] || [];
    const geneCount = Array.isArray(genes)
      ? genes.length
      : typeof genes === "string"
        ? genes.split(",").length
        : 0;
    return mapToGeneCountColor(geneCount, maxGenes);
  });
};
