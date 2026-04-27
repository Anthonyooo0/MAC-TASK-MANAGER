import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = createRoot(document.getElementById('root')!);

async function startApp() {
  // Only load MSAL in production (not localhost)
  if (window.location.hostname !== 'localhost') {
    try {
      const { PublicClientApplication } = await import('@azure/msal-browser');
      const { MsalProvider } = await import('@azure/msal-react');
      const { msalConfig } = await import('./authConfig');

      const msalInstance = new PublicClientApplication(msalConfig);
      await msalInstance.initialize();

      try {
        const response = await msalInstance.handleRedirectPromise();
        if (response) msalInstance.setActiveAccount(response.account);
        else {
          const accounts = msalInstance.getAllAccounts();
          if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
        }
      } catch (redirectErr) {
        // Cached MSAL state may be incompatible (e.g. after scope change).
        // Clear sessionStorage and continue — user will need to sign in again.
        console.warn('MSAL redirect handling failed, clearing cache:', redirectErr);
        try { sessionStorage.clear(); } catch { /* ignore */ }
      }

      root.render(
        <StrictMode>
          <MsalProvider instance={msalInstance}>
            <App />
          </MsalProvider>
        </StrictMode>,
      );
    } catch (initErr) {
      // If MSAL itself fails to load, render the app without it so the user
      // at least sees the login page instead of a white screen.
      console.error('MSAL init failed, rendering without auth provider:', initErr);
      root.render(
        <StrictMode>
          <App />
        </StrictMode>,
      );
    }
  } else {
    // Local dev — render without MSAL
    root.render(
      <StrictMode>
        <App />
      </StrictMode>,
    );
  }
}

startApp();
