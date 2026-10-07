import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'HOME', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/reservation', label: 'Reserve' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const location = useLocation();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <Link to="/" className="brand">
          PEN KHON DEE
        </Link>

        <button
          type="button"
          className="nav__toggle"
          aria-expanded={open}
          aria-controls="nav-menu"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? 'Close' : 'Navigation Menu'}
        </button>

        <div id="nav-menu" className={`nav__menu${open ? ' is-open' : ''}`}>
          <nav aria-label="Main Menu">
            <ul className="nav__links">
              {links.map((l) => (
                <li key={l.to}>
                  <NavLink to={l.to} end={l.end} className="nav__link">
                    {l.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          <div className="nav__auth">
            {user ? (
              <>
                <span className="nav__user">สวัสดี {user.name}</span>
                <button type="button" className="btn btn--ghost-light btn--small" onClick={logout}>
                  ออกจากระบบ
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav__link">
                  เข้าสู่ระบบ
                </Link>
                <Link to="/register" className="btn btn--light btn--small">
                  สมัครสมาชิก
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
