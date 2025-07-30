import React, { useState, useMemo } from 'react';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableContainer, 
  TableHead, 
  TableRow, 
  Paper,
  Typography,
  Box,
  IconButton,
  Tooltip
} from '@mui/material';
import { 
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  UnfoldMore as SortIcon
} from '@mui/icons-material';
import type { Pathway } from '../lib/api';

interface PathwaysTableProps {
  pathways: Pathway[];
}

type SortDirection = 'asc' | 'desc' | null;

const PathwaysTable: React.FC<PathwaysTableProps> = ({ pathways }) => {
  const [sortConfig, setSortConfig] = useState<{
    key: string | null;
    direction: SortDirection;
  }>({ key: null, direction: null });

  if (pathways.length === 0) {
    return (
      <Box textAlign="center" py={4}>
        <Typography color="text.secondary">
          No pathways to display.
        </Typography>
      </Box>
    );
  }

  // Get all unique keys from all pathways
  const allKeys = Array.from(
    new Set(
      pathways.flatMap(pathway => Object.keys(pathway))
    )
  ).sort();

  const handleSort = (key: string) => {
    let direction: SortDirection = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      direction = null;
    }
    setSortConfig({ key: direction ? key : null, direction });
  };

  const sortedPathways = useMemo(() => {
    if (!sortConfig.key || !sortConfig.direction) {
      return pathways;
    }

    return [...pathways].sort((a, b) => {
      const aValue = a[sortConfig.key!];
      const bValue = b[sortConfig.key!];

      // Handle undefined/null values
      if (aValue === undefined || aValue === null) return 1;
      if (bValue === undefined || bValue === null) return -1;

      // Convert to strings for comparison
      const aStr = String(aValue);
      const bStr = String(bValue);

      if (sortConfig.direction === 'asc') {
        return aStr.localeCompare(bStr);
      } else {
        return bStr.localeCompare(aStr);
      }
    });
  }, [pathways, sortConfig]);

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <SortIcon />;
    }
    return sortConfig.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  };

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 900 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}>#</TableCell>
            {allKeys.map(key => (
              <TableCell 
                key={key} 
                sx={{ 
                  fontWeight: 'bold',
                  maxWidth: key === 'Leading edge genes' ? '300px' : 'auto',
                  width: key === 'Leading edge genes' ? '300px' : 'auto',
                  cursor: 'pointer',
                  '&:hover': {
                    backgroundColor: 'rgba(0, 0, 0, 0.04)'
                  }
                }}
                onClick={() => handleSort(key)}
              >
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>{key}</span>
                  <Tooltip title={`Sort by ${key}`}>
                    <IconButton size="small" sx={{ ml: 1 }}>
                      {getSortIcon(key)}
                    </IconButton>
                  </Tooltip>
                </Box>
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {sortedPathways.map((pathway, index) => (
            <TableRow key={index} hover>
              <TableCell>{index + 1}</TableCell>
              {allKeys.map(key => (
                <TableCell 
                  key={key}
                  sx={{
                    maxWidth: key === 'Leading edge genes' ? '300px' : 'auto',
                    width: key === 'Leading edge genes' ? '300px' : 'auto',
                    wordWrap: key === 'Leading edge genes' ? 'break-word' : 'normal',
                    overflow: key === 'Leading edge genes' ? 'hidden' : 'visible',
                    textOverflow: key === 'Leading edge genes' ? 'ellipsis' : 'clip'
                  }}
                >
                  {pathway[key] !== undefined ? String(pathway[key]) : '-'}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PathwaysTable; 