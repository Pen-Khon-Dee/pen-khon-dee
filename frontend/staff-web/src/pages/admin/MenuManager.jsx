import { useCallback, useEffect, useState } from 'react';
import { useOutletContext } from 'react-router-dom';
import {
  addAdminCategory, addAdminMenuItem, getAdminCategories, getAdminMenu,
  renameAdminCategory, setAdminMenuAvailability, updateAdminMenuItem,
} from '../../api';
import { baht } from '../../lib/format';
import { Labeled } from '../../components/Field';

const blankItem = (categoryId = '') => ({ menu_name: '', price: '', category_id: String(categoryId) });

export default function MenuManager() {
  const { token, loading, run, setError, setNotice } = useOutletContext();
  const [categories, setCategories] = useState([]);
  const [menu, setMenu] = useState([]);
  const [item, setItem] = useState(blankItem());
  const [editing, setEditing] = useState(null);
  const [showOld, setShowOld] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [editingCategory, setEditingCategory] = useState(null);
  const [busyId, setBusyId] = useState(null);
  const [panel, setPanel] = useState(null); // 'item' | 'categories' | null

  const load = useCallback(async () => {
    const [cats, rows] = await Promise.all([getAdminCategories(token), getAdminMenu(token)]);
    setCategories(cats);
    setMenu(rows);
    setItem((cur) => ({ ...cur, category_id: cur.category_id || String(cats[0]?.category_id || '') }));
  }, [token]);

  useEffect(() => {
    load().catch((err) => setError(err.message));
  }, [load, setError]);

  const saveItem = (event) => {
    event.preventDefault();
    run(async () => {
      const payload = {
        menu_name: item.menu_name.trim(),
        price: Number(item.price),
        category_id: Number(item.category_id),
      };
      if (editing) await updateAdminMenuItem(editing.menu_id, payload, token);
      else await addAdminMenuItem(payload, token);
      setItem((cur) => ({ ...cur, menu_name: '', price: '' }));
      setNotice(editing ? 'Menu item updated.' : 'Menu item added.');
      setEditing(null);
      setPanel(null);
      await load();
    });
  };

  const startEdit = (row) => {
    setEditing(row);
    setItem({ menu_name: row.menu_name, price: String(row.price), category_id: String(row.category_id) });
    setPanel('item');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const stopEdit = () => {
    setEditing(null);
    setItem(blankItem(categories[0]?.category_id || ''));
    setPanel(null);
  };

  const changeStatus = async (row, status) => {
    setBusyId(row.menu_id);
    setError('');
    setNotice('');
    try {
      await setAdminMenuAvailability(row.menu_id, status, token);
      await load();
      setNotice(`Updated “${row.menu_name}”.`);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusyId(null);
    }
  };

  const saveCategory = (event) => {
    event.preventDefault();
    run(async () => {
      if (editingCategory) await renameAdminCategory(editingCategory.category_id, editingCategory.category_name.trim(), token);
      else await addAdminCategory(newCategory.trim(), token);
      setNotice(editingCategory ? 'Category renamed.' : 'Category added.');
      setEditingCategory(null);
      setNewCategory('');
      await load();
    });
  };

  return (
    <div className="narrow narrow--wide">
      <header className="page-head">
        <h1 className="page-title">Menu</h1>
        <div className="page-head__actions">
          <label className="check">
            <input type="checkbox" checked={showOld} onChange={(e) => setShowOld(e.target.checked)} />
            Show discontinued
          </label>
          <button type="button" className="btn btn--ghost" onClick={() => setPanel(panel === 'categories' ? null : 'categories')}>Categories</button>
          <button type="button" className="btn btn--primary" onClick={() => { setEditing(null); setItem(blankItem(categories[0]?.category_id || '')); setPanel(panel === 'item' && !editing ? null : 'item'); }}>Add item</button>
        </div>
      </header>

      {panel === 'item' && (
        <form className="card form" onSubmit={saveItem}>
          <h2 className="card__title">{editing ? 'Edit menu item' : 'New menu item'}</h2>
          <div className="grid-3">
            <Labeled label="Name"><input className="field__control" value={item.menu_name} onChange={(e) => setItem({ ...item, menu_name: e.target.value })} required /></Labeled>
            <Labeled label="Category">
              <select className="field__control" value={item.category_id} onChange={(e) => setItem({ ...item, category_id: e.target.value })} required>
                <option value="" disabled>Select a category</option>
                {categories.map((c) => <option key={c.category_id} value={c.category_id}>{c.category_name}</option>)}
              </select>
            </Labeled>
            <Labeled label="Price (THB)"><input className="field__control" type="number" min="0" step="0.01" value={item.price} onChange={(e) => setItem({ ...item, price: e.target.value })} required /></Labeled>
          </div>
          <div className="form__actions">
            <button type="submit" className="btn btn--primary" disabled={loading || !categories.length}>{editing ? 'Save changes' : 'Add item'}</button>
            <button type="button" className="btn btn--ghost" onClick={stopEdit}>Cancel</button>
          </div>
        </form>
      )}

      {panel === 'categories' && (
        <section className="card form">
          <h2 className="card__title">Categories</h2>
          <form className="inline-form" onSubmit={saveCategory}>
            <Labeled label={editingCategory ? 'Rename category' : 'New category'}>
              <input
                className="field__control"
                value={editingCategory ? editingCategory.category_name : newCategory}
                onChange={(e) => (editingCategory
                  ? setEditingCategory({ ...editingCategory, category_name: e.target.value })
                  : setNewCategory(e.target.value))}
                required
              />
            </Labeled>
            <button type="submit" className="btn btn--primary" disabled={loading}>{editingCategory ? 'Save name' : 'Add'}</button>
            {editingCategory && <button type="button" className="btn btn--ghost" onClick={() => setEditingCategory(null)}>Cancel</button>}
          </form>
          <div className="tags">
            {categories.map((c) => (
              <button type="button" key={c.category_id} className="tag" onClick={() => { setEditingCategory(c); setNewCategory(''); }}>
                {c.category_name}<span>Rename</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {categories.map((category) => {
        const items = menu.filter((r) => r.category_id === category.category_id && (showOld || r.availability_status !== 'Discontinued'));
        if (!items.length) return null;
        return (
          <section className="group" key={category.category_id}>
            <h2 className="group__title">{category.category_name}</h2>
            <ul className="rows">
              {items.map((row) => (
                <li className="row row--menu" key={row.menu_id}>
                  <div className="row__main"><p className="row__title">{row.menu_name}</p></div>
                  <span className="row__price">{baht(row.price)}</span>
                  <select
                    className={`field__control status-select is-${row.availability_status}`}
                    aria-label={`Status of ${row.menu_name}`}
                    value={row.availability_status}
                    disabled={busyId === row.menu_id}
                    onChange={(e) => changeStatus(row, e.target.value)}
                  >
                    <option value="Available">Available</option>
                    <option value="Sold_Out">Sold out</option>
                    <option value="Discontinued">Discontinued</option>
                  </select>
                  <button type="button" className="link-button" onClick={() => startEdit(row)}>Edit</button>
                </li>
              ))}
            </ul>
          </section>
        );
      })}
      {!menu.length && !loading && <p className="empty">No menu items yet.</p>}
    </div>
  );
}
