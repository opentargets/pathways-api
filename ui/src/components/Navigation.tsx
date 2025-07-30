import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { 
  AppBar, 
  Toolbar, 
  Typography, 
  Button, 
  Box 
} from '@mui/material';

const Navigation: React.FC = () => {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path;
  };

  return (
    <AppBar position="static">
      <Toolbar>
        <Typography 
          variant="h6" 
          component={Link} 
          to="/" 
          sx={{ 
            flexGrow: 1, 
            textDecoration: 'none', 
            color: 'inherit' 
          }}
        >
          Open Targets
        </Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button
            component={Link}
            to="/"
            color="inherit"
            sx={{
              backgroundColor: isActive('/') ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            }}
          >
            Home
          </Button>
          <Button
            component={Link}
            to="/pathways"
            color="inherit"
            sx={{
              backgroundColor: isActive('/pathways') ? 'rgba(255, 255, 255, 0.1)' : 'transparent'
            }}
          >
            Pathways
          </Button>
        </Box>
      </Toolbar>
    </AppBar>
  );
};

export default Navigation; 