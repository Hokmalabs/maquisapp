'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

export default function AbonnementPage() {
  const router = useRouter()
  const [planChoisi, setPlanChoisi] = useState(null)
  const [paiementEnvoye, setPaiementEnvoye] = useState(false)

  return (
    <div style={{ minHeight: '100vh', background: '#0D0D0D', fontFamily: "'DM Sans', system-ui, sans-serif", padding: '32px 20px', display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes fadeUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
        .plan-card:hover { transform: translateY(-3px); transition: transform .2s; }
      `}</style>

      {/* Blobs */}
      <div style={{ position: 'absolute', top: '-10%', right: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,107,53,.12) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>
      <div style={{ position: 'absolute', bottom: '-10%', left: '-15%', width: 400, height: 400, background: 'radial-gradient(circle, rgba(255,69,0,.08) 0%, transparent 70%)', filter: 'blur(60px)', pointerEvents: 'none' }}></div>

      <div style={{ width: '100%', maxWidth: 460, position: 'relative', zIndex: 1, animation: 'fadeUp .5s ease' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontSize: 48, animation: 'float 4s ease-in-out infinite', display: 'inline-block' }}>🍽️</div>
          <h1 style={{ fontFamily: "'Playfair Display', serif", fontSize: 24, fontWeight: 800, color: '#fff', marginTop: 10 }}>MaquisApp</h1>
        </div>

        {/* Titre */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>Votre essai gratuit est terminé</div>
          <div style={{ fontSize: 15, color: 'rgba(255,255,255,.55)', lineHeight: 1.6 }}>Choisissez votre plan pour continuer à utiliser MaquisApp</div>
        </div>

        {/* Plans */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 28 }}>
          {/* Plan Mensuel */}
          <div className="plan-card" onClick={() => setPlanChoisi('mensuel')}
            style={{ background: planChoisi === 'mensuel' ? 'rgba(255,107,53,.15)' : 'rgba(255,255,255,.06)', border: `2px solid ${planChoisi === 'mensuel' ? '#FF6B35' : 'rgba(255,255,255,.12)'}`, borderRadius: 16, padding: '20px 22px', cursor: 'pointer', transition: 'all .2s' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Plan Mensuel</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Résiliable à tout moment</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B35' }}>15 000 F</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>/ mois</div>
              </div>
            </div>
            {planChoisi === 'mensuel' && <div style={{ marginTop: 10, color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>✓ Sélectionné</div>}
          </div>

          {/* Plan Annuel */}
          <div className="plan-card" onClick={() => setPlanChoisi('annuel')}
            style={{ background: planChoisi === 'annuel' ? 'rgba(255,107,53,.15)' : 'rgba(255,255,255,.06)', border: `2px solid ${planChoisi === 'annuel' ? '#FF6B35' : 'rgba(255,255,255,.12)'}`, borderRadius: 16, padding: '20px 22px', cursor: 'pointer', transition: 'all .2s', position: 'relative', overflow: 'hidden' }}>
            <div style={{ position: 'absolute', top: 12, right: 12, background: '#FF6B35', color: '#fff', fontSize: 10, fontWeight: 800, borderRadius: 6, padding: '2px 8px' }}>ÉCONOMISEZ 40 000 F</div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, color: '#fff', marginBottom: 4 }}>Plan Annuel</div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Facturé 120 000 F/an</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 22, fontWeight: 800, color: '#FF6B35' }}>10 000 F</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>/ mois</div>
              </div>
            </div>
            {planChoisi === 'annuel' && <div style={{ marginTop: 10, color: '#FF6B35', fontSize: 12, fontWeight: 700 }}>✓ Sélectionné</div>}
          </div>
        </div>

        {/* Numéros de paiement */}
        {planChoisi && (
          <div style={{ background: 'rgba(255,255,255,.06)', borderRadius: 14, padding: '18px 20px', marginBottom: 20, border: '1px solid rgba(255,255,255,.1)' }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.8)', marginBottom: 12 }}>Effectuez votre paiement :</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
              <span style={{ fontSize: 18 }}>🌊</span>
              <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Wave : <span style={{ color: '#FF6B35' }}>[NUMERO_WAVE]</span></span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 18 }}>🟠</span>
              <span style={{ fontSize: 14, color: '#fff', fontWeight: 600 }}>Orange Money : <span style={{ color: '#FF6B35' }}>[NUMERO_ORANGE]</span></span>
            </div>
            <div style={{ marginTop: 10, fontSize: 12, color: 'rgba(255,255,255,.4)', fontStyle: 'italic' }}>
              Montant : {planChoisi === 'mensuel' ? '15 000 FCFA' : '120 000 FCFA'}
            </div>
          </div>
        )}

        {/* Bouton */}
        {!paiementEnvoye ? (
          <button
            onClick={() => { if (planChoisi) setPaiementEnvoye(true) }}
            disabled={!planChoisi}
            style={{ width: '100%', background: planChoisi ? '#FF6B35' : 'rgba(255,255,255,.1)', border: 'none', borderRadius: 14, padding: '15px', fontSize: 15, fontWeight: 700, color: planChoisi ? '#fff' : 'rgba(255,255,255,.3)', cursor: planChoisi ? 'pointer' : 'not-allowed', fontFamily: 'inherit', marginBottom: 14 }}>
            J'ai effectué mon paiement ✓
          </button>
        ) : (
          <div style={{ background: 'rgba(0,200,81,.12)', border: '1.5px solid #00C851', borderRadius: 14, padding: '16px 18px', marginBottom: 14 }}>
            <div style={{ fontSize: 14, fontWeight: 700, color: '#00C851', marginBottom: 6 }}>✅ Merci pour votre paiement !</div>
            <div style={{ fontSize: 13, color: 'rgba(255,255,255,.6)', lineHeight: 1.6 }}>
              Votre activation sera confirmée sous 24h.<br />
              Contactez-nous sur WhatsApp : <span style={{ color: '#FF6B35', fontWeight: 700 }}>[NUMERO]</span>
            </div>
          </div>
        )}

        <button onClick={() => router.push('/dashboard')}
          style={{ width: '100%', background: 'transparent', border: '1.5px solid rgba(255,255,255,.15)', borderRadius: 14, padding: '13px', fontSize: 13, fontWeight: 600, color: 'rgba(255,255,255,.4)', cursor: 'pointer', fontFamily: 'inherit' }}>
          Retour au tableau de bord
        </button>
      </div>
    </div>
  )
}
