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
	List,
	ListItem,
	ListItemText,
	ListItemIcon,
} from "@mui/material";
import { Info as InfoIcon, Science as ScienceIcon } from "@mui/icons-material";
import type { GeneNode, NetworkSettings } from "./types";
import type { Pathway } from "../../lib/api";

interface NodeDetailsDialogProps {
	open: boolean;
	onClose: () => void;
	selectedNode: GeneNode | null;
	settings: NetworkSettings;
}

const NodeDetailsDialog: React.FC<NodeDetailsDialogProps> = ({
	open,
	onClose,
	selectedNode,
	settings,
}) => {
	return (
		<Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
			<DialogTitle>
				<Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
					<InfoIcon />
					Gene Details: {selectedNode?.data?.label}
				</Box>
			</DialogTitle>
			<DialogContent>
				{selectedNode && (
					<Box sx={{ mt: 2 }}>
						<Typography variant="h6" gutterBottom>
							{selectedNode.data.label}
						</Typography>

						<Box sx={{ display: "flex", gap: 2, mb: 2 }}>
							<Chip
								label={`${selectedNode.data.pathwayCount} pathways`}
								color="primary"
							/>
							<Chip
								label={`P-value: ${(selectedNode.data.avgPValue || 0).toExponential(2)}`}
								color={
									(selectedNode.data.avgPValue || 1) < 0.05
										? "success"
										: "default"
								}
							/>
							<Chip
								label={`FDR: ${(selectedNode.data.avgFDR || 0).toExponential(2)}`}
								color={
									(selectedNode.data.avgFDR || 1) < 0.05 ? "success" : "default"
								}
							/>
						</Box>

						{settings.showPathways &&
							selectedNode.data.pathways &&
							selectedNode.data.pathways.length > 0 && (
								<Box>
									<Typography variant="subtitle1" gutterBottom>
										Associated Pathways ({selectedNode.data.pathways.length}):
									</Typography>
									<List sx={{ maxHeight: "300px", overflow: "auto" }}>
										{selectedNode.data.pathways.map(
											(pathway: Pathway, index: number) => {
												const pValue =
													pathway["P-value"] ||
													pathway["p_value"] ||
													pathway["pvalue"];
												const fdr = pathway["FDR"] || pathway["fdr"];
												const pathwayId = pathway["ID"] || pathway["id"] || "";

												return (
													<ListItem key={index} divider>
														<ListItemIcon>
															<ScienceIcon />
														</ListItemIcon>
														<ListItemText
															primary={
																pathway["Pathway"] ||
																pathway["pathway"] ||
																`Pathway ${index + 1}`
															}
															secondary={
																<Box>
																	<Typography variant="body2">
																		P-value: {(pValue || 0).toExponential(2)} |
																		FDR: {(fdr || 0).toExponential(2)}
																	</Typography>
																	<Typography
																		variant="caption"
																		color="text.secondary"
																	>
																		ID: {pathwayId} | Parent:{" "}
																		{pathway["Parent pathway"] ||
																			pathway["parent_pathway"] ||
																			"None"}
																	</Typography>
																</Box>
															}
														/>
													</ListItem>
												);
											},
										)}
									</List>
								</Box>
							)}
					</Box>
				)}
			</DialogContent>
			<DialogActions>
				<Button onClick={onClose}>Close</Button>
			</DialogActions>
		</Dialog>
	);
};

export default NodeDetailsDialog;
