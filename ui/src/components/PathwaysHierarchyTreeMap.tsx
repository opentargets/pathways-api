import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
// @ts-ignore
import Plotly from 'plotly.js-dist';
import {
  Box,
  Typography,
  Paper,
  Chip,
  IconButton,
  Tooltip,
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
  Alert,
} from '@mui/material';
import {
  Settings as SettingsIcon,
  Info as InfoIcon,
  ZoomIn as ZoomInIcon,
  ZoomOut as ZoomOutIcon,
  Home as HomeIcon,
  ViewModule as TreeMapIcon,
} from '@mui/icons-material';
import type { Pathway } from '../lib/api';

interface PathwaysHierarchyTreeMapProps {
  pathways: Pathway[];
}

interface TreeMapNode {
  ids: string[];
  labels: string[];
  parents: string[];
  values: number[];
  customdata: any[];
  hovertemplate: string;
  marker: {
    colors: string[];
    line: { color: string; width: number };
  };
}

const PathwaysHierarchyTreeMap: React.FC<PathwaysHierarchyTreeMapProps> = ({ pathways }) => {
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nodeDetailsOpen, setNodeDetailsOpen] = useState(false);
  const [selectedPathway, setSelectedPathway] = useState<Pathway | null>(null);
  const plotContainerRef = useRef<HTMLDivElement>(null);
  const plotRef = useRef<any>(null);
  const [settings, setSettings] = useState({
    maxPathways: pathways.length,
    showPValues: true,
    showFDR: true,
    showGenes: false,
    colorBy: 'pvalue' as 'pvalue' | 'fdr' | 'genes',
    layout: 'squarify' as 'squarify' | 'binary' | 'dice' | 'slice' | 'slice-dice',
  });

  // Memoized color scale generation
  const getColorScale = useCallback((values: number[], type: 'pvalue' | 'fdr' | 'genes') => {
    if (type === 'genes') {
      // Color by number of genes (gradient)
      const maxGenes = Math.max(...values);
      return values.map(value => {
        const normalized = value / maxGenes;
        return `rgb(${Math.round(255 * (1 - normalized))}, ${Math.round(255 * normalized)}, 100)`;
      });
    } else {
      // Color by p-value or FDR (log scale)
      const logValues = values.map(v => -Math.log10(v));
      const maxLog = Math.max(...logValues);
      return values.map((value, index) => {
        const normalized = logValues[index] / maxLog;
        if (normalized > 0.7) return '#4caf50'; // Green for significant
        if (normalized > 0.4) return '#ff9800'; // Orange for moderate
        return '#f44336'; // Red for not significant
      });
    }
  }, []);

  // Build hierarchy from parent pathway relationships
  const buildHierarchy = useCallback((pathways: Pathway[]) => {
    const pathwayMap = new Map<string, Pathway>();
    const childrenMap = new Map<string, string[]>();
    const rootPathways: Pathway[] = [];

    // Create pathway map and collect children
    pathways.forEach(pathway => {
      const id = pathway['ID'] || pathway['id'] || '';
      pathwayMap.set(id, pathway);
      
      const parentPathway = pathway['Parent pathway'] || pathway['parent_pathway'] || '';
      if (parentPathway) {
        const parents = parentPathway.split(',').map((p: string) => p.trim());
        parents.forEach((parent: string) => {
          if (!childrenMap.has(parent)) {
            childrenMap.set(parent, []);
          }
          childrenMap.get(parent)!.push(id);
        });
      } else {
        rootPathways.push(pathway);
      }
    });

    return { pathwayMap, childrenMap, rootPathways };
  }, []);

  // Memoized treemap data generation
  const treemapData = useMemo(() => {
    if (pathways.length === 0) return null;

    const limitedPathways = pathways.slice(0, settings.maxPathways);
    const { pathwayMap, childrenMap, rootPathways } = buildHierarchy(limitedPathways);
    
    const nodes: TreeMapNode = {
      ids: [],
      labels: [],
      parents: [],
      values: [],
      customdata: [],
      hovertemplate: '',
      marker: {
        colors: [],
        line: { color: '#333', width: 1 },
      },
    };

    // Add root node
    nodes.ids.push('root');
    nodes.labels.push('All Pathways');
    nodes.parents.push('');
    nodes.values.push(limitedPathways.length);
    nodes.customdata.push({ type: 'root' });
    nodes.marker.colors.push('#2196f3');

    // Add root pathways (those without parents)
    rootPathways.forEach((pathway, index) => {
      const pathwayId = pathway['ID'] || pathway['id'] || `root-${index}`;
      const pValue = pathway['p-value'] || pathway['p_value'] || pathway['pvalue'];
      const fdr = pathway['FDR'] || pathway['fdr'];
      const genes = pathway['Leading edge genes'] || pathway['genes'] || [];
      const geneCount = Array.isArray(genes) ? genes.length : (typeof genes === 'string' ? genes.split(',').length : 0);

      // Calculate area based on significance (more significant = larger area)
      const significance = 1 / (pValue || 1);
      const area = Math.max(1, Math.log(significance) * 10);

      nodes.ids.push(pathwayId);
      nodes.labels.push(pathway['Pathway'] || pathway['pathway'] || `Pathway ${index + 1}`);
      nodes.parents.push('root');
      nodes.values.push(area);
      nodes.customdata.push({
        type: 'pathway',
        pathway,
        pValue,
        fdr,
        geneCount,
        genes: Array.isArray(genes) ? genes : typeof genes === 'string' ? genes.split(',').map((g: string) => g.trim()) : [],
      });

      // Color based on settings
      if (settings.colorBy === 'genes') {
        nodes.marker.colors.push(`rgb(${Math.round(255 * (1 - geneCount / 50))}, ${Math.round(255 * geneCount / 50)}, 100)`);
      } else if (settings.colorBy === 'fdr') {
        const normalized = -Math.log10(fdr || 1) / 3;
        if (normalized > 0.7) nodes.marker.colors.push('#4caf50');
        else if (normalized > 0.4) nodes.marker.colors.push('#ff9800');
        else nodes.marker.colors.push('#f44336');
      } else {
        const normalized = -Math.log10(pValue || 1) / 3;
        if (normalized > 0.7) nodes.marker.colors.push('#4caf50');
        else if (normalized > 0.4) nodes.marker.colors.push('#ff9800');
        else nodes.marker.colors.push('#f44336');
      }
    });

    // Add child pathways
    const processedIds = new Set<string>();
    
    const addChildren = (parentId: string, parentPath: string) => {
      const children = childrenMap.get(parentId) || [];
      
      children.forEach(childId => {
        if (processedIds.has(childId)) return;
        processedIds.add(childId);
        
        const pathway = pathwayMap.get(childId);
        if (!pathway) return;

        const pValue = pathway['p-value'] || pathway['p_value'] || pathway['pvalue'];
        const fdr = pathway['FDR'] || pathway['fdr'];
        const genes = pathway['Leading edge genes'] || pathway['genes'] || [];
        const geneCount = Array.isArray(genes) ? genes.length : (typeof genes === 'string' ? genes.split(',').length : 0);

        // Calculate area based on significance
        const significance = 1 / (pValue || 1);
        const area = Math.max(1, Math.log(significance) * 10);

        nodes.ids.push(childId);
        nodes.labels.push(pathway['Pathway'] || pathway['pathway'] || childId);
        nodes.parents.push(parentPath);
        nodes.values.push(area);
        nodes.customdata.push({
          type: 'pathway',
          pathway,
          pValue,
          fdr,
          geneCount,
          genes: Array.isArray(genes) ? genes : typeof genes === 'string' ? genes.split(',').map((g: string) => g.trim()) : [],
        });

        // Color based on settings
        if (settings.colorBy === 'genes') {
          nodes.marker.colors.push(`rgb(${Math.round(255 * (1 - geneCount / 50))}, ${Math.round(255 * geneCount / 50)}, 100)`);
        } else if (settings.colorBy === 'fdr') {
          const normalized = -Math.log10(fdr || 1) / 3;
          if (normalized > 0.7) nodes.marker.colors.push('#4caf50');
          else if (normalized > 0.4) nodes.marker.colors.push('#ff9800');
          else nodes.marker.colors.push('#f44336');
        } else {
          const normalized = -Math.log10(pValue || 1) / 3;
          if (normalized > 0.7) nodes.marker.colors.push('#4caf50');
          else if (normalized > 0.4) nodes.marker.colors.push('#ff9800');
          else nodes.marker.colors.push('#f44336');
        }

        // Recursively add children of this pathway
        addChildren(childId, childId);
      });
    };

    // Add children for each root pathway
    rootPathways.forEach(pathway => {
      const pathwayId = pathway['ID'] || pathway['id'] || '';
      addChildren(pathwayId, pathwayId);
    });

    // Set hover template
    nodes.hovertemplate = 
      '<b>%{label}</b><br>' +
      'Area: %{value}<br>' +
      '<extra></extra>';

    return nodes;
  }, [pathways, settings.maxPathways, settings.colorBy, buildHierarchy]);

  // Plotly layout configuration
  const layout = useMemo(() => ({
    width: undefined,
    height: 700,
    treemapcolorway: ['#636efa', '#ef553b', '#00cc96', '#ab63fa', '#ffa15a'],
    extendsunburstcolors: true,
    margin: { l: 0, r: 0, t: 0, b: 0 },
    treemap: {
      tiling: {
        packing: settings.layout,
        squarifyratio: 1,
      },
    },
  }), [settings.layout]);

  // Plotly config
  const config = useMemo(() => ({
    displayModeBar: true,
    modeBarButtonsToRemove: ['pan2d', 'lasso2d', 'select2d'],
    displaylogo: false,
    responsive: true,
  }), []);

  // Initialize plot
  useEffect(() => {
    if (plotContainerRef.current && treemapData) {
      const plotElement = plotContainerRef.current;
      
      const plotData = [{
        type: 'treemap',
        ...treemapData,
      }];

      Plotly.newPlot(plotElement, plotData, layout, config).then((plotDiv: any) => {
        plotRef.current = plotDiv;
        
        // Add click event listener
        plotDiv.on('plotly_click', (event: any) => {
          if (event.points && event.points.length > 0) {
            const point = event.points[0];
            const customData = point.customdata;
            
            if (customData && customData.type === 'pathway') {
              setSelectedPathway(customData.pathway);
              setNodeDetailsOpen(true);
            }
          }
        });
      });

      return () => {
        if (plotRef.current) {
          Plotly.purge(plotRef.current);
        }
      };
    }
  }, [treemapData, layout, config]);

  // Handle settings change
  const handleSettingsChange = useCallback((key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  }, []);

  // Zoom controls
  const handleZoomIn = useCallback(() => {
    if (plotRef.current) {
      Plotly.relayout(plotRef.current, {
        'treemap.level': 1,
      });
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (plotRef.current) {
      Plotly.relayout(plotRef.current, {
        'treemap.level': 0,
      });
    }
  }, []);

  const handleReset = useCallback(() => {
    if (plotRef.current) {
      Plotly.relayout(plotRef.current, {
        'treemap.level': '',
      });
    }
  }, []);

  if (pathways.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No pathways to display in treemap.
        </Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ height: '1000px', width: '100%' }}>
      <Paper sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
          <Typography variant="h6" component="h2">
            Pathways Hierarchy (TreeMap)
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Tooltip title="Zoom In">
              <IconButton onClick={handleZoomIn} size="small">
                <ZoomInIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Zoom Out">
              <IconButton onClick={handleZoomOut} size="small">
                <ZoomOutIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Reset View">
              <IconButton onClick={handleReset} size="small">
                <HomeIcon />
              </IconButton>
            </Tooltip>
            <Tooltip title="Settings">
              <IconButton onClick={() => setSettingsOpen(true)}>
                <SettingsIcon />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
        
        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Chip 
            label={`${pathways.length} total pathways`} 
            color="primary" 
            size="small" 
          />
          <Chip 
            label={`${settings.maxPathways} displayed`} 
            color="secondary" 
            size="small" 
          />
          <Chip 
            label={`Color by: ${settings.colorBy}`} 
            variant="outlined" 
            size="small" 
          />
          <Chip 
            label="TreeMap Chart" 
            variant="outlined" 
            size="small" 
          />
        </Box>

        <Alert severity="info" sx={{ mt: 2 }}>
          <Typography variant="body2">
            Click on pathway rectangles to view details. Larger rectangles indicate more significant pathways. Hierarchy is based on parent pathway relationships.
          </Typography>
        </Alert>
      </Paper>

      <Paper sx={{ height: '800px', position: 'relative' }}>
        <div 
          ref={plotContainerRef} 
          style={{ width: '100%', height: '100%' }}
        />
      </Paper>

      {/* Settings Dialog */}
      <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>TreeMap Hierarchy Settings</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Color By</InputLabel>
              <Select
                value={settings.colorBy}
                onChange={(e) => handleSettingsChange('colorBy', e.target.value)}
                label="Color By"
              >
                <MenuItem value="pvalue">P-Value</MenuItem>
                <MenuItem value="fdr">FDR</MenuItem>
                <MenuItem value="genes">Gene Count</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Layout Algorithm</InputLabel>
              <Select
                value={settings.layout}
                onChange={(e) => handleSettingsChange('layout', e.target.value)}
                label="Layout Algorithm"
              >
                <MenuItem value="squarify">Squarify (Default)</MenuItem>
                <MenuItem value="binary">Binary</MenuItem>
                <MenuItem value="dice">Dice</MenuItem>
                <MenuItem value="slice">Slice</MenuItem>
                <MenuItem value="slice-dice">Slice-Dice</MenuItem>
              </Select>
            </FormControl>

            <Box>
              <Typography gutterBottom>Max Pathways: {settings.maxPathways}</Typography>
              <Slider
                value={settings.maxPathways}
                onChange={(_, value) => handleSettingsChange('maxPathways', value)}
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
                  onChange={(e) => handleSettingsChange('showPValues', e.target.checked)}
                />
              }
              label="Show P-Values"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showFDR}
                  onChange={(e) => handleSettingsChange('showFDR', e.target.checked)}
                />
              }
              label="Show FDR"
            />

            <FormControlLabel
              control={
                <Switch
                  checked={settings.showGenes}
                  onChange={(e) => handleSettingsChange('showGenes', e.target.checked)}
                />
              }
              label="Show Gene Lists"
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSettingsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>

      {/* Pathway Details Dialog */}
      <Dialog open={nodeDetailsOpen} onClose={() => setNodeDetailsOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <InfoIcon />
            Pathway Details
          </Box>
        </DialogTitle>
        <DialogContent>
          {selectedPathway && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                {selectedPathway['Pathway'] || selectedPathway['pathway'] || 'Unknown Pathway'}
              </Typography>
              
              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Chip 
                  label={`P-value: ${(selectedPathway['p-value'] || selectedPathway['p_value'] || selectedPathway['pvalue'] || 1).toExponential(2)}`}
                  color={((selectedPathway['p-value'] || selectedPathway['p_value'] || selectedPathway['pvalue'] || 1) < 0.05) ? 'success' : 'default'}
                />
                <Chip 
                  label={`FDR: ${(selectedPathway['FDR'] || selectedPathway['fdr'] || 1).toExponential(2)}`}
                  color={((selectedPathway['FDR'] || selectedPathway['fdr'] || 1) < 0.05) ? 'success' : 'default'}
                />
                <Chip 
                  label={`${Array.isArray(selectedPathway['Leading edge genes'] || selectedPathway['genes']) ? 
                    (selectedPathway['Leading edge genes'] || selectedPathway['genes']).length : 
                    (typeof (selectedPathway['Leading edge genes'] || selectedPathway['genes']) === 'string' ? 
                      (selectedPathway['Leading edge genes'] || selectedPathway['genes']).split(',').length : 0)} genes`}
                  color="primary"
                />
              </Box>

              {settings.showGenes && (selectedPathway['Leading edge genes'] || selectedPathway['genes']) && (
                <Box>
                  <Typography variant="subtitle1" gutterBottom>
                    Leading Edge Genes:
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {(Array.isArray(selectedPathway['Leading edge genes'] || selectedPathway['genes']) ? 
                      (selectedPathway['Leading edge genes'] || selectedPathway['genes']) : 
                      (typeof (selectedPathway['Leading edge genes'] || selectedPathway['genes']) === 'string' ? 
                        (selectedPathway['Leading edge genes'] || selectedPathway['genes']).split(',').map((g: string) => g.trim()) : [])).slice(0, 20).map((gene: string, index: number) => (
                      <Chip key={index} label={gene} size="small" variant="outlined" />
                    ))}
                    {(Array.isArray(selectedPathway['Leading edge genes'] || selectedPathway['genes']) ? 
                      (selectedPathway['Leading edge genes'] || selectedPathway['genes']).length : 
                      (typeof (selectedPathway['Leading edge genes'] || selectedPathway['genes']) === 'string' ? 
                        (selectedPathway['Leading edge genes'] || selectedPathway['genes']).split(',').length : 0)) > 20 && (
                      <Chip label={`+${(Array.isArray(selectedPathway['Leading edge genes'] || selectedPathway['genes']) ? 
                        (selectedPathway['Leading edge genes'] || selectedPathway['genes']).length : 
                        (typeof (selectedPathway['Leading edge genes'] || selectedPathway['genes']) === 'string' ? 
                          (selectedPathway['Leading edge genes'] || selectedPathway['genes']).split(',').length : 0)) - 20} more`} size="small" />
                    )}
                  </Box>
                </Box>
              )}

              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  All Pathway Data:
                </Typography>
                <Box sx={{ maxHeight: '200px', overflow: 'auto' }}>
                  {Object.entries(selectedPathway).map(([key, value]) => (
                    <Box key={key} sx={{ display: 'flex', justifyContent: 'space-between', py: 0.5 }}>
                      <Typography variant="body2" sx={{ fontWeight: 'bold' }}>
                        {key}:
                      </Typography>
                      <Typography variant="body2" sx={{ ml: 2, maxWidth: '60%' }}>
                        {String(value)}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setNodeDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default PathwaysHierarchyTreeMap; 