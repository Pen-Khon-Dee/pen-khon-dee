import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { adminLogin } from '../api';

const ADMIN_SESSION_KEY = 'pen_khon_dee_cashier';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();

  const [values, setValues] = useState({ identifier: '', password: '' });
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
    const found = {};
    if (!values.identifier.trim()) found.identifier = 'Enter your email or username.';
    if (!values.password) found.password = 'Enter your password.';
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      const data = await adminLogin({
        identifier: values.identifier.trim(),
        password: values.password,
      });
      if (data.employee?.role !== 'Cashier') {
        throw new Error('This account does not have permission to access the admin dashboard.');
      }
      sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
        token: data.token,
        employee: data.employee,
      }));
      navigate('/admin', { replace: true });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <aside className="auth-split__aside">
        <p className="auth-split__quote">Staff access</p>
        <p className="auth-split__text">Sign in with your cashier email or username to manage tables, bills, reservations, and menu items.</p>
      </aside>

      <div className="auth-split__main">
        <div className="auth-box">
          <h1 className="auth-box__title">Staff Login</h1>

          {location.state?.message && (
            <p className="alert alert--ok" role="status">
              {location.state.message}
            </p>
          )}

          <form className="form" onSubmit={onSubmit} noValidate>
            {submitError && (
              <p className="alert alert--error" role="alert">
                {submitError}
              </p>
            )}
            <Field label="Email or username" name="identifier" type="text" value={values.identifier} onChange={onChange} error={errors.identifier} autoComplete="username" />
            <Field label="Password" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} autoComplete="current-password" />
            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
