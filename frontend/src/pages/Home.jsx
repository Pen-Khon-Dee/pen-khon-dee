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
              We believe that good Italian food starts with a few really good ingredients. Freshly made pasta, slow-cooked sauces, and pizza dough fermented for 48 hours before going into the wood-fired oven.
            </p>
            <div className="hero__actions">
              <Link to="/reservation" className="btn btn--light">
                reserve a table
              </Link>
              <Link to="/menu" className="btn btn--ghost-light">
                view menu
              </Link>
            </div>
          </div>

          <div className="plate">
            <div className="plate__body">
              <p className="plate__title">Aperto ogni sera</p>
              <p className="plate__sub">Open every evening 17:30 – 23:00</p>
            </div>
          </div>
        </div>
      </section>

      <section className="band">
        <div className="container story">
          <h2 className="display">Pochi ingredienti, fatti bene.</h2>
          <div className="prose">
            <p>
              We believe that good Italian food starts with a few really good ingredients. Freshly made pasta, slow-cooked sauces, and pizza dough fermented for 48 hours before going into the wood-fired oven.
            </p>
            <p>
              The restaurant features a sophisticated black and white interior with warm lighting, perfect for a romantic dinner for two or a large table for family and friends.
            </p>
          </div>
        </div>
      </section>

      <section className="band band--grey">
        <div className="container">
          <div className="section-head">
            <h2 className="display">Signature Dishes</h2>
            <Link to="/menu" className="btn btn--dark">
              View All Menu Items
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
          <h2 className="display">Come and dine with us at PEN KHON DEE</h2>
          <dl className="info">
            <div>
              <dt>Operating Hours</dt>
              <dd>Every day 17:30 – 23:00</dd>
            </div>
            <div>
              <dt>Location</dt>
              <dd>88 Example Road, Example Subdistrict, Bangkok 10110</dd>
            </div>
            <div>
              <dt>Phone</dt>
              <dd>02-000-0000</dd>
            </div>
          </dl>
          <div className="cta-row">
            <Link to="/reservation" className="btn btn--light">
              Reserve a Table
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
