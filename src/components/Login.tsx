import React, { useEffect } from 'react';
import { useMsal } from '@azure/msal-react';
import { loginRequest, ALLOWED_DOMAIN } from '../authConfig';

interface LoginProps {
  onLogin: (email: string) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const { instance, accounts, inProgress } = useMsal();

  useEffect(() => {
    if (inProgress === 'none' && accounts.length > 0) {
      const email = accounts[0].username?.toLowerCase() || '';
      if (email.endsWith(`@${ALLOWED_DOMAIN}`)) {
        onLogin(email);
      } else {
        instance.logoutPopup();
      }
    }
  }, [accounts, inProgress, instance, onLogin]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-mac-light px-4">
      <div className="bg-white p-10 rounded-2xl shadow-xl w-full max-w-md border border-slate-200">
        <div className="text-center mb-10">
          <img src="/mac_logo.png" className="h-12 mx-auto mb-6 object-contain" />
          <h1 className="text-2xl font-bold text-slate-800">MAC Task Manager</h1>
          <p className="text-slate-400 text-sm mt-2">Sign in with your MAC Products account</p>
        </div>
        <button
          onClick={() => instance.loginRedirect(loginRequest)}
          className="w-full bg-[#2F2F2F] hover:bg-[#1F1F1F] text-white font-semibold py-3.5 px-4 rounded-full transition-all shadow-lg flex items-center justify-center gap-3"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 21 21">
            <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
            <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
            <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
            <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
          </svg>
          Sign in with Microsoft
        </button>
        <div className="mt-10 pt-6 border-t border-slate-100 text-center">
          <p className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
            MAC PRODUCTS INTERNAL SYSTEM
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
