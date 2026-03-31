'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../lib/supabase';

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#FF6B35', primaryLight: '#FFF0EB',
  dark: '#1A1A2E', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
  purple: '#8B5CF6',
};

const MODES = [
  { id: 'wave',         label: 'Wave',          icon: '🌊', color: '#1BA7FF' },
  { id: 'orange_money', label: 'Orange Money',  icon: '🟠', color: '#FF6600' },
  { id: 'mtn_money',   label: 'MTN Money',     icon: '💛', color: '#FFC107' },
  { id: 'cash',        label: 'Espèces',       icon: '💵', color: '#00C851' },
  { id: 'carte',       label: 'Carte',         icon: '💳', color: '#8B5CF6' },
];

function getMode(id) {
  return MODES.find(m => m.id === id) || { label: id || 'Non spécifié', icon: '❓', color: '#8A8A9A' };
}

const PERIODS = [
  { id: 'today', label: "Aujourd'hui" },
  { id: 'week',  label: '7 jours' },
  { id: 'month', label: '30 jours' },
  { id: 'custom',label: 'Personnalisé' },
];

function getPeriodRange(period, customFrom, customTo) {
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  if (period === 'today') return { from: today, to: today };
  if (period === 'week') {
    const f = new Date(now); f.setDate(f.getDate() - 6);
    return { from: f.toISOString().slice(0, 10), to: today };
  }
  if (period === 'month') {
    const f = new Date(now); f.setDate(f.getDate() - 29);
    return { from: f.toISOString().slice(0, 10), to: today };
  }
  return { from: customFrom || today, to: customTo || today };
}

