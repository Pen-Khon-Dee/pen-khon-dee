import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { menuItems, signatureIds } from '../data/menu';

const signature = signatureIds.map((id) => menuItems.find((m) => m.id === id)).filter(Boolean);
const heroImages = [
  { src: '/images/hero-1.jpg', alt: 'บรรยากาศร้าน PEN KHON DEE' },
  { src: '/images/hero-2.jpg', alt: 'อาหารจานพิเศษของร้าน' },
  { src: '/images/hero-3.jpg', alt: 'มื้ออาหารสไตล์อิตาเลียน' },
];

function HeroSlideshow() {
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveSlide((current) => (current + 1) % heroImages.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, []);

  const showSlide = (index) => {
    setActiveSlide((index + heroImages.length) % heroImages.length);
  };

  return (
    <div className="hero__visual" aria-label="ภาพบรรยากาศร้านอาหาร">
      {heroImages.map((image, index) => (
        <div
          key={image.src}
          className={`hero__slide${index === activeSlide ? ' is-active' : ''}`}
          role="img"
          aria-label={image.alt}
          style={{ backgroundImage: `url("${image.src}")` }}
          aria-hidden={index !== activeSlide}
        />
      ))}
      <div className="hero__slide-controls" aria-label="slideshow controls">
        <button className="hero__arrow" type="button" onClick={() => showSlide(activeSlide - 1)} aria-label="ภาพก่อนหน้า">‹</button>
        {heroImages.map((image, index) => (
          <button
            key={image.src}
            className={`hero__dot${index === activeSlide ? ' is-active' : ''}`}
            type="button"
            onClick={() => showSlide(index)}
            aria-label={`ไปภาพที่ ${index + 1}`}
            aria-current={index === activeSlide ? 'true' : undefined}
          />
        ))}
        <button className="hero__arrow" type="button" onClick={() => showSlide(activeSlide + 1)} aria-label="ภาพถัดไป">›</button>
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <>
      <section className="hero">
        <HeroSlideshow />
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
