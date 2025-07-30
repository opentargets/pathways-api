import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  Typography, 
  Box, 
  CircularProgress, 
  Alert,
  ToggleButtonGroup,
  ToggleButton
} from '@mui/material';
import type { Pathway } from '../lib/api';
import PathwaysTable from './PathwaysTable';
import PathwaysHierarchy from './PathwaysHierarchy';
import PathwaysHierarchyTreeMap from './PathwaysHierarchyTreeMap';

interface PathwaysResultsProps {
  pathways: Pathway[] | null;
  loading: boolean;
  error: string | null;
}

const PathwaysResults: React.FC<PathwaysResultsProps> = ({ 
  pathways, 
  loading, 
  error 
}) => {
  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="400px">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        {error}
      </Alert>
    );
  }

  const displayPathways = pathways || [];
  const [viewMode, setViewMode] = useState<'cards' | 'table' | 'hierarchy' | 'treemap'>('table');

  if (displayPathways.length === 0) {
    return (
      <Box textAlign="center" py={8}>
        <Typography color="text.secondary">
          No pathways found for the selected parameters.
        </Typography>
      </Box>
    );
  }

  return (
    <>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h6">
          Results ({displayPathways.length} pathways)
        </Typography>
        
        <ToggleButtonGroup
          value={viewMode}
          exclusive
          onChange={(_, newMode) => newMode && setViewMode(newMode)}
          size="small"
        >
          <ToggleButton value="cards">Cards</ToggleButton>
          <ToggleButton value="table">Table</ToggleButton>
          <ToggleButton value="hierarchy">Network</ToggleButton>
          <ToggleButton value="treemap">TreeMap</ToggleButton>
        </ToggleButtonGroup>
      </Box>

      {viewMode === 'cards' && (
        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3 }}>
          {displayPathways.map((pathway, index) => (
            <Box key={index} sx={{ flex: '1 1 300px', minWidth: 0 }}>
              <Card>
                <CardContent>
                  <Typography variant="h6" component="h2" gutterBottom>
                    Pathway {index + 1}
                  </Typography>
                  
                  {Object.entries(pathway).map(([key, value]) => (
                    <Box key={key} sx={{ mb: 1 }}>
                      <Typography variant="body2" color="text.secondary">
                        <strong>{key}:</strong> {String(value)}
                      </Typography>
                    </Box>
                  ))}
                </CardContent>
              </Card>
            </Box>
          ))}
        </Box>
      )}

      {viewMode === 'table' && (
        <PathwaysTable pathways={displayPathways} />
      )}

      {viewMode === 'hierarchy' && (
        <PathwaysHierarchy pathways={displayPathways} />
      )}

      {viewMode === 'treemap' && (
        <PathwaysHierarchyTreeMap pathways={displayPathways} />
      )}
    </>
  );
};

export default PathwaysResults; 