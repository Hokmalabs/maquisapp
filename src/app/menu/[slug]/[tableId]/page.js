'use client';

import { useState, useEffect, useRef } from 'react';
import { supabase } from '../../../lib/supabase';

// ─── PALETTE ────────────────────────────────────────────────────────────────
const C = {
  bg: '#F5F5F5',
  white: '#FFFFFF',
  primary: '#FF6B35',
  primaryDark: '#E85520',
  primaryLight: '#FFF0EB',
  dark: '#1A1A2E',
  gray: '#8A8A9A',
  grayLight: '#F0F0F5',
  border: '#E8E8F0',
  green: '#00C851',
  yellow: '#FFB800',
  red: '#FF3B30',
  shadow: 'rgba(0,0,0,0.08)',
  shadowMd: 'rgba(0,0,0,0.14)',
};

// ─── STATUTS COMMANDE ────────────────────────────────────────────────────────
const STATUT_CONFIG = {
  en_attente:    { label: 'En attente',     color: '#FFB800', icon: '⏳', bg: '#FFF8E1' },
  valide:        { label: 'Validée',        color: '#00C851', icon: '✅', bg: '#E8F5E9' },
  en_preparation:{ label: 'En préparation', color: '#FF6B35', icon: '👨‍🍳', bg: '#FFF0EB' },
  presque_pret:  { label: 'Presque prêt !', color: '#E85520', icon: '🔔', bg: '#FFE8E0' },
  servi:         { label: 'Servi',          color: '#00C851', icon: '🍽️', bg: '#E8F5E9' },
  cloture:       { label: 'Clôturée',       color: '#8A8A9A', icon: '✔️', bg: '#F5F5F5' },
  annule:        { label: 'Annulée',        color: '#FF3B30', icon: '❌', bg: '#FFEBEE' },
};

