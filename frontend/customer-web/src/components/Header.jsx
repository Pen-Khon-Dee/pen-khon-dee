export default function Header({ table, orderId }) {
  return (
    <header className="header">
      <a className="wordmark" href="/" aria-label="Pen Khon Dee">Pen Khon Dee</a>
      {table ? (
        <p className="header__table">Table {table}{orderId ? <span> · Order #{orderId}</span> : null}</p>
      ) : null}
    </header>
  );
}
