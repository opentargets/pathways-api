import { AppBar, Toolbar, Typography, Button, Box } from "@mui/material";
import { Link } from "react-router-dom";

const Navigation: React.FC = () => {
	return (
		<AppBar sx={{ backgroundColor: "secondary.main" }} position="static">
			<Toolbar>
				<Typography
					variant="h6"
					component={Link}
					to="/"
					sx={{
						flexGrow: 1,
						textDecoration: "none",
						color: "white",
						"&:hover": {
							color: "white",
							textDecoration: "underline",
						},
					}}
				>
					Open Targets - Pathways API
				</Typography>
				<Box sx={{ display: "flex", gap: 1 }}>
					<Button component={Link} to="/pathways" sx={{ color: "white" }}>
						Pathways
					</Button>
				</Box>
			</Toolbar>
		</AppBar>
	);
};

export default Navigation;
