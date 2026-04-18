export const C = {
  bg: 'var(--bg)',
  surface: 'var(--surface)',
  surface2: 'var(--surface2)',
  surface3: 'var(--surface3)',
  border: 'var(--border)',
  borderMd: 'var(--border-md)',
  text: 'var(--text)',
  textSub: 'var(--text-sub)',
  textMut: 'var(--text-muted)',
  accent: 'var(--accent)',
  accentLt: 'var(--accent-lt)',
  green: 'var(--green)',
  greenLt: 'var(--green-lt)',
  amber: 'var(--amber)',
  red: 'var(--red)',
  purple: 'var(--purple)',
  cyan: 'var(--cyan)',
  pink: 'var(--pink)',
}

export const SEG_COLORS = {
  'VIP Loyalists': '#a78bfa',
  'High Value': '#22c55e',
  'Regular Customers': '#4f7fff',
  'Medium Value': '#22d3ee',
  'At Risk': '#f59e0b',
  'Dormant / No Purchases': '#ef4444',
}

export const CAT_COLORS = {
  Books: '#4f7fff',
  Sports: '#22c55e',
  Electronics: '#a78bfa',
  Beauty: '#f472b6',
  Home: '#22d3ee',
  Clothing: '#f59e0b',
}

export const CHART_PALETTE = [
  '#4f7fff', '#22c55e', '#a78bfa', '#f59e0b', '#ef4444', '#22d3ee', '#f472b6', '#2dd4bf', '#fb923c', '#e879f9'
]

export const card = (extra = {}) => ({
  background: 'var(--surface)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius)',
  padding: '20px',
  ...extra,
})