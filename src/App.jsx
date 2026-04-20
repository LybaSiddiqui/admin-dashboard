import { useState, useEffect, lazy, Suspense } from 'react'
import { C } from './theme.js'
import { supabase } from './supabaseClient.js'
import { Loader } from './components/UI.jsx'

const Overview = lazy(() => import('./tabs/Overview.jsx'))
const ProductExplorer = lazy(() => import('./tabs/ProductExplorer.jsx'))
const CustomerExplorer = lazy(() => import('./tabs/CustomerExplorer.jsx'))
const ChurnRisk = lazy(() => import('./tabs/ChurnRisk.jsx'))
const MLInsights = lazy(() => import('./tabs/MLInsights.jsx'))
const DataManagement = lazy(() => import('./tabs/DataManagement.jsx'))

const NAV = [
  {
    id: 'overview', label: 'Overview',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></svg>
  },
  {
    id: 'product', label: 'Product Explorer',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" /></svg>
  },
  {
    id: 'customer', label: 'Customer Explorer',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M23 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>
  },
  {
    id: 'churn', label: 'Churn Risk',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>,
    badge: true,
  },
  {
    id: 'ml', label: 'ML Insights',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><polygon points="12,2 22,8.5 22,15.5 12,22 2,15.5 2,8.5" /><circle cx="12" cy="12" r="3" /></svg>
  },
  {
    id: 'data', label: 'Data Management',
    icon: <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><ellipse cx="12" cy="5" rx="9" ry="3" /><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" /><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" /></svg>
  },
]

const PAGE_META = {
  overview: { title: 'Overview', sub: 'Platform-wide metrics and trends' },
  product: { title: 'Product Explorer', sub: 'Search and drill into any product' },
  customer: { title: 'Customer Explorer', sub: 'Look up individual customer profiles' },
  churn: { title: 'Churn Risk', sub: 'At-risk customers scored by ML model' },
  ml: { title: 'ML Insights', sub: 'Machine learning analytics across all data' },
  data: { title: 'Data Management', sub: 'Add and manage database records' },
}

const COMPONENTS = {
  overview: Overview, product: ProductExplorer, customer: CustomerExplorer,
  churn: ChurnRisk, ml: MLInsights, data: DataManagement,
}

// ── theme toggle button ────────────────────────────────────────
function ThemeToggle({ dark, onToggle }) {
  return (
    <button onClick={onToggle}
      title={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      style={{ display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '9px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', color: C.textSub, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
      onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = C.text }}
      onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = C.textSub }}>
      {dark ? (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="12" cy="12" r="5" />
            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
          </svg>
          Light mode
        </>
      ) : (
        <>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
          </svg>
          Dark mode
        </>
      )}
      {/* toggle pill */}
      <div style={{ marginLeft: 'auto', width: 32, height: 18, borderRadius: 99, background: dark ? 'var(--accent)' : 'var(--surface3)', border: '1px solid var(--border)', position: 'relative', transition: 'background 0.2s', flexShrink: 0 }}>
        <div style={{ position: 'absolute', top: 2, left: dark ? 'calc(100% - 16px)' : 2, width: 12, height: 12, borderRadius: '50%', background: dark ? '#fff' : 'var(--text-sub)', transition: 'left 0.2s ease, background 0.2s' }} />
      </div>
    </button>
  )
}

// ── nav item ──────────────────────────────────────────────────
function NavItem({ item, active, onClick }) {
  const isActive = active === item.id
  return (
    <button onClick={() => onClick(item.id)}
      style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 12px', borderRadius: 'var(--radius-sm)', background: isActive ? 'rgba(79,127,255,0.12)' : 'transparent', color: isActive ? 'var(--accent-lt)' : C.textSub, fontSize: 13, fontWeight: isActive ? 500 : 400, cursor: 'pointer', border: `1px solid ${isActive ? 'rgba(79,127,255,0.2)' : 'transparent'}`, transition: 'all 0.12s', textAlign: 'left' }}
      onMouseEnter={e => { if (!isActive) { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = 'var(--text)' } }}
      onMouseLeave={e => { if (!isActive) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = C.textSub } }}>
      <span style={{ display: 'flex', alignItems: 'center', opacity: isActive ? 1 : 0.6, flexShrink: 0 }}>{item.icon}</span>
      <span style={{ flex: 1 }}>{item.label}</span>
      {item.badge && <span style={{ width: 6, height: 6, borderRadius: '50%', background: 'var(--amber)', flexShrink: 0 }} />}
    </button>
  )
}

