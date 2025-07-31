
import React, { useState, useContext } from 'react';
import { AppContext } from '../context/AppContext';
import { APP_NAME } from '../constants';

const LoginPage: React.FC = () => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const context = useContext(AppContext);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!context) return;

    setIsLoggingIn(true);
    setError('');
    const success = await context.login(password);
    
    if (success) {
      // The context will handle setting isAuthenticated, and the App component will re-render.
    } else {
      setError('Incorrect password. Please try again.');
    }
    setIsLoggingIn(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-sm p-8 space-y-6 bg-white dark:bg-slate-800 rounded-2xl shadow-lg">
        <div className="text-center">
            <div className="mx-auto h-12 w-12 text-primary-500 flex items-center justify-center rounded-full bg-primary-100 dark:bg-primary-900/50">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
            </div>
          <h1 className="mt-4 text-3xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
            {APP_NAME}
          </h1>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Admin Login
          </p>
        </div>
        <form className="space-y-6" onSubmit={handleSubmit}>
          <div>
            <label
              htmlFor="password"
              className="block text-sm font-medium text-slate-700 dark:text-slate-300"
            >
              Password
            </label>
            <div className="mt-1">
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 text-slate-900 bg-slate-50 dark:bg-slate-700 dark:text-white border border-slate-300 dark:border-slate-600 rounded-md shadow-sm focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div>
            <button
              type="submit"
              disabled={isLoggingIn}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500 disabled:opacity-50"
            >
              {isLoggingIn ? 'Unlocking...' : 'Unlock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;