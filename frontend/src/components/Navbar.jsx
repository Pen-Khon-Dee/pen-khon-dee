import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const links = [
  { to: '/', label: 'HOME', end: true },
  { to: '/menu', label: 'Menu' },
  { to: '/reservation', label: 'Reserve' },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  return (
    <header className="nav">
      <div className="container nav__inner">
        <form
          className="nav__search"
          role="search"
          onSubmit={(event) => {
            event.preventDefault();
            const query = search.trim();
            navigate(query ? `/menu?q=${encodeURIComponent(query)}` : '/menu');
          }}
        >
          <input
            type="search"
            aria-label="find menu"
            placeholder="Find menu..."
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button type="submit" aria-label="ค้นหา">⌕</button>
        </form>

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
                <span className="nav__user">Hello {user.name}</span>
                <button type="button" className="btn btn--ghost-light btn--small" onClick={logout}>
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link to="/login" className="nav__link">
                  Login
                </Link>
                <Link to="/register" className="btn btn--light btn--small">
                  Join Member
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
