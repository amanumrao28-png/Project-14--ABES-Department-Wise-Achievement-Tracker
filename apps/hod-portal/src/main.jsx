import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import '@shared/styles/tokens.css';
import '@shared/styles/global.css';
import '@shared/styles/auth.css';
import '@shared/styles/dashboard.css';
import '@shared/styles/landing.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
