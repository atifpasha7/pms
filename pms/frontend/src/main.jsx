import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import App from './App.jsx';
import { AuthProvider } from './context/AuthContext.jsx';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <App />
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 3500,
            style: {
              background:   '#162034',
              color:        '#E2E8F0',
              border:       '1px solid #2a3f5f',
              borderRadius: '10px',
              fontSize:     '0.875rem',
              fontFamily:   "'DM Sans', sans-serif",
              boxShadow:    '0 8px 32px rgba(0,0,0,0.5)',
            },
            success: { iconTheme: { primary: '#00FF88', secondary: '#162034' } },
            error:   { iconTheme: { primary: '#FF4560', secondary: '#162034' } },
          }}
        />
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
