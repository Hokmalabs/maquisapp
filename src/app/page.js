'use client'
import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'

export default function LandingPage() {
  const router = useRouter()
  const [scrollY, setScrollY] = useState(0)
  const [menuOpen, setMenuOpen] = useState(false)

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div style={{ background: '#0D0D0D', minHeight: '100vh', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#fff', overflowX: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:ital,wght@0,400;0,500;0,600;0,700;0,800;0,900;1,700&family=Playfair+Display:wght@700;800;900&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: #0D0D0D; }
        ::-webkit-scrollbar-thumb { background: #FF6B35; border-radius: 2px; }

        @keyframes fadeUp { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
        @keyframes fadeIn { from{opacity:0} to{opacity:1} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes pulse { 0%,100%{opacity:1;transform:scale(1)} 50%{opacity:.7;transform:scale(1.05)} }
        @keyframes spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes gradientShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
        @keyframes slideRight { from{transform:translateX(-100%)} to{transform:translateX(0)} }
        @keyframes blob { 0%,100%{border-radius:60% 40% 30% 70%/60% 30% 70% 40%} 50%{border-radius:30% 60% 70% 40%/50% 60% 30% 60%} }

        .btn-primary { background: linear-gradient(135deg, #FF6B35, #FF4500); border: none; border-radius: 50px; padding: 16px 36px; font-size: 15px; font-weight: 700; color: #fff; cursor: pointer; font-family: inherit; transition: all .3s; box-shadow: 0 8px 32px rgba(255,107,53,.4); }
        .btn-primary:hover { transform: translateY(-2px); box-shadow: 0 12px 40px rgba(255,107,53,.5); }
        .btn-outline { background: transparent; border: 1.5px solid rgba(255,255,255,.25); border-radius: 50px; padding: 14px 28px; font-size: 14px; font-weight: 600; color: #fff; cursor: pointer; font-family: inherit; transition: all .3s; }
        .btn-outline:hover { border-color: #FF6B35; color: #FF6B35; }
        .feature-card { background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08); border-radius: 24px; padding: 28px; transition: all .3s; cursor: default; }
        .feature-card:hover { background: rgba(255,107,53,.07); border-color: rgba(255,107,53,.25); transform: translateY(-4px); }
        .step-card { background: rgba(255,255,255,.03); border: 1px solid rgba(255,255,255,.07); border-radius: 20px; padding: 24px; }
        .nav-link { color: rgba(255,255,255,.7); font-size: 14px; font-weight: 500; cursor: pointer; transition: color .2s; text-decoration: none; }
        .nav-link:hover { color: #FF6B35; }
        .tag { background: rgba(255,107,53,.15); color: #FF6B35; border: 1px solid rgba(255,107,53,.3); border-radius: 50px; padding: 6px 16px; font-size: 12px; font-weight: 700; display: inline-block; }
        .phone-mockup { background: #1A1A1A; border-radius: 36px; border: 6px solid #2A2A2A; overflow: hidden; box-shadow: 0 40px 80px rgba(0,0,0,.6), 0 0 0 1px rgba(255,255,255,.05); }
        .stat-num { font-family: 'Playfair Display', serif; font-size: 48px; font-weight: 900; background: linear-gradient(135deg,#FF6B35,#FFB347); -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text; }
        .glow { text-shadow: 0 0 80px rgba(255,107,53,.5); }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────────────── */}
      <nav style={{ position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100, padding: '0 24px', height: 64, display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: scrollY > 40 ? 'rgba(13,13,13,.92)' : 'transparent', backdropFilter: scrollY > 40 ? 'blur(20px)' : 'none', borderBottom: scrollY > 40 ? '1px solid rgba(255,255,255,.06)' : 'none', transition: 'all .4s', maxWidth: 1200, margin: '0 auto', left: '50%', transform: 'translateX(-50%)', width: '100%' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 10, background: 'linear-gradient(135deg,#FF6B35,#FF4500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>🍽️</div>
          <span style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>MaquisApp</span>
        </div>
        <div style={{ display: 'flex', gap: 32, alignItems: 'center' }}>
          <a className="nav-link" href="#fonctionnalites" style={{ display: window?.innerWidth < 640 ? 'none' : 'block' }}>Fonctionnalités</a>
          <a className="nav-link" href="#comment" style={{ display: window?.innerWidth < 640 ? 'none' : 'block' }}>Comment ça marche</a>
          <button className="btn-outline" onClick={() => router.push('/auth/login')} style={{ padding: '9px 20px', fontSize: 13 }}>Connexion</button>
          <button className="btn-primary" onClick={() => router.push('/auth/register')} style={{ padding: '10px 22px', fontSize: 13 }}>Démarrer →</button>
        </div>
      </nav>

      {/* ── HERO ──────────────────────────────────────────────────────── */}
      <section style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '100px 24px 60px', position: 'relative', overflow: 'hidden' }}>
        {/* Blobs décoratifs */}
        <div style={{ position: 'absolute', top: '10%', left: '-10%', width: 500, height: 500, background: 'radial-gradient(circle, rgba(255,107,53,.18) 0%, transparent 70%)', filter: 'blur(40px)', animation: 'float 8s ease-in-out infinite', pointerEvents: 'none' }}></div>
        <div style={{ position: 'absolute', bottom: '5%', right: '-10%', width: 600, height: 600, background: 'radial-gradient(circle, rgba(255,69,0,.12) 0%, transparent 70%)', filter: 'blur(60px)', animation: 'float 10s ease-in-out infinite 2s', pointerEvents: 'none' }}></div>
        {/* Grid lines déco */}
        <div style={{ position: 'absolute', inset: 0, backgroundImage: 'linear-gradient(rgba(255,255,255,.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.02) 1px, transparent 1px)', backgroundSize: '60px 60px', pointerEvents: 'none' }}></div>

        <div style={{ maxWidth: 800, textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <div className="tag" style={{ animation: 'fadeUp .6s ease both', marginBottom: 24 }}>
            🇨🇮 Fait pour la restauration ivoirienne
          </div>

          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(42px, 8vw, 80px)', fontWeight: 900, lineHeight: 1.1, marginBottom: 24, animation: 'fadeUp .6s ease .1s both' }}>
            Votre restaurant,{' '}
            <span style={{ fontStyle: 'italic', background: 'linear-gradient(135deg,#FF6B35,#FFB347)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              digitalisé
            </span>
            <br />en 5 minutes
          </h1>

          <p style={{ fontSize: 'clamp(15px, 2.5vw, 19px)', color: 'rgba(255,255,255,.6)', lineHeight: 1.7, maxWidth: 560, margin: '0 auto 40px', animation: 'fadeUp .6s ease .2s both' }}>
            QR codes sur les tables, commandes en temps réel, gestion du menu — tout depuis votre smartphone. Zéro formation requise.
          </p>

          <div style={{ display: 'flex', gap: 14, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp .6s ease .3s both' }}>
            <button className="btn-primary" onClick={() => router.push('/auth/register')} style={{ fontSize: 16, padding: '18px 40px' }}>
              Créer mon restaurant gratuit →
            </button>
            <button className="btn-outline" onClick={() => router.push('/auth/login')}>
              Se connecter
            </button>
          </div>

          <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,.35)', animation: 'fadeUp .6s ease .4s both' }}>
            Aucune carte de crédit requise • Gratuit pour commencer
          </div>
        </div>

        {/* PHONE MOCKUP HERO */}
        <div style={{ marginTop: 60, position: 'relative', animation: 'fadeUp .8s ease .4s both' }}>
          <div style={{ position: 'absolute', inset: -30, background: 'radial-gradient(ellipse, rgba(255,107,53,.2) 0%, transparent 70%)', filter: 'blur(20px)', borderRadius: '50%' }}></div>
          <div className="phone-mockup" style={{ width: 260, position: 'relative', animation: 'float 6s ease-in-out infinite' }}>
            <div style={{ width: 70, height: 16, background: '#111', borderRadius: '0 0 10px 10px', margin: '0 auto' }}></div>
            {/* Screen content */}
            <div style={{ background: '#F5F5F5', padding: '10px 10px 16px' }}>
              {/* Header */}
              <div style={{ background: '#1A1A2E', borderRadius: 12, padding: '10px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                  <div style={{ width: 26, height: 26, borderRadius: 7, background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🍽️</div>
                  <div><div style={{ color: '#fff', fontSize: 9, fontWeight: 700 }}>Le Maquis</div><div style={{ color: '#aaa', fontSize: 7 }}>Table 5 • Terrasse</div></div>
                </div>
                <div style={{ background: '#FFF0EB', borderRadius: 8, padding: '4px 8px', fontSize: 8, fontWeight: 700, color: '#FF6B35' }}>🔔 Serveur</div>
              </div>
              {/* Bannière */}
              <div style={{ background: 'linear-gradient(135deg,#FF6B35,#FF8C42)', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                <div style={{ fontSize: 8, color: 'rgba(255,255,255,.8)', fontWeight: 600 }}>BIENVENUE !</div>
                <div style={{ fontSize: 13, fontWeight: 800, color: '#fff', marginTop: 2 }}>Commandez<br/>directement 👇</div>
              </div>
              {/* Cat chips */}
              <div style={{ display: 'flex', gap: 5, marginBottom: 8 }}>
                {['Grillades', 'Poissons', 'Boissons'].map((c, i) => (
                  <div key={c} style={{ padding: '4px 9px', borderRadius: 50, background: i === 0 ? '#FF6B35' : '#fff', color: i === 0 ? '#fff' : '#888', fontSize: 8, fontWeight: 600 }}>{c}</div>
                ))}
              </div>
              {/* Plats */}
              {[
                { nom: 'Poulet braisé', prix: '3 500', emoji: '🍗' },
                { nom: 'Tilapia grillé', prix: '4 000', emoji: '🐟' },
              ].map(p => (
                <div key={p.nom} style={{ background: '#fff', borderRadius: 10, display: 'flex', alignItems: 'center', marginBottom: 6, overflow: 'hidden' }}>
                  <div style={{ width: 48, height: 48, background: '#FFF0EB', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, flexShrink: 0 }}>{p.emoji}</div>
                  <div style={{ flex: 1, padding: '7px 9px' }}>
                    <div style={{ fontSize: 9, fontWeight: 700, color: '#1A1A2E' }}>{p.nom}</div>
                    <div style={{ fontSize: 9, fontWeight: 800, color: '#FF6B35', marginTop: 2 }}>{p.prix} F</div>
                  </div>
                  <div style={{ width: 22, height: 22, background: '#FF6B35', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14, color: '#fff', margin: '0 8px', flexShrink: 0 }}>+</div>
                </div>
              ))}
              {/* Panier btn */}
              <div style={{ background: '#1A1A2E', borderRadius: 10, padding: '9px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 4 }}>
                <div style={{ background: '#FF6B35', borderRadius: 5, width: 18, height: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, fontWeight: 800, color: '#fff' }}>2</div>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#fff' }}>Voir mon panier</span>
                <span style={{ fontSize: 9, fontWeight: 700, color: '#FF6B35' }}>7 500 F</span>
              </div>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 40, marginTop: 56, justifyContent: 'center', flexWrap: 'wrap', animation: 'fadeUp .6s ease .5s both' }}>
          {[
            { num: '< 5min', label: 'pour configurer' },
            { num: '100%', label: 'mobile-first' },
            { num: '0 FCFA', label: 'pour démarrer' },
          ].map(s => (
            <div key={s.num} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 28, fontWeight: 800, color: '#FF6B35', fontFamily: "'Playfair Display', serif" }}>{s.num}</div>
              <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginTop: 3 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* ── FONCTIONNALITÉS ───────────────────────────────────────────── */}
      <section id="fonctionnalites" style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 60 }}>
          <div className="tag" style={{ marginBottom: 16 }}>Fonctionnalités</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.2, marginBottom: 16 }}>
            Tout ce dont votre<br />restaurant a besoin
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', maxWidth: 480, margin: '0 auto' }}>
            Une solution complète pensée pour les réalités de la restauration en Côte d'Ivoire.
          </p>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              icon: '📱', title: 'QR Code par table',
              desc: 'Chaque table a son QR code unique. Le client scanne et commande directement depuis son téléphone — sans application à télécharger.',
              color: '#FF6B35'
            },
            {
              icon: '⚡', title: 'Commandes en temps réel',
              desc: 'Le gérant voit chaque commande instantanément sur son smartphone. Validez, préparez, servez — en quelques clics.',
              color: '#FFB347'
            },
            {
              icon: '✍️', title: 'Commande manuelle',
              desc: 'Pour les clients sans smartphone, le gérant passe la commande manuellement depuis le dashboard en quelques secondes.',
              color: '#00C851'
            },
            {
              icon: '🍽️', title: 'Gestion du menu',
              desc: 'Ajoutez, modifiez, activez ou désactivez des plats en temps réel. Les changements sont visibles immédiatement par les clients.',
              color: '#5B8DEF'
            },
            {
              icon: '🔔', title: 'Appel serveur',
              desc: 'Le client appelle le serveur d\'un simple bouton. L\'alerte arrive instantanément sur le tableau de bord du gérant.',
              color: '#A855F7'
            },
            {
              icon: '📊', title: 'Rapports & CA',
              desc: 'Suivez votre chiffre d\'affaires jour par jour. Exportez vos données en CSV pour votre comptabilité.',
              color: '#EC4899'
            },
          ].map(f => (
            <div key={f.title} className="feature-card">
              <div style={{ width: 48, height: 48, borderRadius: 14, background: f.color + '18', border: `1px solid ${f.color}30`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, marginBottom: 16 }}>{f.icon}</div>
              <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 10 }}>{f.title}</h3>
              <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── COMMENT ÇA MARCHE ─────────────────────────────────────────── */}
      <section id="comment" style={{ padding: '100px 24px', background: 'rgba(255,255,255,.02)', borderTop: '1px solid rgba(255,255,255,.05)', borderBottom: '1px solid rgba(255,255,255,.05)' }}>
        <div style={{ maxWidth: 800, margin: '0 auto' }}>
          <div style={{ textAlign: 'center', marginBottom: 60 }}>
            <div className="tag" style={{ marginBottom: 16 }}>Comment ça marche</div>
            <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 52px)', fontWeight: 800, lineHeight: 1.2 }}>
              Opérationnel en<br />
              <span style={{ fontStyle: 'italic', color: '#FF6B35' }}>moins de 5 minutes</span>
            </h2>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {[
              { num: '01', title: 'Créez votre compte', desc: 'Inscrivez votre restaurant en 2 minutes. Ajoutez votre menu, vos catégories et vos plats avec photos.', icon: '📝' },
              { num: '02', title: 'Configurez vos tables', desc: 'Créez vos tables et téléchargez les QR codes. Imprimez-les et posez-les sur chaque table.', icon: '🪑' },
              { num: '03', title: 'Vos clients commandent', desc: 'Le client scanne le QR code, choisit ses plats et envoie sa commande — sans téléchargement d\'app.', icon: '📱' },
              { num: '04', title: 'Vous gérez tout', desc: 'Recevez les commandes en temps réel, suivez la préparation et gérez le service depuis votre smartphone.', icon: '⚡' },
            ].map((s, i) => (
              <div key={s.num} className="step-card" style={{ display: 'flex', alignItems: 'flex-start', gap: 20 }}>
                <div style={{ flexShrink: 0, width: 52, height: 52, borderRadius: 14, background: i === 0 ? 'linear-gradient(135deg,#FF6B35,#FF4500)' : 'rgba(255,107,53,.1)', border: i === 0 ? 'none' : '1px solid rgba(255,107,53,.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 10, fontWeight: 800, color: i === 0 ? '#fff' : '#FF6B35', fontFamily: "'Playfair Display', serif", fontSize: 18 }}>
                  {s.icon}
                </div>
                <div>
                  <div style={{ fontSize: 10, color: '#FF6B35', fontWeight: 700, marginBottom: 4, letterSpacing: 1 }}>{s.num}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 700, color: '#fff', marginBottom: 6 }}>{s.title}</h3>
                  <p style={{ fontSize: 13, color: 'rgba(255,255,255,.5)', lineHeight: 1.7 }}>{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── TÉMOIGNAGES ───────────────────────────────────────────────── */}
      <section style={{ padding: '100px 24px', maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 56 }}>
          <div className="tag" style={{ marginBottom: 16 }}>Témoignages</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(28px, 4vw, 44px)', fontWeight: 800 }}>
            Ce qu'en disent nos restaurateurs
          </h2>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { name: 'Kouassi Aya', role: 'Gérant, Maquis Chez Aya • Abidjan', text: 'Depuis MaquisApp, mes clients commandent eux-mêmes. Je passe moins de temps à courir entre les tables et plus de temps en cuisine.', stars: 5 },
            { name: 'Bamba Seydou', role: 'Propriétaire, Le Woro-Woro • Bouaké', text: 'Installation en 10 minutes, QR codes imprimés, et mes commandes arrivent directement sur mon téléphone. Vraiment bluffant.', stars: 5 },
            { name: 'Adjoua Marie', role: 'Gérante, Maquis La Détente • San-Pédro', text: 'Le suivi des commandes en temps réel a tout changé. On ne perd plus une seule commande et les clients sont contents.', stars: 5 },
          ].map(t => (
            <div key={t.name} className="feature-card">
              <div style={{ display: 'flex', gap: 2, marginBottom: 14 }}>
                {Array(t.stars).fill(0).map((_, i) => <span key={i} style={{ color: '#FFB347', fontSize: 14 }}>★</span>)}
              </div>
              <p style={{ fontSize: 14, color: 'rgba(255,255,255,.7)', lineHeight: 1.75, marginBottom: 20, fontStyle: 'italic' }}>"{t.text}"</p>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ width: 38, height: 38, borderRadius: '50%', background: 'linear-gradient(135deg,#FF6B35,#FF8C42)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0 }}>
                  {t.name[0]}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 700, color: '#fff' }}>{t.name}</div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)', marginTop: 1 }}>{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA FINAL ─────────────────────────────────────────────────── */}
      <section style={{ padding: '80px 24px 120px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(ellipse at center, rgba(255,107,53,.15) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
        <div style={{ position: 'relative', zIndex: 1, maxWidth: 640, margin: '0 auto' }}>
          <div style={{ fontSize: 56, marginBottom: 20, animation: 'float 4s ease-in-out infinite' }}>🍽️</div>
          <h2 style={{ fontFamily: "'Playfair Display', serif", fontSize: 'clamp(32px, 5vw, 56px)', fontWeight: 900, lineHeight: 1.2, marginBottom: 20 }}>
            Prêt à digitaliser<br />
            <span style={{ fontStyle: 'italic', color: '#FF6B35' }}>votre restaurant ?</span>
          </h2>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.5)', marginBottom: 40, lineHeight: 1.7 }}>
            Rejoignez les restaurateurs ivoiriens qui modernisent leur service avec MaquisApp. Gratuit pour commencer, sans engagement.
          </p>
          <button className="btn-primary" onClick={() => router.push('/auth/register')} style={{ fontSize: 17, padding: '20px 48px' }}>
            Créer mon restaurant →
          </button>
          <div style={{ marginTop: 16, fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
            Configuration en moins de 5 minutes
          </div>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────── */}
      <footer style={{ borderTop: '1px solid rgba(255,255,255,.06)', padding: '32px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16, maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#FF6B35,#FF4500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
          <span style={{ fontSize: 15, fontWeight: 700 }}>MaquisApp</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,.3)' }}>
          © 2026 Hokma Labs • Fait avec ❤️ en Côte d'Ivoire
        </div>
        <div style={{ display: 'flex', gap: 20 }}>
          <a href="#" className="nav-link" style={{ fontSize: 12 }}>Contact</a>
          <a href="#" className="nav-link" style={{ fontSize: 12 }}>Mentions légales</a>
        </div>
      </footer>
    </div>
  )
}