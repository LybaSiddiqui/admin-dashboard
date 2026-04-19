import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

const css = `
  *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }

  /* ── dark theme (default) ─────────────────── */
  :root {
    --bg:        #0a0d14;
    --surface:   #10141f;
    --surface2:  #161b2a;
    --surface3:  #1c2236;
    --border:    rgba(255,255,255,0.07);
    --border-md: rgba(255,255,255,0.12);
    --text:      #e8edf5;
    --text-sub:  #6b7a99;
    --text-muted:#2d3a52;
    --accent:    #4f7fff;
    --accent-lt: #7da0ff;
    --green:     #22c55e;
    --green-lt:  #4ade80;
    --amber:     #f59e0b;
    --red:       #ef4444;
    --purple:    #a78bfa;
    --cyan:      #22d3ee;
    --pink:      #f472b6;
  }

  /* ── light theme ──────────────────────────── */
  :root.light {
    --bg:        #f0f2f7;
    --surface:   #ffffff;
    --surface2:  #f5f7fc;
    --surface3:  #eaecf4;
    --border:    rgba(0,0,0,0.08);
    --border-md: rgba(0,0,0,0.14);
    --text:      #0f1729;
    --text-sub:  #5a6a85;
    --text-muted:#b0bcd4;
    --accent:    #2563eb;
    --accent-lt: #3b82f6;
    --green:     #16a34a;
    --green-lt:  #22c55e;
    --amber:     #d97706;
    --red:       #dc2626;
    --purple:    #7c3aed;
    --cyan:      #0891b2;
    --pink:      #db2777;
  }

  /* ── shared ───────────────────────────────── */
  :root, :root.light {
    --sidebar-w: 240px;
    --topbar-h:  56px;
    --radius-sm: 6px;
    --radius:    10px;
    --radius-lg: 14px;
    --font:      'DM Sans', system-ui, sans-serif;
    --font-mono: 'DM Mono', 'Fira Code', monospace;
    --font-head: 'Syne', sans-serif;
    --shadow:    0 1px 3px rgba(0,0,0,0.08), 0 4px 16px rgba(0,0,0,0.06);
    --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
    --transition: 0.15s ease;
  }

  html { height: 100%; }
  body {
    height: 100%;
    background: var(--bg);
    color: var(--text);
    font-family: var(--font);
    font-size: 13px;
    line-height: 1.6;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
    transition: background 0.2s ease, color 0.2s ease;
  }
  #root { height: 100%; display: flex; }

  button  { cursor: pointer; font-family: var(--font); border: none; background: none; color: inherit; }
  input, select, textarea { font-family: var(--font); color: var(--text); outline: none; }
  a { color: var(--accent); text-decoration: none; }

  ::-webkit-scrollbar { width: 4px; height: 4px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: var(--surface3); border-radius: 99px; }
  ::-webkit-scrollbar-thumb:hover { background: var(--border-md); }

  @keyframes spin    { to { transform: rotate(360deg); } }
  @keyframes fade-in { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
  @keyframes pulse   { 0%,100% { opacity: 1; } 50% { opacity: .5; } }

  .fade-in { animation: fade-in 0.2s ease both; }
  .pulse   { animation: pulse 1.8s ease infinite; }
`

const el = document.createElement('style')
el.textContent = css
document.head.appendChild(el)

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode><App /></React.StrictMode>
)