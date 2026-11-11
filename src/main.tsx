import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import ErrorBoundary from './components/ErrorBoundary';
import { EmailVerifiedNotice } from './components/EmailVerification';
import './index.css';
import { captureFirstTouch } from './utils/attribution';
import { getPublicPageKind, PublicInfoPage } from './components/PublicInfoPage';

// Spara utm-länken (t.ex. ?utm_source=tiktok) innan något annat hinner ändra adressen
captureFirstTouch();

const renderApp = () => {
  let container = document.getElementById('root');
  if (!container) {
    container = document.createElement('div');
    container.id = 'root';
    document.body.appendChild(container);
  }
  const root = createRoot(container);
  // dejz.se/integritet, /villkor och /support visas som egna sidor (krävs av App Store)
  const publicPage = getPublicPageKind(window.location.pathname);
  if (publicPage) {
    root.render(
      <StrictMode>
        <PublicInfoPage kind={publicPage} />
      </StrictMode>,
    );
    return;
  }
  root.render(
    <StrictMode>
      <ErrorBoundary>
        <App />
        <EmailVerifiedNotice />
      </ErrorBoundary>
    </StrictMode>,
  );
};

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', renderApp);
} else {
  renderApp();
}
