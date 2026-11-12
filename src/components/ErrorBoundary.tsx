import { logWarn } from '../utils/logger';
import React, { Component, ErrorInfo, ReactNode } from 'react';
import { sendFeedback } from '../utils/sendFeedback';
import { reportError } from '../utils/monitoring';
import { WarningCircle } from '@phosphor-icons/react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  reported: boolean;
  note: string;
  noteSent: boolean;
  sendingNote: boolean;
}

/**
 * Fångar krascher. Felet rapporteras automatiskt (sparas i Supabase och mejlas till hej@dejz.se),
 * och användaren kan lägga till vad hen gjorde precis innan.
 */
class ErrorBoundary extends Component<Props, State> {
  state: State = {
    hasError: false,
    error: null,
    reported: false,
    note: '',
    noteSent: false,
    sendingNote: false,
  };

  private componentStack = '';

  public static getDerivedStateFromError(error: Error): Partial<State> {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // Skickas till Sentry av reportError nedan – här bara konsolen under utveckling
    logWarn('Uncaught error', { error, errorInfo });
    this.componentStack = (errorInfo?.componentStack || '').slice(0, 1500);
    reportError(error, { komponenter: this.componentStack });
    void sendFeedback('crash', `${error?.name || 'Error'}: ${error?.message || String(error)}`, {
      stack: String(error?.stack || '').slice(0, 1500),
      komponenter: this.componentStack,
    }).then((ok) => this.setState({ reported: ok }));
  }

  private sendNote = async () => {
    const note = this.state.note.trim();
    if (!note || this.state.sendingNote) return;
    this.setState({ sendingNote: true });
    await sendFeedback('bug', note, {
      kraschfel: `${this.state.error?.name || 'Error'}: ${this.state.error?.message || ''}`,
    });
    this.setState({ sendingNote: false, noteSent: true, note: '' });
  };

  public render() {
    if (!this.state.hasError) return this.props.children;

    const { reported, note, noteSent, sendingNote, error } = this.state;

    return (
      <div className="min-h-dvh flex flex-col bg-[var(--bg-color)] text-[var(--text-primary)] px-6 pt-[calc(4rem+env(safe-area-inset-top,0px))] pb-[calc(1.5rem+env(safe-area-inset-bottom,0px))]">
        <div className="w-full max-w-sm mx-auto flex-1 flex flex-col">
          <div className="flex flex-col items-center text-center">
            <div className="ui-auth-icon-tile" aria-hidden="true">
              <WarningCircle size={32} weight="regular" />
            </div>
            <h1 className="mt-6 font-display font-bold text-2xl tracking-[-0.025em]">Hoppsan, något gick fel</h1>
            <p className="mt-2 text-subhead text-[var(--text-secondary)] leading-relaxed max-w-[300px] text-balance">
              {reported
                ? 'Vi har fått en rapport om felet och tittar på det. Ladda om så brukar det fungera igen.'
                : 'Ladda om sidan så brukar det fungera igen.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="ui-btn-primary mt-8"
          >
            Ladda om sidan
          </button>

          {noteSent ? (
            <p className="mt-10 text-subhead text-center text-[var(--text-secondary)]">Tack! Det hjälper oss att hitta felet.</p>
          ) : (
            <div className="mt-10 space-y-3">
              <label className="block text-footnote font-medium text-[var(--text-secondary)] px-1" htmlFor="crash-note">
                Vill du berätta vad du gjorde precis innan? (frivilligt)
              </label>
              <textarea
                id="crash-note"
                value={note}
                onChange={(e) => this.setState({ note: e.target.value })}
                rows={3}
                maxLength={1000}
                placeholder="T.ex. jag tryckte på Spara på en fast utgift"
                className="w-full rounded-card-nested bg-[var(--surface-color)] shadow-[var(--card-shadow)] px-4 py-3 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none resize-none"
              />
              <button
                type="button"
                onClick={this.sendNote}
                disabled={!note.trim() || sendingNote}
                className="ui-auth-btn-surface"
              >
                {sendingNote ? 'Skickar…' : 'Skicka'}
              </button>
            </div>
          )}

          {error && (
            <details className="mt-auto pt-8 text-footnote text-[var(--text-tertiary)]">
              <summary className="cursor-pointer text-center">Teknisk information</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono text-left">{error.toString()}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
