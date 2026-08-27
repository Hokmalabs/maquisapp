'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '../../../lib/supabase';
import { agregerParArticle } from '../../../../lib/ventes';

const C = {
  bg: '#F5F5F5', white: '#FFFFFF', primary: '#8B1A27', primaryLight: '#FFF0EB',
  dark: '#3D0C11', gray: '#8A8A9A', grayLight: '#F0F0F5', border: '#E8E8F0',
  green: '#00C851', yellow: '#FFB800', red: '#FF3B30', shadow: 'rgba(0,0,0,0.07)',
  purple: '#8B5CF6',
};

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

const MEDAILLES = ['🥇', '🥈', '🥉'];

export default function VentesParArticlePage() {
  const router = useRouter();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading]       = useState(true);
  const [period, setPeriod]         = useState('today');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo]     = useState('');
  const [showCustom, setShowCustom] = useState(false);
  const [articles, setArticles]     = useState([]);

  useEffect(() => {
    (async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { router.push('/auth/login'); return; }
      const { data: profile } = await supabase.from('profiles').select('restaurant_id').eq('id', session.user.id).single();
      if (!profile) { router.push('/auth/login'); return; }
      const { data: resto } = await supabase.from('restaurants').select('*').eq('id', profile.restaurant_id).single();
      setRestaurant(resto);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (!restaurant) return;
    (async () => {
      const { from, to } = getPeriodRange(period, customFrom, customTo);
      const { data: commandes } = await supabase.from('commandes')
        .select('id, created_at, table_id, mode_paiement')
        .eq('restaurant_id', restaurant.id)
        .eq('statut', 'cloture')
        .gte('created_at', from + 'T00:00:00')
        .lte('created_at', to + 'T23:59:59');

      const ids = (commandes || []).map(c => c.id);
      let items = [];
      if (ids.length > 0) {
        const { data } = await supabase.from('commande_items').select('*').in('commande_id', ids);
        items = data || [];
      }
      setArticles(agregerParArticle(items));
    })();
  }, [restaurant, period, customFrom, customTo]);

  const totalQuantite = articles.reduce((s, a) => s + a.quantite, 0);
  const totalMontant = articles.reduce((s, a) => s + a.montant, 0);
  const maxMontant = Math.max(...articles.map(a => a.montant), 1);

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
        .btn:active { transform: scale(0.97); }
      `}</style>

      {/* HEADER */}
      <div style={{ background: C.dark, padding: '48px 16px 0', position: 'sticky', top: 0, zIndex: 100 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
          <button onClick={() => router.push('/dashboard/historique')} style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16 }}>←</button>
          <div>
            <div style={{ color: C.white, fontWeight: 700, fontSize: 15 }}>Ventes par article</div>
            <div style={{ color: '#aaa', fontSize: 11 }}>{restaurant?.nom}</div>
          </div>
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

        {/* RÉSUMÉ */}
        <div style={{ background: C.dark, borderRadius: 20, padding: '20px', boxShadow: '0 4px 20px rgba(0,0,0,.15)' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.5)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: .5, marginBottom: 4 }}>Montant total vendu</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: C.white, marginBottom: 2 }}>{fmtCFA(totalMontant)}</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.5)' }}>{totalQuantite} unité{totalQuantite !== 1 ? 's' : ''} · {articles.length} article{articles.length !== 1 ? 's' : ''} distinct{articles.length !== 1 ? 's' : ''}</div>
        </div>

        {/* TOP ARTICLES */}
        <div style={{ background: C.white, borderRadius: 18, boxShadow: `0 2px 10px ${C.shadow}`, overflow: 'hidden' }}>
          <div style={{ padding: '14px 16px', borderBottom: `1px solid ${C.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Top ventes</div>
            <span style={{ fontSize: 11, color: C.gray }}>{articles.length} article{articles.length !== 1 ? 's' : ''}</span>
          </div>

          {articles.length === 0 ? (
            <div style={{ padding: 32, textAlign: 'center', color: C.gray, fontSize: 13 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              Aucune vente sur cette période
            </div>
          ) : (
            <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {articles.map((a, i) => {
                const pct = maxMontant > 0 ? (a.montant / maxMontant) * 100 : 0;
                return (
                  <div key={a.nom}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 5 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ fontSize: 15, width: 20, textAlign: 'center' }}>{MEDAILLES[i] || `${i + 1}`}</span>
                        <div>
                          <div style={{ fontSize: 13, fontWeight: 600, color: C.dark }}>{a.nom}</div>
                          <div style={{ fontSize: 10, color: C.gray }}>×{a.quantite} vendu{a.quantite !== 1 ? 's' : ''}</div>
                        </div>
                      </div>
                      <div style={{ fontSize: 14, fontWeight: 800, color: C.primary }}>{fmtCFA(a.montant)}</div>
                    </div>
                    <div style={{ height: 5, background: C.grayLight, borderRadius: 99, overflow: 'hidden' }}>
                      <div style={{ height: '100%', background: C.primary, borderRadius: 99, width: `${pct}%`, transition: 'width .4s ease' }} />
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
    </div>
  );
}
