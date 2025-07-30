import React from 'react';
import { 
  Container, 
  Typography, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Box 
} from '@mui/material';
import { 
  AccountTree as PathwaysIcon
} from '@mui/icons-material';
import { Link } from 'react-router-dom';

const Home: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h3" component="h1" gutterBottom>
        Open Targets Pathways API
      </Typography>
      <Typography variant="h6" color="text.secondary" paragraph>
        Explore biological pathways and their associations with diseases and targets.
      </Typography>
      
      <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 3, mt: 4 }}>
        <Box sx={{ flex: '1 1 300px', minWidth: 0 }}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center" mb={2}>
                <PathwaysIcon color="primary" sx={{ mr: 1 }} />
                <Typography variant="h5" component="h2">
                  Pathways
                </Typography>
              </Box>
              <Typography color="text.secondary" paragraph>
                Browse and search through biological pathways
              </Typography>
            </CardContent>
            <CardActions>
              <Button 
                component={Link} 
                to="/pathways" 
                color="primary"
                size="small"
              >
                Explore Pathways
              </Button>
            </CardActions>
          </Card>
        </Box>
        

      </Box>
    </Container>
  );
};

export default Home; 