
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { NavigationConfirmationProvider } from './hooks/useNavigationConfirmation.tsx'
import { ThemeProvider } from 'next-themes'

// Initialize glass theme if it's saved in localStorage
const initTheme = () => {
  const savedTheme = localStorage.getItem('themeStyle');
  if (savedTheme === 'glass') {
    document.documentElement.classList.add('glass-theme');
  }
};

// Call init function
initTheme();

createRoot(document.getElementById("root")!).render(
  <ThemeProvider attribute="class">
    <NavigationConfirmationProvider>
      <App />
    </NavigationConfirmationProvider>
  </ThemeProvider>
);
