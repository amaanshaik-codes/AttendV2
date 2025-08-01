
import React, { useContext } from 'react';
import { AppContext } from './context/AppContext';
import LoginPage from './components/LoginPage';
import MainPage from './components/MainPage';

const LoadingSpinner: React.FC = () => (
  <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-950">
    <div className="flex items-center gap-3 text-slate-500 dark:text-slate-400">
      <svg className="animate-spin h-5 w-5 text-primary-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      <span>Loading Classroom...</span>
    </div>
  </div>
);

const App: React.FC = () => {
  const { isAuthenticated, settings, isLoading } = useContext(AppContext);

  React.useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    document.body.className = `font-sans antialiased bg-slate-50 dark:bg-slate-950 text-slate-800 dark:text-slate-200`;
  }, [settings.theme]);

  if (isLoading) {
    return <LoadingSpinner />;
  }

  return (
    <div>
      {isAuthenticated ? <MainPage /> : <LoginPage />}
    </div>
  );
};

export default App;
