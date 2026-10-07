import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Field from '../components/Field';
import { register } from '../api';

function validate(v) {
  const e = {};
  if (!v.name.trim()) e.name = 'กรอกชื่อ-นามสกุล';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'กรอกอีเมลให้ถูกต้อง';
  if (!/^[0-9+\-\s]{8,15}$/.test(v.phone.trim())) e.phone = 'กรอกเบอร์โทรให้ถูกต้อง เช่น 081-234-5678';
  if (v.password.length < 8) e.password = 'รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร';
  if (v.confirm !== v.password) e.confirm = 'รหัสผ่านทั้งสองช่องไม่ตรงกัน';
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
      navigate('/login', { state: { message: 'สมัครสมาชิกเรียบร้อย เข้าสู่ระบบได้เลย' } });
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
          สมาชิกจองโต๊ะได้เร็วขึ้นโดยไม่ต้องกรอกข้อมูลซ้ำ และรับสิทธิ์ชิมเมนูใหม่ก่อนใคร
        </p>
      </aside>

      <div className="auth-split__main">
        <div className="auth-box">
          <h1 className="auth-box__title">สมัครสมาชิก</h1>
          <form className="form" onSubmit={onSubmit} noValidate>
            {submitError && (
              <p className="alert alert--error" role="alert">
                {submitError}
              </p>
            )}
            <Field label="ชื่อ-นามสกุล" name="name" value={values.name} onChange={onChange} error={errors.name} autoComplete="name" />
            <Field label="อีเมล" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            <Field label="เบอร์โทร" name="phone" type="tel" value={values.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
            <Field label="รหัสผ่าน" name="password" type="password" value={values.password} onChange={onChange} error={errors.password} hint="อย่างน้อย 8 ตัวอักษร" autoComplete="new-password" />
            <Field label="ยืนยันรหัสผ่าน" name="confirm" type="password" value={values.confirm} onChange={onChange} error={errors.confirm} autoComplete="new-password" />
            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'กำลังสมัคร…' : 'สมัครสมาชิก'}
            </button>
          </form>
          <p className="auth-box__switch">
            มีบัญชีอยู่แล้ว? <Link to="/login">เข้าสู่ระบบ</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
