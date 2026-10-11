export default function Quantity({ name, quantity, onChange, onAdd }) {
  if (!quantity) {
    return (
      <button type="button" className="add" onClick={onAdd} aria-label={`Add ${name}`}>Add</button>
    );
  }
  return (
    <div className="qty" role="group" aria-label={`Quantity of ${name}`}>
      <button type="button" onClick={() => onChange(-1)} aria-label={`Remove one ${name}`}>−</button>
      <output>{quantity}</output>
      <button type="button" onClick={() => onChange(1)} aria-label={`Add one ${name}`}>+</button>
    </div>
  );
}
