'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '../../../lib/supabase';

// ─── Design tokens ────────────────────────────────────────────────────
const C = {
  bg:       '#FFF8F3',
  header:   '#1A1A2E',
  orange:   '#FF6B35',
  orangeL:  '#FFF0EA',
  white:    '#FFFFFF',
  border:   '#F0E8E0',
  textDark: '#1A1A2E',
  textGray: '#8A7E75',
  textLight:'#B5ADA6',
  green:    '#22C55E',
  greenL:   '#F0FDF4',
  red:      '#EF4444',
  redL:     '#FEF2F2',
  yellow:   '#F59E0B',
  yellowL:  '#FFFBEB',
  shadow:   'rgba(26,26,46,0.08)',
};

const S = {
  card: { background: C.white, borderRadius: 16, border: `1px solid ${C.border}`, boxShadow: `0 2px 12px ${C.shadow}` },
  btn: (v='primary') => ({
    display:'inline-flex', alignItems:'center', justifyContent:'center', gap:6,
    padding:'11px 20px', borderRadius:12, fontSize:14, fontWeight:700,
    cursor:'pointer', border:'none', transition:'all .18s', fontFamily:'system-ui, sans-serif',
    ...(v==='primary' ? { background:C.orange, color:C.white }
      : v==='ghost'   ? { background:'transparent', color:C.textGray, border:`1.5px solid ${C.border}` }
      : v==='green'   ? { background:C.green, color:C.white }
      :                 { background:C.orangeL, color:C.orange }),
  }),
};

const Icon = {
  cart:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/><path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/></svg>,
  bell:  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  minus: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  plus:  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>,
  close: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>,
  check: <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12"/></svg>,
  trash: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/></svg>,
  image: <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>,
  phone: <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.77 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l.91-.91a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 17v-.08z"/></svg>,
  info:  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>,
  wallet:<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 3H8l-2 4h12z"/><circle cx="17" cy="13" r="1" fill="currentColor"/></svg>,
};

// ─── Toast ────────────────────────────────────────────────────────────
function Toast({ msg, type, onDone }) {
  useEffect(() => { const t = setTimeout(onDone, 2800); return () => clearTimeout(t); }, []);
  const bg = type === 'error' ? C.red : type === 'warn' ? C.yellow : C.green;
  return (
    <div style={{ position:'fixed', top:20, left:'50%', transform:'translateX(-50%)', zIndex:999,
      background:bg, color:C.white, padding:'12px 22px', borderRadius:12, fontSize:14, fontWeight:700,
      boxShadow:'0 4px 24px rgba(0,0,0,0.18)', whiteSpace:'nowrap', animation:'slideDown .25s' }}>
      {msg}
    </div>
  );
}

