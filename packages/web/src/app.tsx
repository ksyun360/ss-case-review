import { useEffect, useRef } from 'react';
import { Navigate, NavLink, Route, Routes, useLocation } from 'react-router';
import { Brand } from './brand.tsx';
import { HomePage } from './home-page.tsx';
import { CasesPage } from './cases-page.tsx';
import { CaseDetailPage } from './case-detail-page.tsx';
import { UploadPage } from './upload-page.tsx';
import { DemoCasePage } from './demo-case-page.tsx';

export function App() {
  const { pathname } = useLocation();
  const previousPath = useRef(pathname);

  useEffect(() => {
    if (previousPath.current !== pathname) {
      (document.getElementById('main-content') as HTMLElement).focus();
      previousPath.current = pathname;
    }
  }, [pathname]);

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
          Use synthetic documents only. Local original registration requires a configured API;
          background PDF processing requires the same API. Court sign-in is unavailable.
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
        <Route path="/cases/:caseId" element={<CaseDetailPage />} />
        <Route path="/upload" element={<UploadPage />} />
        <Route path="/demo" element={<DemoCasePage />} />
      </Routes>
      <footer className="site-footer">
        <span>Record Review</span>
        <span>Development workspace · Not for court records</span>
      </footer>
    </>
  );
}
