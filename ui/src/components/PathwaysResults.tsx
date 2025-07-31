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
import {
	PathwaysTable,
	PathwaysHierarchy,
	PathwaysHierarchyTreeMap,
} from "./pathways";
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
		"table" | "hierarchy" | "treemap" | "flamegraph"
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
				</ToggleButtonGroup>
			</Box>

			{viewMode === "table" && <PathwaysTable pathways={displayPathways} />}

			{viewMode === "hierarchy" && (
				<PathwaysHierarchy pathways={displayPathways} />
			)}

			{viewMode === "treemap" && (
				<PathwaysHierarchyTreeMap pathways={displayPathways} />
			)}

			{viewMode === "flamegraph" && (
				<PathwaysFlameGraph pathways={displayPathways} />
			)}
		</>
	);
};

export default PathwaysResults;
