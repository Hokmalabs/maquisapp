'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
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
  en_attente:    { label: 'En attente',     color: C.yellow,  icon: '⏳', bg: '#FFF8E1' },
  valide:        { label: 'Validée',        color: C.green,   icon: '✅', bg: '#E8F5E9' },
  en_preparation:{ label: 'En préparation', color: C.primary, icon: '👨‍🍳', bg: '#FFF0EB' },
  presque_pret:  { label: 'Presque prêt !', color: C.primaryDark, icon: '🔔', bg: '#FFE8E0' },
  servi:         { label: 'Servi',          color: C.green,   icon: '🍽️', bg: '#E8F5E9' },
  cloture:       { label: 'Clôturée',       color: C.gray,    icon: '✔️', bg: '#F5F5F5' },
  annule:        { label: 'Annulée',        color: C.red,     icon: '❌', bg: '#FFEBEE' },
};

export default function MenuPage({ params }) {
  const { slug, tableId } = params;

  // ─── STATE ────────────────────────────────────────────────────────────────
  const [restaurant, setRestaurant]   = useState(null);
  const [categories, setCategories]   = useState([]);
  const [plats, setPlats]             = useState([]);
  const [table, setTable]             = useState(null);
  const [panier, setPanier]           = useState([]);
  const [commande, setCommande]       = useState(null);
  const [commandeItems, setCommandeItems] = useState([]);
  const [loading, setLoading]         = useState(true);
  const [activeCat, setActiveCat]     = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [view, setView]               = useState('menu'); // menu | panier | commande
  const [showPanierModal, setShowPanierModal] = useState(false);
  const [note, setNote]               = useState('');
  const [showNoteFor, setShowNoteFor] = useState(null);
  const [commandeEnvoyee, setCommandeEnvoyee] = useState(false);
  const [appelEnvoye, setAppelEnvoye] = useState(false);
  const [modePaiement, setModePaiement] = useState('');
  const [showPaiementModal, setShowPaiementModal] = useState(false);
  const [platDetail, setPlatDetail]   = useState(null);
  const catRefs = useRef({});
  const scrollRef = useRef(null);

  // ─── CHARGEMENT ──────────────────────────────────────────────────────────
  useEffect(() => {
    loadData();
  }, [slug, tableId]);

  async function loadData() {
    setLoading(true);
    // Restaurant
    const { data: resto } = await supabase
      .from('restaurants')
      .select('*')
      .eq('slug', slug)
      .single();
    if (!resto) { setLoading(false); return; }
    setRestaurant(resto);

    // Table
    const { data: tbl } = await supabase
      .from('tables')
      .select('*')
      .eq('id', tableId)
      .single();
    setTable(tbl);

    // Catégories
    const { data: cats } = await supabase
      .from('categories')
      .select('*')
      .eq('restaurant_id', resto.id)
      .order('ordre');
    setCategories(cats || []);
    if (cats?.length) setActiveCat(cats[0].id);

    // Plats
    const { data: pls } = await supabase
      .from('plats')
      .select('*')
      .eq('restaurant_id', resto.id)
      .eq('disponible', true)
      .order('ordre');
    setPlats(pls || []);

    // Commande active sur cette table
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'commandes', filter: `table_id=eq.${tableId}` }, (payload) => {
        const s = payload.new?.statut;
        if (['en_attente','valide','en_preparation','presque_pret','servi'].includes(s)) {
          setCommande(payload.new);
          loadCommandeItems(payload.new.id);
        } else if (['cloture','annule'].includes(s)) {
          setCommande(null);
          setCommandeItems([]);
          setCommandeEnvoyee(false);
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
    const total = totalPanier;
    const { data: cmd, error } = await supabase
      .from('commandes')
      .insert({ restaurant_id: restaurant.id, table_id: table.id, statut: 'en_attente', total, paye: false })
      .select()
      .single();
    if (error || !cmd) return;
    await supabase.from('commande_items').insert(
      panier.map(i => ({ commande_id: cmd.id, plat_id: i.plat_id, nom_plat: i.nom, prix_unitaire: i.prix, quantite: i.quantite, note: i.note || '' }))
    );
    setCommande(cmd);
    loadCommandeItems(cmd.id);
    setPanier([]);
    setCommandeEnvoyee(true);
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

  // ─── FILTRE PLATS ─────────────────────────────────────────────────────────
  const platsFiltres = searchQuery
    ? plats.filter(p => p.nom.toLowerCase().includes(searchQuery.toLowerCase()))
    : activeCat ? plats.filter(p => p.categorie_id === activeCat) : plats;

  const platsByCat = categories.map(cat => ({
    ...cat,
    plats: plats.filter(p => p.categorie_id === cat.id)
  }));

  // ─── SCROLL CAT ──────────────────────────────────────────────────────────
  function scrollToCategory(catId) {
    setActiveCat(catId);
    catRefs.current[catId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  if (loading) return <LoadingScreen />;
  if (!restaurant) return <ErrorScreen />;

  // ─── RENDER ───────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: '100vh', maxWidth: 430, margin: '0 auto', fontFamily: "'DM Sans', system-ui, sans-serif", position: 'relative', overflow: 'hidden' }}>

      {/* FONT */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { display: none; }
        body { background: ${C.bg}; }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.05)} }
        @keyframes slideUp { from{transform:translateY(100%);opacity:0} to{transform:translateY(0);opacity:1} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes bounce { 0%,100%{transform:scale(1)} 40%{transform:scale(1.25)} 70%{transform:scale(0.9)} }
        @keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
        .plat-card:active { transform: scale(0.98); }
        .cat-chip:active { transform: scale(0.95); }
        .btn-primary:active { transform: scale(0.97); opacity:.9; }
      `}</style>

      {/* ── HEADER ─────────────────────────────────────────────────────── */}
      <div style={{ background: C.white, padding: '52px 20px 16px', position: 'sticky', top: 0, zIndex: 100, boxShadow: `0 2px 12px ${C.shadow}` }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {restaurant.logo_url
              ? <img src={restaurant.logo_url} alt="" style={{ width: 40, height: 40, borderRadius: 12, objectFit: 'cover' }} />
              : <div style={{ width: 40, height: 40, borderRadius: 12, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>🍽️</div>
            }
            <div>
              <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, lineHeight: 1.2 }}>{restaurant.nom}</div>
              <div style={{ fontSize: 12, color: C.gray, display: 'flex', alignItems: 'center', gap: 4 }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: C.green, display: 'inline-block' }}></span>
                Table {table?.numero} • {table?.zone || 'Salle'}
              </div>
            </div>
          </div>
          {/* Bouton appel serveur */}
          <button onClick={appelServeur} style={{ background: appelEnvoye ? C.green : C.primaryLight, border: 'none', borderRadius: 14, padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 6, cursor: 'pointer', transition: 'all .3s' }}>
            <span style={{ fontSize: 18 }}>{appelEnvoye ? '✅' : '🔔'}</span>
            <span style={{ fontSize: 12, fontWeight: 600, color: appelEnvoye ? C.white : C.primary }}>{appelEnvoye ? 'Appelé' : 'Serveur'}</span>
          </button>
        </div>

        {/* SEARCH */}
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 16 }}>🔍</span>
          <input
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Rechercher un plat..."
            style={{ width: '100%', padding: '11px 14px 11px 40px', borderRadius: 14, border: `1.5px solid ${C.border}`, background: C.grayLight, fontSize: 14, outline: 'none', color: C.dark, fontFamily: 'inherit' }}
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: 16 }}>✕</button>
          )}
        </div>
      </div>

      {/* ── CONTENU PRINCIPAL ──────────────────────────────────────────── */}
      <div style={{ paddingBottom: 120 }} ref={scrollRef}>

        {/* STATUT COMMANDE (si commande active) */}
        {commande && (
          <div style={{ margin: '16px 16px 0', animation: 'slideUp .4s ease' }}>
            <CommandeStatusBanner commande={commande} items={commandeItems} onVoirDetails={() => setView('commande')} onPayer={() => setShowPaiementModal(true)} />
          </div>
        )}

        {/* BANNIÈRE PROMO (si pas de commande) */}
        {!commande && (
          <div style={{ margin: '16px 16px 0' }}>
            <div style={{ borderRadius: 20, overflow: 'hidden', background: `linear-gradient(135deg, ${C.primary} 0%, #FF8C42 50%, #FFB347 100%)`, padding: '20px', position: 'relative', minHeight: 120 }}>
              <div style={{ position: 'absolute', right: -10, top: -10, fontSize: 80, opacity: .15 }}>🍽️</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.8)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: 1 }}>Bienvenue !</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: C.white, marginTop: 4, lineHeight: 1.2 }}>Commandez<br/>directement ici 👇</div>
              <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,.85)' }}>Scannez, choisissez, savourez</div>
            </div>
          </div>
        )}

        {/* CATÉGORIES */}
        {!searchQuery && (
          <div style={{ padding: '20px 0 0' }}>
            <div style={{ padding: '0 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: C.dark }}>Catégories</div>
            </div>
            <div style={{ display: 'flex', gap: 10, overflowX: 'auto', padding: '0 16px 4px' }}>
              {categories.map((cat, i) => (
                <button key={cat.id} className="cat-chip" onClick={() => scrollToCategory(cat.id)}
                  style={{ flexShrink: 0, padding: '8px 18px', borderRadius: 50, border: activeCat === cat.id ? 'none' : `1.5px solid ${C.border}`, background: activeCat === cat.id ? C.primary : C.white, color: activeCat === cat.id ? C.white : C.dark, fontSize: 13, fontWeight: 600, cursor: 'pointer', transition: 'all .2s', whiteSpace: 'nowrap', fontFamily: 'inherit' }}>
                  {cat.nom}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* LISTE PLATS par catégorie */}
        {!searchQuery ? (
          platsByCat.map(cat => cat.plats.length === 0 ? null : (
            <div key={cat.id} ref={el => catRefs.current[cat.id] = el} style={{ marginTop: 24 }}>
              <div style={{ padding: '0 16px 12px', fontSize: 16, fontWeight: 700, color: C.dark }}>{cat.nom}</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '0 16px' }}>
                {cat.plats.map(plat => (
                  <PlatCard key={plat.id} plat={plat} quantite={quantiteDans(plat.id)} onAdd={() => ajouterAuPanier(plat)} onRemove={() => retirerDuPanier(plat.id)} onClick={() => setPlatDetail(plat)} />
                ))}
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px 16px 0' }}>
            <div style={{ fontSize: 14, color: C.gray, marginBottom: 14 }}>{platsFiltres.length} résultat{platsFiltres.length !== 1 ? 's' : ''}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {platsFiltres.map(plat => (
                <PlatCard key={plat.id} plat={plat} quantite={quantiteDans(plat.id)} onAdd={() => ajouterAuPanier(plat)} onRemove={() => retirerDuPanier(plat.id)} onClick={() => setPlatDetail(plat)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── BOUTON PANIER FLOTTANT ────────────────────────────────────── */}
      {countPanier > 0 && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', zIndex: 200, width: 'calc(100% - 32px)', maxWidth: 398, animation: 'slideUp .35s ease' }}>
          <button className="btn-primary" onClick={() => setShowPanierModal(true)}
            style={{ width: '100%', background: C.dark, border: 'none', borderRadius: 18, padding: '16px 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer', boxShadow: `0 8px 30px rgba(26,26,46,.35)`, transition: 'all .2s' }}>
            <div style={{ background: C.primary, borderRadius: 10, width: 28, height: 28, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: 13, fontWeight: 800, color: C.white }}>{countPanier}</span>
            </div>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.white }}>Voir mon panier</span>
            <span style={{ fontSize: 15, fontWeight: 700, color: C.primary }}>{totalPanier.toLocaleString()} F</span>
          </button>
        </div>
      )}

      {/* ── MODAL PANIER ─────────────────────────────────────────────── */}
      {showPanierModal && (
        <ModalPanier
          panier={panier}
          total={totalPanier}
          onClose={() => setShowPanierModal(false)}
          onAdd={ajouterAuPanier}
          onRemove={retirerDuPanier}
          onCommander={async () => { await envoyerCommande(); setShowPanierModal(false); }}
          plats={plats}
        />
      )}

      {/* ── MODAL DÉTAIL PLAT ─────────────────────────────────────────── */}
      {platDetail && (
        <ModalPlatDetail
          plat={platDetail}
          quantite={quantiteDans(platDetail.id)}
          onClose={() => setPlatDetail(null)}
          onAdd={() => { ajouterAuPanier(platDetail); }}
          onRemove={() => { retirerDuPanier(platDetail.id); }}
        />
      )}

      {/* ── MODAL PAIEMENT ────────────────────────────────────────────── */}
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
          <VueCommande commande={commande} items={commandeItems} restaurant={restaurant} table={table}
            onBack={() => setView('menu')} onAppelServeur={appelServeur} appelEnvoye={appelEnvoye}
            onPayer={() => { setView('menu'); setShowPaiementModal(true); }} />
        </div>
      )}
    </div>
  );
}

// ─── COMPOSANTS ──────────────────────────────────────────────────────────────

function PlatCard({ plat, quantite, onAdd, onRemove, onClick }) {
  return (
    <div className="plat-card" style={{ background: C.white, borderRadius: 18, overflow: 'hidden', display: 'flex', boxShadow: `0 2px 12px ${C.shadow}`, cursor: 'pointer', transition: 'transform .15s' }} onClick={onClick}>
      {/* Image */}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        {plat.image_url
          ? <img src={plat.image_url} alt={plat.nom} style={{ width: 100, height: 100, objectFit: 'cover' }} />
          : <div style={{ width: 100, height: 100, background: `linear-gradient(135deg, ${C.primaryLight}, #FFE0D5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36 }}>🍽️</div>
        }
      </div>
      {/* Infos */}
      <div style={{ flex: 1, padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontSize: 14, fontWeight: 700, color: C.dark, lineHeight: 1.3 }}>{plat.nom}</div>
          {plat.description && <div style={{ fontSize: 12, color: C.gray, marginTop: 3, lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{plat.description}</div>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 8 }}>
          <div style={{ fontSize: 15, fontWeight: 800, color: C.primary }}>{plat.prix.toLocaleString()} F</div>
          {/* Stepper */}
          <div onClick={e => e.stopPropagation()} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {quantite > 0 ? (
              <>
                <button onClick={onRemove} style={{ width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 16, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.dark }}>−</button>
                <span style={{ fontSize: 14, fontWeight: 700, color: C.dark, minWidth: 16, textAlign: 'center' }}>{quantite}</span>
              </>
            ) : null}
            <button onClick={onAdd} style={{ width: 32, height: 32, borderRadius: 10, border: 'none', background: C.primary, fontSize: 18, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, animation: quantite === 0 ? 'none' : 'bounce .3s ease' }}>+</button>
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
    <div style={{ background: cfg.bg, borderRadius: 18, padding: '14px 16px', border: `1.5px solid ${cfg.color}22`, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: cfg.color, borderRadius: '18px 18px 0 0' }}></div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ fontSize: 26, animation: isPretOuServi ? 'pulse 1.2s infinite' : 'none' }}>{cfg.icon}</div>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: cfg.color }}>{cfg.label}</div>
          <div style={{ fontSize: 12, color: C.gray, marginTop: 1 }}>{items.length} article{items.length !== 1 ? 's' : ''} • {commande.total?.toLocaleString()} F</div>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {commande.statut === 'servi' && (
            <button onClick={onPayer} style={{ background: C.green, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: C.white, cursor: 'pointer' }}>Payer</button>
          )}
          <button onClick={onVoirDetails} style={{ background: cfg.color, border: 'none', borderRadius: 10, padding: '7px 14px', fontSize: 12, fontWeight: 700, color: C.white, cursor: 'pointer' }}>Voir</button>
        </div>
      </div>
    </div>
  );
}

function ModalPanier({ panier, total, onClose, onAdd, onRemove, onCommander, plats }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 400, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end' }}>
      <div onClick={onClose} style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,.5)', animation: 'fadeIn .2s' }}></div>
      <div style={{ position: 'relative', background: C.white, borderRadius: '24px 24px 0 0', padding: '0 0 40px', maxHeight: '85vh', display: 'flex', flexDirection: 'column', animation: 'slideUp .3s ease' }}>
        {/* Drag handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 0' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, background: C.border }}></div>
        </div>
        <div style={{ padding: '12px 20px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>Mon panier 🛒</div>
          <button onClick={onClose} style={{ background: C.grayLight, border: 'none', borderRadius: 10, width: 32, height: 32, cursor: 'pointer', fontSize: 16 }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: '12px 20px' }}>
          {panier.map(item => {
            const plat = plats.find(p => p.id === item.plat_id);
            return (
              <div key={item.plat_id} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 0', borderBottom: `1px solid ${C.border}` }}>
                {plat?.image_url
                  ? <img src={plat.image_url} alt="" style={{ width: 52, height: 52, borderRadius: 12, objectFit: 'cover' }} />
                  : <div style={{ width: 52, height: 52, borderRadius: 12, background: C.primaryLight, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>🍽️</div>
                }
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.nom}</div>
                  <div style={{ fontSize: 13, color: C.primary, fontWeight: 700 }}>{(item.prix * item.quantite).toLocaleString()} F</div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button onClick={() => onRemove(item.plat_id)} style={{ width: 28, height: 28, borderRadius: 8, border: `1.5px solid ${C.border}`, background: C.white, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>
                  <span style={{ fontSize: 14, fontWeight: 700, minWidth: 16, textAlign: 'center' }}>{item.quantite}</span>
                  <button onClick={() => onAdd(plat)} style={{ width: 28, height: 28, borderRadius: 8, border: 'none', background: C.primary, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white }}>+</button>
                </div>
              </div>
            );
          })}
        </div>
        <div style={{ padding: '16px 20px 0', borderTop: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 14 }}>
            <span style={{ fontSize: 14, color: C.gray }}>Total</span>
            <span style={{ fontSize: 18, fontWeight: 800, color: C.dark }}>{total.toLocaleString()} FCFA</span>
          </div>
          <button className="btn-primary" onClick={onCommander}
            style={{ width: '100%', background: C.primary, border: 'none', borderRadius: 16, padding: '16px', fontSize: 15, fontWeight: 700, color: C.white, cursor: 'pointer', transition: 'all .2s' }}>
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
      <div style={{ position: 'relative', background: C.white, borderRadius: '24px 24px 0 0', overflow: 'hidden', animation: 'slideUp .3s ease' }}>
        {plat.image_url
          ? <img src={plat.image_url} alt={plat.nom} style={{ width: '100%', height: 220, objectFit: 'cover' }} />
          : <div style={{ width: '100%', height: 180, background: `linear-gradient(135deg, ${C.primaryLight}, #FFE0D5)`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>🍽️</div>
        }
        <button onClick={onClose} style={{ position: 'absolute', top: 16, right: 16, background: C.white, border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 18, boxShadow: `0 2px 8px ${C.shadowMd}` }}>✕</button>
        <div style={{ padding: '20px 20px 40px' }}>
          <div style={{ fontSize: 20, fontWeight: 800, color: C.dark }}>{plat.nom}</div>
          {plat.description && <div style={{ fontSize: 14, color: C.gray, marginTop: 8, lineHeight: 1.6 }}>{plat.description}</div>}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 20 }}>
            <div style={{ fontSize: 22, fontWeight: 800, color: C.primary }}>{plat.prix.toLocaleString()} FCFA</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              {quantite > 0 && <button onClick={onRemove} style={{ width: 38, height: 38, borderRadius: 10, border: `1.5px solid ${C.border}`, background: C.white, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>−</button>}
              {quantite > 0 && <span style={{ fontSize: 16, fontWeight: 700 }}>{quantite}</span>}
              <button onClick={onAdd} style={{ background: C.primary, border: 'none', borderRadius: 10, width: 38, height: 38, cursor: 'pointer', fontSize: 22, color: C.white, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>+</button>
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
      <div style={{ position: 'relative', width: '100%', background: C.white, borderRadius: '24px 24px 0 0', padding: '20px 20px 40px', animation: 'slideUp .3s ease' }}>
        <div style={{ fontSize: 18, fontWeight: 800, color: C.dark, marginBottom: 6 }}>Mode de paiement</div>
        <div style={{ fontSize: 13, color: C.gray, marginBottom: 20 }}>Total : {commande?.total?.toLocaleString()} FCFA</div>
        {modes.map(m => (
          <button key={m.id} onClick={() => setModePaiement(m.id)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', borderRadius: 14, border: `2px solid ${modePaiement === m.id ? C.primary : C.border}`, background: modePaiement === m.id ? C.primaryLight : C.white, marginBottom: 10, cursor: 'pointer', fontFamily: 'inherit' }}>
            <span style={{ fontSize: 24 }}>{m.icon}</span>
            <span style={{ fontSize: 15, fontWeight: 600, color: C.dark }}>{m.label}</span>
            {modePaiement === m.id && <span style={{ marginLeft: 'auto', color: C.primary, fontSize: 18 }}>✓</span>}
          </button>
        ))}
        <button onClick={onConfirm} disabled={!modePaiement}
          style={{ width: '100%', background: modePaiement ? C.primary : C.grayLight, border: 'none', borderRadius: 16, padding: '15px', fontSize: 15, fontWeight: 700, color: modePaiement ? C.white : C.gray, cursor: modePaiement ? 'pointer' : 'not-allowed', marginTop: 4 }}>
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
    <div style={{ minHeight: '100vh', background: C.bg, fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* Header */}
      <div style={{ background: C.white, padding: '52px 20px 16px', boxShadow: `0 2px 8px ${C.shadow}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <button onClick={onBack} style={{ background: C.grayLight, border: 'none', borderRadius: 12, width: 38, height: 38, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>←</button>
          <div>
            <div style={{ fontSize: 17, fontWeight: 800, color: C.dark }}>Ma commande</div>
            <div style={{ fontSize: 12, color: C.gray }}>Table {table?.numero} • {restaurant.nom}</div>
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px', paddingBottom: 120 }}>
        {/* Statut visuel */}
        <div style={{ background: C.white, borderRadius: 20, padding: '20px', marginBottom: 16, boxShadow: `0 2px 12px ${C.shadow}` }}>
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 48, animation: ['presque_pret','servi'].includes(commande.statut) ? 'pulse 1.2s infinite' : 'none' }}>{cfg.icon}</div>
            <div style={{ fontSize: 18, fontWeight: 800, color: cfg.color, marginTop: 8 }}>{cfg.label}</div>
          </div>
          {/* Stepper */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {steps.map((s, i) => (
              <div key={s} style={{ display: 'flex', alignItems: 'center', flex: i < steps.length - 1 ? 1 : 'none' }}>
                <div style={{ width: 28, height: 28, borderRadius: '50%', background: i <= stepIdx ? C.primary : C.grayLight, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'all .4s' }}>
                  {i <= stepIdx ? <span style={{ color: C.white, fontSize: 14 }}>✓</span> : <span style={{ width: 8, height: 8, borderRadius: '50%', background: C.border, display: 'block' }}></span>}
                </div>
                {i < steps.length - 1 && <div style={{ flex: 1, height: 2, background: i < stepIdx ? C.primary : C.grayLight, margin: '0 4px', transition: 'all .4s' }}></div>}
              </div>
            ))}
          </div>
        </div>

        {/* Articles commandés */}
        <div style={{ background: C.white, borderRadius: 20, padding: '16px 20px', marginBottom: 16, boxShadow: `0 2px 12px ${C.shadow}` }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: C.dark, marginBottom: 12 }}>Articles commandés</div>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: `1px solid ${C.border}` }}>
              <div>
                <div style={{ fontSize: 14, fontWeight: 600, color: C.dark }}>{item.nom_plat}</div>
                {item.note && <div style={{ fontSize: 12, color: C.gray }}>Note : {item.note}</div>}
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 13, color: C.gray }}>×{item.quantite}</div>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.primary }}>{(item.prix_unitaire * item.quantite).toLocaleString()} F</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 12 }}>
            <span style={{ fontSize: 14, fontWeight: 700, color: C.dark }}>Total</span>
            <span style={{ fontSize: 16, fontWeight: 800, color: C.primary }}>{commande.total?.toLocaleString()} FCFA</span>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12 }}>
          <button onClick={onAppelServeur}
            style={{ flex: 1, background: appelEnvoye ? C.green : C.dark, border: 'none', borderRadius: 16, padding: '14px', fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer', transition: 'all .3s' }}>
            {appelEnvoye ? '✅ Appelé !' : '🔔 Appeler serveur'}
          </button>
          {commande.statut === 'servi' && (
            <button onClick={onPayer}
              style={{ flex: 1, background: C.primary, border: 'none', borderRadius: 16, padding: '14px', fontSize: 14, fontWeight: 700, color: C.white, cursor: 'pointer' }}>
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
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: 'system-ui' }}>
      <div style={{ fontSize: 48, animation: 'pulse 1s infinite' }}>🍽️</div>
      <div style={{ marginTop: 16, fontSize: 16, fontWeight: 600, color: C.dark }}>Chargement du menu...</div>
    </div>
  );
}

function ErrorScreen() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: C.bg, fontFamily: 'system-ui', padding: 24 }}>
      <div style={{ fontSize: 48 }}>😕</div>
      <div style={{ marginTop: 16, fontSize: 18, fontWeight: 700, color: C.dark }}>Restaurant introuvable</div>
      <div style={{ marginTop: 8, fontSize: 14, color: C.gray, textAlign: 'center' }}>Vérifiez le QR code ou contactez le restaurant</div>
    </div>
  );
}