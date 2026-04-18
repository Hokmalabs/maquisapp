'use client'
import { useRouter } from 'next/navigation'

export default function ConfidentialitePage() {
  const router = useRouter()
  return (
    <div style={{ minHeight: '100vh', background: '#fff', fontFamily: "'DM Sans', system-ui, sans-serif", color: '#3D0C11' }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&display=swap'); * { box-sizing: border-box; margin: 0; padding: 0; }`}</style>

      {/* Header */}
      <div style={{ background: '#3D0C11', padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 14 }}>
        <button onClick={() => router.push('/')}
          style={{ background: 'rgba(255,255,255,.1)', border: 'none', borderRadius: 10, width: 34, height: 34, display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: 16, color: '#fff' }}>←</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 28, height: 28, borderRadius: 8, background: 'linear-gradient(135deg,#8B1A27,#FF4500)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍽️</div>
          <span style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>MaquisApp</span>
        </div>
      </div>

      <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px 80px' }}>
        <h1 style={{ fontSize: 28, fontWeight: 800, marginBottom: 8 }}>Politique de Confidentialité</h1>
        <p style={{ fontSize: 13, color: '#8A8A9A', marginBottom: 40 }}>Dernière mise à jour : avril 2026</p>

        {[
          {
            titre: '1. Données collectées',
            contenu: `Lors de votre inscription et utilisation de MaquisApp, nous collectons :\n• Nom, email, téléphone du gérant\n• Informations du restaurant (nom, ville, logo)\n• Données de commandes (anonymisées côté client)\n• Données de navigation à des fins d'amélioration du service`,
          },
          {
            titre: '2. Utilisation des données',
            contenu: `Vos données sont utilisées uniquement pour :\n• Faire fonctionner le service MaquisApp\n• Vous envoyer des communications liées à votre compte\n• Améliorer l'expérience utilisateur\n\nVos données ne sont jamais vendues ni partagées avec des tiers à des fins commerciales.`,
          },
          {
            titre: '3. Hébergement',
            contenu: `• Application web : Vercel Inc. (États-Unis)\n• Base de données : Supabase (États-Unis)\n• Stockage images : Supabase Storage\n\nCes fournisseurs sont soumis à leurs propres politiques de confidentialité et aux réglementations en vigueur.`,
          },
          {
            titre: '4. Vos droits',
            contenu: `Vous disposez des droits suivants sur vos données :\n• Accès : consulter les données que nous détenons\n• Modification : corriger des informations inexactes\n• Suppression : demander l'effacement de votre compte et données\n\nPour exercer ces droits : contact.hokmalabs@gmail.com ou WhatsApp 2250585379999`,
          },
          {
            titre: '5. Cookies',
            contenu: `MaquisApp utilise uniquement des cookies techniques nécessaires au bon fonctionnement de la session (authentification).\n\nAucun cookie publicitaire ou de tracking tiers n'est utilisé.`,
          },
          {
            titre: '6. Sécurité',
            contenu: `Nous mettons en œuvre des mesures de sécurité appropriées :\n• Connexions chiffrées HTTPS\n• Authentification sécurisée via Supabase Auth\n• Accès aux données contrôlé par des règles de sécurité (RLS)`,
          },
          {
            titre: '7. Contact',
            contenu: `Pour toute question relative à la confidentialité :\n📧 contact.hokmalabs@gmail.com\n📱 WhatsApp : 2250585379999`,
          },
        ].map(section => (
          <div key={section.titre} style={{ marginBottom: 32 }}>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#8B1A27', marginBottom: 10 }}>{section.titre}</h2>
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
