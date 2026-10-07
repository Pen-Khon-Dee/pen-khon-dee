import { useEffect, useMemo, useState } from 'react';
import { categories, menuItems as fallbackItems } from '../data/menu';
import { getMenu } from '../api';

const baht = (n) => `฿${Number(n).toLocaleString('th-TH')}`;

export default function Menu() {
  const [items, setItems] = useState(null);
  const [notice, setNotice] = useState('');
  const [active, setActive] = useState(categories[0].id);

  useEffect(() => {
    let alive = true;
    getMenu()
      .then((data) => alive && setItems(data))
      .catch(() => {
        if (!alive) return;
        setItems(fallbackItems);
        setNotice('Failed to connect to the server. Displaying sample menu instead.');
      });
    return () => {
      alive = false;
    };
  }, []);

  const category = categories.find((c) => c.id === active);
  const visible = useMemo(
    () => (items ? items.filter((i) => i.category === active) : []),
    [items, active]
  );

  return (
    <>
      <section className="page-head">
        <div className="container">
          <h1 className="page-head__title">Il Menù</h1>
          <p className="page-head__lead">
            Traditional Italian menu, prepared fresh for each dish, prices include VAT.
            If you have any dietary restrictions or are vegetarian, please inform the staff.
          </p>
        </div>
      </section>

      <div className="menu-tabs">
        <div className="container">
          <div className="menu-tabs__list" role="group" aria-label="หมวดเมนู">
            {categories.map((c) => (
              <button
                key={c.id}
                type="button"
                className="menu-tab"
                aria-pressed={c.id === active}
                onClick={() => setActive(c.id)}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <section className="band">
        <div className="container">
          {notice && (
            <p className="alert alert--ok" role="status" style={{ marginBottom: '2rem' }}>
              {notice}
            </p>
          )}

          <h2 className="menu-section__title">{category.label}</h2>
          <p className="menu-section__note">{category.note}</p>

          {!items ? (
            <p className="menu-section__note" style={{ marginTop: '2.5rem' }} role="status">
              Loading menu…
            </p>
          ) : visible.length === 0 ? (
            <p className="menu-section__note" style={{ marginTop: '2.5rem' }}>
              There are no items in this category.
            </p>
          ) : (
            <ul className="dishes">
              {visible.map((dish) => (
                <li key={dish.id} className="dish">
                  <div className="dish__row">
                    <h3 className="dish__name">{dish.name}</h3>
                    <span className="dish__leader" aria-hidden="true" />
                    <span className="price">{baht(dish.price)}</span>
                  </div>
                  <p className="dish__desc">{dish.description}</p>
                  {dish.vegetarian && <span className="dish__tag">Vegetarian</span>}
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </>
  );
}
