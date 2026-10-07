import { Link } from 'react-router-dom';
import { menuItems, signatureIds } from '../data/menu';

const signature = signatureIds.map((id) => menuItems.find((m) => m.id === id)).filter(Boolean);

export default function Home() {
  return (
    <>
      <section className="hero">
        <div className="container hero__grid">
          <div>
            <h1 className="hero__title">A tavola, senza fretta.</h1>
            <p className="hero__lead">
              มาถึงโต๊ะอย่างไม่เร่งรีบ ปาสต้าทำสดทุกเช้า พิซซ่าจากเตาฟืน
              และไวน์ที่คัดมาให้เข้ากับทุกจาน
            </p>
            <div className="hero__actions">
              <Link to="/reservation" className="btn btn--light">
                จองโต๊ะ
              </Link>
              <Link to="/menu" className="btn btn--ghost-light">
                ดูเมนู
              </Link>
            </div>
          </div>

          <div className="plate">
            <div className="plate__body">
              <p className="plate__title">Aperto ogni sera</p>
              <p className="plate__sub">เปิดทุกวัน 17:30 – 23:00</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container story">
          <h2 className="display">Pochi ingredienti, fatti bene.</h2>
          <div className="prose">
            <p>
              เราเชื่อว่าอาหารอิตาเลียนที่ดีเริ่มจากวัตถุดิบไม่กี่อย่างที่ดีจริง
              เส้นพาสต้านวดและตัดใหม่ทุกเช้า ซอสเคี่ยวช้าตามสูตรดั้งเดิม
              และแป้งพิซซ่าหมักนาน 48 ชั่วโมงก่อนเข้าเตาฟืน
            </p>
            <p>
              ห้องอาหารโทนขาวดำเรียบหรู ไฟอบอุ่น เหมาะกับมื้อค่ำสำหรับสองคน
              ไปจนถึงโต๊ะใหญ่ของครอบครัวและเพื่อนฝูง
            </p>
          </div>
        </div>
      </section>

      <section className="band band--grey">
        <div className="container">
          <div className="section-head">
            <h2 className="display">จานที่เราภูมิใจ</h2>
            <Link to="/menu" className="btn btn--dark">
              ดูเมนูทั้งหมด
            </Link>
          </div>
          <ul className="signature">
            {signature.map((dish) => (
              <li key={dish.id} className="signature__item">
                <h3 className="signature__name">{dish.name}</h3>
                <p className="signature__desc">{dish.description}</p>
                <p className="price">฿{dish.price}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="band band--dark">
        <div className="container">
          <h2 className="display">มาทานด้วยกันที่ Osteria Nero</h2>
          <dl className="info">
            <div>
              <dt>เวลาเปิดบริการ</dt>
              <dd>ทุกวัน 17:30 – 23:00</dd>
            </div>
            <div>
              <dt>ที่ตั้ง</dt>
              <dd>88 ถนนตัวอย่าง แขวงตัวอย่าง กรุงเทพฯ 10110</dd>
            </div>
            <div>
              <dt>โทรศัพท์</dt>
              <dd>02-000-0000</dd>
            </div>
          </dl>
          <div className="cta-row">
            <Link to="/reservation" className="btn btn--light">
              จองโต๊ะออนไลน์
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
