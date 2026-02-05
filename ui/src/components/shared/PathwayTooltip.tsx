import React from "react";
import {
	Tooltip,
	Box,
	Typography,
	Chip,
	Paper,
} from "@mui/material";
import { Info as InfoIcon } from "@mui/icons-material";
import type { Pathway } from "../../lib/api";

interface PathwayTooltipProps {
	pathway: Pathway;
	children: React.ReactElement;
	showGenes?: boolean;
}

const PathwayTooltip: React.FC<PathwayTooltipProps> = ({
	pathway,
	children,
	showGenes = false,
}) => {
	const pValue = pathway["p-value"] || pathway["p_value"] || pathway["pvalue"] || 1;
	const fdr = pathway["FDR"] || pathway["fdr"] || 1;
	const es = pathway["ES"] || pathway["es"] || 0;
	const nes = pathway["NES"] || pathway["nes"] || 0;
	const genes = pathway["All pathway genes"] || pathway["Leading edge genes"] || pathway["genes"] || "";
	const geneCount = pathway["Number of input genes"] || 0;
	const pathwaySize = pathway["Pathway size"] || 0;

	const geneList =
		typeof genes === "string"
			? genes.split(",").map((g) => g.trim()).filter((g) => g)
			: Array.isArray(genes)
				? genes
				: [];

	const tooltipContent = (
		<Paper sx={{ p: 2, maxWidth: 400, maxHeight: 300, overflow: "auto" }}>
			<Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2 }}>
				<InfoIcon fontSize="small" />
				<Typography variant="h6" sx={{ fontWeight: "bold" }}>
					{pathway["Pathway"] || pathway["pathway"] || "Unknown Pathway"}
				</Typography>
			</Box>

			<Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
				<Chip
					label={`P: ${pValue.toExponential(2)}`}
					size="small"
					color={pValue < 0.05 ? "success" : "default"}
					variant={pValue < 0.05 ? "filled" : "outlined"}
				/>
				<Chip
					label={`FDR: ${fdr.toExponential(2)}`}
					size="small"
					color={fdr < 0.05 ? "success" : "default"}
					variant={fdr < 0.05 ? "filled" : "outlined"}
				/>
				<Chip
					label={`ES: ${es.toFixed(3)}`}
					size="small"
					color={es > 0.2 ? "success" : "default"}
					variant={es > 0.2 ? "filled" : "outlined"}
				/>
				<Chip
					label={`NES: ${nes.toFixed(3)}`}
					size="small"
					color={nes > 1.5 ? "success" : "default"}
					variant={nes > 1.5 ? "filled" : "outlined"}
				/>
			</Box>

			<Box sx={{ display: "flex", gap: 1, mb: 2, flexWrap: "wrap" }}>
				<Chip
					label={`${geneCount} input genes`}
					size="small"
					color="primary"
					variant="outlined"
				/>
				<Chip
					label={`Size: ${pathwaySize}`}
					size="small"
					color="secondary"
					variant="outlined"
				/>
			</Box>

			{showGenes && geneList.length > 0 && (
				<Box>
					<Typography variant="subtitle2" gutterBottom>
						All Pathway Genes:
					</Typography>
					<Box sx={{ display: "flex", flexWrap: "wrap", gap: 0.5 }}>
						{geneList.slice(0, 10).map((gene, index) => (
							<Chip
								key={`${pathway["ID"] || pathway["id"]}-gene-${index}`}
								label={gene}
								size="small"
								variant="outlined"
								sx={{ fontSize: "0.6rem" }}
							/>
						))}
						{geneList.length > 10 && (
							<Chip
								label={`+${geneList.length - 10} more`}
								size="small"
								variant="outlined"
								sx={{ fontSize: "0.6rem" }}
							/>
						)}
					</Box>
				</Box>
			)}
		</Paper>
	);

	return (
		<Tooltip
			title={tooltipContent}
			placement="top"
			arrow
			enterDelay={300}
			leaveDelay={200}
			PopperProps={{
				modifiers: [
					{
						name: "offset",
						options: {
							offset: [0, 8],
						},
					},
				],
			}}
		>
			{children}
		</Tooltip>
	);
};

export default PathwayTooltip;
