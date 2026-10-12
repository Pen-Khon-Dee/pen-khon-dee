export default function TablePicker({ tables, value, onChange, order, onNewOrder }) {
  if (order) {
    return (
      <div className="table-row">
        <div>
          <p className="table-row__label">Your table</p>
          <p className="table-row__value">Table {order.table_number}</p>
        </div>
        <button type="button" className="text-button" onClick={onNewOrder}>
          Order for another table
        </button>
      </div>
    );
  }

  return (
    <div className="table-row">
      <label htmlFor="table-number" className="table-row__label">
        Your table
      </label>

      <div className="select">
        <select
          id="table-number"
          value={value}
          onChange={(e) => onChange(e.target.value)}
        >
          <option value="">Choose a table</option>

          {tables.map((table) => (
            <option
              key={table.table_number}
              value={table.table_number}
              disabled={!table.can_order}
            >
              Table {table.table_number} · {table.capacity} seats
              {table.can_order ? ' · Ready to order' : ' · Not open'}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
