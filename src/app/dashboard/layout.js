'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { supabase } from '../lib/supabase'
import { C } from '../theme'

// ── Contexte restaurant partagé ────────────────────────────────────────
// Charge le resto UNE fois ici (layout), l'expose aux pages enfants via
// useRestaurant(). Évite que chaque page dashboard refasse getUser + select
// profiles. L'accueil (page.js) garde temporairement son propre chargement
// (il charge bien plus que le resto) : le contexte est additif, non-cassant.
const RestaurantContext = createContext({
  restaurant: null,
  restaurantId: null,
  loading: true,
  refresh: async () => {},
})

export function useRestaurant() {
  return useContext(RestaurantContext)
}

const NAV_ITEMS = [
  { icon: '🏠', label: 'Accueil', path: '/dashboard' },
  { icon: '📋', label: 'Commandes', path: '/dashboard/commandes' },
  { icon: '🍛', label: 'Menu', path: '/dashboard/menu' },
  { icon: '🪑', label: 'Tables & QR', path: '/dashboard/tables' },
  { icon: '🥤', label: 'Stock boissons', path: '/dashboard/stock' },
  { icon: '📊', label: 'Historique', path: '/dashboard/historique' },
  { icon: '⚙️', label: 'Réglages', path: '/dashboard/parametres' },
]