function fmtCFA(n) { return Number(n || 0).toLocaleString('fr-CI') + ' F'; }
function fmtDate(d) { return new Date(d).toLocaleDateString('fr-CI', { day: '2-digit', month: 'short' }); }
function fmtTime(d) { return new Date(d).toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' }); }

function BarChart({ data }) {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data.map(d => d.total), 1);
  const today = new Date().toISOString().slice(0, 10);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 3, height: 72, padding: '0 2px' }}>
      {data.slice(-14).map((d, i) => {
        const h = Math.max((d.total / max) * 60, 2);
        const isToday = d.date === today;
        return (
          <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2 }}>
            <div style={{ width: '100%', height: h, borderRadius: '3px 3px 0 0', background: isToday ? '#FF6B35' : 'rgba(255,107,53,0.3)', minHeight: 2 }} />
            <span style={{ fontSize: 7, color: isToday ? '#FF6B35' : 'rgba(255,255,255,.4)', fontWeight: isToday ? 700 : 400 }}>
              {new Date(d.date).getDate()}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function exportCSV(commandes, tables) {
  const rows = [['Date', 'Heure', 'Table', 'Total (FCFA)', 'Mode paiement', 'Statut']];
  commandes.forEach(c => {
    const t = tables.find(x => x.id === c.table_id);
    const dt = new Date(c.created_at);
    rows.push([
      dt.toLocaleDateString('fr-CI'),
      dt.toLocaleTimeString('fr-CI', { hour: '2-digit', minute: '2-digit' }),
      `Table ${t?.numero || '?'}`,
      c.total || 0,
      c.mode_paiement || '—',
      c.statut,
    ]);
  });
  const csv = rows.map(r => r.join(';')).join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = `maquisapp_historique_${new Date().toISOString().slice(0, 10)}.csv`; a.click();
  URL.revokeObjectURL(url);
}

export default function HistoriquePage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [tables, setTables]         = useState([]);
  const [commandes, setCommandes]   = useState([]);
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [filterMode, setFilterMode] = useState('all'); // filtre par mode paiement
  const [showDetail, setShowDetail] = useState(null);  // commande sélectionnée
  const [detailItems, setDetailItems] = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', session.user.id).single();
      if (!profile) { router.push('/auth/login'); return; }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('id', profile.restaurant_id).single();
      setRestaurant(resto);
      const { data: ts } = await supabase.from('tables').select('*').eq('restaurant_id', profile.restaurant_id);
      setTables(ts || []);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    const { from, to } = getPeriodRange(period, customFrom, customTo);
    supabase.from('commandes')
      .select('*')
      .eq('restaurant_id', restaurant.id)
      .eq('statut', 'cloture')
      .gte('created_at', from + 'T00:00:00')
      .lte('created_at', to + 'T23:59:59')
      .order('created_at', { ascending: false })
      .then(({ data }) => setCommandes(data || []));
  }, [restaurant, period, customFrom, customTo]);

  async function ouvrirDetail(cmd) {
    setShowDetail(cmd);
    const { data } = await supabase.from('commande_items').select('*').eq('commande_id', cmd.id);
    setDetailItems(data || []);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────
  const ca = commandes.reduce((s, c) => s + (c.total || 0), 0);
  const nbCommandes = commandes.length;
  const panierMoyen = nbCommandes > 0 ? ca / nbCommandes : 0;

  // Totaux par mode de paiement (montants)
  const totauxParMode = {};
  commandes.forEach(c => {
    const m = c.mode_paiement || 'non_specifie';
    if (!totauxParMode[m]) totauxParMode[m] = { count: 0, total: 0 };
    totauxParMode[m].count++;
    totauxParMode[m].total += c.total || 0;
  });

  // Bar chart
  const byDay = {};
  commandes.forEach(c => {
    const d = c.created_at.slice(0, 10);
    byDay[d] = (byDay[d] || 0) + (c.total || 0);
  });
  const { from, to } = getPeriodRange(period, customFrom, customTo);
  const chartData = [];
  const cur = new Date(from); const end = new Date(to);
  while (cur <= end) {
    const d = cur.toISOString().slice(0, 10);
    chartData.push({ date: d, total: byDay[d] || 0 });
    cur.setDate(cur.getDate() + 1);
  }

  // Filtre mode paiement
  const commandesFiltrees = filterMode === 'all'
    ? commandes
    : commandes.filter(c => (c.mode_paiement || 'non_specifie') === filterMode);

  if (loading) return (
    <div style={{ minHeight: '100vh', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 12, fontFamily: "'DM Sans', system-ui" }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>📊</div>
      <p style={{ color: C.primary, fontWeight: 600, fontSize: 14 }}>Chargement...</p>
      <style>{`@keyframes pulse{0%,100%{opacity:1;transform:scale(1)}50%{opacity:.6;transform:scale(1.1)}}`}</style>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif", paddingBottom: 90 }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .row-cmd:active { background: #F5F5F5; }
        .btn:active { transform: scale(0.97); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={() => router.push('/dashboard')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Historique</div>
              <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.nom}</div>
            </div>
          </div>
          <button className="btn" onClick={() => exportCSV(commandes, tables)}
            style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 13px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.2)', background: 'transparent', color: C.white, fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            ⬇️ CSV
          </button>
        </div>

        {/* Filtres période */}
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', padding: '0 0 12px' }}>
          {PERIODS.map(p => (
            <button key={p.id} onClick={() => { setPeriod(p.id); setShowCustom(p.id === 'custom'); }}
              style={{ flexShrink: 0, padding: '6px 14px', borderRadius: 50, border: `1.5px solid ${period === p.id ? C.primary : 'rgba(255,255,255,.2)'}`, background: period === p.id ? C.primary : 'transparent', color: C.white, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Dates custom */}
        {showCustom && (
          <div style={{ display: 'flex', gap: 8, padding: '0 0 12px' }}>
            <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: C.white, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
            <span style={{ color: 'rgba(255,255,255,.5)', alignSelf: 'center' }}>→</span>
            <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
              style={{ flex: 1, padding: '8px 10px', borderRadius: 10, border: '1.5px solid rgba(255,255,255,.2)', background: 'rgba(255,255,255,.1)', color: C.white, fontSize: 12, outline: 'none', fontFamily: 'inherit' }} />
          </div>
        )}
      </div>

      <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>

        {/* CA PRINCIPAL */}
        <div style={{ background: C.dark, borderRadius: 20, padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Chiffre d'affaires</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.white, marginBottom: 2 }}>{fmtCFA(ca)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{nbCommandes} commande{nbCommandes !== 1 ? 's' : ''} clôturée{nbCommandes !== 1 ? 's' : ''}</div>
          {chartData.length > 1 && <div style={{ marginTop: 14 }}><BarChart data={chartData} /></div>}
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
          {[
            { label: 'Panier moyen', value: fmtCFA(panierMoyen), color: C.purple, bg: '#F5F3FF' },
            { label: 'Commandes/jour', value: period === 'today' ? nbCommandes : (chartData.length > 0 ? (nbCommandes / chartData.length).toFixed(1) : 0), color: C.primary, bg: C.primaryLight },
          ].map(k => (
            <div key={k.label} style={{ background: C.white, borderRadius: 16, padding: '14px', boxShadow: `0 2px 8px ${C.shadow}`, border: `1px solid ${k.color}22` }}>
              <div style={{ fontSize: 10, color: C.gray, fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>{k.label}</div>
              <div style={{ fontSize: 20, fontWeight: 800, color: k.color }}>{k.value}</div>
            </div>
          ))}
        </div>

        {/* TOTAUX PAR MODE DE PAIEMENT */}
        {Object.keys(totauxParMode).length > 0 && (
          <div style={{ background: C.white, borderRadius: 18, boxShadow: `0 2px 10px ${C.shadow}`, overflow: 'hidden' }}>
            <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Encaissements par mode</div>
              <div style={{ fontSize: 11, color: C.gray }}>{nbCommandes} total</div>
            </div>
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 10 }}>
              {Object.entries(totauxParMode).sort((a, b) => b[1].total - a[1].total).map(([modeId, stats]) => {
                const cfg = getMode(modeId);
                const pct = ca > 0 ? (stats.total / ca) * 100 : 0;
                return (
                  <div key={modeId}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 18 }}>{cfg.icon}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{cfg.label}</div>
                          <div style={{ fontSize: 10, color: C.gray }}>{stats.count} commande{stats.count > 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 14, fontWeight: 800, color: cfg.color }}>{fmtCFA(stats.total)}</div>
                        <div style={{ fontSize: 10, color: C.gray }}>{pct.toFixed(0)}%</div>
                      </div>
                    </div>
                    {/* Barre de progression */}
                    <div style={{ height: 5, background: C.grayLight, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: cfg.color, borderRadius: 99, width: `${pct}%`, transition: 'width .4s ease' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* FILTRE PAR MODE + LISTE */}
        <div style={{ background: C.white, borderRadius: 18, boxShadow: `0 2px 10px ${C.shadow}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Détail</div>
              <span style={{ fontSize: 11, color: C.gray }}>{commandesFiltrees.length} entrée{commandesFiltrees.length !== 1 ? 's' : ''}</span>
            </div>
            {/* Chips filtre mode */}
            <div style={{ display: 'flex', gap: 6, overflowX: 'auto' }}>
              <button onClick={() => setFilterMode('all')}
                style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 50, border: filterMode === 'all' ? 'none' : `1.5px solid ${C.border}`, background: filterMode === 'all' ? C.dark : C.white, color: filterMode === 'all' ? '#fff' : C.dark, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
                Tous
              </button>
              {Object.keys(totauxParMode).map(modeId => {
                const cfg = getMode(modeId);
                const active = filterMode === modeId;
                return (
                  <button key={modeId} onClick={() => setFilterMode(modeId)}
                    style={{ flexShrink: 0, padding: '5px 12px', borderRadius: 50, border: active ? 'none' : `1.5px solid ${C.border}`, background: active ? cfg.color : C.white, color: active ? '#fff' : C.dark, fontSize: 11, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap' }}>
                    {cfg.icon} {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {commandesFiltrees.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.gray, fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              Aucune commande sur cette période
            </div>
          ) : (
            <div>
              {commandesFiltrees.map((c, i) => {
                const t = tables.find(x => x.id === c.table_id);
                const cfg = getMode(c.mode_paiement || 'non_specifie');
                return (
                  <div key={c.id} className="row-cmd" onClick={() => ouvrirDetail(c)}
                    style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 16px', borderBottom: i < commandesFiltrees.length - 1 ? `1px solid ${C.border}` : 'none', cursor: 'pointer', transition: 'background .15s' }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: cfg.color + '18', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>{cfg.icon}</div>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>Table {t?.numero || '?'}</div>
                      <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>{fmtDate(c.created_at)} · {fmtTime(c.created_at)} · {cfg.label}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{fmtCFA(c.total)}</div>
                      <div style={{ fontSize: 10, color: C.gray, marginTop: 1 }}>›</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* BOTTOM NAV */}
      <div style={{ position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: '100%', maxWidth: 480, background: C.white, borderTop: `1px solid ${C.border}`, display: 'flex', zIndex: 100 }}>
        {[
          { icon: '🏠', label: 'Accueil', path: '/dashboard' },
          { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
          { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
          { icon: '🪑', label: 'Tables', path: '/dashboard/tables' },
          { icon: '📊', label: 'Historique', path: '/dashboard/historique', active: true },
        ].map(item => (
          <button key={item.path} onClick={() => router.push(item.path)}
            style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2, padding: '10px 0 6px', background: 'none', border: 'none', cursor: 'pointer', color: item.active ? C.primary : C.gray, fontSize: 9, fontWeight: item.active ? 700 : 400, fontFamily: 'inherit', position: 'relative' }}>
            {item.active && <div style={{ position: 'absolute', top: 0, left: '50%', transform: 'translateX(-50%)', width: 20, height: 3, background: C.primary, borderRadius: '0 0 3px 3px' }}></div>}
            <span style={{ fontSize: 20 }}>{item.icon}</span>
            {item.label}
          </button>
        ))}
      </div>

      {/* MODAL DÉTAIL COMMANDE */}
      {showDetail && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', alignItems: 'flex-end', animation: 'fadeIn .2s' }}>
          <div onClick={() => { setShowDetail(null); setDetailItems([]); }} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)' }}></div>
          <div style={{ position: 'relative', width: '100%', background: C.white, borderRadius: '22px 22px 0 0', maxHeight: '80vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
            <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
              <div style={{ width: 36, height: 4, borderRadius: 2, background: C.border }}></div>
            </div>
            <div style={{ padding: '10px 18px 12px', borderBottom: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: 15, fontWeight: 800, color: C.dark }}>
                  Table {tables.find(t => t.id === showDetail.table_id)?.numero || '?'}
                </div>
                <div style={{ fontSize: 11, color: C.gray, marginTop: 1 }}>
                  {fmtDate(showDetail.created_at)} · {fmtTime(showDetail.created_at)}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <div style={{ background: getMode(showDetail.mode_paiement || 'non_specifie').color + '18', color: getMode(showDetail.mode_paiement || 'non_specifie').color, borderRadius: 20, padding: '4px 10px', fontSize: 11, fontWeight: 700, display: 'flex', alignItems: 'center', gap: 4 }}>
                  <span>{getMode(showDetail.mode_paiement || 'non_specifie').icon}</span>
                  {getMode(showDetail.mode_paiement || 'non_specifie').label}
                </div>
                <button onClick={() => { setShowDetail(null); setDetailItems([]); }} style={{ background: C.grayLight, border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
              </div>
            </div>
            <div style={{ overflowY: 'auto', flex: 1, padding: '10px 18px' }}>
              {detailItems.map(item => (
                <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{item.nom_plat}</div>
                    <div style={{ fontSize: 11, color: C.gray }}>×{item.quantite} · {item.prix_unitaire.toLocaleString()} F/u</div>
                  </div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{(item.prix_unitaire * item.quantite).toLocaleString()} F</div>
                </div>
              ))}
            </div>
            <div style={{ padding: '12px 18px 36px', borderTop: `1px solid ${C.border}`, display: 'flex', justifyContent: 'space-between' }}>
              <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Total</span>
              <span style={{ fontSize: 17, fontWeight: 800, color: C.primary }}>{fmtCFA(showDetail.total)}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}