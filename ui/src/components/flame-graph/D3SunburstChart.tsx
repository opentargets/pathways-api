import React, { useEffect, useRef, useMemo } from "react";
import * as d3 from "d3";
import { Box } from "@mui/material";
import type { Pathway } from "../../lib/api";
import { buildPathwayHierarchy, getEffectiveRootPathways } from "../../utils/pathwayHierarchy";
import { 
  PRIORITISATION_COLORS, 
  mapToPrioritizationColor, 
  ROOT_NODE_COLORS
} from "../../utils/colorPalettes";

interface D3SunburstChartProps {
  pathways: Pathway[];
  maxPathways: number;
  orientation: "h" | "v";
  branchvalues: "total" | "remainder";
}

interface D3Node extends d3.HierarchyNode<any> {
  data: {
    id: string;
    name: string;
    pathway?: Pathway;
    pValue?: number;
    fdr?: number;
    nes?: number;
    geneCount?: number;
    genes?: string[];
    type: "root" | "pathway";
  };
}

const D3SunburstChart: React.FC<D3SunburstChartProps> = ({
  pathways,
  maxPathways,
  orientation,
  branchvalues,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Convert pathway data to D3 hierarchy format
  const hierarchyData = useMemo(() => {
    if (pathways.length === 0) return null;

    const limitedPathways = pathways.slice(0, maxPathways);
    const { pathwayMap, childrenMap } = buildPathwayHierarchy(limitedPathways);
    const rootPathways = getEffectiveRootPathways(limitedPathways);

    // Collect all NES values for color scaling
    const allNESValues: number[] = [];
    limitedPathways.forEach((pathway) => {
      const nes = pathway["NES"] || pathway["nes"] || 0;
      allNESValues.push(nes);
    });

    const maxNES = Math.max(...allNESValues);
    const minNES = Math.min(...allNESValues);

    // Helper function to create node data
    const createNodeData = (pathway: Pathway, type: "root" | "pathway") => {
      const pValue = pathway["p-value"] || pathway["p_value"] || pathway["pvalue"];
      const fdr = pathway["FDR"] || pathway["fdr"];
      const nes = pathway["NES"] || pathway["nes"];
      const genes = pathway["Leading edge genes"] || pathway["genes"] || [];
      const geneCount = Array.isArray(genes)
        ? genes.length
        : typeof genes === "string"
          ? genes.split(",").length
          : 0;

      // Calculate value based on significance (more significant = larger)
      const significance = 1 / (pValue || 1);
      const value = Math.max(1, Math.log(significance) * 5);

      return {
        id: pathway["ID"] || pathway["id"] || "",
        name: pathway["Pathway"] || pathway["pathway"] || "",
        pathway,
        pValue,
        fdr,
        nes,
        geneCount,
        genes: Array.isArray(genes)
          ? genes
          : typeof genes === "string"
            ? genes.split(",").map((g: string) => g.trim())
            : [],
        type,
        value,
        color: type === "root" 
          ? ROOT_NODE_COLORS.primary 
          : mapToPrioritizationColor(nes || 0, minNES, maxNES)
      };
    };

    // Build hierarchy structure
    const buildHierarchy = (parentId: string, processedIds: Set<string>): any[] => {
      const children = childrenMap.get(parentId) || [];
      return children
        .filter(childId => !processedIds.has(childId))
        .map(childId => {
          processedIds.add(childId);
          const pathway = pathwayMap.get(childId);
          if (!pathway) return null;

          const nodeData = createNodeData(pathway, "pathway");
          const childNodes = buildHierarchy(childId, processedIds);

          return {
            ...nodeData,
            children: childNodes.length > 0 ? childNodes : undefined
          };
        })
        .filter(Boolean);
    };

    // Create root node
    const rootNodeData = {
      id: "root",
      name: "All Pathways",
      type: "root" as const,
      value: limitedPathways.length,
      color: ROOT_NODE_COLORS.primary,
      children: rootPathways.map(pathway => {
        const pathwayId = pathway["ID"] || pathway["id"] || "";
        const nodeData = createNodeData(pathway, "pathway");
        const processedIds = new Set<string>();
        processedIds.add(pathwayId);
        
        const childNodes = buildHierarchy(pathwayId, processedIds);
        
        return {
          ...nodeData,
          children: childNodes.length > 0 ? childNodes : undefined
        };
      })
    };

    return rootNodeData;
  }, [pathways, maxPathways]);

  // D3 rendering function
  const renderSunburst = () => {
    if (!hierarchyData || !svgRef.current || !containerRef.current) return;

    const container = containerRef.current;
    const svg = d3.select(svgRef.current);
    
    // Clear previous content
    svg.selectAll("*").remove();

    const width = container.clientWidth;
    const height = 700;
    const radius = Math.min(width, height) / 2 - 10;

    // Set up SVG
    svg
      .attr("width", width)
      .attr("height", height)
      .style("background-color", "white");

    // Create main group
    const g = svg
      .append("g")
      .attr("transform", `translate(${width / 2},${height / 2})`);

    // Create partition layout
    const partition = d3.partition()
      .size([2 * Math.PI, radius]);

    // Create arc generator
    const arc = d3.arc<D3Node>()
      .startAngle(d => d.x0)
      .endAngle(d => d.x1)
      .padAngle(d => Math.min((d.x1 - d.x0) / 2, 0.005))
      .padRadius(radius / 2)
      .innerRadius(d => d.y0)
      .outerRadius(d => d.y1 - 1);

    // Create hierarchy
    const root = d3.hierarchy(hierarchyData)
      .sum(d => d.value)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    const nodes = partition(root).descendants().filter(d => d.x1 - d.x0 > 0.005);

    // Create arcs
    const arcs = g
      .selectAll(".arc")
      .data(nodes)
      .enter()
      .append("path")
      .attr("class", "arc")
      .attr("d", arc)
      .style("fill", d => d.data.color)
      .style("cursor", "pointer")
      .style("opacity", 0)
      .on("mouseover", function(event, d) {
        // Highlight current path
        const sequenceArray = d.ancestors().reverse();
        
        // Fade all arcs
        arcs.transition().duration(300).style("opacity", 0.3);
        
        // Highlight current path
        arcs
          .filter(d => sequenceArray.indexOf(d) >= 0)
          .transition()
          .duration(300)
          .style("opacity", 1);

        // Show tooltip (you can implement this based on your tooltip system)
        showTooltip(event, d);
      })
      .on("mouseleave", function() {
        // Reset all arcs
        arcs.transition().duration(300).style("opacity", 1);
        hideTooltip();
      })
      .on("click", function(event, d) {
        // Handle click events if needed
        console.log("Clicked:", d.data);
      });

    // Animate arcs
    arcs
      .transition()
      .delay((d, i) => i * 20)
      .style("opacity", 1);

    // Add labels for larger arcs
    const labels = g
      .selectAll(".label")
      .data(nodes.filter(d => d.x1 - d.x0 > 0.1 && d.y1 - d.y0 > 10))
      .enter()
      .append("text")
      .attr("class", "label")
      .attr("transform", d => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr("text-anchor", "middle")
      .attr("dy", "0.35em")
      .style("font-size", "12px")
      .style("font-family", "Arial, sans-serif")
      .style("fill", "#333")
      .text(d => d.data.name.length > 15 ? d.data.name.substring(0, 15) + "..." : d.data.name)
      .style("opacity", 0)
      .transition()
      .delay((d, i) => i * 20 + 200)
      .style("opacity", 1);
  };

  // Tooltip functions
  const showTooltip = (event: MouseEvent, d: D3Node) => {
    const tooltip = d3.select("body")
      .append("div")
      .attr("class", "sunburst-tooltip")
      .style("position", "absolute")
      .style("background", "rgba(0, 0, 0, 0.8)")
      .style("color", "white")
      .style("padding", "8px")
      .style("border-radius", "4px")
      .style("font-size", "12px")
      .style("pointer-events", "none")
      .style("z-index", "1000");

    const content = `
      <div><strong>${d.data.name}</strong></div>
      ${d.data.type === "pathway" ? `
        <div>NES: ${d.data.nes?.toFixed(3) || "N/A"}</div>
        <div>P-value: ${d.data.pValue?.toExponential(2) || "N/A"}</div>
        <div>FDR: ${d.data.fdr?.toExponential(2) || "N/A"}</div>
        <div>Genes: ${d.data.geneCount || 0}</div>
      ` : ""}
    `;

    tooltip.html(content);

    tooltip
      .style("left", (event.pageX + 10) + "px")
      .style("top", (event.pageY - 10) + "px");
  };

  const hideTooltip = () => {
    d3.selectAll(".sunburst-tooltip").remove();
  };

  // Render on mount and when data changes
  useEffect(() => {
    renderSunburst();
  }, [hierarchyData]);

  // Handle resize
  useEffect(() => {
    const handleResize = () => {
      renderSunburst();
    };

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [hierarchyData]);

  if (pathways.length === 0) {
    return null;
  }

  return (
    <Box sx={{ flex: 1, position: "relative", minHeight: "600px" }}>
      <div 
        ref={containerRef} 
        style={{ width: "100%", height: "100%" }}
      >
        <svg ref={svgRef} />
      </div>
    </Box>
  );
};

export default D3SunburstChart;
