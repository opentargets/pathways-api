import React from "react";
import {
	Paper,
	Box,
	Typography,
	Chip,
	IconButton,
	Tooltip,
	Alert,
} from "@mui/material";
import {
	Settings as SettingsIcon,
	ZoomIn as ZoomInIcon,
	ZoomOut as ZoomOutIcon,
	Home as HomeIcon,
} from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

interface FlameGraphHeaderProps {
	pathways: Pathway[];
	maxPathways: number;
	colorBy: string;
	onSettingsClick: () => void;
	onZoomIn: () => void;
	onZoomOut: () => void;
	onReset: () => void;
}

const FlameGraphHeader: React.FC<FlameGraphHeaderProps> = ({
	pathways,
	maxPathways,
	colorBy,
	onSettingsClick,
	onZoomIn,
	onZoomOut,
	onReset,
}) => {
	return (
		<Paper sx={{ p: 2, mb: 2 }}>
			<Box
				sx={{
					display: "flex",
					justifyContent: "space-between",
					alignItems: "center",
					mb: 2,
				}}
			>
				<Typography variant="h6" component="h2">
					Pathways Hierarchy (Flame Graph)
				</Typography>
				<Box sx={{ display: "flex", gap: 1 }}>
					<Tooltip title="Zoom In">
						<IconButton onClick={onZoomIn} size="small">
							<ZoomInIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Zoom Out">
						<IconButton onClick={onZoomOut} size="small">
							<ZoomOutIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Reset View">
						<IconButton onClick={onReset} size="small">
							<HomeIcon />
						</IconButton>
					</Tooltip>
					<Tooltip title="Settings">
						<IconButton onClick={onSettingsClick}>
							<SettingsIcon />
						</IconButton>
					</Tooltip>
				</Box>
			</Box>

			<Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
				<Chip
					label={`${pathways.length} total pathways`}
					color="primary"
					size="small"
				/>
				<Chip
					label={`${maxPathways} displayed`}
					color="secondary"
					size="small"
				/>
				<Chip label={`Color by: ${colorBy}`} variant="outlined" size="small" />
				<Chip label="Flame Graph Chart" variant="outlined" size="small" />
			</Box>

			<Alert severity="info" sx={{ mt: 2 }}>
				<Typography variant="body2">
					Click on pathway segments to view details. Wider segments indicate
					more significant pathways. Hierarchy is based on parent pathway
					relationships. Colors represent NES values using prioritization scale.
				</Typography>
			</Alert>
		</Paper>
	);
};

export default FlameGraphHeader;
