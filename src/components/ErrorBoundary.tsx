import React, { Component, ErrorInfo, ReactNode } from 'react';
import { translations } from '../i18n';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("Uncaught error:", error, errorInfo);
  }

  private getTranslation(key: 'errorTitle' | 'errorMessage'): string {
    return translations['sv'][key] || (key === 'errorTitle' ? 'Något gick fel.' : 'Ett oväntat fel har inträffat.');
  }

  public render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center h-screen bg-[var(--bg-color)] text-[var(--text-primary)]">
          <div className="text-center p-8 border border-danger/30 rounded-[16px] surface-card max-w-2xl w-full mx-4">
            <h1 className="text-2xl font-semibold mb-2">{this.getTranslation('errorTitle')}</h1>
            <p className="mb-4 text-sm opacity-80">{this.getTranslation('errorMessage')}</p>
            {this.state.error && (
              <pre className="text-left text-[10px] bg-danger/10 p-3 rounded-[14px] overflow-auto max-h-48 font-mono border border-danger/20">
                {this.state.error.toString()}
              </pre>
            )}
            <button 
              onClick={() => window.location.reload()}
              className="mt-6 px-6 py-2 bg-danger text-[var(--text-primary)] rounded-full font-semibold hover:opacity-90 transition-colors"
            >
              Ladda om sidan
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
