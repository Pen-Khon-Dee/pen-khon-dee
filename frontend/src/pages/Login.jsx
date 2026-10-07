import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { useAuth } from '../context/AuthContext';

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
    if (!/^\S+@\S+\.\S+$/.test(values.email.trim())) found.email = 'กรอกอีเมลให้ถูกต้อง';
    if (!values.password) found.password = 'กรอกรหัสผ่าน';
    setErrors(found);
    if (Object.keys(found).length) return;

    setLoading(true);
    try {
      await login(values.email.trim(), values.password);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setSubmitError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      <aside className="auth-split__aside">
        <p className="auth-split__quote">Bentornati.</p>
        <p className="auth-split__text">เข้าสู่ระบบเพื่อจองโต๊ะได้รวดเร็วขึ้น โดยไม่ต้องกรอกข้อมูลซ้ำ</p>
      </aside>

      <div className="auth-split__main">
        <div className="auth-box">
          <h1 className="auth-box__title">เข้าสู่ระบบ</h1>

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
            <Field label="อีเมล" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            <Field label="รหัสผ่าน" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} autoComplete="current-password" />
            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'กำลังเข้าสู่ระบบ…' : 'เข้าสู่ระบบ'}
            </button>
          </form>
          <p className="auth-box__switch">
            ยังไม่มีบัญชี? <Link to="/register">สมัครสมาชิก</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
