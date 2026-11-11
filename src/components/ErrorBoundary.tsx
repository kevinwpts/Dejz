import React, { Component, ErrorInfo, ReactNode } from 'react';
import { sendFeedback } from '../utils/sendFeedback';

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
    console.error('Uncaught error:', error, errorInfo);
    this.componentStack = (errorInfo?.componentStack || '').slice(0, 1500);
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
      <div className="min-h-dvh flex items-center justify-center bg-[var(--bg-color)] text-[var(--text-primary)] px-4 py-10">
        <div className="w-full max-w-sm bg-[var(--surface-color)] border border-[var(--border-subtle)] rounded-container p-6 space-y-5 shadow-[var(--shadow-modal)]">
          <div className="space-y-2 text-center">
            <div className="text-4xl" aria-hidden="true">😕</div>
            <h1 className="font-display font-semibold text-xl">Hoppsan, något gick fel</h1>
            <p className="text-sm text-[var(--text-secondary)] leading-[1.5]">
              {reported
                ? 'Vi har fått en rapport om felet och tittar på det. Ladda om så brukar det fungera igen.'
                : 'Ladda om sidan så brukar det fungera igen.'}
            </p>
          </div>

          <button
            type="button"
            onClick={() => window.location.reload()}
            className="w-full h-12 rounded-full bg-[var(--cta-bg)] text-[var(--cta-fg)] shadow-[var(--cta-shadow)] font-display font-semibold text-sm active:scale-[0.99] transition-all cursor-pointer"
          >
            Ladda om sidan
          </button>

          {noteSent ? (
            <p className="text-sm text-center text-[var(--text-secondary)]">Tack! Det hjälper oss att hitta felet 💜</p>
          ) : (
            <div className="space-y-2">
              <label className="block text-xs font-medium text-[var(--text-secondary)]" htmlFor="crash-note">
                Vill du berätta vad du gjorde precis innan? (frivilligt)
              </label>
              <textarea
                id="crash-note"
                value={note}
                onChange={(e) => this.setState({ note: e.target.value })}
                rows={3}
                maxLength={1000}
                placeholder="T.ex. jag tryckte på Spara på en fast utgift"
                className="w-full rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] px-4 py-3 text-base text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:outline-none focus:border-[var(--accent-color)] resize-none"
              />
              <button
                type="button"
                onClick={this.sendNote}
                disabled={!note.trim() || sendingNote}
                className="w-full h-11 rounded-2xl bg-[var(--bg-color)] border border-[var(--border-subtle)] text-sm font-semibold text-[var(--text-primary)] active:scale-[0.99] transition-all cursor-pointer disabled:opacity-40"
              >
                {sendingNote ? 'Skickar…' : 'Skicka'}
              </button>
            </div>
          )}

          {error && (
            <details className="text-xs text-[var(--text-muted)]">
              <summary className="cursor-pointer">Teknisk information</summary>
              <pre className="mt-2 whitespace-pre-wrap break-all font-mono">{error.toString()}</pre>
            </details>
          )}
        </div>
      </div>
    );
  }
}

export default ErrorBoundary;