// ─── Qty stepper ──────────────────────────────────────────────────────
function Stepper({ value, onChange, min = 0 }) {
  return (
    <div style={{ display:'flex', alignItems:'center', gap:0, background:C.bg, borderRadius:10, overflow:'hidden', border:`1px solid ${C.border}` }}>
      <button onClick={() => value > min && onChange(value - 1)}
        style={{ width:34, height:34, border:'none', background:'transparent', cursor:'pointer', color:C.textGray, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {Icon.minus}
      </button>
      <span style={{ width:28, textAlign:'center', fontSize:15, fontWeight:700, color:C.textDark }}>{value}</span>
      <button onClick={() => onChange(value + 1)}
        style={{ width:34, height:34, border:'none', background:C.orange, cursor:'pointer', color:C.white, display:'flex', alignItems:'center', justifyContent:'center' }}>
        {Icon.plus}
      </button>
    </div>
  );
}

// ─── Plat detail modal ────────────────────────────────────────────────
function PlatModal({ plat, onClose, onAdd }) {
  const [qty, setQty] = useState(1);
  const [note, setNote] = useState('');
  if (!plat) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(26,26,46,0.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'88vh', overflowY:'auto' }}>
        {/* Image */}
        <div style={{ width:'100%', height:220, background:C.bg, position:'relative', overflow:'hidden' }}>
          {plat.image_url
            ? <img src={plat.image_url} alt={plat.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
            : <div style={{ width:'100%', height:'100%', display:'flex', alignItems:'center', justifyContent:'center', color:C.textLight }}>{Icon.image}</div>}
          <button onClick={onClose} style={{ position:'absolute', top:14, right:14, width:36, height:36, borderRadius:'50%',
            background:'rgba(255,255,255,0.9)', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center', color:C.textDark }}>
            {Icon.close}
          </button>
          {!plat.disponible && (
            <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <span style={{ color:C.white, fontWeight:700, fontSize:16, background:'rgba(0,0,0,0.6)', padding:'8px 20px', borderRadius:999 }}>Indisponible</span>
            </div>
          )}
        </div>

        <div style={{ padding:'20px 20px 32px', display:'flex', flexDirection:'column', gap:14 }}>
          <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:12 }}>
            <h2 style={{ margin:0, fontSize:20, fontWeight:800, color:C.textDark, flex:1 }}>{plat.nom}</h2>
            <span style={{ fontSize:20, fontWeight:800, color:C.orange, flexShrink:0 }}>
              {Number(plat.prix).toLocaleString('fr-CI')} F
            </span>
          </div>
          {plat.description && <p style={{ margin:0, fontSize:14, color:C.textGray, lineHeight:1.6 }}>{plat.description}</p>}

          {/* Note */}
          <div>
            <label style={{ fontSize:12, fontWeight:600, color:C.textGray, display:'block', marginBottom:6 }}>Note pour la cuisine (optionnel)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Ex: sans piment, bien cuit…"
              style={{ width:'100%', padding:'10px 14px', borderRadius:10, border:`1.5px solid ${C.border}`,
                fontSize:14, color:C.textDark, background:C.white, outline:'none', resize:'none', minHeight:72,
                fontFamily:'system-ui, sans-serif', boxSizing:'border-box' }}/>
          </div>

          {plat.disponible && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 0 0', borderTop:`1px solid ${C.border}` }}>
              <Stepper value={qty} onChange={setQty} min={1}/>
              <button onClick={() => { onAdd(plat, qty, note); onClose(); }}
                style={{ ...S.btn('primary'), padding:'12px 24px', fontSize:15 }}>
                Ajouter · {(plat.prix * qty).toLocaleString('fr-CI')} F
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Panier modal ─────────────────────────────────────────────────────
function PanierModal({ items, onClose, onCommander, onUpdateQty, onRemove, commandeEnCours }) {
  const total = items.reduce((s, i) => s + i.prix * i.qty, 0);
  const [note, setNote] = useState('');

  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(26,26,46,0.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'flex-end', justifyContent:'center' }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:'24px 24px 0 0', width:'100%', maxWidth:480, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'center', padding:'12px 0 4px' }}>
          <div style={{ width:40, height:4, borderRadius:2, background:C.border }}/>
        </div>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'8px 20px 14px', borderBottom:`1px solid ${C.border}` }}>
          <h3 style={{ margin:0, fontSize:18, fontWeight:800, color:C.textDark }}>Mon panier</h3>
          <button onClick={onClose} style={{ background:'transparent', border:'none', cursor:'pointer', color:C.textGray }}>{Icon.close}</button>
        </div>

        <div style={{ padding:'14px 20px', display:'flex', flexDirection:'column', gap:10 }}>
          {items.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px 0', color:C.textGray }}>
              <div style={{ fontSize:40, marginBottom:12 }}>🛒</div>
              <div style={{ fontSize:14 }}>Votre panier est vide</div>
            </div>
          ) : (
            <>
              {items.map(item => (
                <div key={item.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:`1px solid ${C.border}` }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:14, fontWeight:600, color:C.textDark }}>{item.nom}</div>
                    {item.note && <div style={{ fontSize:12, color:C.textGray, fontStyle:'italic' }}>{item.note}</div>}
                    <div style={{ fontSize:13, fontWeight:700, color:C.orange, marginTop:2 }}>
                      {(item.prix * item.qty).toLocaleString('fr-CI')} F
                    </div>
                  </div>
                  <Stepper value={item.qty} onChange={v => v === 0 ? onRemove(item.id) : onUpdateQty(item.id, v)} min={0}/>
                </div>
              ))}

              {/* Total */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 0 0' }}>
                <span style={{ fontSize:16, fontWeight:700, color:C.textDark }}>Total</span>
                <span style={{ fontSize:22, fontWeight:800, color:C.orange }}>{total.toLocaleString('fr-CI')} FCFA</span>
              </div>

              {/* Ajout items si commande en cours */}
              {commandeEnCours && (
                <div style={{ background:C.yellowL, borderRadius:10, padding:'10px 14px', fontSize:13, color:C.yellow, fontWeight:600, display:'flex', gap:8, alignItems:'flex-start' }}>
                  {Icon.info}
                  <span>Vous avez déjà une commande en cours. Ces articles seront ajoutés à votre commande existante.</span>
                </div>
              )}

              <button onClick={() => onCommander(note)}
                style={{ ...S.btn('primary'), width:'100%', padding:'14px', fontSize:16 }}>
                {commandeEnCours ? '+ Ajouter à la commande' : '🍽️ Commander'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Statut commande banner ───────────────────────────────────────────
const STATUT_INFO = {
  en_attente:     { emoji:'⏳', label:'Commande reçue',        desc:'Le gérant va valider votre commande', color:C.yellow,  bg:C.yellowL },
  valide:         { emoji:'✅', label:'Commande validée',      desc:'En attente de préparation',           color:C.blue,    bg:'#EFF6FF'  },
  en_preparation: { emoji:'👨‍🍳', label:'En préparation',       desc:'Notre cuisine s\'affaire pour vous',   color:'#8B5CF6', bg:'#F5F3FF'  },
  presque_pret:   { emoji:'🔔', label:'Presque prêt !',        desc:'Votre plat arrive bientôt',           color:'#14B8A6', bg:'#F0FDFA'  },
  servi:          { emoji:'✨', label:'Bon appétit !',         desc:'Votre commande a été servie',          color:C.green,   bg:C.greenL   },
  cloture:        { emoji:'🏁', label:'Table clôturée',        desc:'Merci pour votre visite !',           color:C.textGray,bg:C.bg       },
  annule:         { emoji:'❌', label:'Commande annulée',      desc:'Contactez le serveur',                color:C.red,     bg:C.redL     },
};

function StatutBanner({ commande }) {
  if (!commande) return null;
  const info = STATUT_INFO[commande.statut] || STATUT_INFO.en_attente;
  return (
    <div style={{ background:info.bg, border:`1px solid ${info.color}33`, borderRadius:14, padding:'14px 16px',
      display:'flex', alignItems:'center', gap:14, margin:'0 16px' }}>
      <div style={{ fontSize:28 }}>{info.emoji}</div>
      <div style={{ flex:1 }}>
        <div style={{ fontSize:15, fontWeight:700, color:info.color }}>{info.label}</div>
        <div style={{ fontSize:12, color:C.textGray, marginTop:2 }}>{info.desc}</div>
        {commande.total > 0 && (
          <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginTop:4 }}>
            Total : {Number(commande.total).toLocaleString('fr-CI')} FCFA
          </div>
        )}
      </div>
      {/* Progress dots */}
      <div style={{ display:'flex', flexDirection:'column', gap:3 }}>
        {['en_attente','valide','en_preparation','presque_pret','servi'].map((s, i) => {
          const statuts = ['en_attente','valide','en_preparation','presque_pret','servi','cloture'];
          const currentIdx = statuts.indexOf(commande.statut);
          const done = i <= currentIdx;
          return <div key={s} style={{ width:8, height:8, borderRadius:'50%', background:done?info.color:C.border }}/>;
        })}
      </div>
    </div>
  );
}

