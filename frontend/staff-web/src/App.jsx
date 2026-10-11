import { useEffect } from 'react';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import Workstation from './pages/Workstation';
import Tables from './pages/admin/Tables';
import Reservations from './pages/admin/Reservations';
import Customers from './pages/admin/Customers';
import MenuManager from './pages/admin/MenuManager';
import { readSession } from './lib/session';

function Home() {
  const role = readSession()?.employee?.role;
  if (role === 'Kitchen') return <Navigate to="/kitchen" replace />;
  if (role === 'Server') return <Navigate to="/server" replace />;
  return <Navigate to="/admin/tables" replace />;
}

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);
  return null;
}

function NotFound() {
  return (
    <div className="notfound">
      <h1>Page not found</h1>
      <p>The page you are looking for doesn’t exist.</p>
      <Link to="/admin/tables" className="btn btn--primary">Go to tables</Link>
    </div>
  );
}

export default function App() {
  return (
    <>
      <a href="#main" className="skip">Skip to content</a>
      <ScrollToTop />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/kitchen" element={<Workstation role="Kitchen" />} />
        <Route path="/server" element={<Workstation role="Server" />} />
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<Navigate to="tables" replace />} />
          <Route path="tables" element={<Tables />} />
          <Route path="reservations" element={<Reservations />} />
          <Route path="customers" element={<Customers />} />
          <Route path="menu" element={<MenuManager />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}
