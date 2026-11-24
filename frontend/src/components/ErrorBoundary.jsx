import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { TRADUCCIONES } from '../data/traducciones';

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      errorMessage: error?.message || ''
    };
  }

  componentDidCatch(error, info) {
    console.error('[ErrorBoundary]', error, info);
  }

  render() {
    if (this.state.hasError) {
      let lang = 'es';
      try {
        lang = localStorage.getItem('gotox_idioma') || localStorage.getItem('synodos_idioma') || 'es';
      } catch {}
      const dic = TRADUCCIONES[lang]?.errores || TRADUCCIONES.es.errores;

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <div className="max-w-md w-full p-6 rounded-3xl border border-rose-500/30 bg-[#111827] text-[#E8EDF5] text-center space-y-4 shadow-xl">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h2 className="font-serif font-bold text-xl">{dic.titulo}</h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              {this.state.errorMessage || dic.mensajePorDefecto}
            </p>
            <button
              type="button"
              onClick={() => this.setState({ hasError: false, errorMessage: '' })}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-[#501228] text-white hover:bg-[#6E1E3A] border border-[#F27B91]/40 transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>{dic.reintentar}</span>
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
