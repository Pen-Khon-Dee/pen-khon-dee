import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';
import { adminLogin } from '../api';

const ADMIN_SESSION_KEY = 'pen_khon_dee_cashier';
const MOCK = import.meta.env.VITE_USE_MOCK === 'true';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = location.state?.from?.pathname || '/';

  const [values, setValues] = useState({ email: '', password: '' });
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
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = 'email required';
    if (!values.password) found.password = 'password required';
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    const email = values.email.trim().toLowerCase();
    if (MOCK) {
      try {
        await login(email, values.password);
        navigate(redirectTo, { replace: true });
      } catch (customerError) {
        try {
          const data = await adminLogin({ email, password: values.password });
          if (data.employee?.role !== 'Cashier') {
            throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานหน้าแอดมิน');
          }
          sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
            token: data.token,
            employee: data.employee,
          }));
          navigate('/admin', { replace: true });
        } catch {
          setSubmitError(customerError.message);
        }
      }
    } else {
      try {
        const data = await adminLogin({ email, password: values.password });
        if (data.employee?.role !== 'Cashier') {
          throw new Error('บัญชีนี้ไม่มีสิทธิ์เข้าใช้งานหน้าแอดมิน');
        }
        sessionStorage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
          token: data.token,
          employee: data.employee,
        }));
        navigate('/admin', { replace: true });
      } catch (err) {
        setSubmitError(err.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <aside className="auth-split__aside">
        <p className="auth-split__quote">Bentornati.</p>
        <p className="auth-split__text">Log in to your account to make reservations quickly without having to re-enter your information.</p>
      </aside>

      <div className="auth-split__main">
        <div className="auth-box">
          <h1 className="auth-box__title">Log In</h1>

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
            <Field label="Email" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            <Field label="Password" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} autoComplete="current-password" />
            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'Logging in…' : 'Log In'}
            </button>
          </form>
          <p className="auth-box__switch">
            Don't have an account? <Link to="/register">Register</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
