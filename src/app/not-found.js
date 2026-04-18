'use client'
import { useRouter } from 'next/navigation'

export default function NotFound() {
  const router = useRouter()
  return (
    <div style={{
      minHeight: '100vh',
      background: '#3D0C11',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'DM Sans', system-ui",
      padding: 24,
      textAlign: 'center'
    }}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;600;700;800&display=swap');`}</style>
      <div style={{ fontSize: 72, marginBottom: 16 }}>🍽️</div>
      <div style={{ fontSize: 28, fontWeight: 800, color: '#fff', marginBottom: 8 }}>
        Page introuvable
      </div>
      <div style={{ fontSize: 14, color: 'rgba(255,255,255,.5)', marginBottom: 32, maxWidth: 300 }}>
        Cette page n'existe pas ou a été déplacée.
      </div>
      <button onClick={() => router.push('/')}
        style={{
          background: '#8B1A27', border: 'none', borderRadius: 14,
          padding: '14px 28px', fontSize: 14, fontWeight: 700,
          color: '#fff', cursor: 'pointer', fontFamily: 'inherit'
        }}>
        Retour à l'accueil
      </button>
    </div>
  )
}
