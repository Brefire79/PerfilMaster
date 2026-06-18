import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.jsx';
import './index.css';
import './i18n/index.js';
import './store/themeStore.js'; // aplica o tema salvo (light/dark) cedo, evita flash

// Register service worker (handled by vite-plugin-pwa in production)
// The plugin auto-generates and registers the SW

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
