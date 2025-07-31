import React from "react";
import {
	Dialog,
	DialogTitle,
	DialogContent,
	DialogActions,
	Button,
	Box,
	Typography,
	Chip,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

interface PathwayDetailsDialogProps {
	open: boolean;
	onClose: () => void;
	selectedPathway: Pathway | null;
	showGenes: boolean;
}

const PathwayDetailsDialog: React.FC<PathwayDetailsDialogProps> = ({
	open,
	onClose,
	selectedPathway,
	showGenes,
}) => {
	if (!selectedPathway) return null;

	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<InfoIcon />
					Pathway Details
				</Box>
			</DialogTitle>
			<DialogContent>
				<Box sx={{ mt: 2 }}>
					<Typography variant="h6" gutterBottom>
						{selectedPathway["Pathway"] ||
							selectedPathway["pathway"] ||
							"Unknown Pathway"}
					</Typography>

					<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
						<Chip
							label={`P-value: ${(
								selectedPathway["p-value"] ||
									selectedPathway["p_value"] ||
									selectedPathway["pvalue"] ||
									1
							).toExponential(2)}`}
							color={
								(selectedPathway["p-value"] ||
									selectedPathway["p_value"] ||
									selectedPathway["pvalue"] ||
									1) < 0.05
									? "success"
									: "default"
							}
						/>
						<Chip
							label={`FDR: ${(
								selectedPathway["FDR"] || selectedPathway["fdr"] || 1
							).toExponential(2)}`}
							color={
								(selectedPathway["FDR"] || selectedPathway["fdr"] || 1) < 0.05
									? "success"
									: "default"
							}
						/>
						<Chip
							label={`NES: ${(
								selectedPathway["NES"] || selectedPathway["nes"] || 0
							).toFixed(3)}`}
							color="primary"
						/>
						<Chip
							label={`${
								Array.isArray(
									selectedPathway["Leading edge genes"] ||
										selectedPathway["genes"],
								)
									? (
											selectedPathway["Leading edge genes"] ||
												selectedPathway["genes"]
										).length
									: typeof (
												selectedPathway["Leading edge genes"] ||
												selectedPathway["genes"]
											) === "string"
										? (
												selectedPathway["Leading edge genes"] ||
												selectedPathway["genes"]
											).split(",").length
										: 0
							} genes`}
							color="secondary"
						/>
					</Box>

					{showGenes &&
						(selectedPathway["Leading edge genes"] ||
							selectedPathway["genes"]) && (
							<Box>
								<Typography variant="subtitle1" gutterBottom>
									Leading Edge Genes:
								</Typography>
								<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
									{(Array.isArray(
										selectedPathway["Leading edge genes"] ||
											selectedPathway["genes"],
									)
										? selectedPathway["Leading edge genes"] ||
											selectedPathway["genes"]
										: typeof (
													selectedPathway["Leading edge genes"] ||
													selectedPathway["genes"]
												) === "string"
											? (
													selectedPathway["Leading edge genes"] ||
													selectedPathway["genes"]
												)
													.split(",")
													.map((g: string) => g.trim())
											: []
									)
										.slice(0, 20)
										.map((gene: string) => (
											<Chip
												key={gene}
												label={gene}
												size="small"
												variant="outlined"
											/>
										))}
									{(Array.isArray(
										selectedPathway["Leading edge genes"] ||
											selectedPathway["genes"],
									)
										? (
												selectedPathway["Leading edge genes"] ||
												selectedPathway["genes"]
											).length
										: typeof (
													selectedPathway["Leading edge genes"] ||
													selectedPathway["genes"]
												) === "string"
											? (
													selectedPathway["Leading edge genes"] ||
													selectedPathway["genes"]
												).split(",").length
											: 0) > 20 && (
										<Chip
											label={`+${
												(Array.isArray(
													selectedPathway["Leading edge genes"] ||
														selectedPathway["genes"],
												)
													? (
															selectedPathway["Leading edge genes"] ||
															selectedPathway["genes"]
														).length
													: typeof (
																selectedPathway["Leading edge genes"] ||
																selectedPathway["genes"]
															) === "string"
														? (
																selectedPathway["Leading edge genes"] ||
																selectedPathway["genes"]
															).split(",").length
														: 0) - 20
											} more`}
											size="small"
										/>
									)}
								</Box>
							</Box>
						)}

					<Box sx={{ mt: 2 }}>
						<Typography variant="subtitle2" gutterBottom>
							All Pathway Data:
						</Typography>
						<Box sx={{ maxHeight: "200px", overflow: "auto" }}>
							{Object.entries(selectedPathway).map(([key, value]) => (
								<Box
									key={key}
									sx={{
										display: "flex",
										justifyContent: "space-between",
										py: 0.5,
									}}
								>
									<Typography variant="body2" sx={{ fontWeight: "bold" }}>
										{key}:
									</Typography>
									<Typography variant="body2" sx={{ ml: 2, maxWidth: "60%" }}>
										{String(value)}
									</Typography>
								</Box>
							))}
						</Box>
					</Box>
				</Box>
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
};

export default PathwayDetailsDialog;
