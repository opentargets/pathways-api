import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ApolloProvider } from '@apollo/client';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { client } from './lib/apollo';
import Navigation from './components/Navigation';
import Home from './pages/Home';
import Pathways from './pages/Pathways';
import { theme } from './theme';

function App() {
  return (
    <ApolloProvider client={client}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Router>
          <div style={{ minHeight: '100vh', minWidth: '100vw', backgroundColor: '#f5f5f5' }}>
            <Navigation />
            <main>
                          <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/pathways" element={<Pathways />} />
            </Routes>
            </main>
          </div>
        </Router>
      </ThemeProvider>
    </ApolloProvider>
  );
}

export default App;
