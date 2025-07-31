import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Slider,
	FormControlLabel,
	Switch,
	Box,
	Typography,
} from "@mui/material";

interface FlameGraphSettings {
	maxPathways: number;
	showPValues: boolean;
	showFDR: boolean;
	showGenes: boolean;
	colorBy: "pvalue" | "fdr" | "genes" | "nes";
	orientation: "h" | "v";
	branchvalues: "total" | "remainder";
	chartType: "sunburst" | "horizontal";
}

interface FlameGraphSettingsProps {
	open: boolean;
	onClose: () => void;
	settings: FlameGraphSettings;
	onSettingsChange: (key: string, value: any) => void;
}

const FlameGraphSettings: React.FC<FlameGraphSettingsProps> = ({
	open,
	onClose,
	settings,
	onSettingsChange,
}) => {
	return (
		<Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
			<DialogTitle>Flame Graph Settings</DialogTitle>
			<DialogContent>
				<Box sx={{ display: "flex", flexDirection: "column", gap: 2, mt: 1 }}>
					<FormControl fullWidth>
						<InputLabel>Chart Type</InputLabel>
						<Select
							value={settings.chartType}
							onChange={(e) => onSettingsChange("chartType", e.target.value)}
							label="Chart Type"
						>
							<MenuItem value="sunburst">Sunburst Only</MenuItem>
							<MenuItem value="horizontal">Horizontal Flame Only</MenuItem>
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<InputLabel>Color By</InputLabel>
						<Select
							value={settings.colorBy}
							onChange={(e) => onSettingsChange("colorBy", e.target.value)}
							label="Color By"
						>
							<MenuItem value="nes">NES</MenuItem>
							<MenuItem value="pvalue">P-Value</MenuItem>
							<MenuItem value="fdr">FDR</MenuItem>
							<MenuItem value="genes">Gene Count</MenuItem>
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<InputLabel>Orientation</InputLabel>
						<Select
							value={settings.orientation}
							onChange={(e) => onSettingsChange("orientation", e.target.value)}
							label="Orientation"
						>
							<MenuItem value="h">Horizontal</MenuItem>
							<MenuItem value="v">Vertical</MenuItem>
						</Select>
					</FormControl>

					<FormControl fullWidth>
						<InputLabel>Branch Values</InputLabel>
						<Select
							value={settings.branchvalues}
							onChange={(e) => onSettingsChange("branchvalues", e.target.value)}
							label="Branch Values"
						>
							<MenuItem value="total">Total</MenuItem>
							<MenuItem value="remainder">Remainder</MenuItem>
						</Select>
					</FormControl>

					<Box>
						<Typography gutterBottom>
							Max Pathways: {settings.maxPathways}
						</Typography>
						<Slider
							value={settings.maxPathways}
							onChange={(_, value) => onSettingsChange("maxPathways", value)}
							min={10}
							max={300}
							step={5}
							marks
							valueLabelDisplay="auto"
						/>
					</Box>

					<FormControlLabel
						control={
							<Switch
								checked={settings.showPValues}
								onChange={(e) =>
									onSettingsChange("showPValues", e.target.checked)
								}
							/>
						}
						label="Show P-Values"
					/>

					<FormControlLabel
						control={
							<Switch
								checked={settings.showFDR}
								onChange={(e) => onSettingsChange("showFDR", e.target.checked)}
							/>
						}
						label="Show FDR"
					/>

					<FormControlLabel
						control={
							<Switch
								checked={settings.showGenes}
								onChange={(e) =>
									onSettingsChange("showGenes", e.target.checked)
								}
							/>
						}
						label="Show Gene Lists"
					/>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
};

export default FlameGraphSettings;
