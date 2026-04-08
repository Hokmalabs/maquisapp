'use client'
import { useRouter } from 'next/navigation'

export default function ConditionsPage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#1A1A2E' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <div style={{ background: '#1A1A2E', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#fff' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#FF6B35,#FF4500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>MaquisApp</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Conditions Générales d'Utilisation</h1>
        <p style={{ fontSize: 13, color: '#8A8A9A', marginBottom: 40 }}>Dernière mise à jour : avril 2026</p>

        {[
          {
            titre: '1. Présentation',
            contenu: `MaquisApp est un service SaaS de gestion de restaurant édité par Hokma Labs, Abidjan, Côte d'Ivoire.\n\nContact : 2250585379999 | contact.hokmalabs@gmail.com`,
          },
          {
            titre: '2. Accès au service',
            contenu: `• Essai gratuit 14 jours sans engagement\n• Abonnement mensuel : 15 000 FCFA/mois\n• Abonnement annuel : 10 000 FCFA/mois\n• Résiliation possible à tout moment sans frais`,
          },
          {
            titre: '3. Responsabilités',
            contenu: `MaquisApp fournit l'outil logiciel. Le restaurant est seul responsable de ses données, de son activité et du respect de la réglementation applicable.\n\nHokma Labs ne peut être tenu responsable des pertes de données en cas de force majeure, d'incident technique imprévisible ou d'interruption de service des fournisseurs tiers.`,
          },
          {
            titre: '4. Données personnelles',
            contenu: `• Les données sont hébergées sur des serveurs sécurisés (Vercel, Supabase)\n• Elles ne sont jamais vendues ni partagées avec des tiers à des fins commerciales\n• Chaque restaurant peut demander la suppression complète de ses données en contactant le support`,
          },
          {
            titre: '5. Propriété intellectuelle',
            contenu: `Le code, le design et les marques associées à MaquisApp sont la propriété exclusive de Hokma Labs. Toute reproduction non autorisée est interdite.`,
          },
          {
            titre: '6. Modification des CGU',
            contenu: `Hokma Labs se réserve le droit de modifier les présentes CGU à tout moment. Les utilisateurs seront informés par email en cas de modification substantielle.`,
          },
          {
            titre: '7. Contact',
            contenu: `Pour toute question juridique ou relative aux CGU :\n📧 contact.hokmalabs@gmail.com\n📱 WhatsApp : 2250585379999`,
          },
        ].map(section => (
          <div key={section.titre} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#FF6B35', marginBottom: 10 }}>{section.titre}</h2>
            <p style={{ fontSize: 14, color: '#444', lineHeight: 1.8, whiteSpace: 'pre-line' }}>{section.contenu}</p>
          </div>
        ))}

        <div style={{ marginTop: 40, padding: '16px', background: '#F5F5F5', borderRadius: 12, fontSize: 13, color: '#8A8A9A', textAlign: 'center' }}>
          © 2026 Hokma Labs • Fait avec ❤️ en Côte d'Ivoire
        </div>
      </div>
    </div>
  )
}
