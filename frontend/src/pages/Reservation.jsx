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
  if (!v.name.trim()) e.name = 'กรอกชื่อผู้จอง';
  if (!/^[0-9+\-\s]{8,15}$/.test(v.phone.trim())) e.phone = 'กรอกเบอร์โทรให้ถูกต้อง เช่น 081-234-5678';
  if (!/^\S+@\S+\.\S+$/.test(v.email.trim())) e.email = 'กรอกอีเมลให้ถูกต้อง เพื่อรับการยืนยันการจอง';
  if (!v.date) e.date = 'เลือกวันที่';
  else if (v.date < todayStr()) e.date = 'เลือกวันที่ตั้งแต่วันนี้เป็นต้นไป';
  if (!v.time) e.time = 'เลือกเวลา';
  if (!v.guests) e.guests = 'เลือกจำนวนผู้ทานอาหาร';
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
            <p className="page-head__lead">เราได้รับการจองของคุณแล้ว</p>
          </div>
        </section>
        <section className="band">
          <div className="container">
            <div className="receipt" role="status">
              <p className="receipt__code">{done.code}</p>
              <p>รหัสการจอง</p>
              <dl className="receipt__list">
                <div>
                  <dt>ชื่อผู้จอง</dt>
                  <dd>{done.name}</dd>
                </div>
                <div>
                  <dt>วันและเวลา</dt>
                  <dd>
                    {done.date} เวลา {done.time} น.
                  </dd>
                </div>
                <div>
                  <dt>จำนวนผู้ทานอาหาร</dt>
                  <dd>{done.guests} ท่าน</dd>
                </div>
              </dl>
              <p className="field__hint">
                เราจะส่งอีเมลยืนยันไปที่ {done.email} โต๊ะจะถูกเก็บไว้ให้ 15 นาทีหลังเวลาที่จอง
              </p>
              <div className="hero__actions">
                <Link to="/menu" className="btn btn--dark">
                  ดูเมนูระหว่างรอ
                </Link>
                <button type="button" className="btn" onClick={() => setDone(null)}>
                  จองโต๊ะเพิ่ม
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
            เลือกวัน เวลา และจำนวนผู้ทานอาหาร เราจะยืนยันการจองทางอีเมล
          </p>
        </div>
      </section>

      <section className="band">
        <div className="container form-layout">
          <div className="prose">
            <h2 className="display display--small">ก่อนจอง</h2>
            <p>รับจองทุกวัน เวลา 17:30 – 22:30 โต๊ะจะถูกเก็บไว้ให้ 15 นาทีหลังเวลาที่จอง</p>
            <p>
              กลุ่มมากกว่า 10 ท่าน กรุณาโทร 02-000-0000
              เพื่อให้เราจัดโต๊ะและเมนูเฉพาะกลุ่มให้
            </p>
            {!user && (
              <p>
                มีบัญชีแล้ว?{' '}
                <Link to="/login" state={{ from: { pathname: '/reservation' } }}>
                  เข้าสู่ระบบ
                </Link>{' '}
                เพื่อกรอกข้อมูลอัตโนมัติ
              </p>
            )}
          </div>

          <form className="form" onSubmit={onSubmit} noValidate>
            {submitError && (
              <p className="alert alert--error" role="alert">
                {submitError}
              </p>
            )}

            <Field label="ชื่อผู้จอง" name="name" value={values.name} onChange={onChange} error={errors.name} autoComplete="name" />

            <div className="form__row">
              <Field label="เบอร์โทร" name="phone" type="tel" value={values.phone} onChange={onChange} error={errors.phone} autoComplete="tel" />
              <Field label="อีเมล" name="email" type="email" value={values.email} onChange={onChange} error={errors.email} autoComplete="email" />
            </div>

            <div className="form__row">
              <Field label="วันที่" name="date" type="date" min={todayStr()} value={values.date} onChange={onChange} error={errors.date} />
              <Field label="เวลา" name="time" as="select" value={values.time} onChange={onChange} error={errors.time}>
                <option value="">เลือกเวลา</option>
                {TIMES.map((t) => (
                  <option key={t} value={t}>
                    {t} น.
                  </option>
                ))}
              </Field>
            </div>

            <Field label="จำนวนผู้ทานอาหาร" name="guests" as="select" value={values.guests} onChange={onChange} error={errors.guests}>
              {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} ท่าน
                </option>
              ))}
            </Field>

            <Field
              label="หมายเหตุ (ถ้ามี)"
              name="note"
              as="textarea"
              rows={3}
              value={values.note}
              onChange={onChange}
              hint="เช่น วันเกิด ที่นั่งริมหน้าต่าง หรืออาหารที่แพ้"
            />

            <button type="submit" className="btn btn--dark btn--block" disabled={loading}>
              {loading ? 'กำลังจอง…' : 'ยืนยันการจอง'}
            </button>
          </form>
        </div>
      </section>
    </>
  );
}
