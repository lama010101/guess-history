
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NavigationConfirmationProvider } from './hooks/useNavigationConfirmation.tsx'

createRoot(document.getElementById("root")!).render(
  <NavigationConfirmationProvider>
    <App />
  </NavigationConfirmationProvider>
);
