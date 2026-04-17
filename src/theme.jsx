import { createContext, useContext, useState, useEffect } from 'react'

const ThemeCtx = createContext()

export function ThemeProvider({ children }) {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('theme')
    return saved ? saved === 'dark' : window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    localStorage.setItem('theme', dark ? 'dark' : 'light')
    document.body.style.background = dark ? '#0d1117' : '#f0f2f7'
    document.body.style.color = dark ? '#e2e8f0' : '#1a202c'
  }, [dark])

  return (
    <ThemeCtx.Provider value={{ dark, toggle: () => setDark(d => !d) }}>
      {children}
    </ThemeCtx.Provider>
  )
}

export const useTheme = () => useContext(ThemeCtx)

export function useColors() {
  const { dark } = useTheme()
  return dark ? {
    bg: '#0d1117',
    surface: '#161b27',
    surface2: '#1e2638',
    surface3: '#252d42',
    border: '#2a3347',
    borderMd: '#334160',
    text: '#e2e8f0',
    textSub: '#8892a4',
    textMut: '#4a5568',
    blue: '#3b82f6',
    blueLight: '#60a5fa',
    green: '#10b981',
    greenLt: '#34d399',
    amber: '#f59e0b',
    amberLt: '#fbbf24',
    red: '#ef4444',
    redLt: '#f87171',
    purple: '#8b5cf6',
    cyan: '#06b6d4',
  } : {
    bg: '#f0f2f7',
    surface: '#ffffff',
    surface2: '#f8fafc',
    surface3: '#edf2f7',
    border: '#e2e8f0',
    borderMd: '#cbd5e0',
    text: '#1a202c',
    textSub: '#4a5568',
    textMut: '#a0aec0',
    blue: '#2563eb',
    blueLight: '#3b82f6',
    green: '#059669',
    greenLt: '#10b981',
    amber: '#d97706',
    amberLt: '#f59e0b',
    red: '#dc2626',
    redLt: '#ef4444',
    purple: '#7c3aed',
    cyan: '#0891b2',
  }
}
