import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Suppress native browser HTML5 validation bubbles globally in favor of custom design-system UI
window.addEventListener(
  'invalid',
  (e) => {
    e.preventDefault();
  },
  true
);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

