import React from "react";
import {
	Container,
	Typography,
	Card,
	CardContent,
	Box,
	Link as MuiLink,
} from "@mui/material";
import { AccountTree as PathwaysIcon } from "@mui/icons-material";

const Home: React.FC = () => {
	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Typography
				variant="h3"
				component="h1"
				gutterBottom
				sx={{ fontWeight: "bold", color: "secondary.main" }}
			>
				Gene Set Enrichment Analysis
			</Typography>
			<Typography variant="h6" color="text.secondary" paragraph>
				Gene set enrichment analysis (GSEA) interprets gene-level disease
				association information by identifying biological pathways and functional
				categories that are overrepresented in ranked gene lists. The Platform
				implements GSEA to reveal biological themes underlying disease
				associations and support target identification and validation.
			</Typography>

			<Box sx={{ mt: 4 }}>
				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Box display="flex" alignItems="center" mb={2}>
							<PathwaysIcon
								color="primary"
								sx={{ mr: 1, fontSize: "2rem" }}
							/>
							<Typography
								variant="h5"
								component="h2"
								sx={{ fontWeight: "bold", color: "secondary.main" }}
							>
								Input Gene Lists
							</Typography>
						</Box>
						<Typography color="text.secondary" paragraph>
							Gene lists for GSEA can be derived from the disease association
							page using different evidence types:
						</Typography>
						<Box component="ul" sx={{ pl: 2, mb: 2 }}>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>All disease associations</strong> — comprehensive ranked
								list across all evidence types
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>Specific data type or source</strong> — subset based
								individual data types or sources
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
							>
								<strong>Custom gene list</strong> — user-provided genes with
								disease associations
							</Typography>
						</Box>
						<Typography color="text.secondary" variant="body2">
							The Platform recommends using gene lists of &gt;500 genes to achieve
							statistically significant results, though the optimal size depends
							on the gene set library being tested. Larger gene lists generally
							provide better statistical power and increase the likelihood of
							detecting meaningful enrichments.
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography
							variant="h5"
							component="h2"
							sx={{ fontWeight: "bold", color: "secondary.main", mb: 2 }}
						>
							GSEA Implementation
						</Typography>
						<Typography color="text.secondary" paragraph>
							The Platform uses{" "}
							<MuiLink
								href="https://github.com/Genentech/blitzgsea"
								target="_blank"
								rel="noopener noreferrer"
							>
								blitzGSEA
							</MuiLink>{" "}
							to perform enrichment analysis. This implementation estimates
							p-values by fitting enrichment score null distributions to gamma
							models¹, enabling efficient computation across large gene set
							collections.
						</Typography>
						<Typography color="text.secondary" paragraph>
							Since all genes from the Platform have positive ranking scores, the
							analysis is performed one-sided by default. Results are filtered by
							normalised enrichment score (NES) to show only gene sets enriched at
							the top of the ranked list (NES &gt; 0).
						</Typography>
						<Typography color="text.secondary">
							By default, the analysis uses all gene sets from the selected
							library as the background for enrichment testing. This approach
							ensures consistent statistical evaluation across all pathways and
							functional categories within each gene set collection.
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography
							variant="h5"
							component="h2"
							sx={{ fontWeight: "bold", color: "secondary.main", mb: 2 }}
						>
							Available Gene Set Libraries
						</Typography>
						<Typography color="text.secondary" paragraph>
							The Platform provides curated gene set libraries from multiple
							sources (February 2026):
						</Typography>
						<Box component="ul" sx={{ pl: 2, mb: 2 }}>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>Reactome</strong> — curated biological pathways for
								understanding disease mechanisms
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>ChEMBL target class</strong> — drug target
								classifications for therapeutic target identification
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>GO biological process</strong> — broad functional
								categorisation of biological processes
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
								sx={{ mb: 1 }}
							>
								<strong>GO molecular function</strong> — molecular-level
								activities and biochemical functions
							</Typography>
							<Typography
								component="li"
								variant="body2"
								color="text.secondary"
							>
								<strong>GO cellular component</strong> — subcellular
								localisation and cellular compartments
							</Typography>
						</Box>
						<Typography color="text.secondary" variant="body2">
							All gene sets are sourced from their original resources and unified
							in a standardised gene_sets parquet file, which will be available
							for download from the Platform.
						</Typography>
					</CardContent>
				</Card>

				<Card sx={{ mb: 3 }}>
					<CardContent>
						<Typography
							variant="h5"
							component="h2"
							sx={{ fontWeight: "bold", color: "secondary.main", mb: 2 }}
						>
							Interpreting Enrichment Results
						</Typography>

						<Typography
							variant="h6"
							component="h3"
							sx={{ fontWeight: "bold", mt: 2, mb: 1 }}
						>
							Normalised Enrichment Score
						</Typography>
						<Typography color="text.secondary" paragraph>
							The normalised enrichment score (NES) quantifies the degree to which
							a gene set is overrepresented at the top of the ranked gene list.
							Higher positive NES values indicate stronger enrichment signals,
							with values &gt;1.5 typically considered meaningful, though this
							depends on the specific analysis context.
						</Typography>

						<Typography
							variant="h6"
							component="h3"
							sx={{ fontWeight: "bold", mt: 2, mb: 1 }}
						>
							Statistical Significance
						</Typography>
						<Typography color="text.secondary" paragraph>
							Results include p-values estimated through the gamma distribution
							approximation. The Platform applies multiple testing correction
							where appropriate, and associations with p &lt; 0.05 or FDR &lt;
							0.25 are typically considered statistically significant.
						</Typography>

						<Typography
							variant="h6"
							component="h3"
							sx={{ fontWeight: "bold", mt: 2, mb: 1 }}
						>
							Leading Edge Genes
						</Typography>
						<Typography color="text.secondary">
							The leading edge subset represents the core genes contributing most
							to the enrichment signal. These genes appear at the top of the ranked
							list and before the point where the enrichment score reaches its
							maximum, making them particularly relevant for understanding the
							biological mechanisms underlying the association.
						</Typography>
					</CardContent>
				</Card>

				<Card>
					<CardContent>
						<Typography
							variant="h5"
							component="h2"
							sx={{ fontWeight: "bold", color: "secondary.main", mb: 2 }}
						>
							References
						</Typography>
						<Typography color="text.secondary" variant="body2">
							Lachmann, A., Xie, Z., &amp; Ma'ayan, A. (2022). blitzGSEA:
							efficient computation of gene set enrichment analysis through gamma
							distribution approximation. Bioinformatics, 38(8), 2356-2357.
						</Typography>
					</CardContent>
				</Card>
			</Box>
		</Container>
	);
};

export default Home;
