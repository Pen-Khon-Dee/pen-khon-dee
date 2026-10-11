import { useMemo } from 'react';
import { baht } from '../lib/format';
import Quantity from './Quantity';

const ALL = 'All';

export default function MenuList({ menu, loading, category, onCategory, cart, onChange }) {
  const categories = useMemo(() => [ALL, ...new Set(menu.map((i) => i.category_name))], [menu]);
  const groups = useMemo(() => {
    const names = category === ALL ? categories.slice(1) : [category];
    return names.map((name) => ({ name, items: menu.filter((i) => i.category_name === name) }))
      .filter((g) => g.items.length);
  }, [menu, categories, category]);

  return (
    <section className="menu" aria-label="Menu">
      <nav className="tabs" aria-label="Menu categories">
        {categories.map((name) => (
          <button
            key={name}
            type="button"
            className={`tabs__item${category === name ? ' is-active' : ''}`}
            aria-current={category === name ? 'true' : undefined}
            onClick={() => onCategory(name)}
          >
            {name}
          </button>
        ))}
      </nav>

      {loading ? (
        <p className="empty">Loading today’s menu…</p>
      ) : groups.length ? (
        groups.map((group) => (
          <section className="group" key={group.name}>
            <h2 className="group__title">{group.name}</h2>
            <ul>
              {group.items.map((item) => (
                <li className="dish" key={item.menu_id}>
                  <div className="dish__line">
                    <h3 className="dish__name">{item.menu_name}</h3>
                    <span className="dish__leader" aria-hidden="true" />
                    <span className="dish__price">{baht(item.price)}</span>
                  </div>
                  <Quantity
                    name={item.menu_name}
                    quantity={cart[item.menu_id]?.quantity}
                    onAdd={() => onChange(item, 1)}
                    onChange={(delta) => onChange(item, delta)}
                  />
                </li>
              ))}
            </ul>
          </section>
        ))
      ) : (
        <p className="empty">{menu.length ? 'Nothing in this category right now.' : 'The menu isn’t available right now.'}</p>
      )}
    </section>
  );
}
