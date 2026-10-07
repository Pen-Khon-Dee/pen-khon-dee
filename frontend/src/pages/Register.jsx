import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { register } from '../api';

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'Name is required';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'Please enter a valid email address';
  if (!/^[0-9+\-\s]{8,15}$/.test(v.phone.trim())) e.phone = 'Please enter a valid phone number (8-15 characters)';
  if (v.password.length < 8) e.password = 'Password must be at least 8 characters long';
  if (v.confirm !== v.password) e.confirm = 'Passwords do not match';
  return e;
}

export default function Register() {
  const navigate = useNavigate();
  const [values, setValues] = useState({ name: '', email: '', phone: '', password: '', confirm: '' });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);

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
      await register({
        name: values.name.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        password: values.password,
      });
      navigate('/login', { state: { message: 'Registration successful. You can now log in.' } });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <aside className="auth-split__aside">
        <p className="auth-split__quote">Benvenuti a casa nostra.</p>
        <p className="auth-split__text">
          Registered members can book tables faster without having to re-enter their information and get early access to new menu items.
        </p>
      </aside>

      <div className="auth-split__main">
        <div className="auth-box">
          <h1 className="auth-box__title">Register</h1>
          <form className="form" onSubmit={onSubmit} noValidate>
            {submitError && (
              <p className="alert alert--error" role="alert">
                {submitError}
              </p>
            )}
            <Field label="Name" name="name" value={values.name} onChange={onChange} error={errors.name} autoComplete="name" />
            <Field label="Email" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            <Field label="Phone" name="phone" type="tel" value={values.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
            <Field label="Password" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} hint="At least 8 characters" autoComplete="new-password" />
            <Field label="Confirm Password" name="confirm" type="password" value={values.confirm} onChange={onChange} error={errors.confirm} autoComplete="new-password" />
            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'Registering…' : 'Register'}
            </button>
          </form>
          <p className="auth-box__switch">
            Already have an account? <Link to="/login">Log in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