// ─── Paiement modal ───────────────────────────────────────────────────
function PaiementModal({ commande, onClose, onPay }) {
  const [mode, setMode] = useState('');
  const modes = [
    { id:'especes', label:'💵 Espèces' },
    { id:'mobile_money', label:'📱 Mobile Money' },
    { id:'carte', label:'💳 Carte bancaire' },
  ];
  if (!commande) return null;
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(26,26,46,0.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:20, padding:24, width:'100%', maxWidth:360 }}>
        <h3 style={{ margin:'0 0 6px', fontSize:18, fontWeight:800, color:C.textDark }}>Paiement</h3>
        <p style={{ margin:'0 0 20px', fontSize:13, color:C.textGray }}>Choisissez votre mode de paiement</p>

        <div style={{ background:C.orangeL, borderRadius:12, padding:'12px 16px', textAlign:'center', marginBottom:20 }}>
          <div style={{ fontSize:11, color:C.textGray, fontWeight:600, marginBottom:2 }}>TOTAL À RÉGLER</div>
          <div style={{ fontSize:28, fontWeight:800, color:C.orange }}>{Number(commande.total).toLocaleString('fr-CI')} FCFA</div>
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:20 }}>
          {modes.map(m => (
            <button key={m.id} onClick={() => setMode(m.id)} style={{
              padding:'13px 16px', borderRadius:12, border:`2px solid ${mode===m.id?C.orange:C.border}`,
              background:mode===m.id?C.orangeL:C.white, color:C.textDark, fontSize:15, fontWeight:600,
              cursor:'pointer', textAlign:'left', transition:'all .15s',
            }}>{m.label}</button>
          ))}
        </div>

        <button onClick={() => mode && onPay(mode)} disabled={!mode}
          style={{ ...S.btn('primary'), width:'100%', padding:'14px', opacity:mode?1:0.5 }}>
          {Icon.wallet} Confirmer le paiement
        </button>
      </div>
    </div>
  );
}

