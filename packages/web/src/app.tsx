import { Navigate, NavLink, Route, Routes } from 'react-router';
import { Brand } from './brand.tsx';
import { HomePage } from './home-page.tsx';
import { CasesPage } from './cases-page.tsx';
import { UploadPage } from './upload-page.tsx';

export function App() {
  return (
    <>
      <a className="skip-link" href="#main-content">
        Skip to main content
      </a>
      <header className="site-header">
        <div className="header-inner">
          <Brand />
          <nav className="primary-nav" aria-label="Main navigation">
            <NavLink to="/home">Workspace</NavLink>
            <NavLink to="/upload">Upload record</NavLink>
            <NavLink to="/cases">Saved cases</NavLink>
          </nav>
        </div>
      </header>
      <div className="development-banner">
        <span className="preview-indicator" aria-hidden="true" />
        <p>
          <strong>Local preview</strong>
          <span className="banner-separator" aria-hidden="true">
            {' '}
            ·{' '}
          </span>
          Use synthetic documents only. Storage, processing, and court sign-in are not connected.
        </p>
      </div>
      <Routes>
        <Route
          path="*"
          element={
            <main id="main-content" className="page" tabIndex={-1}>
              <div className="empty-state panel">
                <p className="eyebrow">WORKSPACE / PAGE UNAVAILABLE</p>
                <h1>Page not found</h1>
                <p>The requested page is not available in this preview.</p>
                <a className="button primary-button" href="/home">
                  Return to workspace
                </a>
              </div>
            </main>
          }
        />
        <Route path="/" element={<Navigate to="/home" replace />} />
        <Route path="/home" element={<HomePage />} />
        <Route path="/cases" element={<CasesPage />} />
        <Route path="/upload" element={<UploadPage />} />
      </Routes>
      <footer className="site-footer">
        <span>Record Review</span>
        <span>Development workspace · Not for court records</span>
      </footer>
    </>
  );
}
