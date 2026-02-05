import React, { useState } from "react";
import {
	Container,
	Typography,
	Box,
	FormControl,
	InputLabel,
	Select,
	MenuItem,
	Button,
	Alert,
	Switch,
	FormControlLabel,
} from "@mui/material";
import { CloudUpload } from "@mui/icons-material";
import { useGsea, useGmtLibraries } from "../hooks/useApi";
import PathwaysResults from "../components/PathwaysResults";
import { mockPathwayData } from "../data/mockPathwayData";

const Pathways: React.FC = () => {
	const [selectedFile, setSelectedFile] = useState<File | null>(null);
	const [library, setLibrary] = useState<string>("");
	const [fileError, setFileError] = useState<string>("");
	const [testMode, setTestMode] = useState<boolean>(false);

	const {
		data: gmtLibraries,
		loading: librariesLoading,
		error: librariesError,
	} = useGmtLibraries();

	const {
		data: pathways,
		loading,
		error,
		execute: runGsea,
	} = useGsea();

	// Use mock data in test mode, otherwise use real data
	const displayPathways = testMode ? mockPathwayData : pathways;
	const displayLoading = testMode ? false : loading;
	const displayError = testMode ? null : error;

	// Set default library when libraries are loaded
	React.useEffect(() => {
		if (gmtLibraries && gmtLibraries.length > 0 && !library) {
			setLibrary(gmtLibraries[0]);
		}
	}, [gmtLibraries, library]);

	const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (file) {
			if (file.name.endsWith('.tsv')) {
				setSelectedFile(file);
				setFileError("");
			} else {
				setFileError("Please select a .tsv file");
				setSelectedFile(null);
			}
		}
	};

	const handleSubmit = async () => {
		if (!selectedFile) {
			setFileError("Please select a TSV file");
			return;
		}

		if (!library) {
			setFileError("Please select a GMT library");
			return;
		}

		await runGsea({
			tsv_file: selectedFile,
			gmt_name: library,
		});
	};

	return (
		<Container maxWidth="xl" sx={{ py: 4 }}>
			<Typography
				variant="h4"
				component="h1"
				gutterBottom
				sx={{ fontWeight: "bold", color: "secondary.main", mb: 4 }}
			>
				GSEA Analysis
			</Typography>

			<Box sx={{ mb: 4 }}>
				<Box sx={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<FormControl fullWidth>
							<InputLabel>GMT Library</InputLabel>
							<Select
								value={library}
								label="GMT Library"
								onChange={(e) => setLibrary(e.target.value)}
								disabled={librariesLoading || testMode}
							>
								{gmtLibraries?.map((lib) => (
									<MenuItem key={lib} value={lib}>
										{lib}
									</MenuItem>
								))}
							</Select>
							{librariesError && (
								<Alert severity="error" sx={{ mt: 1 }}>
									Failed to load GMT libraries
								</Alert>
							)}
						</FormControl>
					</Box>

					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<Typography gutterBottom>TSV File Upload</Typography>
						<input
							accept=".tsv"
							style={{ display: 'none' }}
							id="tsv-file-upload"
							type="file"
							onChange={handleFileSelect}
							disabled={testMode}
						/>
						<label htmlFor="tsv-file-upload">
							<Button
								variant="outlined"
								component="span"
								startIcon={<CloudUpload />}
								fullWidth
								disabled={testMode}
							>
								{selectedFile ? selectedFile.name : "Choose TSV File"}
							</Button>
						</label>
						{fileError && (
							<Alert severity="error" sx={{ mt: 1 }}>
								{fileError}
							</Alert>
						)}
						<Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
							File must have 2 columns: symbol and globalScore
						</Typography>
					</Box>

					<Box sx={{ flex: "1 1 300px", minWidth: 0 }}>
						<FormControlLabel
							control={
								<Switch
									checked={testMode}
									onChange={(e) => setTestMode(e.target.checked)}
								/>
							}
							label="Test Mode (Use Mock Data)"
							sx={{ mb: 2 }}
						/>
						<Button
							variant="contained"
							color="primary"
							onClick={handleSubmit}
							disabled={(!selectedFile || !library) && !testMode || loading}
							fullWidth
							sx={{ mt: 4 }}
						>
							{loading ? "Running GSEA..." : testMode ? "Show Test Data" : "Run GSEA Analysis"}
						</Button>
					</Box>
				</Box>
			</Box>

			<PathwaysResults pathways={displayPathways} loading={displayLoading} error={displayError} />
		</Container>
	);
};

export default Pathways;
