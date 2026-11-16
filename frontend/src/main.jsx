import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TemaProvider } from './context/TemaContext';
import { SesionProvider } from './context/SesionContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TemaProvider>
      <SesionProvider>
        <App />
      </SesionProvider>
    </TemaProvider>
  </React.StrictMode>
);
