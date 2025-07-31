import React, { useState, useMemo } from "react";
import {
	Box,
	TextField,
	Autocomplete,
	Chip,
	Typography,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Slider,
	FormControlLabel,
	Switch,
	Collapse,
	Button,
} from "@mui/material";
import {
	ExpandMore as ExpandMoreIcon,
	ExpandLess as ExpandLessIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

export interface PathwayFilters {
	searchText: string;
	selectedCategories: string[];
	nesRange: [number, number];
	pValueThreshold: number;
	fdrThreshold: number;
	showSignificantOnly: boolean;
}

interface PathwayFilterProps {
	pathways: Pathway[];
	filters: PathwayFilters;
	onFiltersChange: (filters: PathwayFilters) => void;
}

const PathwayFilter: React.FC<PathwayFilterProps> = ({
	pathways,
	filters,
	onFiltersChange,
}) => {
	const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
	// Extract unique pathway categories from pathway names
	const pathwayCategories = useMemo(() => {
		const categories = new Set<string>();

		pathways.forEach((pathway) => {
			const pathwayName = pathway["Pathway"] || pathway["pathway"] || "";
			if (pathwayName) {
				// Extract category from pathway name (e.g., "Signaling by FGFR" -> "Signaling")
				const parts = pathwayName.split(" ");
				if (parts.length > 2) {
					// Take first two words as category
					const category = parts.slice(0, 2).join(" ");
					categories.add(category);
				} else if (parts.length === 2) {
					// Take first word as category
					categories.add(parts[0]);
				} else {
					// Use the full name as category
					categories.add(pathwayName);
				}
			}
		});

		return Array.from(categories).sort();
	}, [pathways]);

	// Get NES range for slider
	const nesRange = useMemo(() => {
		const nesValues = pathways.map((p) => p["NES"] || p["nes"] || 0);
		return [Math.min(...nesValues), Math.max(...nesValues)];
	}, [pathways]);

	const handleSearchTextChange = (value: string) => {
		onFiltersChange({ ...filters, searchText: value });
	};

	const handleCategoriesChange = (value: string[]) => {
		onFiltersChange({ ...filters, selectedCategories: value });
	};

	const handleNESRangeChange = (value: [number, number]) => {
		onFiltersChange({ ...filters, nesRange: value });
	};

	const handlePValueThresholdChange = (value: number) => {
		onFiltersChange({ ...filters, pValueThreshold: value });
	};

	const handleFDRThresholdChange = (value: number) => {
		onFiltersChange({ ...filters, fdrThreshold: value });
	};

	const handleSignificantOnlyChange = (checked: boolean) => {
		onFiltersChange({ ...filters, showSignificantOnly: checked });
	};

	return (
		<Box sx={{ p: 2 }}>
			<Typography variant="h6" gutterBottom>
				Pathway Filters
			</Typography>

			<Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
				{/* Search Text */}
				<TextField
					fullWidth
					label="Search Pathways"
					value={filters.searchText}
					onChange={(e) => handleSearchTextChange(e.target.value)}
					placeholder="Search by pathway name or ID..."
					size="small"
				/>

				{/* Category Autocomplete */}
				<Autocomplete
					multiple
					options={pathwayCategories}
					value={filters.selectedCategories}
					onChange={(_, newValue) => handleCategoriesChange(newValue)}
					renderInput={(params) => (
						<TextField
							{...params}
							label="Pathway Categories"
							placeholder="Select categories..."
							size="small"
						/>
					)}
					renderTags={(value, getTagProps) =>
						value.map((option, index) => (
							<Chip
								{...getTagProps({ index })}
								key={option}
								label={option}
								size="small"
							/>
						))
					}
					renderOption={(props, option) => (
						<li {...props}>
							<Box>
								<Typography variant="body2">{option}</Typography>
								<Typography variant="caption" color="text.secondary">
									{
										pathways.filter((p) => {
											const pathwayName = p["Pathway"] || p["pathway"] || "";
											return pathwayName.includes(option);
										}).length
									}{" "}
									pathways
								</Typography>
							</Box>
						</li>
					)}
				/>

				{/* Advanced Filters Toggle Button */}
				<Button
					variant="text"
					onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
					endIcon={
						showAdvancedFilters ? <ExpandLessIcon /> : <ExpandMoreIcon />
					}
					size="small"
					sx={{ alignSelf: "flex-start", mt: 1 }}
				>
					Advanced Filters
				</Button>

				{/* Advanced Filters - Collapsible */}
				<Collapse in={showAdvancedFilters}>
					<Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 2 }}>
						{/* NES Range Slider */}
						<Box>
							<Typography gutterBottom>NES Range</Typography>
							<Slider
								value={filters.nesRange}
								onChange={(_, value) =>
									handleNESRangeChange(value as [number, number])
								}
								valueLabelDisplay="auto"
								min={nesRange[0]}
								max={nesRange[1]}
								step={0.1}
							/>
							<Box sx={{ display: "flex", justifyContent: "space-between" }}>
								<Typography variant="caption">
									{filters.nesRange[0].toFixed(1)}
								</Typography>
								<Typography variant="caption">
									{filters.nesRange[1].toFixed(1)}
								</Typography>
							</Box>
						</Box>

						{/* P-value Threshold */}
						<FormControl fullWidth size="small">
							<InputLabel>P-value Threshold</InputLabel>
							<Select
								value={filters.pValueThreshold}
								onChange={(e) =>
									handlePValueThresholdChange(e.target.value as number)
								}
								label="P-value Threshold"
							>
								<MenuItem value={0.001}>0.001</MenuItem>
								<MenuItem value={0.01}>0.01</MenuItem>
								<MenuItem value={0.05}>0.05</MenuItem>
								<MenuItem value={0.1}>0.1</MenuItem>
								<MenuItem value={1.0}>No filter</MenuItem>
							</Select>
						</FormControl>

						{/* FDR Threshold */}
						<FormControl fullWidth size="small">
							<InputLabel>FDR Threshold</InputLabel>
							<Select
								value={filters.fdrThreshold}
								onChange={(e) =>
									handleFDRThresholdChange(e.target.value as number)
								}
								label="FDR Threshold"
							>
								<MenuItem value={0.001}>0.001</MenuItem>
								<MenuItem value={0.01}>0.01</MenuItem>
								<MenuItem value={0.05}>0.05</MenuItem>
								<MenuItem value={0.1}>0.1</MenuItem>
								<MenuItem value={1.0}>No filter</MenuItem>
							</Select>
						</FormControl>

						{/* Show Significant Only */}
						<FormControlLabel
							control={
								<Switch
									checked={filters.showSignificantOnly}
									onChange={(e) =>
										handleSignificantOnlyChange(e.target.checked)
									}
								/>
							}
							label="Show significant pathways only (p < 0.05)"
						/>
					</Box>
				</Collapse>
			</Box>
		</Box>
	);
};

export default PathwayFilter;
