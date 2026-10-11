import { useOutletContext } from 'react-router-dom';
import { createAdminCustomer, enrollAdminMember } from '../../api';
import useCustomerSearch from '../../hooks/useCustomerSearch';
import { Labeled } from '../../components/Field';

export default function Customers() {
  const { token, loading, run, setError, setNotice } = useOutletContext();
  const search = useCustomerSearch({ token, run, setError });
  const { customer, notFound } = search;

  const create = (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const name = String(data.get('customerName') || '').trim();
    const email = String(data.get('customerEmail') || '').trim();
    run(async () => {
      const created = await createAdminCustomer({
        name,
        phone: search.phone.trim(),
        ...(email ? { email } : {}),
      }, token);
      search.setCustomer(created);
      search.setNotFound(false);
      form.reset();
      setNotice('Customer added.');
    });
  };

  const enroll = () => run(async () => {
    search.setCustomer(await enrollAdminMember(customer.customer_id, token));
    setNotice('Membership created.');
  });

  return (
    <div className="narrow">
      <header className="page-head">
        <h1 className="page-title">Customers</h1>
      </header>

      <form className="inline-form" onSubmit={(e) => { e.preventDefault(); search.search(); }}>
        <Labeled label="Phone number">
          <input className="field__control" type="tel" value={search.phone} onChange={(e) => search.changePhone(e.target.value)} required />
        </Labeled>
        <button type="submit" className="btn btn--primary" disabled={loading}>Search</button>
      </form>

      {customer && (
        <article className="card">
          <h2 className="card__title">{customer.name}</h2>
          <dl className="facts">
            <div><dt>Phone</dt><dd>{customer.phone}</dd></div>
            <div><dt>Email</dt><dd>{customer.email || '—'}</dd></div>
            <div><dt>Membership</dt><dd>{customer.member?.member_level || 'Not a member'}</dd></div>
            <div><dt>Points</dt><dd>{customer.member?.current_points ?? 0}</dd></div>
          </dl>
          {!customer.member && (
            <button type="button" className="btn btn--ghost" disabled={loading} onClick={enroll}>Enroll as member</button>
          )}
        </article>
      )}

      {notFound && (
        <form className="card form" onSubmit={create}>
          <h2 className="card__title">No customer found</h2>
          <p className="muted">Add them with this phone number.</p>
          <Labeled label="Name"><input className="field__control" name="customerName" required /></Labeled>
          <Labeled label="Phone number"><input className="field__control" value={search.phone} readOnly /></Labeled>
          <Labeled label="Email (optional)"><input className="field__control" name="customerEmail" type="email" /></Labeled>
          <button type="submit" className="btn btn--primary" disabled={loading}>Add customer</button>
        </form>
      )}
    </div>
  );
}