// ── app ───────────────────────────────────────────────────────
export default function App() {
  const [tab, setTab] = useState('overview')
  const [connected, setConnected] = useState(null)
  const [dark, setDark] = useState(() => {
    // read preference from localStorage, default to dark
    try { return localStorage.getItem('dbmt-theme') !== 'light' }
    catch { return true }
  })

  // apply theme class to <html> element
  useEffect(() => {
    document.documentElement.classList.toggle('light', !dark)
    try { localStorage.setItem('dbmt-theme', dark ? 'dark' : 'light') }
    catch { }
  }, [dark])

  useEffect(() => {
    supabase.from('customers').select('customerid', { count: 'exact', head: true }).limit(1)
      .then(({ error }) => setConnected(!error))
      .catch(() => setConnected(false))
  }, [])

  const ActiveTab = COMPONENTS[tab]
  const meta = PAGE_META[tab]

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100%', overflow: 'hidden' }}>

      {/* ── sidebar ──────────────────────────────────── */}
      <aside style={{ width: 'var(--sidebar-w)', flexShrink: 0, background: 'var(--surface)', borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', height: '100vh', overflow: 'hidden' }}>

        {/* logo */}
        <div style={{ padding: '16px 16px 14px', borderBottom: '1px solid var(--border)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: 'linear-gradient(135deg, #4f7fff, #7da0ff)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                <ellipse cx="12" cy="5" rx="9" ry="3" stroke="white" strokeWidth="1.5" />
                <path d="M3 5v6c0 1.657 4.03 3 9 3s9-1.343 9-3V5" stroke="white" strokeWidth="1.5" />
                <path d="M3 11v6c0 1.657 4.03 3 9 3s9-1.343 9-3v-6" stroke="white" strokeWidth="1.5" />
              </svg>
            </div>
            <div>
              <p style={{ fontSize: 13, fontWeight: 700, color: C.text, lineHeight: 1, fontFamily: 'var(--font-head)' }}>DBMT Admin</p>
              <p style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>Customer Intelligence</p>
            </div>
          </div>
        </div>

        {/* nav */}
        <nav style={{ flex: 1, padding: '10px 8px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
          <p style={{ fontSize: 10, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, padding: '6px 12px 4px' }}>Platform</p>
          {NAV.slice(0, 3).map(item => <NavItem key={item.id} item={item} active={tab} onClick={setTab} />)}
          <p style={{ fontSize: 10, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 600, padding: '14px 12px 4px' }}>Analytics</p>
          {NAV.slice(3).map(item => <NavItem key={item.id} item={item} active={tab} onClick={setTab} />)}
        </nav>

        {/* bottom: theme toggle + status */}
        <div style={{ padding: '12px 8px', borderTop: '1px solid var(--border)', flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
          <ThemeToggle dark={dark} onToggle={() => setDark(d => !d)} />

          <div style={{ padding: '0 4px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)' }}>
              <div style={{ width: 7, height: 7, borderRadius: '50%', flexShrink: 0, background: connected === true ? C.green : connected === false ? C.red : C.textMut, boxShadow: connected === true ? `0 0 6px ${C.green}80` : 'none' }} />
              <span style={{ fontSize: 11, color: connected === true ? C.green : connected === false ? C.red : C.textSub, fontWeight: 500 }}>
                {connected === null ? 'Connecting…' : connected ? 'Supabase connected' : 'Connection failed'}
              </span>
            </div>
            <p style={{ fontSize: 10, color: C.textMut, marginTop: 8, textAlign: 'center', lineHeight: 1.5 }}>Lyba Siddiqui/p>
          </div>
        </div>
      </aside>

      {/* ── main ─────────────────────────────────────── */}
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

        {/* topbar */}
        <header style={{ height: 'var(--topbar-h)', flexShrink: 0, background: 'var(--surface)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', padding: '0 28px', gap: 16 }}>
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 14, fontWeight: 600, color: C.text, lineHeight: 1 }}>{meta.title}</p>
            <p style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{meta.sub}</p>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 11, color: C.textMut, fontFamily: 'var(--font-mono)' }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}
            </span>
            <div style={{ width: 28, height: 28, borderRadius: '50%', background: 'linear-gradient(135deg,#4f7fff,#a78bfa)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600 }}>A</div>
          </div>
        </header>

        {/* content */}
        <main style={{ flex: 1, overflowY: 'auto', padding: '28px', background: 'var(--bg)' }}>
          <Suspense fallback={<Loader h={300} />}>
            {ActiveTab && <div className="fade-in"><ActiveTab /></div>}
          </Suspense>
        </main>
      </div>
    </div>
  )
}
