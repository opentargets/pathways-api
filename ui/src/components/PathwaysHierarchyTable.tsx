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
  Collapse,
  Tooltip
} from '@mui/material';
import { 
  KeyboardArrowDown as ExpandIcon,
  KeyboardArrowUp as CollapseIcon,
  ArrowUpward as SortAscIcon,
  ArrowDownward as SortDescIcon,
  UnfoldMore as SortIcon
} from '@mui/icons-material';
import type { Pathway } from '../lib/api';

interface PathwaysHierarchyTableProps {
  pathways: Pathway[];
}

type SortDirection = 'asc' | 'desc' | null;

interface RowProps {
  pathway: Pathway;
  index: number;
  allKeys: string[];
}

const Row: React.FC<RowProps> = ({ pathway, index, allKeys }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <TableRow hover>
        <TableCell>
          <IconButton
            size="small"
            onClick={() => setOpen(!open)}
          >
            {open ? <CollapseIcon /> : <ExpandIcon />}
          </IconButton>
        </TableCell>
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
      <TableRow>
        <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={allKeys.length + 2}>
          <Collapse in={open} timeout="auto" unmountOnExit>
            <Box sx={{ margin: 1 }}>
              <Typography variant="h6" gutterBottom component="div">
                Pathway Details
              </Typography>
              <Table size="small">
                <TableBody>
                  {Object.entries(pathway).map(([key, value]) => (
                    <TableRow key={key}>
                      <TableCell sx={{ fontWeight: 'bold', width: '30%' }}>
                        {key}
                      </TableCell>
                      <TableCell>
                        {String(value)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </TableCell>
      </TableRow>
    </>
  );
};

const PathwaysHierarchyTable: React.FC<PathwaysHierarchyTableProps> = ({ pathways }) => {
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

  const getSortIcon = (key: string) => {
    if (sortConfig.key !== key) {
      return <SortIcon />;
    }
    return sortConfig.direction === 'asc' ? <SortAscIcon /> : <SortDescIcon />;
  };

  // Group pathways by parent pathway and sort within groups
  const groupedPathways = useMemo(() => {
    const grouped = pathways.reduce((acc, pathway) => {
      const parentPathway = pathway['PARENT PATHWAY'] || 'Unknown';
      if (!acc[parentPathway]) {
        acc[parentPathway] = [];
      }
      acc[parentPathway].push(pathway);
      return acc;
    }, {} as Record<string, Pathway[]>);

    // Sort pathways within each group if sorting is active
    if (sortConfig.key && sortConfig.direction) {
      Object.keys(grouped).forEach(parentPathway => {
        grouped[parentPathway].sort((a, b) => {
          const aValue = a[sortConfig.key!];
          const bValue = b[sortConfig.key!];

          if (aValue === undefined || aValue === null) return 1;
          if (bValue === undefined || bValue === null) return -1;

          const aStr = String(aValue);
          const bStr = String(bValue);

          if (sortConfig.direction === 'asc') {
            return aStr.localeCompare(bStr);
          } else {
            return bStr.localeCompare(aStr);
          }
        });
      });
    }

    return grouped;
  }, [pathways, sortConfig]);

  return (
    <TableContainer component={Paper} sx={{ maxHeight: 600 }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell sx={{ fontWeight: 'bold' }}></TableCell>
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
          {Object.entries(groupedPathways).map(([parentPathway, parentPathways]) => (
            <React.Fragment key={parentPathway}>
              <TableRow sx={{ backgroundColor: 'grey.100' }}>
                <TableCell colSpan={allKeys.length + 2}>
                  <Typography variant="h6" sx={{ fontWeight: 'bold' }}>
                    Parent Pathway: {parentPathway} ({parentPathways.length} pathways)
                  </Typography>
                </TableCell>
              </TableRow>
              {parentPathways.map((pathway, index) => (
                <Row 
                  key={`${parentPathway}-${index}`} 
                  pathway={pathway} 
                  index={index} 
                  allKeys={allKeys} 
                />
              ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
};

export default PathwaysHierarchyTable; 