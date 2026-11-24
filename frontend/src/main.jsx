import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { TemaProvider } from './context/TemaContext';
import { IdiomaProvider } from './context/IdiomaContext';
import { AccesibilidadProvider } from './context/AccesibilidadContext';
import { SesionProvider } from './context/SesionContext';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <TemaProvider>
      <IdiomaProvider>
        <AccesibilidadProvider>
          <SesionProvider>
            <App />
          </SesionProvider>
        </AccesibilidadProvider>
      </IdiomaProvider>
    </TemaProvider>
  </React.StrictMode>
);
