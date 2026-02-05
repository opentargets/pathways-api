import React, { useState, useMemo } from "react";
import {
	Table,
	TableBody,
	TableCell,
	TableContainer,
	TableHead,
	TableRow,
	Paper,
	Typography,
	Box,
	IconButton,
	Tooltip,
	Link,
	Button,
} from "@mui/material";
import {
	ArrowUpward as SortAscIcon,
	ArrowDownward as SortDescIcon,
	UnfoldMore as SortIcon,
	Download as DownloadIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

interface PathwaysTableProps {
	pathways: Pathway[];
}

type SortDirection = "asc" | "desc" | null;

const PathwaysTable: React.FC<PathwaysTableProps> = ({ pathways }) => {
	const [sortConfig, setSortConfig] = useState<{
		key: string | null;
		direction: SortDirection;
	}>({ key: null, direction: null });

	// Get all unique keys from all pathways, excluding link columns
	const allKeys = useMemo(() => {
		const allKeysFromPathways = Array.from(
			new Set(pathways.flatMap((pathway) => Object.keys(pathway))),
		).filter((key) => !key.toLowerCase().includes("link"));

		// Define the desired column order
		const columnOrder = [
			"ID",
			"Pathway",
			"Pathway size",
			"Parent Pathway",
			"NES",
			"ES",
			"FDR",
			"p-value",
			"Sidak's p-value",
			"Input gene number",
			"All pathway genes",
			"Leading edge genes"
			
		];

		// Sort columns: first by the defined order, then alphabetically for any remaining columns
		return allKeysFromPathways.sort((a, b) => {
			const aIndex = columnOrder.findIndex(
				(col) => col.toLowerCase() === a.toLowerCase()
			  );
			  const bIndex = columnOrder.findIndex(
				(col) => col.toLowerCase() === b.toLowerCase()
			  );

			// If both are in the defined order, sort by their position
			if (aIndex !== -1 && bIndex !== -1) {
				return aIndex - bIndex;
			}

			// If only one is in the defined order, prioritize it
			if (aIndex !== -1) return -1;
			if (bIndex !== -1) return 1;

			// If neither is in the defined order, sort alphabetically
			return a.localeCompare(b);
		});
	}, [pathways]);

	const handleSort = (key: string) => {
		let direction: SortDirection = "asc";
		if (sortConfig.key === key && sortConfig.direction === "asc") {
			direction = "desc";
		} else if (sortConfig.key === key && sortConfig.direction === "desc") {
			direction = null;
		}
		setSortConfig({ key: direction ? key : null, direction });
	};

	const sortedPathways = useMemo(() => {
		if (!sortConfig.key || !sortConfig.direction) {
			return pathways;
		}

		return [...pathways].sort((a, b) => {
			const aValue = a[sortConfig.key!];
			const bValue = b[sortConfig.key!];

			// Handle undefined/null values
			if (aValue === undefined || aValue === null) return 1;
			if (bValue === undefined || bValue === null) return -1;

			// Handle numbers properly
			const aNum = Number(aValue);
			const bNum = Number(bValue);
			const bothNumbers = !isNaN(aNum) && !isNaN(bNum);

			if (bothNumbers) {
			return sortConfig.direction === "asc"
				? aNum - bNum
				: bNum - aNum;
			}

			// Fallback: string comparison
			const aStr = String(aValue);
			const bStr = String(bValue);

			return sortConfig.direction === "asc"
			? aStr.localeCompare(bStr)
			: bStr.localeCompare(aStr);

		});
	}, [pathways, sortConfig]);

	const getSortIcon = (key: string) => {
		if (sortConfig.key !== key) {
			return <SortIcon />;
		}
		return sortConfig.direction === "asc" ? <SortAscIcon /> : <SortDescIcon />;
	};

	const downloadCSV = () => {
		// Create CSV content
		const headers = allKeys.join(",");
		const rows = sortedPathways.map((pathway) =>
			allKeys
				.map((key) => {
					const value = pathway[key];
					if (value === undefined || value === null) return "";
					// Escape quotes and wrap in quotes if contains comma or quote
					const strValue = String(value);
					if (strValue.includes(",") || strValue.includes('"') || strValue.includes("\n")) {
						return `"${strValue.replace(/"/g, '""')}"`;
					}
					return strValue;
				})
				.join(",")
		);
		const csvContent = [headers, ...rows].join("\n");

		// Create and trigger download
		const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
		const url = URL.createObjectURL(blob);
		const link = document.createElement("a");
		link.setAttribute("href", url);
		link.setAttribute("download", `gsea_results_${new Date().toISOString().split("T")[0]}.csv`);
		document.body.appendChild(link);
		link.click();
		document.body.removeChild(link);
		URL.revokeObjectURL(url);
	};

	const formatValue = (value: unknown, key: string, pathway: Pathway) => {
		if (value === undefined || value === null) return "-";
	
		// Columns that should have 0 decimal places
		if (typeof value === "number") {
			if (key === "Pathway size" || key === "Input gene number") return value.toFixed(0);
			return value.toFixed(2);
		}
	
		// Handle ID column as external link
		if (key.toLowerCase().includes("id") && typeof value === "string") {
			const linkUrl = (pathway as any).Link || (pathway as any).link;
			if (linkUrl) {
				return (
					<Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
						<Link
							href={linkUrl}
							target="_blank"
							rel="noopener noreferrer"
							sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
						>
							{value}
						</Link>
					</Box>
				);
			}
		}
	
		return String(value);
	};
	

	if (pathways.length === 0) {
		return (
			<Box textAlign="center" py={4}>
				<Typography color="text.secondary">No pathways to display.</Typography>
			</Box>
		);
	}

	return (
		<Box>
			<Box sx={{ display: "flex", justifyContent: "flex-end", mb: 1 }}>
				<Button
					variant="outlined"
					size="small"
					startIcon={<DownloadIcon />}
					onClick={downloadCSV}
				>
					Download CSV
				</Button>
			</Box>
			<TableContainer component={Paper} sx={{ maxHeight: 900 }}>
			<Table stickyHeader>
				<TableHead>
					<TableRow>
						{allKeys.map((key) => (
							<TableCell
								key={key}
								sx={{
									fontWeight: "bold",
									maxWidth: (key === "All pathway genes" || key === "Leading edge genes") ? "300px" : "auto",
									width: (key === "All pathway genes" || key === "Leading edge genes") ? "300px" : "auto",
									cursor: "pointer",
									"&:hover": {
										backgroundColor: "rgba(0, 0, 0, 0.04)",
									},
								}}
								onClick={() => handleSort(key)}
							>
								<Box
									sx={{
										display: "flex",
										alignItems: "center",
										justifyContent: "space-between",
									}}
								>
									<span>{key}</span>
									<Tooltip title={`Sort by ${key}`}>
										<IconButton size="small" sx={{ ml: 1 }}>
											{getSortIcon(key)}
										</IconButton>
									</Tooltip>
								</Box>
							</TableCell>
						))}
					</TableRow>
				</TableHead>
				<TableBody>
					{sortedPathways.map((pathway, index) => (
						<TableRow key={`pathway-${index}-${JSON.stringify(pathway)}`} hover>
							{allKeys.map((key) => (
								<TableCell
									key={key}
									sx={{
										maxWidth: (key === "All pathway genes" || key === "Leading edge genes") ? "300px" : "auto",
										width: (key === "All pathway genes" || key === "Leading edge genes") ? "300px" : "auto",
										wordWrap:
											(key === "All pathway genes" || key === "Leading edge genes") ? "break-word" : "normal",
										overflow:
											(key === "All pathway genes" || key === "Leading edge genes") ? "hidden" : "visible",
										textOverflow:
											(key === "All pathway genes" || key === "Leading edge genes") ? "ellipsis" : "clip",
									}}
								>
									{formatValue(pathway[key], key, pathway)}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</TableContainer>
		</Box>
	);
};

export default PathwaysTable;
