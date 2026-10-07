import { Link } from 'react-router-dom';

export default function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <p className="footer__brand">PEN KHON DEE</p>
          </div>
          <div>
            <p className="footer__title">OPEN</p>
            <p>Every Day 17:30 – 23:00</p>
            <p>Last Order 22:15</p>
          </div>
          <div>
            <p className="footer__title">Contact</p>
            <p>02-000-0000</p>
            <p>
              <Link to="/reservation">Reserve Table</Link>
            </p>
          </div>
        </div>
        <p className="footer__bottom">© {new Date().getFullYear()} PEN KHON DEE</p>
      </div>
    </footer>
  );
}
