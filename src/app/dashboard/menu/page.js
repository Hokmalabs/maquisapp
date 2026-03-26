'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase'

// ─── Palette & tokens ────────────────────────────────────────────────
const C = {
  bg:        '#FFF8F3',
  header:    '#1A1A2E',
  orange:    '#FF6B35',
  orangeL:   '#FFF0EA',
  white:     '#FFFFFF',
  border:    '#F0E8E0',
  textDark:  '#1A1A2E',
  textGray:  '#8A7E75',
  textLight: '#B5ADA6',
  green:     '#22C55E',
  greenL:    '#F0FDF4',
  red:       '#EF4444',
  redL:      '#FEF2F2',
  yellow:    '#F59E0B',
  yellowL:   '#FFFBEB',
  shadow:    'rgba(26,26,46,0.08)',
};

const S = {
  card: {
    background: C.white,
    borderRadius: 16,
    border: `1px solid ${C.border}`,
    boxShadow: `0 2px 12px ${C.shadow}`,
  },
  pill: (active) => ({
    display: 'inline-flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    borderRadius: 999,
    fontSize: 13,
    fontWeight: 600,
    cursor: 'pointer',
    border: `1.5px solid ${active ? C.orange : C.border}`,
    background: active ? C.orange : C.white,
    color: active ? C.white : C.textGray,
    transition: 'all .18s',
    whiteSpace: 'nowrap',
  }),
  btn: (variant = 'primary') => ({
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '10px 18px',
    borderRadius: 10,
    fontSize: 14,
    fontWeight: 600,
    cursor: 'pointer',
    border: 'none',
    transition: 'all .18s',
    ...(variant === 'primary'
      ? { background: C.orange, color: C.white }
      : variant === 'ghost'
      ? { background: 'transparent', color: C.textGray, border: `1.5px solid ${C.border}` }
      : variant === 'danger'
      ? { background: C.redL, color: C.red, border: `1.5px solid ${C.red}` }
      : { background: C.orangeL, color: C.orange }),
  }),
  input: {
    width: '100%',
    padding: '10px 14px',
    borderRadius: 10,
    border: `1.5px solid ${C.border}`,
    fontSize: 14,
    color: C.textDark,
    background: C.white,
    outline: 'none',
    fontFamily: 'system-ui, sans-serif',
    boxSizing: 'border-box',
  },
  label: {
    fontSize: 12,
    fontWeight: 600,
    color: C.textGray,
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: 6,
    display: 'block',
  },
};

// ─── Icons (inline SVG) ───────────────────────────────────────────────
const Icon = {
  plus:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  edit:  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>,
  trash: <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>,
  close: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  drag:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="7" r="1.5" fill="currentColor"/><circle cx="15" cy="7" r="1.5" fill="currentColor"/><circle cx="9" cy="12" r="1.5" fill="currentColor"/><circle cx="15" cy="12" r="1.5" fill="currentColor"/><circle cx="9" cy="17" r="1.5" fill="currentColor"/><circle cx="15" cy="17" r="1.5" fill="currentColor"/></svg>,
  image: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  menu:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></svg>,
  home:  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  table: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="3" y1="15" x2="21" y2="15"/><line x1="9" y1="9" x2="9" y2="21"/></svg>,
  order: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><line x1="9" y1="12" x2="15" y2="12"/><line x1="9" y1="16" x2="13" y2="16"/></svg>,
  history:<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10"/><path d="M20.49 15a9 9 0 1 1-.44-4.22"/></svg>,
  search:<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  eye:   <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  eyeOff:<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></svg>,
};

// ─── BottomNav ────────────────────────────────────────────────────────
function BottomNav({ active }) {
  const router = useRouter();
  const items = [
    { id: 'home',      label: 'Accueil',   icon: Icon.home,    path: '/dashboard' },
    { id: 'menu',      label: 'Menu',      icon: Icon.menu,    path: '/dashboard/menu' },
    { id: 'tables',    label: 'Tables',    icon: Icon.table,   path: '/dashboard/tables' },
    { id: 'commandes', label: 'Commandes', icon: Icon.order,   path: '/dashboard/commandes' },
    { id: 'historique',label: 'Historique',icon: Icon.history, path: '/dashboard/historique' },
  ];
  return (
    <nav style={{
      position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 100,
      background: C.white, borderTop: `1px solid ${C.border}`,
      display: 'flex', alignItems: 'stretch',
      paddingBottom: 'env(safe-area-inset-bottom)',
    }}>
      {items.map(it => (
        <button key={it.id} onClick={() => router.push(it.path)} style={{
          flex: 1, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center',
          gap: 3, padding: '10px 4px 8px', border: 'none',
          background: 'transparent', cursor: 'pointer',
          color: active === it.id ? C.orange : C.textLight,
          fontSize: 10, fontWeight: 600, fontFamily: 'system-ui, sans-serif',
        }}>
          <span style={{ transform: active === it.id ? 'scale(1.15)' : 'scale(1)', transition: 'transform .18s' }}>
            {it.icon}
          </span>
          {it.label}
          {active === it.id && (
            <span style={{ width: 4, height: 4, borderRadius: '50%', background: C.orange, position: 'absolute', bottom: 6 }} />
          )}
        </button>
      ))}
    </nav>
  );
}