export default function MenuPage({ params }) {
  const { slug, tableId } = params;

  const [restaurant, setRestaurant]       = useState(null);
  const [categories, setCategories]       = useState([]);
  const [plats, setPlats]                 = useState([]);
  const [table, setTable]                 = useState(null);
  const [panier, setPanier]               = useState([]);
  const [commande, setCommande]           = useState(null);
  const [commandeItems, setCommandeItems] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [activeCat, setActiveCat]         = useState(null);
  const [searchQuery, setSearchQuery]     = useState('');
  const [view, setView]                   = useState('menu');
  const [showPanierModal, setShowPanierModal]   = useState(false);
  const [appelEnvoye, setAppelEnvoye]     = useState(false);
  const [modePaiement, setModePaiement]   = useState('');
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [platDetail, setPlatDetail]       = useState(null);
  const catRefs = useRef({});

  // ─── CHARGEMENT ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [slug, tableId]);

  async function loadData() {
    setLoading(true);

    const { data: resto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!resto) { setLoading(false); return; }
    setRestaurant(resto);

    const { data: tbl } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();
    setTable(tbl);

    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', resto.id)
      .order('ordre');
    setCategories(cats || []);
    if (cats?.length) setActiveCat(cats[0].id);

    const { data: pls } = await supabase
      .from('plats')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('disponible', true)
      .order('ordre');
    setPlats(pls || []);

    const { data: cmd } = await supabase
      .from('commandes')
      .select('*')
      .eq('table_id', tableId)
      .in('statut', ['en_attente', 'valide', 'en_preparation', 'presque_pret', 'servi'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    if (cmd) {
      setCommande(cmd);
      loadCommandeItems(cmd.id);
    }

    setLoading(false);
  }

  async function loadCommandeItems(cmdId) {
    const { data } = await supabase
      .from('commande_items')
      .select('*')
      .eq('commande_id', cmdId);
    setCommandeItems(data || []);
  }

  // ─── REALTIME ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!restaurant) return;
    const ch = supabase.channel(`menu-${tableId}`)
      .on('postgres_changes', {
        event: '*', schema: 'public', table: 'commandes',
        filter: `table_id=eq.${tableId}`
      }, (payload) => {
        const s = payload.new?.statut;
        if (['en_attente','valide','en_preparation','presque_pret','servi'].includes(s)) {
          setCommande(payload.new);
          loadCommandeItems(payload.new.id);
        } else if (['cloture','annule'].includes(s)) {
          setCommande(null);
          setCommandeItems([]);
        }
      })
      .subscribe();
    return () => supabase.removeChannel(ch);
  }, [restaurant, tableId]);

  // ─── PANIER ───────────────────────────────────────────────────────────────
  const totalPanier = panier.reduce((s, i) => s + i.prix * i.quantite, 0);
  const countPanier = panier.reduce((s, i) => s + i.quantite, 0);

  function ajouterAuPanier(plat) {
    setPanier(prev => {
      const ex = prev.find(i => i.plat_id === plat.id);
      if (ex) return prev.map(i => i.plat_id === plat.id ? { ...i, quantite: i.quantite + 1 } : i);
      return [...prev, { plat_id: plat.id, nom: plat.nom, prix: plat.prix, quantite: 1, note: '', image_url: plat.image_url }];
    });
  }

  function retirerDuPanier(platId) {
    setPanier(prev => {
      const ex = prev.find(i => i.plat_id === platId);
      if (!ex) return prev;
      if (ex.quantite === 1) return prev.filter(i => i.plat_id !== platId);
      return prev.map(i => i.plat_id === platId ? { ...i, quantite: i.quantite - 1 } : i);
    });
  }

  function quantiteDans(platId) {
    return panier.find(i => i.plat_id === platId)?.quantite || 0;
  }

  // ─── COMMANDER ────────────────────────────────────────────────────────────
  async function envoyerCommande() {
    if (!panier.length || !restaurant || !table) return;
    const { data: cmd, error } = await supabase
      .from('commandes')
      .insert({ restaurant_id: restaurant.id, table_id: table.id, statut: 'en_attente', total: totalPanier, paye: false })
      .select()
      .single();
    if (error || !cmd) return;
    await supabase.from('commande_items').insert(
      panier.map(i => ({ commande_id: cmd.id, plat_id: i.plat_id, nom_plat: i.nom, prix_unitaire: i.prix, quantite: i.quantite, note: i.note || '' }))
    );
    setCommande(cmd);
    loadCommandeItems(cmd.id);
    setPanier([]);
    setShowPanierModal(false);
    setView('commande');
  }

  // ─── APPEL SERVEUR ────────────────────────────────────────────────────────
  async function appelServeur() {
    if (!restaurant || !table || appelEnvoye) return;
    await supabase.from('appels_serveur').insert({ restaurant_id: restaurant.id, table_id: table.id, traite: false });
    setAppelEnvoye(true);
    setTimeout(() => setAppelEnvoye(false), 30000);
  }

  // ─── PAIEMENT ─────────────────────────────────────────────────────────────
  async function demanderPaiement() {
    if (!commande || !modePaiement) return;
    await supabase.from('commandes').update({ mode_paiement: modePaiement }).eq('id', commande.id);
    setShowPaiementModal(false);
  }

  // ─── FILTRE ───────────────────────────────────────────────────────────────
  const platsByCat = categories.map(cat => ({
    ...cat,
    plats: plats.filter(p => p.categorie_id === cat.id)
  }));

  const platsFiltres = plats.filter(p =>
    p.nom.toLowerCase().includes(searchQuery.toLowerCase())
  );

  function scrollToCategory(catId) {
    setActiveCat(catId);
    catRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <LoadingScreen />;
  if (!restaurant) return <ErrorScreen />;

  return (
    <div style={{ background: C.bg, minHeight: '100vh', maxWidth: 430, margin: '0 auto', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative' }}>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        body { background: #F5F5F5; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.08)} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        .plat-card:active { transform: scale(0.98); }
        .cat-chip:active { transform: scale(0.95); }
        .btn-cmd:active { transform: scale(0.97); opacity:.9; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: C.white, padding: '48px 16px 14px', position: 'sticky', top: 0, zIndex: 100, boxShadow: '0 2px 12px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt="" style={{ width: 38, height: 38, borderRadius: 10, objectFit: 'cover' }} />
              : <div style={{ width: 38, height: 38, borderRadius: 10, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
            }
            <div>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>{restaurant.nom}</div>
              <div style={{ fontSize: 11, color: C.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 5, height: 5, borderRadius: '50%', background: C.green, display: 'inline-block' }}></span>
                Table {table?.numero} • {table?.zone || 'Salle'}
              </div>
            </div>
          </div>
          <button onClick={appelServeur} style={{ background: appelEnvoye ? '#E8F5E9' : C.primaryLight, border: 'none', borderRadius: 12, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', transition: 'all .3s' }}>
            <span style={{ fontSize: 16 }}>{appelEnvoye ? '✅' : '🔔'}</span>
            <span style={{ fontSize: 11, fontWeight: 700, color: appelEnvoye ? C.green : C.primary }}>{appelEnvoye ? 'Appelé !' : 'Serveur'}</span>
          </button>
        </div>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 14 }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un plat..."
            style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: 12, border: `1.5px solid ${C.border}`, background: C.grayLight, fontSize: 13, outline: 'none', color: C.dark, fontFamily: 'inherit' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, color: C.gray }}>✕</button>
          )}
        </div>
      </div>

      {/* ── BODY ─────────────────────────────────────────────────────────── */}
      <div style={{ paddingBottom: 120 }}>

        {/* STATUT COMMANDE */}
        {commande && (
          <div style={{ margin: '14px 16px 0', animation: 'slideUp .4s ease' }}>
            <CommandeStatusBanner
              commande={commande}
              items={commandeItems}
              onVoirDetails={() => setView('commande')}
              onPayer={() => setShowPaiementModal(true)}
            />
          </div>
        )}

        {/* BANNIÈRE BIENVENUE */}
        {!commande && (
          <div style={{ margin: '14px 16px 0', borderRadius: 18, background: 'linear-gradient(135deg, #FF6B35 0%, #FF8C42 60%, #FFB347 100%)', padding: '18px', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 72, opacity: .13 }}>🍽️</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.85)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 1 }}>Bienvenue !</div>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#fff', marginTop: 4, lineHeight: 1.25 }}>Commandez<br/>directement ici 👇</div>
            <div style={{ marginTop: 8, fontSize: 11, color: 'rgba(255,255,255,.8)' }}>Scannez, choisissez, savourez</div>
          </div>
        )}

        {/* CATÉGORIES */}
        {!searchQuery && (
          <>
            <div style={{ padding: '18px 16px 8px', fontSize: 15, fontWeight: 700, color: C.dark }}>Catégories</div>
            <div style={{ display: 'flex', gap: 8, overflowX: 'auto', padding: '0 16px 4px' }}>
              {categories.map(cat => (
                <button key={cat.id} className="cat-chip" onClick={() => scrollToCategory(cat.id)}
                  style={{ flexShrink: 0, padding: '7px 16px', borderRadius: 50, border: activeCat === cat.id ? 'none' : `1.5px solid ${C.border}`, background: activeCat === cat.id ? C.primary : C.white, color: activeCat === cat.id ? '#fff' : C.dark, fontSize: 12, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {cat.nom}
                </button>
              ))}
            </div>
          </>
        )}

        {/* LISTE PLATS */}
        {!searchQuery ? (
          platsByCat.map(cat => cat.plats.length === 0 ? null : (
            <div key={cat.id} ref={el => catRefs.current[cat.id] = el} style={{ marginTop: 22 }}>
              <div style={{ padding: '0 16px 10px', fontSize: 15, fontWeight: 700, color: C.dark }}>{cat.nom}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, padding: '0 16px' }}>
                {cat.plats.map(plat => (
                  <PlatCard key={plat.id} plat={plat} quantite={quantiteDans(plat.id)}
                    onAdd={() => ajouterAuPanier(plat)}
                    onRemove={() => retirerDuPanier(plat.id)}
                    onClick={() => setPlatDetail(plat)}
                  />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '16px 16px 0' }}>
            <div style={{ fontSize: 13, color: C.gray, marginBottom: 12 }}>{platsFiltres.length} résultat{platsFiltres.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {platsFiltres.map(plat => (
                <PlatCard key={plat.id} plat={plat} quantite={quantiteDans(plat.id)}
                  onAdd={() => ajouterAuPanier(plat)}
                  onRemove={() => retirerDuPanier(plat.id)}
                  onClick={() => setPlatDetail(plat)}
                />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── PANIER FLOTTANT ───────────────────────────────────────────── */}
      {countPanier > 0 && (
        <div style={{ position: 'fixed', bottom: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 32px)', maxWidth: 398, animation: 'slideUp .3s ease' }}>
          <button className="btn-cmd" onClick={() => setShowPanierModal(true)}
            style={{ width: '100%', background: C.dark, border: 'none', borderRadius: 16, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: '0 8px 28px rgba(26,26,46,.32)', transition: 'all .2s', fontFamily: 'inherit' }}>
            <div style={{ background: C.primary, borderRadius: 8, width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 12, fontWeight: 800, color: '#fff' }}>{countPanier}</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, color: '#fff' }}>Voir mon panier</span>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.primary }}>{totalPanier.toLocaleString()} F</span>
          </button>
        </div>
      )}

      {/* ── MODALS ────────────────────────────────────────────────────── */}
      {showPanierModal && (
        <ModalPanier
          panier={panier} total={totalPanier} plats={plats}
          onClose={() => setShowPanierModal(false)}
          onAdd={ajouterAuPanier}
          onRemove={retirerDuPanier}
          onCommander={envoyerCommande}
        />
      )}

      {platDetail && (
        <ModalPlatDetail
          plat={platDetail}
          quantite={quantiteDans(platDetail.id)}
          onClose={() => setPlatDetail(null)}
          onAdd={() => ajouterAuPanier(platDetail)}
          onRemove={() => retirerDuPanier(platDetail.id)}
        />
      )}

      {showPaiementModal && (
        <ModalPaiement
          commande={commande}
          modePaiement={modePaiement}
          setModePaiement={setModePaiement}
          onClose={() => setShowPaiementModal(false)}
          onConfirm={demanderPaiement}
        />
      )}

      {/* ── VUE COMMANDE ─────────────────────────────────────────────── */}
      {view === 'commande' && commande && (
        <div style={{ position: 'fixed', inset: 0, background: C.bg, zIndex: 300, overflowY: 'auto', animation: 'slideUp .3s ease' }}>
          <VueCommande
            commande={commande} items={commandeItems}
            restaurant={restaurant} table={table}
            onBack={() => setView('menu')}
            onAppelServeur={appelServeur}
            appelEnvoye={appelEnvoye}
            onPayer={() => { setView('menu'); setShowPaiementModal(true); }}
          />
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANTS ──────────────────────────────────────────────────────────────

function PlatCard({ plat, quantite, onAdd, onRemove, onClick }) {
  return (
    <div className="plat-card"
      style={{ background: '#fff', borderRadius: 16, overflow: 'hidden', display: 'flex', boxShadow: '0 2px 10px rgba(0,0,0,0.07)', cursor: 'pointer', transition: 'transform .15s' }}
      onClick={onClick}>
      {plat.image_url
        ? <img src={plat.image_url} alt={plat.nom} style={{ width: 95, height: 95, objectFit: 'cover', flexShrink: 0 }} />
        : <div style={{ width: 95, height: 95, background: 'linear-gradient(135deg, #FFF0EB, #FFE0D5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, flexShrink: 0 }}>🍽️</div>
      }
      <div style={{ flex: 1, padding: '11px 13px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', lineHeight: 1.3 }}>{plat.nom}</div>
          {plat.description && (
            <div style={{ fontSize: 11, color: '#8A8A9A', marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plat.description}</div>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ fontSize: 14, fontWeight: 800, color: '#FF6B35' }}>{plat.prix.toLocaleString()} F</div>
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
            {quantite > 0 && (
              <>
                <button onClick={onRemove} style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #E8E8F0', background: '#fff', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#1A1A2E' }}>−</button>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E', minWidth: 14, textAlign: 'center' }}>{quantite}</span>
              </>
            )}
            <button onClick={onAdd} style={{ width: 30, height: 30, borderRadius: 9, border: 'none', background: '#FF6B35', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>+</button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CommandeStatusBanner({ commande, items, onVoirDetails, onPayer }) {
  const cfg = STATUT_CONFIG[commande.statut] || STATUT_CONFIG.en_attente;
  const isPretOuServi = ['presque_pret', 'servi'].includes(commande.statut);
  return (
    <div style={{ background: cfg.bg, borderRadius: 16, padding: '13px 14px', border: `1.5px solid ${cfg.color}33`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cfg.color, borderRadius: '16px 16px 0 0' }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 24, animation: isPretOuServi ? 'pulse 1.2s infinite' : 'none' }}>{cfg.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 11, color: '#8A8A9A', marginTop: 1 }}>{items.length} article{items.length !== 1 ? 's' : ''} • {commande.total?.toLocaleString()} F</div>
        </div>
        <div style={{ display: 'flex', gap: 7 }}>
          {commande.statut === 'servi' && (
            <button onClick={onPayer} style={{ background: '#00C851', border: 'none', borderRadius: 9, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Payer</button>
          )}
          <button onClick={onVoirDetails} style={{ background: cfg.color, border: 'none', borderRadius: 9, padding: '6px 12px', fontSize: 11, fontWeight: 700, color: '#fff', cursor: 'pointer' }}>Voir</button>
        </div>
      </div>
    </div>
  );
}

function ModalPanier({ panier, total, plats, onClose, onAdd, onRemove, onCommander }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', animation: 'fadeIn .2s' }}></div>
      <div style={{ position: 'relative', background: '#fff', borderRadius: '22px 22px 0 0', padding: '0 0 36px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
        <div style={{ display: 'flex', justifyContent: 'center', padding: '10px 0 0' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: '#E8E8F0' }}></div>
        </div>
        <div style={{ padding: '10px 18px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F0F0F5' }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A2E' }}>Mon panier 🛒</div>
          <button onClick={onClose} style={{ background: '#F5F5F5', border: 'none', borderRadius: 9, width: 30, height: 30, cursor: 'pointer', fontSize: 14 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '10px 18px' }}>
          {panier.map(item => {
            const plat = plats.find(p => p.id === item.plat_id);
            return (
              <div key={item.plat_id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 0', borderBottom: '1px solid #F0F0F5' }}>
                {plat?.image_url
                  ? <img src={plat.image_url} alt="" style={{ width: 48, height: 48, borderRadius: 10, objectFit: 'cover' }} />
                  : <div style={{ width: 48, height: 48, borderRadius: 10, background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>🍽️</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{item.nom}</div>
                  <div style={{ fontSize: 12, color: '#FF6B35', fontWeight: 700 }}>{(item.prix * item.quantite).toLocaleString()} F</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <button onClick={() => onRemove(item.plat_id)} style={{ width: 26, height: 26, borderRadius: 7, border: '1.5px solid #E8E8F0', background: '#fff', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 13, fontWeight: 700, minWidth: 14, textAlign: 'center' }}>{item.quantite}</span>
                  <button onClick={() => onAdd(plat)} style={{ width: 26, height: 26, borderRadius: 7, border: 'none', background: '#FF6B35', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '14px 18px 0', borderTop: '1px solid #F0F0F5' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
            <span style={{ fontSize: 13, color: '#8A8A9A' }}>Total</span>
            <span style={{ fontSize: 17, fontWeight: 800, color: '#1A1A2E' }}>{total.toLocaleString()} FCFA</span>
          </div>
          <button className="btn-cmd" onClick={onCommander}
            style={{ width: '100%', background: '#FF6B35', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
            ✅ Envoyer la commande
          </button>
        </div>
      </div>
    </div>
  );
}

function ModalPlatDetail({ plat, quantite, onClose, onAdd, onRemove }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.55)', animation: 'fadeIn .2s' }}></div>
      <div style={{ position: 'relative', background: '#fff', borderRadius: '22px 22px 0 0', overflow: 'hidden', animation: 'slideUp .3s ease' }}>
        {plat.image_url
          ? <img src={plat.image_url} alt={plat.nom} style={{ width: '100%', height: 210, objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: 170, background: 'linear-gradient(135deg, #FFF0EB, #FFE0D5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 56 }}>🍽️</div>
        }
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: '#fff', border: 'none', borderRadius: '50%', width: 34, height: 34, cursor: 'pointer', fontSize: 16, boxShadow: '0 2px 8px rgba(0,0,0,0.14)' }}>✕</button>
        <div style={{ padding: '18px 18px 36px' }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: '#1A1A2E' }}>{plat.nom}</div>
          {plat.description && <div style={{ fontSize: 13, color: '#8A8A9A', marginTop: 7, lineHeight: 1.6 }}>{plat.description}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 18 }}>
            <div style={{ fontSize: 20, fontWeight: 800, color: '#FF6B35' }}>{plat.prix.toLocaleString()} FCFA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {quantite > 0 && <button onClick={onRemove} style={{ width: 36, height: 36, borderRadius: 9, border: '1.5px solid #E8E8F0', background: '#fff', fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>}
              {quantite > 0 && <span style={{ fontSize: 15, fontWeight: 700 }}>{quantite}</span>}
              <button onClick={onAdd} style={{ background: '#FF6B35', border: 'none', borderRadius: 9, width: 36, height: 36, cursor: 'pointer', fontSize: 20, color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function ModalPaiement({ commande, modePaiement, setModePaiement, onClose, onConfirm }) {
  const modes = [
    { id: 'cash', label: 'Espèces', icon: '💵' },
    { id: 'mobile_money', label: 'Mobile Money', icon: '📱' },
    { id: 'carte', label: 'Carte bancaire', icon: '💳' },
  ];
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 500, display: 'flex', alignItems: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)' }}></div>
      <div style={{ position: 'relative', width: '100%', background: '#fff', borderRadius: '22px 22px 0 0', padding: '18px 18px 36px', animation: 'slideUp .3s ease' }}>
        <div style={{ fontSize: 17, fontWeight: 800, color: '#1A1A2E', marginBottom: 5 }}>Mode de paiement</div>
        <div style={{ fontSize: 12, color: '#8A8A9A', marginBottom: 18 }}>Total : {commande?.total?.toLocaleString()} FCFA</div>
        {modes.map(m => (
          <button key={m.id} onClick={() => setModePaiement(m.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 12, padding: '12px 14px', borderRadius: 12, border: `2px solid ${modePaiement === m.id ? '#FF6B35' : '#E8E8F0'}`, background: modePaiement === m.id ? '#FFF0EB' : '#fff', marginBottom: 9, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 22 }}>{m.icon}</span>
            <span style={{ fontSize: 14, fontWeight: 600, color: '#1A1A2E' }}>{m.label}</span>
            {modePaiement === m.id && <span style={{ marginLeft: 'auto', color: '#FF6B35', fontSize: 16 }}>✓</span>}
          </button>
        ))}
        <button onClick={onConfirm} disabled={!modePaiement}
          style={{ width: '100%', background: modePaiement ? '#FF6B35' : '#F0F0F5', border: 'none', borderRadius: 14, padding: '14px', fontSize: 14, fontWeight: 700, color: modePaiement ? '#fff' : '#8A8A9A', cursor: modePaiement ? 'pointer' : 'not-allowed', fontFamily: 'inherit' }}>
          Confirmer le paiement
        </button>
      </div>
    </div>
  );
}

function VueCommande({ commande, items, restaurant, table, onBack, onAppelServeur, appelEnvoye, onPayer }) {
  const cfg = STATUT_CONFIG[commande.statut] || STATUT_CONFIG.en_attente;
  const steps = ['en_attente', 'valide', 'en_preparation', 'presque_pret', 'servi'];
  const stepIdx = steps.indexOf(commande.statut);

  return (
    <div style={{ minHeight: '100vh', background: '#F5F5F5', fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <div style={{ background: '#fff', padding: '48px 16px 14px', boxShadow: '0 2px 8px rgba(0,0,0,0.07)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <button onClick={onBack} style={{ background: '#F0F0F5', border: 'none', borderRadius: 10, width: 36, height: 36, cursor: 'pointer', fontSize: 17, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: '#1A1A2E' }}>Ma commande</div>
            <div style={{ fontSize: 11, color: '#8A8A9A' }}>Table {table?.numero} • {restaurant.nom}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '16px', paddingBottom: 100 }}>
        <div style={{ background: '#fff', borderRadius: 18, padding: '18px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 44, animation: ['presque_pret','servi'].includes(commande.statut) ? 'pulse 1.2s infinite' : 'none' }}>{cfg.icon}</div>
            <div style={{ fontSize: 17, fontWeight: 800, color: cfg.color, marginTop: 7 }}>{cfg.label}</div>
          </div>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ width: 26, height: 26, borderRadius: '50%', background: i <= stepIdx ? '#FF6B35' : '#F0F0F5', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .4s' }}>
                  {i <= stepIdx
                    ? <span style={{ color: '#fff', fontSize: 13 }}>✓</span>
                    : <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#E8E8F0', display: 'block' }}></span>
                  }
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < stepIdx ? '#FF6B35' : '#F0F0F5', margin: '0 3px', transition: 'all .4s' }}></div>}
              </div>
            ))}
          </div>
        </div>

        <div style={{ background: '#fff', borderRadius: 18, padding: '14px 16px', marginBottom: 14, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1A2E', marginBottom: 10 }}>Articles commandés</div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #F0F0F5' }}>
              <div>
                <div style={{ fontSize: 13, fontWeight: 600, color: '#1A1A2E' }}>{item.nom_plat}</div>
                {item.note && <div style={{ fontSize: 11, color: '#8A8A9A' }}>Note : {item.note}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, color: '#8A8A9A' }}>×{item.quantite}</div>
                <div style={{ fontSize: 12, fontWeight: 700, color: '#FF6B35' }}>{(item.prix_unitaire * item.quantite).toLocaleString()} F</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 10 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: '#1A1A2E' }}>Total</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: '#FF6B35' }}>{commande.total?.toLocaleString()} FCFA</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onAppelServeur}
            style={{ flex: 1, background: appelEnvoye ? '#00C851' : '#1A1A2E', border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', transition: 'all .3s', fontFamily: 'inherit' }}>
            {appelEnvoye ? '✅ Appelé !' : '🔔 Appeler serveur'}
          </button>
          {commande.statut === 'servi' && (
            <button onClick={onPayer}
              style={{ flex: 1, background: '#FF6B35', border: 'none', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 700, color: '#fff', cursor: 'pointer', fontFamily: 'inherit' }}>
              💳 Payer
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

function LoadingScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 44, animation: 'pulse 1s infinite' }}>🍽️</div>
      <div style={{ marginTop: 14, fontSize: 15, fontWeight: 600, color: '#1A1A2E' }}>Chargement du menu...</div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#F5F5F5', fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ fontSize: 44 }}>😕</div>
      <div style={{ marginTop: 14, fontSize: 17, fontWeight: 700, color: '#1A1A2E' }}>Restaurant introuvable</div>
      <div style={{ marginTop: 7, fontSize: 13, color: '#8A8A9A', textAlign: 'center' }}>Vérifiez le QR code ou contactez le restaurant</div>
    </div>
  );
}