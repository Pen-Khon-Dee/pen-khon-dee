import { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import Wordmark from '../components/Wordmark';
import { adminLogin } from '../api';
import { saveSession } from '../lib/session';

function pathForRole(role) {
  if (role === 'Kitchen') return '/kitchen';
  if (role === 'Server') return '/server';
  return '/admin/tables';
}

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
      saveSession({ token: data.token, employee: data.employee });
      navigate(pathForRole(data.employee?.role), { replace: true });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main id="main" className="login">
      <div className="login__panel">
        <Wordmark className="wordmark--lg" />
        <h1 className="login__title">Staff sign in</h1>
        <p className="login__lead">Sign in with your staff account to open the tools for your role.</p>

        {location.state?.message && <p className="banner banner--ok" role="status"><span>{location.state.message}</span></p>}
        {submitError && <p className="banner banner--error" role="alert"><span>{submitError}</span></p>}

        <form className="form" onSubmit={onSubmit} noValidate>
          <Field label="Email or username" name="identifier" type="text" value={values.identifier} onChange={onChange} error={errors.identifier} autoComplete="username" />
          <Field label="Password" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} autoComplete="current-password" />
          <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </main>
  );
}
