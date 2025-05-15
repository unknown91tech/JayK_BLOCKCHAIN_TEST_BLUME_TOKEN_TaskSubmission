
import { Layout } from './components/layout/Layout';
import { ThemeProvider } from './components/ThemeProvider';
import { Dashboard } from './pages/Dashboard';

/**
 * Main application component
 */
function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="defi-theme-preference">
      <Layout>
        <Dashboard />
      </Layout>
    </ThemeProvider>
  );
}

export default App;