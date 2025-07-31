import React from 'react';
import { Handle, Position } from 'reactflow';
import { Typography, Chip, Box } from '@mui/material';
import { Science as ScienceIcon } from '@mui/icons-material';
import type { PathwayGroupNode } from './types';

interface PathwayGroupNodeProps {
  data: PathwayGroupNode['data'];
}

const PathwayGroupNodeComponent: React.FC<PathwayGroupNodeProps> = ({ data }) => {
  return (
    <div
      style={{
        background: `${data.color}20`, // Semi-transparent background
        borderRadius: '12px',
        padding: '16px',
        minWidth: '280px',
        minHeight: '200px',
        border: `3px solid ${data.color}`,
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        color: data.color,
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-start',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.02)';
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
        <ScienceIcon sx={{ fontSize: '1.5rem' }} />
        <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
          {data.label}
        </Typography>
      </Box>
      
      <Chip 
        label={`${data.geneCount} genes`}
        size="small"
        sx={{ 
          fontSize: '0.8rem',
          backgroundColor: data.color,
          color: 'white',
          height: '24px',
          fontWeight: 'bold',
        }}
      />

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

export default PathwayGroupNodeComponent; 