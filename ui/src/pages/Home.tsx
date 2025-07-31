import React from "react";
import {
	Container,
	Typography,
	Card,
	CardContent,
	CardActions,
	Button,
	Box,
} from "@mui/material";
import { AccountTree as PathwaysIcon } from "@mui/icons-material";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
	return (
		<Container maxWidth="lg" sx={{ py: 4 }}>
			<Typography
				variant="h3"
				component="h1"
				gutterBottom
				sx={{ fontWeight: "bold", color: "secondary.main" }}
			>
				Open Targets Pathways API
			</Typography>
			<Typography variant="h6" color="text.secondary" paragraph>
				Explore biological pathways and their associations with diseases and
				targets.
			</Typography>

			<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3, mt: 4 }}>
				<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
					<Card
						sx={{ height: "100%", display: "flex", flexDirection: "column" }}
					>
						<CardContent sx={{ flex: 1 }}>
							<Box display="flex" alignItems="center" mb={3}>
								<PathwaysIcon
									color="primary"
									sx={{ mr: 1, fontSize: "2rem" }}
								/>
								<Typography
									variant="h5"
									component="h2"
									sx={{ fontWeight: "bold", color: "secondary.main" }}
								>
									Pathways Analysis
								</Typography>
							</Box>
							<Typography color="text.secondary" paragraph sx={{ mb: 2 }}>
								Explore biological pathways with multiple visualization options:
							</Typography>
							<Box component="ul" sx={{ pl: 2, mb: 3 }}>
								<Typography
									component="li"
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}
								>
									<strong>Table View:</strong> Detailed pathway data with
									sorting and filtering
								</Typography>
								<Typography
									component="li"
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}
								>
									<strong>Flow Visualization:</strong> Interactive hierarchical
									pathway relationships with parent-child groupings
								</Typography>
								<Typography
									component="li"
									variant="body2"
									color="text.secondary"
									sx={{ mb: 1 }}
								>
									<strong>Advanced Filtering:</strong> Filter by NES scores,
									p-values, gene counts, and pathway sizes
								</Typography>
								<Typography
									component="li"
									variant="body2"
									color="text.secondary"
								>
									<strong>Real-time Search:</strong> Find pathways by name or ID
								</Typography>
							</Box>
						</CardContent>
						<CardActions sx={{ p: 2, pt: 0 }}>
							<Button
								component={Link}
								to="/pathways"
								color="secondary"
								size="large"
								variant="contained"
								fullWidth
								sx={{ py: 1.5 }}
							>
								Explore Pathways
							</Button>
						</CardActions>
					</Card>
				</Box>
			</Box>
		</Container>
	);
};

export default Home;
