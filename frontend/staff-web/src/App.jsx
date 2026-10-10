import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import Admin from './pages/Admin';

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <section className="band band--grey">
      <div className="container">
        <h1 className="display">404 - Page Not Found</h1>
        <p className="prose" style={{ marginTop: '1rem' }}>
          The page you are looking for could not be found.
        </p>
        <p style={{ marginTop: '2rem' }}>
          <Link to="/admin" className="btn btn--dark">
            Go to Admin
          </Link>
        </p>
      </div>
    </section>
  );
}

export default function App() {
  return (
    <>
      <a href="#main" className="skip">
        Skip to content
      </a>
      <ScrollToTop />
      <main id="main">
        <Routes>
          <Route path="/" element={<Navigate to="/admin" replace />} />
          <Route path="/login" element={<Login />} />
          <Route path="/admin" element={<Admin />} />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
    </>
  );
}
