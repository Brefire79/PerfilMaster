import React from 'react';
import { reportClientError } from '@/lib/clientErrors.js';

export default class RouteErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, info) {
    reportClientError(error, { source: 'route', route: this.props.resetKey });
    if (import.meta.env.DEV) {
      console.error('[RouteErrorBoundary]', error, info?.componentStack);
    }
  }

  componentDidUpdate(previousProps) {
    if (this.state.error && previousProps.resetKey !== this.props.resetKey) {
      this.setState({ error: null });
    }
  }

  render() {
    if (!this.state.error) return this.props.children;

    return (
      <main className="min-h-screen bg-[#0F1117] text-[#F7F8FC] flex items-center justify-center p-6">
        <section className="w-full max-w-md rounded-2xl border border-[#2D3047] bg-[#1A1D2E] p-6 text-center shadow-xl">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-[#EF4444]/10 text-[#EF4444]" aria-hidden="true">
            !
          </div>
          <h1 className="text-xl font-heading font-bold">Não foi possível carregar esta página</h1>
          <p className="mt-2 text-sm text-[#A0A3B1]">
            Verifique sua conexão e tente novamente. Se continuar, informe ao suporte em qual tela o erro aconteceu.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-5 h-10 rounded-xl bg-[#6366F1] px-5 text-sm font-semibold text-white hover:bg-[#5558E8] focus:outline-none focus:ring-2 focus:ring-[#818CF8] focus:ring-offset-2 focus:ring-offset-[#1A1D2E]"
          >
            Tentar novamente
          </button>
        </section>
      </main>
    );
  }
}