// ─── Modal wrapper ────────────────────────────────────────────────────
function Modal({ open, onClose, title, children, width = 480 }) {
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);
  if (!open) return null;
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200,
      background: 'rgba(26,26,46,0.55)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
    }} onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{
        background: C.white, borderRadius: '20px 20px 0 0',
        width: '100%', maxWidth: width, maxHeight: '92vh',
        overflowY: 'auto', padding: '0 0 32px',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }} />
        </div>
        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 20px 16px' }}>
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: C.textDark }}>{title}</h3>
          <button onClick={onClose} style={{ ...S.btn('ghost'), padding: '6px', borderRadius: 8 }}>{Icon.close}</button>
        </div>
        <div style={{ padding: '0 20px' }}>{children}</div>
      </div>
    </div>
  );
}

// ─── Toast ────────────────────────────────────────────────────────────
function Toast({ msg, type }) {
  if (!msg) return null;
  const bg = type === 'error' ? C.red : type === 'warn' ? C.yellow : C.green;
  return (
    <div style={{
      position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
      zIndex: 999, background: bg, color: C.white,
      padding: '10px 20px', borderRadius: 10, fontSize: 14, fontWeight: 600,
      boxShadow: '0 4px 20px rgba(0,0,0,0.2)',
      animation: 'fadeIn .2s',
    }}>{msg}</div>
  );
}

// ─── CategoryForm ─────────────────────────────────────────────────────
function CategoryForm({ initial, onSubmit, loading }) {
  const [nom, setNom] = useState(initial?.nom || '');
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <label style={S.label}>Nom de la catégorie *</label>
        <input style={S.input} value={nom} onChange={e => setNom(e.target.value)} placeholder="Ex : Boissons, Grillades…" />
      </div>
      <button style={{ ...S.btn('primary'), width: '100%', padding: '12px' }} onClick={() => onSubmit({ nom })} disabled={loading || !nom.trim()}>
        {loading ? 'Enregistrement…' : initial ? 'Modifier la catégorie' : 'Créer la catégorie'}
      </button>
    </div>
  );
}

