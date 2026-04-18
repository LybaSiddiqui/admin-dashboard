import { useState, useEffect, useMemo } from 'react'
import { C, SEG_COLORS } from '../theme.js'
import { Card, Stack, KpiCard, Loader } from '../components/UI.jsx'
import { runSQL } from '../supabaseClient.js'
import { churnProbability } from '../ml/algorithms.js'

const rLabel = p => p >= 75 ? 'Critical' : p >= 50 ? 'High' : p >= 25 ? 'Medium' : 'Low'
const rColor = p => p >= 75 ? C.red : p >= 50 ? C.amber : p >= 25 ? C.accent : C.green

function RiskBar({ score }) {
    const color = rColor(score)
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 60, height: 4, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden', flexShrink: 0 }}>
                <div style={{ width: `${score}%`, height: '100%', background: color, borderRadius: 99, transition: 'width 0.4s ease' }} />
            </div>
            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', fontWeight: 600, color }}>{score}</span>
        </div>
    )
}

function RiskPill({ score }) {
    const label = rLabel(score)
    const color = rColor(score)
    return (
        <span style={{ fontSize: 10, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', padding: '3px 9px', borderRadius: 5, background: `${color}20`, color, border: `1px solid ${color}40`, whiteSpace: 'nowrap' }}>
            {label}
        </span>
    )
}

export default function ChurnRisk() {
    const [customers, setCustomers] = useState([])
    const [loading, setLoading] = useState(true)
    const [levelF, setLevelF] = useState('All')
    const [sortBy, setSortBy] = useState('risk')
    const [search, setSearch] = useState('')

    useEffect(() => {
        runSQL(`
      SELECT c.customerid, c.firstname || ' ' || c.lastname AS fullname,
             s.segmentlabel, bm.recencyofpurchase, bm.purchasefrequency, bm.averagespending
      FROM behavioral_metrics bm
      JOIN customers c            ON bm.customerid = c.customerid
      JOIN segmentation_results s ON bm.customerid = s.customerid
      WHERE bm.recencyofpurchase > 180 AND bm.purchasefrequency >= 2
      ORDER BY bm.recencyofpurchase DESC
      LIMIT 300
    `).then(rows => {
            setCustomers(rows.map(r => ({
                ...r,
                recencyofpurchase: Number(r.recencyofpurchase),
                purchasefrequency: Number(r.purchasefrequency),
                averagespending: Number(r.averagespending),
                churnPct: churnProbability(
                    Number(r.recencyofpurchase),
                    Number(r.purchasefrequency),
                    Number(r.averagespending)
                ),
            })))
            setLoading(false)
        })
    }, [])

    const filtered = useMemo(() => {
        let list = [...customers]

        // search within at-risk customers only
        if (search.trim()) {
            const s = search.toLowerCase()
            list = list.filter(c =>
                c.fullname?.toLowerCase().includes(s) ||
                String(c.customerid).includes(s) ||
                c.segmentlabel?.toLowerCase().includes(s)
            )
        }

        // level filter
        if (levelF !== 'All') list = list.filter(c => rLabel(c.churnPct) === levelF)

        // sort
        const fns = {
            risk: (a, b) => b.churnPct - a.churnPct,
            recency: (a, b) => b.recencyofpurchase - a.recencyofpurchase,
            spend: (a, b) => b.averagespending - a.averagespending,
        }
        return list.sort(fns[sortBy])
    }, [customers, search, levelF, sortBy])

    const crit = customers.filter(c => rLabel(c.churnPct) === 'Critical').length
    const high = customers.filter(c => rLabel(c.churnPct) === 'High').length
    const avgD = customers.length ? Math.round(customers.reduce((s, c) => s + c.recencyofpurchase, 0) / customers.length) : 0

    if (loading) return <Loader h={400} />

    const COLS = ['Customer', 'ID', 'Segment', 'Days Inactive', 'Purchases', 'Avg Spend', 'Risk Score', 'Level']
    const COL_W = [180, 70, 140, 120, 90, 100, 140, 90]

    return (
        <Stack gap={20}>
            {/* KPIs */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 }}>
                <KpiCard label="Total at-risk" value={customers.length} sub="customers flagged" accent="var(--amber)" />
                <KpiCard label="Critical risk" value={crit} sub="score ≥ 75" accent="var(--red)" />
                <KpiCard label="High risk" value={high} sub="score 50–74" accent="var(--amber)" />
                <KpiCard label="Avg days inactive" value={`${avgD}d`} sub="across at-risk group" accent="var(--text-sub)" />
            </div>

            {/* table card */}
            <Card style={{ padding: 0, overflow: 'hidden' }}>
                {/* card header */}
                <div style={{ padding: '20px 24px 0', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
                    <div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: C.text, fontFamily: 'var(--font-head)' }}>At-risk customer list</p>
                        <p style={{ fontSize: 12, color: C.textSub, marginTop: 3 }}>Customers inactive 180+ days with 2+ past purchases</p>
                    </div>

                    {/* level filter pills */}
                    <div style={{ display: 'flex', gap: 6 }}>
                        {['All', 'Critical', 'High', 'Medium'].map(l => (
                            <button key={l} onClick={() => setLevelF(l)}
                                style={{
                                    padding: '5px 14px', borderRadius: 6, fontSize: 12, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                                    background: levelF === l ? C.accent : 'var(--surface2)',
                                    color: levelF === l ? '#fff' : C.textSub,
                                    border: `1px solid ${levelF === l ? C.accent : 'var(--border)'}`
                                }}>
                                {l}
                            </button>
                        ))}
                    </div>
                </div>

                {/* search + sort bar */}
                <div style={{ padding: '14px 24px', display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap', borderBottom: '1px solid var(--border)' }}>
                    {/* search — searches ONLY within at-risk customers */}
                    <div style={{ flex: 1, minWidth: 200, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 10px', transition: 'border-color 0.15s' }}
                        onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)'}
                        onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search within at-risk customers — name, ID, or segment…"
                            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 12, padding: '8px 0' }} />
                        {search && <button onClick={() => setSearch('')} style={{ color: C.textMut, fontSize: 16, lineHeight: 1, padding: 2 }}>×</button>}
                    </div>

                    {/* sort buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                        <span style={{ fontSize: 11, color: C.textMut, marginRight: 2 }}>Sort by:</span>
                        {[['recency', 'Days inactive'], ['risk', 'Risk score'], ['spend', 'Avg spend']].map(([k, l]) => (
                            <button key={k} onClick={() => setSortBy(k)}
                                style={{
                                    padding: '5px 12px', borderRadius: 6, fontSize: 11, fontWeight: 500, cursor: 'pointer', transition: 'all 0.12s',
                                    background: sortBy === k ? C.accent : 'transparent',
                                    color: sortBy === k ? '#fff' : C.textSub,
                                    border: `1px solid ${sortBy === k ? C.accent : 'var(--border)'}`
                                }}>
                                {l}
                            </button>
                        ))}
                    </div>

                    <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: C.textMut, marginLeft: 'auto', flexShrink: 0 }}>
                        {filtered.length} customers shown
                    </span>
                </div>

                {/* custom table — matches screenshot exactly */}
                <div style={{ overflowX: 'auto', overflowY: 'auto', maxHeight: 600 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                        <thead>
                            <tr style={{ background: 'var(--surface2)', position: 'sticky', top: 0, zIndex: 1 }}>
                                {COLS.map((col, i) => (
                                    <th key={col} style={{ padding: '10px 16px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.09em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap', minWidth: COL_W[i] }}>
                                        {col}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.length === 0 && (
                                <tr>
                                    <td colSpan={COLS.length} style={{ padding: '48px 24px', textAlign: 'center', color: C.textSub, fontSize: 13 }}>
                                        {search ? `No at-risk customers match "${search}"` : 'No customers match the current filters.'}
                                    </td>
                                </tr>
                            )}
                            {filtered.map((c, i) => {
                                const segColor = SEG_COLORS[c.segmentlabel] || C.accent
                                const dColor = c.recencyofpurchase >= 300 ? C.red : c.recencyofpurchase >= 240 ? C.amber : C.textSub
                                return (
                                    <tr key={c.customerid}
                                        style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', transition: 'background 0.1s', borderBottom: '1px solid rgba(255,255,255,0.03)' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'}>

                                        {/* Customer */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{c.fullname}</p>
                                        </td>

                                        {/* ID */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.textMut }}>#{c.customerid}</span>
                                        </td>

                                        {/* Segment */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 4, background: `${segColor}18`, color: segColor, border: `1px solid ${segColor}30`, whiteSpace: 'nowrap' }}>
                                                {c.segmentlabel}
                                            </span>
                                        </td>

                                        {/* Days inactive */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', fontWeight: 600, color: dColor }}>
                                                {c.recencyofpurchase}d
                                            </span>
                                        </td>

                                        {/* Purchases */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.textSub }}>
                                                {c.purchasefrequency}×
                                            </span>
                                        </td>

                                        {/* Avg spend */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <span style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.text }}>
                                                ${c.averagespending.toFixed(0)}
                                            </span>
                                        </td>

                                        {/* Risk score — bar + number */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <RiskBar score={c.churnPct} />
                                        </td>

                                        {/* Level pill */}
                                        <td style={{ padding: '12px 16px' }}>
                                            <RiskPill score={c.churnPct} />
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>

                {/* footer count */}
                <div style={{ padding: '10px 24px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{ fontSize: 11, color: C.textMut }}>
                        Showing {filtered.length} of {customers.length} at-risk customers
                    </span>
                    {search && (
                        <button onClick={() => setSearch('')}
                            style={{ fontSize: 11, color: C.accent, background: 'none', border: 'none', cursor: 'pointer' }}>
                            Clear search
                        </button>
                    )}
                </div>
            </Card>
        </Stack>
    )
}