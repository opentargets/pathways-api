import React from 'react';
import { Handle, Position } from 'reactflow';
import { Typography, Chip } from '@mui/material';
import { Biotech as BiotechIcon } from '@mui/icons-material';
import type { GeneNode } from './types';

interface GeneNodeProps {
  data: GeneNode['data'];
}

const GeneNodeComponent: React.FC<GeneNodeProps> = ({ data }) => {
  const significance = data.significance || 0;
  const pathwayCount = data.pathwayCount || 0;
  
  // Color based on significance and pathway count
  const getNodeColor = () => {
    if (significance > 0.7) return '#4caf50'; // Green for highly significant
    if (significance > 0.4) return '#ff9800'; // Orange for moderately significant
    return '#f44336'; // Red for not significant
  };

  const nodeColor = getNodeColor();
  const nodeSize = Math.max(60, Math.min(120, 60 + pathwayCount * 5));

  return (
    <div
      style={{
        background: nodeColor,
        borderRadius: '50%',
        padding: '8px',
        width: `${nodeSize}px`,
        height: `${nodeSize}px`,
        border: '3px solid #fff',
        boxShadow: '0 4px 8px rgba(0,0,0,0.2)',
        color: 'white',
        fontWeight: 'bold',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        position: 'relative',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.1)';
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.3)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
        e.currentTarget.style.boxShadow = '0 4px 8px rgba(0,0,0,0.2)';
      }}
    >
      <Handle type="target" position={Position.Top} style={{ background: '#555' }} />
      
      <BiotechIcon sx={{ fontSize: '1.2rem', mb: 0.5 }} />
      <Typography variant="caption" sx={{ fontSize: '0.6rem', lineHeight: 1, fontWeight: 'bold' }}>
        {data.label}
      </Typography>
      
      <Chip 
        label={`${pathwayCount}`}
        size="small"
        sx={{ 
          height: '14px', 
          fontSize: '0.5rem',
          backgroundColor: 'rgba(255,255,255,0.2)',
          color: 'white',
          position: 'absolute',
          top: '-5px',
          right: '-5px',
        }}
      />

      <Handle type="source" position={Position.Bottom} style={{ background: '#555' }} />
    </div>
  );
};

export default GeneNodeComponent; 