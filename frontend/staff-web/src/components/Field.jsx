// ช่องกรอกฟอร์มที่ผูก label, ข้อความช่วยเหลือ และข้อความผิดพลาดเข้ากับ input ให้อัตโนมัติ
export default function Field({ label, name, error, hint, as: Control = 'input', children, ...rest }) {
  const id = `field-${name}`;
  const describedBy =
    [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(' ') || undefined;

  return (
    <div className="field">
      <label className="field__label" htmlFor={id}>{label}</label>
      <Control
        id={id}
        name={name}
        className="field__control"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={describedBy}
        {...rest}
      >
        {children}
      </Control>
      {hint && <p className="field__hint" id={`${id}-hint`}>{hint}</p>}
      {error && <p className="field__error" id={`${id}-error`}>{error}</p>}
    </div>
  );
}

// ฟอร์มที่ใช้ label ครอบ input (ใช้ในหน้า admin)
export function Labeled({ label, children }) {
  return (
    <label className="field">
      <span className="field__label">{label}</span>
      {children}
    </label>
  );
}
