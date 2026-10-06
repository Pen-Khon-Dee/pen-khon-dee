import React from "react";

export default function Header() {
  return (
    <header className="site-header">
      <form className="site-search" role="search" onSubmit={(event) => event.preventDefault()}>
        <label className="sr-only" htmlFor="site-search-input">
          Search
        </label>
        <svg aria-hidden="true" viewBox="0 0 24 24" className="search-icon">
          <circle cx="10.8" cy="10.8" r="6.8" />
          <path d="m16 16 4.5 4.5" />
        </svg>
        <input id="site-search-input" type="search" placeholder="Search..." />
      </form>

      <a className="brand" href="/" aria-label="Pen Khon Dee home">
        pen khon dee
      </a>

      <nav className="site-nav" aria-label="Main navigation">
        <a href="#about">About</a>
        <a href="#menu">Menu</a>
        <a className="reserve-link" href="#reserve">Reserve</a>
      </nav>

      <style>{`
        .site-header {
          box-sizing: border-box;
          width: 100%;
          min-height: 76px;
          padding: 14px clamp(20px, 5vw, 72px);
          display: grid;
          grid-template-columns: 1fr auto 1fr;
          align-items: center;
          gap: 24px;
          background: #fffdf9;
          color: #24231f;
          border-bottom: 1px solid #eee9df;
          font-family: inherit;
        }
        .site-search {
          display: flex;
          align-items: center;
          gap: 9px;
          width: min(100%, 220px);
          color: #77746d;
        }
        .search-icon {
          flex: 0 0 17px;
          width: 17px;
          height: 17px;
          fill: none;
          stroke: currentColor;
          stroke-width: 1.7;
          stroke-linecap: round;
        }
        .site-search input {
          box-sizing: border-box;
          width: 100%;
          min-width: 0;
          padding: 8px 0;
          border: 0;
          outline: 0;
          background: transparent;
          color: inherit;
          font: inherit;
          font-size: 13px;
        }
        .site-search input::placeholder { color: #929087; }
        .site-search:focus-within { color: #27251f; }
        .site-search:focus-within input { box-shadow: 0 1px #a4784e; }
        .brand {
          color: inherit;
          text-decoration: none;
          white-space: nowrap;
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(21px, 2vw, 27px);
          letter-spacing: -0.045em;
        }
        .site-nav {
          justify-self: end;
          display: flex;
          align-items: center;
          gap: clamp(12px, 2vw, 28px);
        }
        .site-nav a {
          color: inherit;
          text-decoration: none;
          font-size: 12px;
          letter-spacing: 0.025em;
        }
        .site-nav a:hover { color: #98704b; }
        .site-nav .reserve-link {
          padding: 9px 14px;
          border: 1px solid #b8a58e;
          border-radius: 2px;
        }
        .site-nav .reserve-link:hover {
          color: #fffdf9;
          background: #6f5138;
          border-color: #6f5138;
        }
        .sr-only {
          position: absolute;
          width: 1px;
          height: 1px;
          padding: 0;
          margin: -1px;
          overflow: hidden;
          clip: rect(0, 0, 0, 0);
          white-space: nowrap;
          border: 0;
        }
        @media (max-width: 600px) {
          .site-header {
            min-height: 68px;
            padding-inline: 16px;
            grid-template-columns: 1fr auto;
            gap: 10px;
          }
          .brand { grid-column: 1; grid-row: 1; }
          .site-search { grid-column: 1; grid-row: 2; width: 100%; }
          .site-nav { grid-column: 2; grid-row: 1 / span 2; gap: 12px; }
          .site-nav a { font-size: 11px; }
          .site-nav .reserve-link { padding: 8px 9px; }
        }
      `}</style>
    </header>
  );
}