// ─── PlatForm ─────────────────────────────────────────────────────────
function PlatForm({ initial, categories, restaurantId, onSubmit, loading }) {
  const [form, setForm] = useState({
    nom:          initial?.nom          || '',
    description:  initial?.description  || '',
    prix:         initial?.prix         || '',
    categorie_id: initial?.categorie_id || (categories[0]?.id || ''),
    disponible:   initial?.disponible   !== undefined ? initial.disponible : true,
    image_url:    initial?.image_url    || '',
  });
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {/* Image preview */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <label style={S.label}>URL de l'image</label>
        <input style={S.input} value={form.image_url} onChange={e => set('image_url', e.target.value)} placeholder="https://…" />
        {form.image_url ? (
          <img src={form.image_url} alt="" style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 10, border: `1px solid ${C.border}` }} />
        ) : (
          <div style={{ width: '100%', height: 100, borderRadius: 10, border: `2px dashed ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.textLight }}>
            {Icon.image}<span style={{ marginLeft: 8, fontSize: 13 }}>Aperçu de l'image</span>
          </div>
        )}
      </div>

      <div>
        <label style={S.label}>Nom du plat *</label>
        <input style={S.input} value={form.nom} onChange={e => set('nom', e.target.value)} placeholder="Ex : Kedjenou de poulet" />
      </div>

      <div>
        <label style={S.label}>Description</label>
        <textarea style={{ ...S.input, minHeight: 72, resize: 'vertical' }} value={form.description} onChange={e => set('description', e.target.value)} placeholder="Ingrédients, allergènes, notes…" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div>
          <label style={S.label}>Prix (FCFA) *</label>
          <input style={S.input} type="number" min="0" value={form.prix} onChange={e => set('prix', e.target.value)} placeholder="2500" />
        </div>
        <div>
          <label style={S.label}>Catégorie *</label>
          <select style={{ ...S.input, appearance: 'none' }} value={form.categorie_id} onChange={e => set('categorie_id', e.target.value)}>
            {categories.map(c => <option key={c.id} value={c.id}>{c.nom}</option>)}
          </select>
        </div>
      </div>

      {/* Toggle disponibilité */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 14px', background: form.disponible ? C.greenL : C.redL, borderRadius: 10, border: `1px solid ${form.disponible ? C.green : C.red}` }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 600, color: form.disponible ? C.green : C.red }}>
            {form.disponible ? '✓ Disponible' : '✗ Indisponible'}
          </div>
          <div style={{ fontSize: 12, color: C.textGray }}>Visible sur le menu client</div>
        </div>
        <div onClick={() => set('disponible', !form.disponible)} style={{
          width: 44, height: 24, borderRadius: 12, cursor: 'pointer',
          background: form.disponible ? C.green : C.border,
          position: 'relative', transition: 'background .2s',
        }}>
          <div style={{
            position: 'absolute', top: 3, left: form.disponible ? 23 : 3,
            width: 18, height: 18, borderRadius: '50%', background: C.white,
            transition: 'left .2s', boxShadow: '0 1px 4px rgba(0,0,0,0.2)',
          }} />
        </div>
      </div>

      <button style={{ ...S.btn('primary'), width: '100%', padding: '12px' }}
        onClick={() => onSubmit({ ...form, prix: parseFloat(form.prix) || 0 })}
        disabled={loading || !form.nom.trim() || !form.prix}>
        {loading ? 'Enregistrement…' : initial ? 'Modifier le plat' : 'Ajouter le plat'}
      </button>
    </div>
  );
}

// ─── PlatCard ─────────────────────────────────────────────────────────
function PlatCard({ plat, onEdit, onDelete, onToggle }) {
  return (
    <div style={{
      ...S.card,
      display: 'flex', alignItems: 'center', gap: 12, padding: 12,
      opacity: plat.disponible ? 1 : 0.7,
    }}>
      {/* Image */}
      <div style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 10, overflow: 'hidden', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        {plat.image_url
          ? <img src={plat.image_url} alt={plat.nom} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          : <span style={{ color: C.textLight }}>{Icon.image}</span>}
      </div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 4 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.textDark, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{plat.nom}</span>
          <span style={{ fontSize: 14, fontWeight: 700, color: C.orange, flexShrink: 0 }}>{Number(plat.prix).toLocaleString('fr-CI')} F</span>
        </div>
        {plat.description && (
          <div style={{ fontSize: 12, color: C.textGray, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>{plat.description}</div>
        )}
        {/* Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 8 }}>
          {/* Toggle dispo */}
          <button onClick={() => onToggle(plat)} style={{
            display: 'inline-flex', alignItems: 'center', gap: 4,
            padding: '3px 10px', borderRadius: 999, border: 'none', cursor: 'pointer',
            background: plat.disponible ? C.greenL : C.redL,
            color: plat.disponible ? C.green : C.red,
            fontSize: 11, fontWeight: 600,
          }}>
            {plat.disponible ? Icon.eye : Icon.eyeOff}
            {plat.disponible ? 'Dispo' : 'Indispo'}
          </button>
          <button onClick={() => onEdit(plat)} style={{ ...S.btn('ghost'), padding: '4px 10px', fontSize: 12 }}>{Icon.edit} Modifier</button>
          <button onClick={() => onDelete(plat)} style={{ ...S.btn('danger'), padding: '4px 10px', fontSize: 12 }}>{Icon.trash}</button>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────
export default function MenuPage() {
  const router = useRouter();

  // Data
  const [restaurant, setRestaurant]   = useState(null);
  const [categories, setCategories]   = useState([]);
  const [plats, setPlats]             = useState([]);
  const [activeCategorie, setActiveCategorie] = useState(null); // null = toutes
  const [search, setSearch]           = useState('');

  // UI state
  const [loading, setLoading]         = useState(true);
  const [saving, setSaving]           = useState(false);
  const [toast, setToast]             = useState(null);

  // Modals
  const [modalCat, setModalCat]       = useState(false);
  const [editCat, setEditCat]         = useState(null);
  const [modalPlat, setModalPlat]     = useState(false);
  const [editPlat, setEditPlat]       = useState(null);
  const [deleteCat, setDeleteCat]     = useState(null);
  const [deletePlat, setDeletePlat]   = useState(null);

  // ── Toast helper ──
  const showToast = (msg, type = 'success', duration = 2500) => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), duration);
  };

  // ── Load data ──
  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }

      const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', session.user.id).single();
      if (!profile) { router.push('/auth/login'); return; }

      const { data: resto } = await supabase.from('restaurants').select('*').eq('id', profile.restaurant_id).single();
      setRestaurant(resto);

      const { data: cats  } = await supabase.from('categories').select('*').eq('restaurant_id', profile.restaurant_id).order('ordre');
      const { data: plats } = await supabase.from('plats').select('*').eq('restaurant_id', profile.restaurant_id).order('ordre');

      setCategories(cats || []);
      setPlats(plats || []);
      setLoading(false);
    })();
  }, []);

  // ── CRUD catégories ──
  const saveCat = async ({ nom }) => {
    setSaving(true);
    if (editCat) {
      const { error } = await supabase.from('categories').update({ nom }).eq('id', editCat.id);
      if (!error) {
        setCategories(cs => cs.map(c => c.id === editCat.id ? { ...c, nom } : c));
        showToast('Catégorie modifiée');
      }
    } else {
      const ordre = categories.length + 1;
      const { data, error } = await supabase.from('categories').insert({ nom, ordre, restaurant_id: restaurant.id }).select().single();
      if (!error) {
        setCategories(cs => [...cs, data]);
        showToast('Catégorie créée');
      }
    }
    setSaving(false);
    setModalCat(false);
    setEditCat(null);
  };

  const confirmDeleteCat = async () => {
    const { error } = await supabase.from('categories').delete().eq('id', deleteCat.id);
    if (!error) {
      setCategories(cs => cs.filter(c => c.id !== deleteCat.id));
      setPlats(ps => ps.filter(p => p.categorie_id !== deleteCat.id));
      showToast('Catégorie supprimée', 'warn');
    }
    setDeleteCat(null);
  };

  // ── CRUD plats ──
  const savePlat = async (form) => {
    setSaving(true);
    if (editPlat) {
      const { error } = await supabase.from('plats').update(form).eq('id', editPlat.id);
      if (!error) {
        setPlats(ps => ps.map(p => p.id === editPlat.id ? { ...p, ...form } : p));
        showToast('Plat modifié');
      }
    } else {
      const ordre = plats.length + 1;
      const { data, error } = await supabase.from('plats').insert({ ...form, ordre, restaurant_id: restaurant.id }).select().single();
      if (!error) {
        setPlats(ps => [...ps, data]);
        showToast('Plat ajouté');
      }
    }
    setSaving(false);
    setModalPlat(false);
    setEditPlat(null);
  };

  const toggleDispo = async (plat) => {
    const next = !plat.disponible;
    const { error } = await supabase.from('plats').update({ disponible: next }).eq('id', plat.id);
    if (!error) {
      setPlats(ps => ps.map(p => p.id === plat.id ? { ...p, disponible: next } : p));
      showToast(next ? 'Plat disponible' : 'Plat masqué', next ? 'success' : 'warn');
    }
  };

  const confirmDeletePlat = async () => {
    const { error } = await supabase.from('plats').delete().eq('id', deletePlat.id);
    if (!error) {
      setPlats(ps => ps.filter(p => p.id !== deletePlat.id));
      showToast('Plat supprimé', 'warn');
    }
    setDeletePlat(null);
  };

  // ── Filtered plats ──
  const filteredPlats = plats.filter(p => {
    const matchCat  = !activeCategorie || p.categorie_id === activeCategorie;
    const matchSearch = !search || p.nom.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });

  // ── Counts per category ──
  const countByCat = (catId) => plats.filter(p => p.categorie_id === catId).length;

  // ── Loading skeleton ──
  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontSize: 14, color: C.textGray }}>Chargement du menu…</div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: 'system-ui, sans-serif', paddingBottom: 80 }}>
      {/* Toast */}
      {toast && <Toast msg={toast.msg} type={toast.type} />}

      {/* Header */}
      <div style={{ background: C.header, padding: '16px 20px 20px', position: 'sticky', top: 0, zIndex: 50 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>Gestion</div>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: C.white }}>Menu</h1>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => { setEditCat(null); setModalCat(true); }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: `1.5px solid rgba(255,255,255,0.2)`,
              background: 'transparent', color: C.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {Icon.plus} Catégorie
            </button>
            <button onClick={() => {
              if (categories.length === 0) { showToast('Créez d\'abord une catégorie', 'warn'); return; }
              setEditPlat(null); setModalPlat(true);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 6,
              padding: '8px 14px', borderRadius: 10, border: 'none',
              background: C.orange, color: C.white, fontSize: 13, fontWeight: 600, cursor: 'pointer',
            }}>
              {Icon.plus} Plat
            </button>
          </div>
        </div>

        {/* Stats rapides */}
        <div style={{ display: 'flex', gap: 12, marginTop: 16 }}>
          {[
            { label: 'Catégories', value: categories.length, color: '#818CF8' },
            { label: 'Plats',      value: plats.length,       color: C.orange },
            { label: 'Disponibles',value: plats.filter(p=>p.disponible).length, color: C.green },
          ].map(s => (
            <div key={s.label} style={{ flex: 1, background: 'rgba(255,255,255,0.08)', borderRadius: 10, padding: '8px 12px', textAlign: 'center' }}>
              <div style={{ fontSize: 20, fontWeight: 800, color: s.color }}>{s.value}</div>
              <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.5)', fontWeight: 600 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Search */}
      <div style={{ padding: '16px 16px 0' }}>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: C.textLight }}>{Icon.search}</span>
          <input style={{ ...S.input, paddingLeft: 38 }} value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher un plat…" />
        </div>
      </div>

      {/* Category pills */}
      <div style={{ padding: '12px 0 4px', overflowX: 'auto', display: 'flex', gap: 8, paddingLeft: 16, paddingRight: 16, scrollbarWidth: 'none' }}>
        <button style={S.pill(!activeCategorie)} onClick={() => setActiveCategorie(null)}>
          Tous <span style={{ fontSize: 11, opacity: 0.8 }}>({plats.length})</span>
        </button>
        {categories.map(cat => (
          <button key={cat.id} style={S.pill(activeCategorie === cat.id)} onClick={() => setActiveCategorie(activeCategorie === cat.id ? null : cat.id)}>
            {cat.nom} <span style={{ fontSize: 11, opacity: 0.8 }}>({countByCat(cat.id)})</span>
          </button>
        ))}
      </div>

      {/* Contenu */}
      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 20 }}>

        {/* Aucune catégorie */}
        {categories.length === 0 && (
          <div style={{ ...S.card, padding: 32, textAlign: 'center' }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🍽️</div>
            <div style={{ fontWeight: 700, color: C.textDark, marginBottom: 6 }}>Aucune catégorie</div>
            <div style={{ fontSize: 13, color: C.textGray, marginBottom: 16 }}>Créez vos catégories (Boissons, Grillades…) pour organiser votre menu.</div>
            <button onClick={() => setModalCat(true)} style={{ ...S.btn('primary'), padding: '10px 24px' }}>{Icon.plus} Créer une catégorie</button>
          </div>
        )}

        {/* Bloc par catégorie ou résultat de recherche */}
        {categories.length > 0 && (
          search
            ? <>
                <div style={{ fontSize: 13, color: C.textGray }}>
                  {filteredPlats.length} résultat{filteredPlats.length !== 1 ? 's' : ''} pour « {search} »
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {filteredPlats.map(p => (
                    <PlatCard key={p.id} plat={p} onEdit={pl => { setEditPlat(pl); setModalPlat(true); }} onDelete={setDeletePlat} onToggle={toggleDispo} />
                  ))}
                </div>
              </>
            : (activeCategorie
                ? (() => {
                    const cat = categories.find(c => c.id === activeCategorie);
                    const platscat = filteredPlats;
                    return (
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark }}>{cat.nom}</div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditCat(cat); setModalCat(true); }} style={{ ...S.btn('ghost'), padding: '5px 10px', fontSize: 12 }}>{Icon.edit}</button>
                            <button onClick={() => setDeleteCat(cat)} style={{ ...S.btn('danger'), padding: '5px 10px', fontSize: 12 }}>{Icon.trash}</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {platscat.length === 0
                            ? <div style={{ ...S.card, padding: 20, textAlign: 'center', color: C.textGray, fontSize: 13 }}>Aucun plat dans cette catégorie</div>
                            : platscat.map(p => <PlatCard key={p.id} plat={p} onEdit={pl => { setEditPlat(pl); setModalPlat(true); }} onDelete={setDeletePlat} onToggle={toggleDispo} />)
                          }
                        </div>
                      </div>
                    );
                  })()
                : categories.map(cat => {
                    const catPlats = plats.filter(p => p.categorie_id === cat.id);
                    return (
                      <div key={cat.id}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                            <div style={{ fontSize: 16, fontWeight: 700, color: C.textDark }}>{cat.nom}</div>
                            <span style={{ fontSize: 11, fontWeight: 600, background: C.orangeL, color: C.orange, padding: '2px 8px', borderRadius: 999 }}>{catPlats.length}</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button onClick={() => { setEditCat(cat); setModalCat(true); }} style={{ ...S.btn('ghost'), padding: '5px 10px', fontSize: 12 }}>{Icon.edit}</button>
                            <button onClick={() => setDeleteCat(cat)} style={{ ...S.btn('danger'), padding: '5px 10px', fontSize: 12 }}>{Icon.trash}</button>
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                          {catPlats.length === 0
                            ? (
                              <div style={{ ...S.card, padding: 16, textAlign: 'center' }}>
                                <div style={{ fontSize: 12, color: C.textGray, marginBottom: 10 }}>Aucun plat dans cette catégorie</div>
                                <button onClick={() => { setEditPlat(null); setModalPlat(true); }} style={{ ...S.btn('soft'), padding: '6px 14px', fontSize: 12 }}>{Icon.plus} Ajouter un plat</button>
                              </div>
                            )
                            : catPlats.map(p => <PlatCard key={p.id} plat={p} onEdit={pl => { setEditPlat(pl); setModalPlat(true); }} onDelete={setDeletePlat} onToggle={toggleDispo} />)
                          }
                        </div>
                      </div>
                    );
                  })
              )
        )}
      </div>

      {/* ── Modal catégorie ── */}
      <Modal open={modalCat} onClose={() => { setModalCat(false); setEditCat(null); }} title={editCat ? 'Modifier la catégorie' : 'Nouvelle catégorie'}>
        <CategoryForm initial={editCat} onSubmit={saveCat} loading={saving} />
      </Modal>

      {/* ── Modal plat ── */}
      <Modal open={modalPlat} onClose={() => { setModalPlat(false); setEditPlat(null); }} title={editPlat ? 'Modifier le plat' : 'Nouveau plat'}>
        <PlatForm initial={editPlat} categories={categories} restaurantId={restaurant?.id} onSubmit={savePlat} loading={saving} />
      </Modal>

      {/* ── Confirm delete cat ── */}
      <Modal open={!!deleteCat} onClose={() => setDeleteCat(null)} title="Supprimer la catégorie">
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
          <div style={{ fontWeight: 700, color: C.textDark, marginBottom: 8 }}>Supprimer « {deleteCat?.nom} » ?</div>
          <div style={{ fontSize: 13, color: C.textGray, marginBottom: 20 }}>
            Tous les plats de cette catégorie ({countByCat(deleteCat?.id || '')}) seront également supprimés. Cette action est irréversible.
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeleteCat(null)} style={{ ...S.btn('ghost'), flex: 1, padding: '12px' }}>Annuler</button>
            <button onClick={confirmDeleteCat} style={{ ...S.btn('danger'), flex: 1, padding: '12px' }}>Supprimer</button>
          </div>
        </div>
      </Modal>

      {/* ── Confirm delete plat ── */}
      <Modal open={!!deletePlat} onClose={() => setDeletePlat(null)} title="Supprimer le plat">
        <div style={{ textAlign: 'center', paddingBottom: 8 }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>🗑️</div>
          <div style={{ fontWeight: 700, color: C.textDark, marginBottom: 8 }}>Supprimer « {deletePlat?.nom} » ?</div>
          <div style={{ fontSize: 13, color: C.textGray, marginBottom: 20 }}>Cette action est irréversible.</div>
          <div style={{ display: 'flex', gap: 10 }}>
            <button onClick={() => setDeletePlat(null)} style={{ ...S.btn('ghost'), flex: 1, padding: '12px' }}>Annuler</button>
            <button onClick={confirmDeletePlat} style={{ ...S.btn('danger'), flex: 1, padding: '12px' }}>Supprimer</button>
          </div>
        </div>
      </Modal>

      <BottomNav active="menu" />
    </div>
  );
}