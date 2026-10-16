import React, { Component, ErrorInfo, ReactNode } from 'react';
import { translations } from '../i18n';
import { Button, Card } from './ui';

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
        <div className="flex items-center justify-center h-screen bg-[var(--bg-color)] text-[var(--text-primary)] p-4">
          <Card variant="default" padding="lg" className="text-center border border-[var(--danger-color)]/30 page-max w-full space-y-4">
            <h1 className="text-page-title font-bold">{this.getTranslation('errorTitle')}</h1>
            <p className="text-body text-[var(--text-secondary)]">{this.getTranslation('errorMessage')}</p>
            {this.state.error && (
              <pre className="text-left text-micro-label bg-[var(--danger-container)] p-3 rounded-card-nested overflow-auto max-h-48 font-mono border border-[var(--danger-color)]/20">
                {this.state.error.toString()}
              </pre>
            )}
            <div className="pt-2">
              <Button
                variant="danger"
                size="md"
                onClick={() => window.location.reload()}
              >
                Ladda om sidan
              </Button>
            </div>
          </Card>
        </div>
      );
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
