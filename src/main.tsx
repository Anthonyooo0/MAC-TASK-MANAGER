import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import './index.css';
import App from './App';

const root = createRoot(document.getElementById('root')!);

async function startApp() {
  // Only load MSAL in production (not localhost)
  if (window.location.hostname !== 'localhost') {
    const { PublicClientApplication } = await import('@azure/msal-browser');
    const { MsalProvider } = await import('@azure/msal-react');
    const { msalConfig } = await import('./authConfig');

    const msalInstance = new PublicClientApplication(msalConfig);
    await msalInstance.initialize();
    const response = await msalInstance.handleRedirectPromise();
    if (response) msalInstance.setActiveAccount(response.account);
    else {
      const accounts = msalInstance.getAllAccounts();
      if (accounts.length > 0) msalInstance.setActiveAccount(accounts[0]);
    }

    root.render(
      <StrictMode>
        <MsalProvider instance={msalInstance}>
          <App />
        </MsalProvider>
      </StrictMode>,
    );
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