export default function DashboardLayout({ children }) {
  const router = useRouter()
  const pathname = usePathname()
  const [restaurant, setRestaurant] = useState(null)
  const [restaurantId, setRestaurantId] = useState(null)
  const [restoLoading, setRestoLoading] = useState(true)
  const [dateStr, setDateStr] = useState('')
  const [mounted, setMounted] = useState(false)

  useEffect(() => { setMounted(true) }, [])

  const loadRestaurant = async () => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { router.push('/auth/login'); return }
    const { data: profile } = await supabase
      .from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
    if (profile?.restaurants) {
      setRestaurant(profile.restaurants)
      setRestaurantId(profile.restaurant_id)
    }
    setRestoLoading(false)
  }

  useEffect(() => {
    let active = true
    ;(async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!active) return
      if (!user) { router.push('/auth/login'); return }
      const { data: profile } = await supabase
        .from('profiles').select('*, restaurants(*)').eq('id', user.id).single()
      if (!active) return
      if (profile?.restaurants) {
        setRestaurant(profile.restaurants)
        setRestaurantId(profile.restaurant_id)
      }
      setRestoLoading(false)
    })()
    return () => { active = false }
  }, [])

  useEffect(() => {
    const d = new Date().toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' })
    setDateStr(d.charAt(0).toUpperCase() + d.slice(1))
  }, [])

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/auth/login')
  }

  const isActive = (path) => {
    if (path === '/dashboard') return pathname === '/dashboard'
    return pathname === path || pathname?.startsWith(path + '/')
  }

  return (
    <RestaurantContext.Provider value={{ restaurant, restaurantId, loading: restoLoading, refresh: loadRestaurant }}>
      <div style={{ display: 'flex', minHeight: '100vh' }}>
        <aside className="dsk-sidebar">
          <div className="dsk-sidebar-brand">
            <div className="dsk-sidebar-logo">🍽️</div>
            <span className="dsk-sidebar-brandname">MaquisApp</span>
          </div>

          <div className="dsk-sidebar-resto">
            {mounted && restaurant?.logo_url
              ? <img src={restaurant.logo_url} alt="" className="dsk-sidebar-resto-logo" />
              : <div className="dsk-sidebar-resto-logo dsk-sidebar-resto-logo--placeholder">🍽️</div>
            }
            <div>
              <div className="dsk-sidebar-resto-nom">{mounted ? (restaurant?.nom || 'Chargement...') : ''}</div>
              <div className="dsk-sidebar-resto-ville">{mounted ? (restaurant?.ville || '—') : ''}</div>
            </div>
          </div>

          <nav className="dsk-sidebar-nav">
            {NAV_ITEMS.map(item => (
              <button
                key={item.path}
                className={`dsk-sidebar-navitem${isActive(item.path) ? ' dsk-sidebar-navitem--active' : ''}`}
                onClick={() => router.push(item.path)}
              >
                <span className="dsk-sidebar-navicon">{item.icon}</span>
                {item.label}
              </button>
            ))}
          </nav>

          <button className="dsk-sidebar-logout" onClick={handleLogout}>
            <span className="dsk-sidebar-navicon">🚪</span>
            Déconnexion
          </button>
        </aside>

        <div className="dsk-main">
          <div className="dsk-topbar">
            <div style={{ fontWeight: 800, fontSize: 22, color: C.dark }}>
              {mounted ? `Bonjour, ${restaurant?.nom || '...'}` : ''}
            </div>
            <div style={{ fontSize: 13, color: C.gray, marginTop: 2 }}>{mounted ? dateStr : ''}</div>
          </div>
          {children}
        </div>

        <style>{`
          .dsk-sidebar { display: none; }
          .dsk-main { flex: 1; min-width: 0; }
          .dsk-topbar { display: none; }

          @media (min-width: 900px) {
            .dsk-topbar {
              display: block;
              padding: 22px 28px 16px;
              background: ${C.bg};
              border-bottom: 1px solid ${C.border};
              position: sticky;
              top: 0;
              z-index: 40;
            }
            .dsk-sidebar {
              display: flex;
              flex-direction: column;
              width: 230px;
              flex-shrink: 0;
              min-height: 100vh;
              background: linear-gradient(180deg, ${C.dark} 0%, #2A080C 100%);
              padding: 20px 14px;
              box-sizing: border-box;
            }
            .dsk-sidebar-brand {
              display: flex;
              align-items: center;
              gap: 10px;
              padding: 0 8px 20px;
              border-bottom: 1px solid rgba(255,255,255,.1);
              margin-bottom: 18px;
            }
            .dsk-sidebar-logo {
              width: 34px; height: 34px; border-radius: 9px;
              background: ${C.primary};
              display: flex; align-items: center; justify-content: center;
              font-size: 17px; flex-shrink: 0;
            }
            .dsk-sidebar-brandname {
              color: #fff; font-weight: 800; font-size: 15px; letter-spacing: -.2px;
            }
            .dsk-sidebar-resto {
              display: flex; align-items: center; gap: 10px;
              padding: 10px 8px; margin-bottom: 16px;
              background: rgba(255,255,255,.06);
              border-radius: 12px;
            }
            .dsk-sidebar-resto-logo {
              width: 36px; height: 36px; border-radius: 9px;
              object-fit: cover; flex-shrink: 0;
            }
            .dsk-sidebar-resto-logo--placeholder {
              background: rgba(255,255,255,.1);
              display: flex; align-items: center; justify-content: center;
              font-size: 16px;
            }
            .dsk-sidebar-resto-nom {
              color: #fff; font-weight: 700; font-size: 12.5px;
              overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 140px;
            }
            .dsk-sidebar-resto-ville {
              color: rgba(255,255,255,.55); font-size: 10.5px; margin-top: 2px;
            }
            .dsk-sidebar-nav {
              display: flex; flex-direction: column; gap: 3px; flex: 1;
            }
            .dsk-sidebar-navitem {
              display: flex; align-items: center; gap: 11px;
              padding: 10px 12px; border-radius: 10px;
              background: none; border: none; cursor: pointer;
              color: rgba(255,255,255,.75); font-size: 13px; font-weight: 600;
              font-family: inherit; text-align: left; width: 100%;
              transition: background .15s, color .15s;
            }
            .dsk-sidebar-navitem:hover {
              background: rgba(255,255,255,.08);
              color: #fff;
            }
            .dsk-sidebar-navitem--active {
              background: ${C.primary};
              color: #fff;
            }
            .dsk-sidebar-navicon {
              font-size: 15px; width: 18px; text-align: center; flex-shrink: 0;
            }
            .dsk-sidebar-logout {
              display: flex; align-items: center; gap: 11px;
              padding: 10px 12px; border-radius: 10px;
              background: rgba(255,59,48,.12); border: none; cursor: pointer;
              color: #FF8A80; font-size: 13px; font-weight: 700;
              font-family: inherit; text-align: left; width: 100%;
              margin-top: 12px;
            }
            .dsk-sidebar-logout:hover {
              background: rgba(255,59,48,.2);
            }
          }
        `}</style>
      </div>
    </RestaurantContext.Provider>
  )
}