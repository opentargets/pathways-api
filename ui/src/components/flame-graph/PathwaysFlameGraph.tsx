import React, { useState, useCallback, useMemo } from "react";
import { Box, Tabs, Tab, Typography, Button } from "@mui/material";
import {
	DonutLarge as SunburstIcon,
	ShowChart as BarChartIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";
import FlameGraphHeader from "./FlameGraphHeader";
import SunburstChart from "./SunburstChart";
import HorizontalFlameChart from "./HorizontalFlameChart";
import FlameGraphSettings from "./FlameGraphSettings";
import PathwayFilter, { type PathwayFilters } from "./PathwayFilter";

interface PathwaysFlameGraphProps {
	pathways: Pathway[];
}

const PathwaysFlameGraph: React.FC<PathwaysFlameGraphProps> = ({
	pathways,
}) => {
	const [settingsOpen, setSettingsOpen] = useState(false);
	const [activeTab, setActiveTab] = useState(0);

	// Get NES range for initial filter values
	const nesRange = useMemo(() => {
		const nesValues = pathways.map((p) => p["NES"] || p["nes"] || 0);
		return [Math.min(...nesValues), Math.max(...nesValues)] as [number, number];
	}, [pathways]);

	const [filters, setFilters] = useState<PathwayFilters>({
		searchText: "",
		selectedCategories: [],
		nesRange,
		pValueThreshold: 1.0,
		fdrThreshold: 1.0,
		showSignificantOnly: false,
	});

	const [settings, setSettings] = useState({
		maxPathways: pathways.length,
		showPValues: true,
		showFDR: true,
		showGenes: false,
		colorBy: "nes" as "pvalue" | "fdr" | "genes" | "nes",
		orientation: "h" as "h" | "v",
		branchvalues: "total" as "total" | "remainder",
		chartType: "sunburst" as "sunburst" | "horizontal",
	});

	// Filter pathways based on current filters
	const filteredPathways = useMemo(() => {
		const filtered = pathways.filter((pathway) => {
			// Search text filter
			if (filters.searchText) {
				const pathwayName = pathway["Pathway"] || pathway["pathway"] || "";
				const pathwayId = pathway["ID"] || pathway["id"] || "";
				const searchLower = filters.searchText.toLowerCase();
				if (
					!pathwayName.toLowerCase().includes(searchLower) &&
					!pathwayId.toLowerCase().includes(searchLower)
				) {
					return false;
				}
			}

			// Category filter
			if (filters.selectedCategories.length > 0) {
				const pathwayName = pathway["Pathway"] || pathway["pathway"] || "";
				const matchesCategory = filters.selectedCategories.some((category) =>
					pathwayName.includes(category),
				);
				if (!matchesCategory) {
					return false;
				}
			}

			// NES range filter
			const nes = pathway["NES"] || pathway["nes"] || 0;
			if (nes < filters.nesRange[0] || nes > filters.nesRange[1]) {
				return false;
			}

			// P-value threshold filter
			const pValue =
				pathway["p-value"] || pathway["p_value"] || pathway["pvalue"] || 1;
			if (pValue > filters.pValueThreshold) {
				return false;
			}

			// FDR threshold filter
			const fdr = pathway["FDR"] || pathway["fdr"] || 1;
			if (fdr > filters.fdrThreshold) {
				return false;
			}

			// Show significant only filter
			if (filters.showSignificantOnly && pValue >= 0.05) {
				return false;
			}

			return true;
		});

		// Debug logging
		console.log("Filtering pathways:", {
			total: pathways.length,
			filtered: filtered.length,
			filters,
		});

		return filtered;
	}, [pathways, filters]);

	// Handle settings change
	const handleSettingsChange = useCallback((key: string, value: unknown) => {
		setSettings((prev) => ({ ...prev, [key]: value }));
	}, []);

	// Note: Pathway details are now shown via tooltips on hover

	// Zoom controls
	const handleZoomIn = useCallback(() => {
		// This would need to be implemented with refs to the chart components
	}, []);

	const handleZoomOut = useCallback(() => {
		// This would need to be implemented with refs to the chart components
	}, []);

	const handleReset = useCallback(() => {
		// This would need to be implemented with refs to the chart components
	}, []);

	if (pathways.length === 0) {
		return (
			<Box textAlign="center" py={4}>
				<Typography color="text.secondary">
					No pathways to display in flame graph.
				</Typography>
			</Box>
		);
	}

	return (
		<Box>
			{/* Header */}
			<FlameGraphHeader
				pathways={filteredPathways}
				maxPathways={settings.maxPathways}
				colorBy={settings.colorBy}
				onSettingsClick={() => setSettingsOpen(true)}
				onZoomIn={handleZoomIn}
				onZoomOut={handleZoomOut}
				onReset={handleReset}
			/>
			<Box
				sx={{
					width: "100%",
					display: "flex",
					flexDirection: "row",
					// minHeight: "600px",
					// gap: 2,
					backgroundColor: "background.paper",
				}}
			>
				{/* Left Sidebar - Filters */}
				<Box
					sx={{
						width: "300px",
						minWidth: "300px",
						display: "flex",
						flexDirection: "column",
						gap: 2,
						p: 2,
						// borderRight: 1,
						borderColor: "divider",
						backgroundColor: "background.paper",
					}}
				>
					{/* Filter Header */}
					<Box
						sx={{
							display: "flex",
							justifyContent: "space-between",
							alignItems: "center",
						}}
					>
						<Typography variant="h6">Filters</Typography>
						<Typography variant="body2" color="text.secondary">
							{filteredPathways.length} of {pathways.length}
						</Typography>
					</Box>

					{/* Filters Panel */}
					<PathwayFilter
						pathways={pathways}
						filters={filters}
						onFiltersChange={setFilters}
					/>

					{/* Settings Button */}
					<Box sx={{ mt: "auto" }}>
						<Button
							variant="outlined"
							fullWidth
							onClick={() => setSettingsOpen(true)}
							size="small"
						>
							Chart Settings
						</Button>
					</Box>
				</Box>

				{/* Main Content - Charts */}
				<Box
					sx={{
						flex: 1,
						display: "flex",
						flexDirection: "column",
						minHeight: "600px",
					}}
				>
					{/* Chart Type Tabs */}
					<Box sx={{ mb: 2, mx: 2, backgroundColor: "background.paper" }}>
						<Tabs
							value={activeTab}
							onChange={(_, newValue) => setActiveTab(newValue)}
							sx={{
								backgroundColor: "background.paper",
								border: "none",
								boxShadow: "none",
							}}
						>
							<Tab
								icon={<SunburstIcon />}
								label="Sunburst"
								iconPosition="start"
							/>
							<Tab
								icon={<BarChartIcon />}
								label="Horizontal Flame"
								iconPosition="start"
							/>
						</Tabs>
					</Box>

					{/* Charts Container */}
					<Box
						sx={{
							flex: 1,
							display: "flex",
							flexDirection: "column",
							gap: 2,
							px: 2,
							minHeight: "500px",
						}}
					>
						{/* Sunburst Chart */}
						{activeTab === 0 && (
							<Box sx={{ flex: 1, minHeight: "500px" }}>
								<SunburstChart
									pathways={filteredPathways}
									maxPathways={settings.maxPathways}
									orientation={settings.orientation}
									branchvalues={settings.branchvalues}
								/>
							</Box>
						)}

						{/* Horizontal Flame Graph Chart */}
						{activeTab === 1 && (
							<Box sx={{ flex: 1, minHeight: "500px" }}>
								<HorizontalFlameChart
									pathways={filteredPathways}
									maxPathways={settings.maxPathways}
								/>
							</Box>
						)}
					</Box>
				</Box>

				{/* Settings Dialog */}
				<FlameGraphSettings
					open={settingsOpen}
					onClose={() => setSettingsOpen(false)}
					settings={settings}
					onSettingsChange={handleSettingsChange}
				/>

			</Box>
		</Box>
	);
};

export default PathwaysFlameGraph;
