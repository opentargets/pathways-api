import React from 'react';
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
} from '@mui/material';
import type { NetworkSettings } from './types';

interface NetworkSettingsDialogProps {
  open: boolean;
  onClose: () => void;
  settings: NetworkSettings;
  onSettingsChange: (key: string, value: string | number | boolean) => void;
}

const NetworkSettingsDialog: React.FC<NetworkSettingsDialogProps> = ({
  open,
  onClose,
  settings,
  onSettingsChange,
}) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle>Gene Network Settings</DialogTitle>
      <DialogContent>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <FormControl fullWidth>
            <InputLabel>Layout Type</InputLabel>
                          <Select
                value={settings.layout}
                onChange={(e) => onSettingsChange('layout', e.target.value)}
                label="Layout Type"
              >
                <MenuItem value="hierarchical">Hierarchical</MenuItem>
                <MenuItem value="force">Force-Directed</MenuItem>
                <MenuItem value="circular">Circular</MenuItem>
                <MenuItem value="subflow">Sub Flow Groups</MenuItem>
              </Select>
          </FormControl>

          <Box>
            <Typography gutterBottom>Node Spacing: {settings.nodeSpacing}</Typography>
            <Slider
              value={settings.nodeSpacing}
              onChange={(_, value) => onSettingsChange('nodeSpacing', value)}
              min={100}
              max={400}
              step={50}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box>
            <Typography gutterBottom>Min Pathway Count: {settings.minGeneCount}</Typography>
            <Slider
              value={settings.minGeneCount}
              onChange={(_, value) => onSettingsChange('minGeneCount', value)}
              min={1}
              max={10}
              step={1}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box>
            <Typography gutterBottom>Max Genes: {settings.maxGenes}</Typography>
            <Slider
              value={settings.maxGenes}
              onChange={(_, value) => onSettingsChange('maxGenes', value)}
              min={20}
              max={200}
              step={20}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box>
            <Typography gutterBottom>Max Edges: {settings.maxEdges}</Typography>
            <Slider
              value={settings.maxEdges}
              onChange={(_, value) => onSettingsChange('maxEdges', value)}
              min={100}
              max={1000}
              step={100}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <Box>
            <Typography gutterBottom>Min Significance: {settings.minSignificance}</Typography>
            <Slider
              value={settings.minSignificance}
              onChange={(_, value) => onSettingsChange('minSignificance', value)}
              min={0}
              max={5}
              step={0.5}
              marks
              valueLabelDisplay="auto"
            />
          </Box>

          <FormControlLabel
            control={
              <Switch
                checked={settings.showPValues}
                onChange={(e) => onSettingsChange('showPValues', e.target.checked)}
              />
            }
            label="Show P-Values"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.showFDR}
                onChange={(e) => onSettingsChange('showFDR', e.target.checked)}
              />
            }
            label="Show FDR"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.showPathways}
                onChange={(e) => onSettingsChange('showPathways', e.target.checked)}
              />
            }
            label="Show Pathway Details"
          />

          <FormControlLabel
            control={
              <Switch
                checked={settings.showEdgeLabels}
                onChange={(e) => onSettingsChange('showEdgeLabels', e.target.checked)}
              />
            }
            label="Show Edge Labels"
          />
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
      </DialogActions>
    </Dialog>
  );
};

export default NetworkSettingsDialog; 