// ─── Appel serveur overlay ────────────────────────────────────────────
function AppelOverlay({ onClose, onAppel, loading, done }) {
  return (
    <div style={{ position:'fixed', inset:0, zIndex:200, background:'rgba(26,26,46,0.6)', backdropFilter:'blur(6px)',
      display:'flex', alignItems:'center', justifyContent:'center', padding:20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ background:C.white, borderRadius:20, padding:28, width:'100%', maxWidth:320, textAlign:'center' }}>
        {done ? (
          <>
            <div style={{ fontSize:48, marginBottom:12 }}>🔔</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.green, marginBottom:8 }}>Appel envoyé !</div>
            <div style={{ fontSize:14, color:C.textGray, marginBottom:20 }}>Un serveur arrive bientôt.</div>
            <button onClick={onClose} style={{ ...S.btn('primary'), width:'100%', padding:'12px' }}>OK</button>
          </>
        ) : (
          <>
            <div style={{ fontSize:48, marginBottom:12 }}>🛎️</div>
            <div style={{ fontSize:18, fontWeight:800, color:C.textDark, marginBottom:8 }}>Appeler un serveur ?</div>
            <div style={{ fontSize:14, color:C.textGray, marginBottom:24 }}>Un membre de l'équipe viendra vous voir rapidement.</div>
            <div style={{ display:'flex', gap:10 }}>
              <button onClick={onClose} style={{ ...S.btn('ghost'), flex:1, padding:'12px' }}>Annuler</button>
              <button onClick={onAppel} disabled={loading} style={{ ...S.btn('primary'), flex:1, padding:'12px' }}>
                {loading ? 'Envoi…' : Icon.bell}
                {!loading && ' Appeler'}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────
export default function MenuClientPage() {
  const params = useParams();
  const { slug, tableId } = params;

  const [restaurant, setRestaurant] = useState(null);
  const [table, setTable]           = useState(null);
  const [categories, setCategories] = useState([]);
  const [plats, setPlats]           = useState([]);
  const [commande, setCommande]     = useState(null); // commande active de cette table
  const [commandeItems, setCommandeItems] = useState([]);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState(null);

  const [activeCat, setActiveCat]   = useState(null);
  const [panier, setPanier]         = useState([]); // {id, nom, prix, qty, note}
  const [modalPlat, setModalPlat]   = useState(null);
  const [showPanier, setShowPanier] = useState(false);
  const [showAppel, setShowAppel]   = useState(false);
  const [appelDone, setAppelDone]   = useState(false);
  const [appelLoading, setAppelLoading] = useState(false);
  const [showPaiement, setShowPaiement] = useState(false);
  const [toast, setToast]           = useState(null);

  const showToast = (msg, type='success') => {
    setToast({ msg, type });
  };

  // ── Load data ──
  useEffect(() => {
    (async () => {
      // Find restaurant by slug
      const { data: resto, error: restoErr } = await supabase
        .from('restaurants').select('*').eq('slug', slug).single();
      if (restoErr || !resto) { setError('Restaurant introuvable'); setLoading(false); return; }
      setRestaurant(resto);

      // Find table
      const { data: tbl } = await supabase.from('tables').select('*').eq('id', tableId).single();
      if (!tbl) { setError('Table introuvable'); setLoading(false); return; }
      setTable(tbl);

      // Cats & plats
      const [catsRes, platsRes] = await Promise.all([
        supabase.from('categories').select('*').eq('restaurant_id', resto.id).order('ordre'),
        supabase.from('plats').select('*').eq('restaurant_id', resto.id).eq('disponible', true).order('ordre'),
      ]);
      setCategories(catsRes.data || []);
      setPlats(platsRes.data || []);
      if (catsRes.data?.length > 0) setActiveCat(catsRes.data[0].id);

      // Commande active sur cette table (pas clôturée ni annulée)
      const { data: cmd } = await supabase.from('commandes').select('*')
        .eq('table_id', tableId)
        .not('statut', 'in', '(cloture,annule)')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      if (cmd) {
        setCommande(cmd);
        const { data: citems } = await supabase.from('commande_items').select('*').eq('commande_id', cmd.id);
        setCommandeItems(citems || []);
      }
      setLoading(false);
    })();
  }, [slug, tableId]);

  // ── Realtime commande ──
  useEffect(() => {
    if (!commande) return;
    const ch = supabase.channel(`commande-${commande.id}`)
      .on('postgres_changes', { event:'UPDATE', schema:'public', table:'commandes', filter:`id=eq.${commande.id}` },
        payload => {
          setCommande(payload.new);
          if (payload.new.statut === 'servi') showToast('✨ Votre commande est servie !', 'success');
          if (payload.new.statut === 'presque_pret') showToast('🔔 Votre commande arrive !', 'success');
        })
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'commande_items' },
        payload => {
          if (payload.new.commande_id === commande.id) {
            setCommandeItems(ci => [...ci, payload.new]);
          }
        })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [commande?.id]);

  // ── Panier helpers ──
  const addToCart = (plat, qty, note) => {
    setPanier(p => {
      const existing = p.find(i => i.id === plat.id && i.note === note);
      if (existing) return p.map(i => i.id === plat.id && i.note === note ? { ...i, qty: i.qty + qty } : i);
      return [...p, { id: plat.id, nom: plat.nom, prix: plat.prix, qty, note }];
    });
    showToast(`${plat.nom} ajouté !`);
  };

  const updateQty = (id, qty) => setPanier(p => p.map(i => i.id === id ? { ...i, qty } : i));
  const removeItem = (id) => setPanier(p => p.filter(i => i.id !== id));
  const totalPanier = panier.reduce((s, i) => s + i.prix * i.qty, 0);
  const nbPanier = panier.reduce((s, i) => s + i.qty, 0);

  // ── Commander ──
  const commander = async () => {
    if (panier.length === 0) return;
    const items = panier.map(i => ({
      plat_id: i.id,
      nom_plat: i.nom,
      prix_unitaire: i.prix,
      quantite: i.qty,
      note: i.note || null,
    }));

    if (commande && !['cloture', 'annule'].includes(commande.statut)) {
      // Ajouter à commande existante
      const newItems = items.map(i => ({ ...i, commande_id: commande.id }));
      await supabase.from('commande_items').insert(newItems);
      const newTotal = commandeItems.reduce((s, i) => s + i.prix_unitaire * i.quantite, 0) + totalPanier;
      await supabase.from('commandes').update({ total: newTotal }).eq('id', commande.id);
      setCommande(c => ({ ...c, total: newTotal }));
      showToast('Articles ajoutés à votre commande !');
    } else {
      // Nouvelle commande
      const { data: cmd, error } = await supabase.from('commandes').insert({
        restaurant_id: restaurant.id,
        table_id: tableId,
        statut: 'en_attente',
        total: totalPanier,
        paye: false,
      }).select().single();
      if (error || !cmd) { showToast('Erreur, réessayez', 'error'); return; }

      const withCmd = items.map(i => ({ ...i, commande_id: cmd.id }));
      await supabase.from('commande_items').insert(withCmd);
      // Marquer table occupée
      await supabase.from('tables').update({ statut: 'occupee' }).eq('id', tableId);
      setCommande(cmd);
      setCommandeItems(withCmd);
      showToast('Commande envoyée ! 🎉');
    }
    setPanier([]);
    setShowPanier(false);
  };

  // ── Appel serveur ──
  const appelServeur = async () => {
    setAppelLoading(true);
    await supabase.from('appels_serveur').insert({
      restaurant_id: restaurant.id,
      table_id: tableId,
      traite: false,
    });
    setAppelLoading(false);
    setAppelDone(true);
  };

  // ── Paiement ──
  const demanderPaiement = async (mode) => {
    if (!commande) return;
    await supabase.from('commandes').update({ paye: true, mode_paiement: mode }).eq('id', commande.id);
    setCommande(c => ({ ...c, paye: true, mode_paiement: mode }));
    setShowPaiement(false);
    showToast('Paiement confirmé ! Merci 🙏');
  };

  // ── Filtered plats ──
  const platsDuCat = plats.filter(p => p.categorie_id === activeCat);

  if (loading) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12 }}>
      <div style={{ fontSize:40 }}>🍽️</div>
      <div style={{ fontSize:14, color:C.textGray, fontFamily:'system-ui' }}>Chargement du menu…</div>
    </div>
  );

  if (error) return (
    <div style={{ minHeight:'100vh', background:C.bg, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:12, padding:24 }}>
      <div style={{ fontSize:48 }}>😕</div>
      <div style={{ fontSize:18, fontWeight:700, color:C.textDark, textAlign:'center' }}>{error}</div>
      <div style={{ fontSize:13, color:C.textGray, textAlign:'center' }}>Vérifiez le QR code ou demandez de l'aide au serveur.</div>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:C.bg, fontFamily:'system-ui, sans-serif', paddingBottom:90 }}>
      <style>{`
        @keyframes slideDown{from{transform:translateX(-50%) translateY(-10px);opacity:0}to{transform:translateX(-50%) translateY(0);opacity:1}}
        @keyframes pulse{0%,100%{opacity:1}50%{opacity:0.4}}
        * { -webkit-tap-highlight-color: transparent; }
      `}</style>

      {toast && <Toast msg={toast.msg} type={toast.type} onDone={() => setToast(null)}/>}

      {/* Header */}
      <div style={{ background:C.header, padding:'16px 20px 14px', position:'sticky', top:0, zIndex:50 }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,0.5)', fontWeight:600, letterSpacing:'0.06em', textTransform:'uppercase' }}>
              {restaurant?.nom}
            </div>
            <div style={{ fontSize:20, fontWeight:800, color:C.white }}>
              Table {table?.numero}
            </div>
          </div>
          {/* Appel serveur */}
          <button onClick={() => { setAppelDone(false); setShowAppel(true); }}
            style={{ display:'flex', flexDirection:'column', alignItems:'center', gap:3, background:'rgba(255,255,255,0.1)', border:'none', borderRadius:12, padding:'8px 14px', cursor:'pointer', color:C.white }}>
            {Icon.bell}
            <span style={{ fontSize:10, fontWeight:600 }}>Serveur</span>
          </button>
        </div>
      </div>

      {/* Statut commande */}
      {commande && (
        <div style={{ padding:'14px 0 0' }}>
          <StatutBanner commande={commande}/>
          {/* Bouton paiement si servi et non payé */}
          {commande.statut === 'servi' && !commande.paye && (
            <div style={{ padding:'10px 16px 0' }}>
              <button onClick={() => setShowPaiement(true)}
                style={{ ...S.btn('primary'), width:'100%', padding:'13px', fontSize:15 }}>
                {Icon.wallet} Régler la note · {Number(commande.total).toLocaleString('fr-CI')} FCFA
              </button>
            </div>
          )}
          {commande.paye && commande.statut !== 'cloture' && (
            <div style={{ margin:'10px 16px 0', background:C.greenL, borderRadius:12, padding:'10px 14px', display:'flex', gap:8, alignItems:'center' }}>
              {Icon.check}
              <span style={{ fontSize:13, fontWeight:600, color:C.green }}>Paiement enregistré · Merci !</span>
            </div>
          )}
        </div>
      )}

      {/* Category tabs */}
      <div style={{ background:C.white, borderBottom:`1px solid ${C.border}`, position:'sticky', top:64, zIndex:40, marginTop:14 }}>
        <div style={{ display:'flex', overflowX:'auto', scrollbarWidth:'none', padding:'0 16px' }}>
          {categories.map(cat => {
            const active = activeCat === cat.id;
            return (
              <button key={cat.id} onClick={() => setActiveCat(cat.id)} style={{
                padding:'12px 14px', border:'none', background:'transparent', cursor:'pointer',
                fontSize:13, fontWeight:700, whiteSpace:'nowrap', fontFamily:'system-ui, sans-serif',
                color: active ? C.orange : C.textGray,
                borderBottom: active ? `2px solid ${C.orange}` : '2px solid transparent',
                flexShrink: 0,
              }}>
                {cat.nom}
              </button>
            );
          })}
        </div>
      </div>

      {/* Plats grid */}
      <div style={{ padding:'14px 16px', display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
        {platsDuCat.length === 0 ? (
          <div style={{ gridColumn:'span 2', padding:32, textAlign:'center', color:C.textGray, fontSize:13 }}>
            Aucun plat disponible dans cette catégorie
          </div>
        ) : (
          platsDuCat.map(plat => {
            const qtyInCart = panier.find(i => i.id === plat.id)?.qty || 0;
            return (
              <div key={plat.id} onClick={() => setModalPlat(plat)}
                style={{ ...S.card, overflow:'hidden', cursor:'pointer', position:'relative', opacity:plat.disponible?1:0.6 }}>
                {/* Image */}
                <div style={{ width:'100%', height:110, background:C.bg, overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
                  {plat.image_url
                    ? <img src={plat.image_url} alt={plat.nom} style={{ width:'100%', height:'100%', objectFit:'cover' }}/>
                    : <span style={{ color:C.textLight }}>{Icon.image}</span>}
                </div>
                {/* Badge qty */}
                {qtyInCart > 0 && (
                  <div style={{ position:'absolute', top:8, right:8, width:22, height:22, borderRadius:'50%',
                    background:C.orange, color:C.white, fontSize:11, fontWeight:800,
                    display:'flex', alignItems:'center', justifyContent:'center' }}>
                    {qtyInCart}
                  </div>
                )}
                <div style={{ padding:'10px 10px 12px' }}>
                  <div style={{ fontSize:13, fontWeight:700, color:C.textDark, marginBottom:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{plat.nom}</div>
                  {plat.description && (
                    <div style={{ fontSize:11, color:C.textGray, marginBottom:6, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>{plat.description}</div>
                  )}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <span style={{ fontSize:13, fontWeight:800, color:C.orange }}>{Number(plat.prix).toLocaleString('fr-CI')} F</span>
                    {plat.disponible && (
                      <div style={{ width:24, height:24, borderRadius:'50%', background:C.orange, display:'flex', alignItems:'center', justifyContent:'center', color:C.white }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom bar fixe */}
      {nbPanier > 0 && (
        <div style={{ position:'fixed', bottom:0, left:0, right:0, padding:'12px 16px', background:C.white, borderTop:`1px solid ${C.border}`, zIndex:90 }}>
          <button onClick={() => setShowPanier(true)} style={{ ...S.btn('primary'), width:'100%', padding:'14px', fontSize:15, position:'relative' }}>
            <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)',
              background:'rgba(255,255,255,0.3)', borderRadius:'50%', width:26, height:26,
              display:'flex', alignItems:'center', justifyContent:'center', fontSize:12, fontWeight:800 }}>
              {nbPanier}
            </span>
            {Icon.cart} Voir le panier · {totalPanier.toLocaleString('fr-CI')} FCFA
          </button>
        </div>
      )}

      {/* Modals */}
      {modalPlat && <PlatModal plat={modalPlat} onClose={() => setModalPlat(null)} onAdd={addToCart}/>}
      {showPanier && <PanierModal items={panier} onClose={() => setShowPanier(false)} onCommander={commander} onUpdateQty={updateQty} onRemove={removeItem} commandeEnCours={!!commande && !['cloture','annule'].includes(commande?.statut)}/>}
      {showAppel && <AppelOverlay onClose={() => setShowAppel(false)} onAppel={appelServeur} loading={appelLoading} done={appelDone}/>}
      {showPaiement && <PaiementModal commande={commande} onClose={() => setShowPaiement(false)} onPay={demanderPaiement}/>}
    </div>
  );
}