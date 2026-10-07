import { useState } from 'react';
import { Link } from 'react-router-dom';
import Field from '../components/Field';
import { createReservation } from '../api';
import { useAuth } from '../context/AuthContext';

const TIMES = (() => {
  const out = [];
  for (let m = 17 * 60 + 30; m <= 22 * 60 + 30; m += 30) {
    out.push(`${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`);
  }
  return out;
})();

const todayStr = () => {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 10);
};

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Please enter your name';
  if (!/^[0-9+\-\s]{8,15}$/.test(v.phone.trim())) e.phone = 'Please enter a valid phone number (8-15 characters)';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Please enter a valid email address to receive booking confirmation';
  if (!v.date) e.date = 'Please select a date';
  else if (v.date < todayStr()) e.date = 'Please select a date from today onwards';
  if (!v.time) e.time = 'Please select a time';
  if (!v.guests) e.guests = 'Please select the number of guests';
  return e;
}

export default function Reservation() {
  const { user, token } = useAuth();
  const [values, setValues] = useState({
    name: user?.name || '',
    phone: user?.phone || '',
    email: user?.email || '',
    date: '',
    time: '',
    guests: '2',
    note: '',
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(null);

  const onChange = (e) => {
    const { name, value } = e.target;
    setValues((v) => ({ ...v, [name]: value }));
    if (errors[name]) setErrors((er) => ({ ...er, [name]: undefined }));
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');
    const found = validate(values);
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      const booking = await createReservation(
        { ...values, guests: Number(values.guests) },
        token
      );
      setDone({ ...values, code: booking.code || booking.id });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (done) {
    return (
      <>
        <section className="page-head">
          <div className="container">
            <h1 className="page-head__title">Grazie!</h1>
            <p className="page-head__lead">We have received your booking request</p>
          </div>
        </section>
        <section className="band">
          <div className="container">
            <div className="receipt" role="status">
              <p className="receipt__code">{done.code}</p>
              <p>Booking Code</p>
              <dl className="receipt__list">
                <div>
                  <dt>Booker's Name</dt>
                  <dd>{done.name}</dd>
                </div>
                <div>
                  <dt>Date and Time</dt>
                  <dd>
                    {done.date} at {done.time} PM
                  </dd>
                </div>
                <div>
                  <dt>Number of Guests</dt>
                  <dd>{done.guests} guests</dd>
                </div>
              </dl>
              <p className="field__hint">
                We will send a confirmation email to {done.email}. The table will be held for 15 minutes after the booked time.
              </p>
              <div className="hero__actions">
                <Link to="/menu" className="btn btn--dark">
                  View Menu While Waiting
                </Link>
                <button type="button" className="btn" onClick={() => setDone(null)}>
                  Book Another Table
                </button>
              </div>
            </div>
          </div>
        </section>
      </>
    );
  }

  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1 className="page-head__title">Prenota un tavolo</h1>
          <p className="page-head__lead">
            Choose your preferred date and time, and we will hold the table for you. You will receive a confirmation email with your booking code.
          </p>
        </div>
      </section>

      <section className="band">
        <div className="container form-layout">
          <div className="prose">
            <h2 className="display display--small">Before You Book</h2>
            <p>
              Please note that groups of more than 10 people need to make a reservation by phone at 02-000-0000 to ensure we can accommodate your needs.
            </p>
            <p>
              We will hold your table for 15 minutes after the booked time. If you are running late, please call us at 02-000-0000 to let us know.
            </p>
            {!user && (
              <p>
                Already have an account?{' '}
                <Link to="/login" state={{ from: { pathname: '/reservation' } }}>
                  Log in
                </Link>{' '}
                to fill out information automatically
              </p>
            )}
          </div>

          <form className="form" onSubmit={onSubmit} noValidate>
            {submitError && (
              <p className="alert alert--error" role="alert">
                {submitError}
              </p>
            )}

            <Field label="Name" name="name" value={values.name} onChange={onChange} error={errors.name} autoComplete="name" />

            <div className="form__row">
              <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
              <Field label="Email" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            </div>

            <div className="form__row">
              <Field label="Date" name="date" type="date" min={todayStr()} value={values.date} onChange={onChange} error={errors.date} />
              <Field label="Time" name="time" as="select" value={values.time} onChange={onChange} error={errors.time}>
                <option value="">Select Time</option>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t} PM
                  </option>
                ))}
              </Field>
            </div>

            <Field label="Number of Guests" name="guests" as="select" value={values.guests} onChange={onChange} error={errors.guests}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} Guests
                </option>
              ))}
            </Field>

            <Field
              label="Note (if any)"
              name="note"
              as="textarea"
              rows={3}
              value={values.note}
              onChange={onChange}
              hint="e.g., birthday, window seat, or food allergies"
            />

            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'Processing...' : 'Confirm Reservation'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
