import React, { useState } from "react";
import {
	Typography,
	Box,
	CircularProgress,
	Alert,
	ToggleButtonGroup,
	ToggleButton,
} from "@mui/material";
import type { Pathway } from "../lib/api";
import PathwaysTable from "./PathwaysTable";
import PathwaysHierarchy from "./PathwaysHierarchy";
import PathwaysHierarchyTreeMap from "./PathwaysHierarchyTreeMap";
import PathwaysGeneNetwork from "./PathwaysGeneNetwork";
import PathwayFlowVisualization from "./PathwayFlowVisualization";
import PathwaysFlameGraph from "./PathwaysFlameGraph";

interface PathwaysResultsProps {
	pathways: Pathway[] | null;
	loading: boolean;
	error: string | null;
}

const PathwaysResults: React.FC<PathwaysResultsProps> = ({
	pathways,
	loading,
	error,
}) => {
	const displayPathways = pathways || [];
	const [viewMode, setViewMode] = useState<
		"table" | "hierarchy" | "treemap" | "genenetwork" | "flow" | "flamegraph"
	>("table");

	if (loading) {
		return (
			<Box
				display="flex"
				justifyContent="center"
				alignItems="center"
				minHeight="400px"
			>
				<CircularProgress />
			</Box>
		);
	}

	if (error) {
		return (
			<Alert severity="error" sx={{ mb: 3 }}>
				{error}
			</Alert>
		);
	}

	if (displayPathways.length === 0) {
		return (
			<Box textAlign="center" py={8}>
				<Typography color="text.secondary">
					No pathways found for the selected parameters.
				</Typography>
			</Box>
		);
	}

	return (
		<>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mb: 3,
				}}
			>
				<Typography variant="h6">
					Results ({displayPathways.length} pathways)
				</Typography>

				<ToggleButtonGroup
					value={viewMode}
					exclusive
					onChange={(_, newMode) => newMode && setViewMode(newMode)}
					size="small"
				>
					<ToggleButton value="table">Table</ToggleButton>
					<ToggleButton value="hierarchy">Tree View</ToggleButton>
					<ToggleButton value="flamegraph">Flame Graph</ToggleButton>
					<ToggleButton value="treemap">TreeMap</ToggleButton>
					<ToggleButton value="genenetwork">Gene Network</ToggleButton>
					<ToggleButton value="flow">Flow Visualization</ToggleButton>
				</ToggleButtonGroup>
			</Box>

			{viewMode === "table" && <PathwaysTable pathways={displayPathways} />}

			{viewMode === "hierarchy" && (
				<PathwaysHierarchy pathways={displayPathways} />
			)}

			{viewMode === "treemap" && (
				<PathwaysHierarchyTreeMap pathways={displayPathways} />
			)}

			{viewMode === "genenetwork" && (
				<PathwaysGeneNetwork pathways={displayPathways} />
			)}

			{viewMode === "flow" && (
				<Box
					sx={{ height: "auto", border: "1px solid #e0e0e0", borderRadius: 1 }}
				>
					<PathwayFlowVisualization
						data={displayPathways.map((pathway) => ({
							ID: pathway.ID || pathway.id || "",
							Pathway: pathway.Pathway || pathway.pathway || "",
							ES: pathway.ES || pathway.es || 0,
							NES: pathway.NES || pathway.nes || 0,
							FDR: pathway.FDR || pathway.fdr || 1,
							"p-value":
								pathway["p-value"] || pathway.p_value || pathway.pvalue || 1,
							"Number of input genes":
								pathway["Number of input genes"] ||
								pathway.number_of_input_genes ||
								0,
							"Leading edge genes":
								pathway["Leading edge genes"] ||
								pathway.leading_edge_genes ||
								"",
							"Pathway size":
								pathway["Pathway size"] || pathway.pathway_size || 0,
							"Parent pathway":
								pathway["Parent pathway"] || pathway.parent_pathway || "",
						}))}
					/>
				</Box>
			)}

			{viewMode === "flamegraph" && (
				<PathwaysFlameGraph pathways={displayPathways} />
			)}
		</>
	);
};

export default PathwaysResults;
