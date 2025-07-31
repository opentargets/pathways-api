import React, { useState } from "react";
import {
	Container,
	Typography,
	Box,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Slider,
} from "@mui/material";
import { usePathways } from "../hooks/useApi";
import PathwaysResults from "../components/PathwaysResults";

const Pathways: React.FC = () => {
	const [diseaseId, setDiseaseId] = useState("EFO_0000094");
	const [library] = useState("Reactome_Pathways_2025_diy_v2");
	const [fdrLt, setFdrLt] = useState<number>(0.5);
	const [hideLeadingEdge, setHideLeadingEdge] = useState(false);

	const {
		data: pathways,
		loading,
		error,
	} = usePathways({
		diseaseId,
		library,
		fdr_lt: fdrLt,
		hide_leading_edge: hideLeadingEdge,
	});

	return (
		<Container maxWidth="xl" sx={{ py: 4 }}>
			<Typography
				variant="h4"
				component="h1"
				gutterBottom
				sx={{ fontWeight: "bold", color: "secondary.main", mb: 4 }}
			>
				Pathways Analysis
			</Typography>

			<Box sx={{ mb: 4 }}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<FormControl fullWidth>
							<InputLabel>Disease ID</InputLabel>
							<Select
								value={diseaseId}
								label="Disease ID"
								onChange={(e) => setDiseaseId(e.target.value)}
							>
								<MenuItem value="EFO_0000094">EFO_0000094</MenuItem>
								<MenuItem value="EFO_0000095">EFO_0000095</MenuItem>
								<MenuItem value="EFO_0000096">EFO_0000096</MenuItem>
								<MenuItem value="EFO_0000178">EFO_0000178</MenuItem>
								<MenuItem value="EFO_0000181">EFO_0000181</MenuItem>
								<MenuItem value="EFO_0000182">EFO_0000182</MenuItem>
								<MenuItem value="EFO_0000195">EFO_0000195</MenuItem>
								<MenuItem value="EFO_0000199">EFO_0000199</MenuItem>
								<MenuItem value="EFO_0000200">EFO_0000200</MenuItem>
								<MenuItem value="EFO_0000209">EFO_0000209</MenuItem>
							</Select>
						</FormControl>
					</Box>

					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<Typography gutterBottom>FDR Threshold</Typography>
						<Slider
							value={fdrLt}
							onChange={(_, value) => setFdrLt(value as number)}
							min={0}
							max={1}
							step={0.1}
							marks
							valueLabelDisplay="auto"
						/>
						<Typography variant="body2" color="text.secondary">
							Current: {fdrLt}
						</Typography>
					</Box>

					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<Typography gutterBottom>Library</Typography>
						<Typography variant="body2" color="text.secondary">
							{library}
						</Typography>
					</Box>
				</Box>
			</Box>

			<PathwaysResults pathways={pathways} loading={loading} error={error} />
		</Container>
	);
};

export default Pathways;
