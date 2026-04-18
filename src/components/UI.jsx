import { useState } from 'react'
import { C, card } from '../theme.js'

// ─── layout ──────────────────────────────────────────────────
export function Card({ children, style, className }) {
    return <div className={className} style={{ ...card(), ...style }}>{children}</div>
}

export function Grid({ cols = 2, gap = 14, children, style }) {
    return (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${cols}, 1fr)`, gap, ...style }}>
            {children}
        </div>
    )
}

export function Stack({ gap = 16, children, style }) {
    return <div style={{ display: 'flex', flexDirection: 'column', gap, ...style }}>{children}</div>
}

export function Row({ gap = 12, align = 'center', justify = 'flex-start', children, style }) {
    return <div style={{ display: 'flex', alignItems: align, justifyContent: justify, gap, ...style }}>{children}</div>
}

// ─── typography ───────────────────────────────────────────────
export function PageTitle({ children, sub }) {
    return (
        <div style={{ marginBottom: 22 }}>
            <h1 style={{ fontFamily: 'var(--font-head)', fontSize: 22, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', lineHeight: 1.1 }}>
                {children}
            </h1>
            {sub && <p style={{ fontSize: 13, color: C.textSub, marginTop: 4 }}>{sub}</p>}
        </div>
    )
}

export function SectionTitle({ children, sub, action }) {
    return (
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
            <div>
                <h3 style={{ fontSize: 13, fontWeight: 600, color: C.text, letterSpacing: '-0.01em' }}>{children}</h3>
                {sub && <p style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>{sub}</p>}
            </div>
            {action}
        </div>
    )
}

export function Label({ children, color }) {
    return (
        <span style={{
            fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em',
            padding: '2px 7px', borderRadius: 4,
            background: color ? `${color}18` : 'var(--surface3)',
            color: color || C.textSub,
            border: `1px solid ${color ? color + '30' : 'var(--border)'}`,
            whiteSpace: 'nowrap',
        }}>{children}</span>
    )
}

// ─── KPI cards ───────────────────────────────────────────────
export function KpiCard({ label, value, sub, accent, delta, dir, icon }) {
    const dColor = dir === 'up' ? C.green : dir === 'down' ? C.red : C.textSub
    const dSign = dir === 'up' ? '↑' : dir === 'down' ? '↓' : ''
    return (
        <div style={{ ...card(), position: 'relative', overflow: 'hidden' }}>
            {accent && <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: accent, opacity: 0.7 }} />}
            <p style={{ fontSize: 11, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500, marginBottom: 12 }}>{label}</p>
            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 28, fontWeight: 500, color: accent || C.text, lineHeight: 1, marginBottom: 8 }}>{value}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                {delta && <span style={{ fontSize: 11, color: dColor, fontFamily: 'var(--font-mono)', display: 'flex', alignItems: 'center', gap: 2 }}>{dSign}{delta}</span>}
                {sub && <span style={{ fontSize: 11, color: C.textMut }}>{sub}</span>}
            </div>
        </div>
    )
}

export function StatRow({ label, value, color, pct, total }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            {color && <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, flexShrink: 0 }} />}
            <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>{label}</span>
            {pct != null && total && (
                <div style={{ width: 60, height: 3, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
                    <div style={{ width: `${Math.round((pct / total) * 100)}%`, height: '100%', background: color || C.accent, borderRadius: 99 }} />
                </div>
            )}
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: color || C.text, minWidth: 40, textAlign: 'right' }}>{value}</span>
        </div>
    )
}

// ─── badges & pills ───────────────────────────────────────────
export function QueryBadge({ children }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#7da0ff', background: 'rgba(79,127,255,0.1)', border: '1px solid rgba(79,127,255,0.2)', borderRadius: 5, padding: '3px 9px', marginBottom: 10, fontFamily: 'var(--font-mono)', maxWidth: '100%' }}>
            <span style={{ opacity: 0.7 }}>SQL</span> {children}
        </div>
    )
}

export function MLBadge({ children }) {
    return (
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: '#c4b5fd', background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.2)', borderRadius: 5, padding: '3px 9px', marginBottom: 10, fontFamily: 'var(--font-mono)' }}>
            <span>⬡</span> ML — {children}
        </div>
    )
}

export function RiskPill({ score }) {
    const [label, color] =
        score >= 75 ? ['Critical', C.red] :
            score >= 50 ? ['High', C.amber] :
                score >= 25 ? ['Medium', C.accent] :
                    ['Low', C.green]
    return <Label color={color}>{label}</Label>
}

export function SegmentPill({ label }) {
    const colors = {
        'VIP Loyalists': '#a78bfa', 'High Value': '#22c55e', 'Regular Customers': '#4f7fff',
        'Medium Value': '#22d3ee', 'At Risk': '#f59e0b', 'Dormant / No Purchases': '#ef4444'
    }
    return <Label color={colors[label] || '#4f7fff'}>{label}</Label>
}

// ─── feedback ─────────────────────────────────────────────────
export function Loader({ h = 200, text = 'Loading…' }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: h, gap: 12, color: C.textSub }}>
            <div style={{ width: 20, height: 20, border: `2px solid var(--border)`, borderTopColor: C.accent, borderRadius: '50%', animation: 'spin 0.65s linear infinite' }} />
            <span style={{ fontSize: 12 }}>{text}</span>
        </div>
    )
}

export function Skeleton({ h = 14, w = '100%', radius = 6 }) {
    return <div className="pulse" style={{ height: h, width: w, background: 'var(--surface3)', borderRadius: radius }} />
}

export function Empty({ icon = '⊘', title = 'No data', sub }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '48px 24px', gap: 8 }}>
            <span style={{ fontSize: 28, opacity: 0.3 }}>{icon}</span>
            <p style={{ fontSize: 14, color: C.textSub, fontWeight: 500 }}>{title}</p>
            {sub && <p style={{ fontSize: 12, color: C.textMut, textAlign: 'center', maxWidth: 280 }}>{sub}</p>}
        </div>
    )
}

export function Alert({ type = 'info', children }) {
    const map = { info: [C.accent, 'rgba(79,127,255,0.1)'], success: [C.green, 'rgba(34,197,94,0.1)'], error: [C.red, 'rgba(239,68,68,0.1)'], warning: [C.amber, 'rgba(245,158,11,0.1)'] }
    const [color, bg] = map[type]
    return (
        <div style={{ padding: '11px 14px', borderRadius: 'var(--radius-sm)', background: bg, border: `1px solid ${color}30`, color, fontSize: 13 }}>
            {children}
        </div>
    )
}

// ─── inputs ───────────────────────────────────────────────────
const inputBase = {
    width: '100%', background: 'var(--surface2)', border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: 'var(--text)',
    fontSize: 13, outline: 'none', transition: 'border-color 0.15s',
}

export function Input({ label, value, onChange, type = 'text', placeholder, required, prefix, icon }) {
    const [focused, setFocused] = useState(false)
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {label && (
                <label style={{ fontSize: 11, color: C.textSub, fontWeight: 500, letterSpacing: '0.04em' }}>
                    {label}{required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}
                </label>
            )}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                {icon && <span style={{ position: 'absolute', left: 10, color: C.textMut, fontSize: 14, pointerEvents: 'none' }}>{icon}</span>}
                <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder} required={required}
                    onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
                    style={{ ...inputBase, paddingLeft: icon ? 32 : 12, borderColor: focused ? 'rgba(79,127,255,0.5)' : 'var(--border)' }} />
            </div>
        </div>
    )
}

export function Select({ label, value, onChange, options, required }) {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {label && <label style={{ fontSize: 11, color: C.textSub, fontWeight: 500, letterSpacing: '0.04em' }}>{label}{required && <span style={{ color: C.red, marginLeft: 3 }}>*</span>}</label>}
            <select value={value} onChange={e => onChange(e.target.value)}
                style={{ ...inputBase, appearance: 'none', backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6' viewBox='0 0 10 6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%236b7a99'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 12px center' }}>
                {options.map(o => <option key={o.value ?? o} value={o.value ?? o}>{o.label ?? o}</option>)}
            </select>
        </div>
    )
}

export function SearchBar({ value, onChange, placeholder, onSubmit }) {
    return (
        <div style={{ display: 'flex', gap: 8, width: '100%' }}>
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 12px', transition: 'border-color 0.15s' }}
                onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)'}
                onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--text-sub)" strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                <input value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
                    onKeyDown={e => e.key === 'Enter' && onSubmit?.()}
                    style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, padding: '10px 0' }} />
                {value && <button onClick={() => onChange('')} style={{ color: C.textMut, fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>}
            </div>
            {onSubmit && (
                <Btn onClick={onSubmit} icon={<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="m21 21-4.35-4.35" /><circle cx="11" cy="11" r="8" /></svg>}>
                    Search
                </Btn>
            )}
        </div>
    )
}

// ─── buttons ──────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, icon, style: s }) {
    const variants = {
        primary: { background: C.accent, color: '#fff', border: 'none' },
        success: { background: C.green, color: '#fff', border: 'none' },
        danger: { background: C.red, color: '#fff', border: 'none' },
        secondary: { background: 'var(--surface2)', color: C.textSub, border: '1px solid var(--border)' },
        ghost: { background: 'transparent', color: C.textSub, border: '1px solid var(--border)' },
    }
    const sizes = {
        sm: { padding: '5px 10px', fontSize: 11, borderRadius: 'var(--radius-sm)' },
        md: { padding: '8px 16px', fontSize: 13, borderRadius: 'var(--radius-sm)' },
        lg: { padding: '11px 22px', fontSize: 14, borderRadius: 'var(--radius)' },
    }
    return (
        <button onClick={onClick} disabled={disabled}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontWeight: 500, cursor: disabled ? 'not-allowed' : 'pointer', opacity: disabled ? 0.55 : 1, transition: 'opacity 0.15s, transform 0.1s', whiteSpace: 'nowrap', ...variants[variant], ...sizes[size], ...s }}>
            {icon && <span style={{ display: 'flex', alignItems: 'center', flexShrink: 0 }}>{icon}</span>}
            {children}
        </button>
    )
}

// ─── tables ───────────────────────────────────────────────────
export function DataTable({ columns, rows, height = 400, onRowClick }) {
    return (
        <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: height, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                    <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 }}>
                        {columns.map((col, i) => (
                            <th key={i} style={{ padding: '8px 12px', textAlign: 'left', color: C.textSub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', whiteSpace: 'nowrap', borderBottom: '1px solid var(--border)' }}>
                                {col}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr key={i} onClick={() => onRowClick?.(row)}
                            style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', cursor: onRowClick ? 'pointer' : 'default', transition: 'background 0.1s' }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                            onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'}>
                            {(Array.isArray(row) ? row : Object.values(row)).map((cell, j) => (
                                <td key={j} style={{ padding: '9px 12px', color: C.text, fontFamily: typeof cell === 'number' ? 'var(--font-mono)' : 'inherit', borderBottom: i < rows.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {cell ?? <span style={{ color: C.textMut }}>—</span>}
                                </td>
                            ))}
                        </tr>
                    ))}
                    {rows.length === 0 && (
                        <tr><td colSpan={columns.length}><Empty title="No results" sub="No data matches the current filters" /></td></tr>
                    )}
                </tbody>
            </table>
        </div>
    )
}

// ─── misc ─────────────────────────────────────────────────────
export function Divider() {
    return <div style={{ height: 1, background: 'var(--border)', margin: '4px 0' }} />
}

export function ProgressBar({ value, max, color = C.accent, thin = false }) {
    const pct = Math.min(100, max ? Math.round(value / max * 100) : 0)
    return (
        <div style={{ height: thin ? 3 : 6, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden', flex: 1 }}>
            <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
        </div>
    )
}

export function BackBtn({ onClick }) {
    return (
        <button onClick={onClick}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '6px 12px', borderRadius: 'var(--radius-sm)', background: 'var(--surface2)', border: '1px solid var(--border)', color: C.textSub, fontSize: 12, cursor: 'pointer', transition: 'all 0.15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'var(--surface3)'; e.currentTarget.style.color = C.text }}
            onMouseLeave={e => { e.currentTarget.style.background = 'var(--surface2)'; e.currentTarget.style.color = C.textSub }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
            Back
        </button>
    )
}

export function Tabs({ tabs, active, onChange }) {
    return (
        <div style={{ display: 'flex', gap: 2, borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
            {tabs.map(t => (
                <button key={t.id} onClick={() => onChange(t.id)}
                    style={{ padding: '8px 14px', fontSize: 12, fontWeight: 500, cursor: 'pointer', background: 'transparent', border: 'none', color: active === t.id ? C.text : C.textSub, borderBottom: `2px solid ${active === t.id ? C.accent : 'transparent'}`, transition: 'all 0.15s', marginBottom: -1 }}>
                    {t.label}
                </button>
            ))}
        </div>
    )
}