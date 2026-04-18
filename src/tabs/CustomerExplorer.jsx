import { useState, useEffect } from 'react'
import {
    AreaChart, Area, PieChart, Pie, Cell, XAxis, YAxis, Tooltip,
    ResponsiveContainer, CartesianGrid, BarChart, Bar
} from 'recharts'
import { C, SEG_COLORS, CHART_PALETTE } from '../theme.js'
import {
    Card, Stack, Grid, SectionTitle, QueryBadge, KpiCard,
    DataTable, Loader, Empty, BackBtn, Label, SegmentPill, ProgressBar
} from '../components/UI.jsx'
import { runSQL } from '../supabaseClient.js'
import { churnProbability } from '../ml/algorithms.js'

const TT = {
    contentStyle: { background: '#10141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, padding: '8px 12px' },
    labelStyle: { color: C.textSub },
    itemStyle: { color: C.text },
}

// ── churn ring ────────────────────────────────────────────────
function ChurnGauge({ pct }) {
    const color = pct >= 75 ? C.red : pct >= 50 ? C.amber : pct >= 25 ? C.accent : C.green
    const r = 36, circ = 2 * Math.PI * r, dash = (pct / 100) * circ
    return (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
            <svg width={100} height={100} viewBox="0 0 100 100">
                <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface3)" strokeWidth="6" />
                <circle cx="50" cy="50" r={r} fill="none" stroke={color} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${dash} ${circ - dash}`} strokeDashoffset={circ / 4}
                    style={{ transition: 'stroke-dasharray 0.6s ease' }} />
                <text x="50" y="47" textAnchor="middle" dominantBaseline="middle" fill={color} fontSize="16" fontFamily="var(--font-mono)" fontWeight="500">{pct}%</text>
                <text x="50" y="63" textAnchor="middle" dominantBaseline="middle" fill={C.textMut} fontSize="9">churn risk</text>
            </svg>
        </div>
    )
}

// ── default overview ──────────────────────────────────────────
function CustomerOverview() {
    const [segs, setSegs] = useState([])
    const [age, setAge] = useState([])
    const [gender, setGender] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            runSQL(`
        SELECT s.segmentlabel,
               COUNT(s.customerid) AS customercount,
               ROUND(AVG(bm.averagespending)::numeric,2)   AS avgspending,
               ROUND(AVG(bm.purchasefrequency)::numeric,2) AS avgfrequency
        FROM segmentation_results s
        JOIN behavioral_metrics bm ON s.customerid=bm.customerid
        GROUP BY s.segmentlabel ORDER BY avgspending DESC
      `),
            runSQL(`
        SELECT CASE
          WHEN age<=25 THEN '18–25' WHEN age<=35 THEN '26–35'
          WHEN age<=45 THEN '36–45' WHEN age<=55 THEN '46–55'
          WHEN age<=65 THEN '56–65' ELSE '65+' END AS agegroup,
          COUNT(*) AS cnt FROM customers GROUP BY agegroup ORDER BY agegroup
      `),
            runSQL(`SELECT gender, COUNT(*) AS cnt FROM customers GROUP BY gender`),
        ]).then(([sg, ag, gn]) => {
            setSegs(sg.map(r => ({ ...r, customercount: Number(r.customercount), avgspending: Number(r.avgspending), avgfrequency: Number(r.avgfrequency) })))
            setAge(ag.map(r => ({ ...r, cnt: Number(r.cnt) })))
            setGender(gn.map(r => ({ ...r, cnt: Number(r.cnt) })))
            setLoading(false)
        })
    }, [])

    if (loading) return <Loader h={400} />

    const totalCustomers = segs.reduce((s, r) => s + r.customercount, 0)

    // segment card color map
    const SEG_ORDER = ['VIP Loyalists', 'High Value', 'Regular Customers', 'Medium Value', 'At Risk', 'Dormant / No Purchases']
    // use SEG_ORDER where possible, then append any unexpected segments at the end
    const ordered = SEG_ORDER.map(name => segs.find(s => s.segmentlabel === name)).filter(Boolean)
    const remainder = segs.filter(s => !SEG_ORDER.includes(s.segmentlabel))
    const topSegs = [...ordered, ...remainder]

    return (
        <Stack gap={16}>
            {/* segment cards — top row (first 3) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {topSegs.slice(0, 3).map(s => {
                    const color = SEG_COLORS[s.segmentlabel] || C.accent
                    return (
                        <div key={s.segmentlabel} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 'var(--radius)', padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <p style={{ fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.segmentlabel}</p>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}80` }} />
                            </div>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 500, color, lineHeight: 1, marginBottom: 10 }}>{s.customercount.toLocaleString()}</p>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div>
                                    <p style={{ fontSize: 10, color: C.textMut }}>Avg spend</p>
                                    <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.text }}>${s.avgspending.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: C.textMut }}>Avg freq.</p>
                                    <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.text }}>{s.avgfrequency.toFixed(1)}×</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* segment cards — bottom row (next 3: Medium Value, At Risk, Dormant) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                {topSegs.slice(3, 6).map(s => {
                    const color = SEG_COLORS[s.segmentlabel] || C.accent
                    return (
                        <div key={s.segmentlabel} style={{ background: 'var(--surface)', border: `1px solid var(--border)`, borderRadius: 'var(--radius)', padding: 20, position: 'relative', overflow: 'hidden' }}>
                            <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: color, opacity: 0.7 }} />
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
                                <p style={{ fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 600 }}>{s.segmentlabel}</p>
                                <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
                            </div>
                            <p style={{ fontFamily: 'var(--font-mono)', fontSize: 32, fontWeight: 500, color, lineHeight: 1, marginBottom: 10 }}>{s.customercount.toLocaleString()}</p>
                            <div style={{ display: 'flex', gap: 20 }}>
                                <div>
                                    <p style={{ fontSize: 10, color: C.textMut }}>Avg spend</p>
                                    <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.text }}>${s.avgspending.toFixed(0)}</p>
                                </div>
                                <div>
                                    <p style={{ fontSize: 10, color: C.textMut }}>Avg freq.</p>
                                    <p style={{ fontSize: 13, fontFamily: 'var(--font-mono)', color: C.text }}>{s.avgfrequency.toFixed(1)}×</p>
                                </div>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* age + gender */}
            <Grid cols="3fr 2fr" gap={16} style={{ gridTemplateColumns: '3fr 2fr' }}>
                <Card>
                    <SectionTitle sub="Customer count by age group">Age distribution</SectionTitle>
                    <QueryBadge>CASE WHEN age&lt;=25 THEN '18-25'… GROUP BY agegroup — customers table</QueryBadge>
                    <ResponsiveContainer width="100%" height={240}>
                        <BarChart data={age} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="agegroup" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip {...TT} />
                            <Bar dataKey="cnt" name="Customers" radius={[4, 4, 0, 0]}>
                                {age.map((_, i) => <Cell key={i} fill={`rgba(79,127,255,${0.45 + i / age.length * 0.55})`} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <SectionTitle sub="Male / Female / Other split">Gender split</SectionTitle>
                    <QueryBadge>SELECT gender, COUNT(*) FROM customers GROUP BY gender</QueryBadge>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={gender} cx="50%" cy="50%" innerRadius={48} outerRadius={68} dataKey="cnt" nameKey="gender" paddingAngle={3}>
                                {gender.map((_, i) => <Cell key={i} fill={['#4f7fff', '#a78bfa', '#22d3ee'][i]} />)}
                            </Pie>
                            <Tooltip {...TT} />
                        </PieChart>
                    </ResponsiveContainer>
                    <Stack gap={0}>
                        {gender.map((g, i) => (
                            <div key={g.gender} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: ['#4f7fff', '#a78bfa', '#22d3ee'][i], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>{g.gender}</span>
                                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.textSub }}>{totalCustomers ? `${(g.cnt / totalCustomers * 100).toFixed(1)}%` : '—'}</span>
                                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.text, minWidth: 36, textAlign: 'right' }}>{g.cnt}</span>
                            </div>
                        ))}
                    </Stack>
                </Card>
            </Grid>

            {/* segment detail comparison table */}
            <Card>
                <SectionTitle sub="Full breakdown across all customer tiers">Segment detail comparison</SectionTitle>
                <QueryBadge>segmentation_results JOIN behavioral_metrics — GROUP BY segmentlabel</QueryBadge>
                <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)', marginTop: 8 }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                        <thead>
                            <tr style={{ background: 'var(--surface2)' }}>
                                {['Segment', 'Customers', 'Avg Spend', 'Avg Freq.', 'Est. Total Value', 'Share of base'].map(h => (
                                    <th key={h} style={{ padding: '9px 16px', textAlign: 'left', color: C.textSub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {topSegs.map((s, i) => {
                                const color = SEG_COLORS[s.segmentlabel] || C.accent
                                const estVal = Math.round(s.customercount * s.avgspending)
                                const sharePct = totalCustomers ? (s.customercount / totalCustomers * 100).toFixed(1) : 0
                                return (
                                    <tr key={s.segmentlabel} style={{ background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                                        onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'}>
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: color, flexShrink: 0 }} />
                                                <span style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{s.segmentlabel}</span>
                                            </div>
                                        </td>
                                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: C.text }}>{s.customercount.toLocaleString()}</td>
                                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: C.green, fontWeight: 600 }}>${s.avgspending.toFixed(2)}</td>
                                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: C.textSub }}>{s.avgfrequency.toFixed(2)}×</td>
                                        <td style={{ padding: '10px 16px', fontFamily: 'var(--font-mono)', color: C.text }}>${estVal.toLocaleString()}</td>
                                        <td style={{ padding: '10px 16px' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                                                <div style={{ width: 100, height: 4, background: 'var(--surface3)', borderRadius: 99, overflow: 'hidden' }}>
                                                    <div style={{ width: `${sharePct}%`, height: '100%', background: color, borderRadius: 99 }} />
                                                </div>
                                                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: C.textSub, minWidth: 36 }}>{sharePct}%</span>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                </div>
            </Card>
        </Stack>
    )
}

// ── customer detail view ──────────────────────────────────────
function CustomerDetail({ cust, onBack }) {
    const [detail, setDetail] = useState(null)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            runSQL(`SELECT t.transactionid, t.transactiondate, p.productname, p.category, t.quantity, t.totalamount, SUM(t.totalamount) OVER (PARTITION BY t.customerid ORDER BY t.transactiondate ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW) AS cumulative FROM transactions t JOIN products p ON t.productid=p.productid WHERE t.customerid=${cust.customerid} ORDER BY t.transactiondate DESC`),
            runSQL(`SELECT p.category, SUM(t.totalamount) AS spent FROM transactions t JOIN products p ON t.productid=p.productid WHERE t.customerid=${cust.customerid} GROUP BY p.category ORDER BY spent DESC`),
        ]).then(([txns, catSpend]) => {
            setDetail({
                txns: txns.map(r => ({ ...r, totalamount: Number(r.totalamount), cumulative: Number(r.cumulative) })),
                catSpend: catSpend.map(r => ({ ...r, spent: Number(r.spent) })),
            })
            setLoading(false)
        })
    }, [cust.customerid])

    if (loading) return <Loader h={400} />

    const churnPct = churnProbability(Number(cust.recencyofpurchase) || 0, Number(cust.purchasefrequency) || 0, Number(cust.averagespending) || 0)
    const segColor = SEG_COLORS[cust.segmentlabel] || C.accent
    const cumData = [...detail.txns].reverse()

    return (
        <Stack gap={20}>
            <BackBtn onClick={onBack} />

            <div style={{ ...{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 24 }, display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
                <div style={{ width: 56, height: 56, borderRadius: '50%', background: `${segColor}25`, border: `2px solid ${segColor}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20, fontWeight: 700, color: segColor, flexShrink: 0, fontFamily: 'var(--font-head)' }}>
                    {cust.fullname?.charAt(0)}
                </div>
                <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                        <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: C.text }}>{cust.fullname}</h2>
                        <SegmentPill label={cust.segmentlabel || 'Unknown'} />
                    </div>
                    <p style={{ fontSize: 12, color: C.textSub, marginBottom: 14 }}>Customer #{cust.customerid} · Cluster {cust.clusterid}</p>
                    <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
                        {[['Email', cust.email], ['Phone', cust.phone || '—'], ['Age', cust.age], ['Gender', cust.gender], ['Registered', String(cust.registrationdate).slice(0, 10)]].map(([l, v]) => (
                            <div key={l}>
                                <p style={{ fontSize: 10, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.07em', marginBottom: 2 }}>{l}</p>
                                <p style={{ fontSize: 13, color: C.text, fontFamily: 'var(--font-mono)' }}>{v || '—'}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <ChurnGauge pct={churnPct} />
            </div>

            <Grid cols={4} gap={14}>
                <KpiCard label="Purchase frequency" value={`${cust.purchasefrequency || 0}×`} accent="var(--accent)" />
                <KpiCard label="Avg spend / order" value={`$${Number(cust.averagespending || 0).toFixed(0)}`} accent="var(--green)" />
                <KpiCard label="Days since purchase" value={`${cust.recencyofpurchase || 0}d`} accent={Number(cust.recencyofpurchase) > 90 ? 'var(--amber)' : 'var(--green)'} />
                <KpiCard label="Total transactions" value={detail.txns.length} accent="var(--purple)" />
            </Grid>

            <Grid cols="3fr 2fr" gap={16} style={{ gridTemplateColumns: '3fr 2fr' }}>
                <Card>
                    <SectionTitle sub="Running total using SUM() OVER window function">Cumulative spend</SectionTitle>
                    <QueryBadge>SUM(totalamount) OVER (PARTITION BY customerid ORDER BY transactiondate ROWS UNBOUNDED PRECEDING)</QueryBadge>
                    <ResponsiveContainer width="100%" height={200}>
                        <AreaChart data={cumData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f7fff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f7fff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="transactiondate" tick={{ fill: C.textSub, fontSize: 9 }} axisLine={false} tickLine={false} tickFormatter={v => String(v).slice(0, 7)} />
                            <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                            <Tooltip {...TT} formatter={v => [`$${Number(v).toFixed(0)}`, 'Cumulative']} />
                            <Area type="monotone" dataKey="cumulative" stroke="#4f7fff" strokeWidth={2} fill="url(#cg)" name="Cumulative spend" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <SectionTitle sub="Spend distributed across product categories">Category preferences</SectionTitle>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={detail.catSpend} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="spent" nameKey="category" paddingAngle={2}>
                                {detail.catSpend.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i]} />)}
                            </Pie>
                            <Tooltip {...TT} formatter={v => [`$${Number(v).toFixed(0)}`]} />
                        </PieChart>
                    </ResponsiveContainer>
                    <Stack gap={0}>
                        {detail.catSpend.map((c, i) => (
                            <div key={c.category} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 0', borderBottom: '1px solid var(--border)' }}>
                                <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHART_PALETTE[i], flexShrink: 0 }} />
                                <span style={{ flex: 1, fontSize: 11, color: C.textSub }}>{c.category}</span>
                                <span style={{ fontSize: 11, fontFamily: 'var(--font-mono)', color: C.text }}>${c.spent.toFixed(0)}</span>
                            </div>
                        ))}
                    </Stack>
                </Card>
            </Grid>

            <Card>
                <SectionTitle sub={`${detail.txns.length} transactions — most recent first`}>Transaction history</SectionTitle>
                <QueryBadge>transactions JOIN products WHERE customerid={cust.customerid} ORDER BY transactiondate DESC</QueryBadge>
                <DataTable
                    columns={['Tx ID', 'Date', 'Product', 'Category', 'Qty', 'Amount', 'Cumulative']}
                    rows={detail.txns.map(t => [t.transactionid, String(t.transactiondate).slice(0, 10), t.productname, <Label>{t.category}</Label>, t.quantity, `$${t.totalamount.toFixed(2)}`, `$${t.cumulative.toFixed(2)}`])}
                    height={360} />
            </Card>
        </Stack>
    )
}

// ── main component ─────────────────────────────────────────────
export default function CustomerExplorer() {
    const [term, setTerm] = useState('')
    const [results, setResults] = useState([])
    const [selected, setSelected] = useState(null)
    const [searching, setSearching] = useState(false)
    const [showSearch, setShowSearch] = useState(false)

    async function search() {
        if (!term.trim()) { setShowSearch(false); setResults([]); return }
        setSearching(true); setSelected(null); setShowSearch(true)
        const rows = await runSQL(`
      SELECT c.customerid, c.firstname||' '||c.lastname AS fullname, c.email, c.phone, c.gender, c.age, c.registrationdate,
             s.segmentlabel, s.clusterid, bm.purchasefrequency, bm.averagespending, bm.recencyofpurchase
      FROM customers c
      LEFT JOIN segmentation_results s ON c.customerid=s.customerid
      LEFT JOIN behavioral_metrics bm  ON c.customerid=bm.customerid
      WHERE c.firstname ILIKE '%${term}%' OR c.lastname ILIKE '%${term}%' OR c.email ILIKE '%${term}%'
      LIMIT 20
    `)
        setResults(rows)
        setSearching(false)
    }

    function clearSearch() { setTerm(''); setResults([]); setShowSearch(false); setSelected(null) }

    if (selected) return <CustomerDetail cust={selected} onBack={() => setSelected(null)} />

    return (
        <Stack gap={16}>
            {/* search bar — always visible */}
            <div style={{ display: 'flex', gap: 8 }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 12px', transition: 'border-color 0.15s' }}
                    onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)'}
                    onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
                    <input value={term} onChange={e => { setTerm(e.target.value); if (!e.target.value) clearSearch() }}
                        onKeyDown={e => e.key === 'Enter' && search()}
                        placeholder="Search any customer by name or email…"
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, padding: '10px 0' }} />
                    {term && <button onClick={clearSearch} style={{ color: C.textMut, fontSize: 18, lineHeight: 1 }}>×</button>}
                </div>
                <button onClick={search}
                    style={{ padding: '0 20px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
                    {searching ? 'Searching…' : 'Search'}
                </button>
            </div>

            {/* search results */}
            {showSearch && !searching && (
                <Card>
                    <SectionTitle sub={`${results.length} customers found — click to view full profile`}>Search results</SectionTitle>
                    {results.length > 0 ? (
                        <Stack gap={1}>
                            {results.map(c => {
                                const sc = SEG_COLORS[c.segmentlabel] || C.accent
                                return (
                                    <button key={c.customerid} onClick={() => setSelected(c)}
                                        style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.12s' }}
                                        onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                                        <div style={{ width: 34, height: 34, borderRadius: '50%', background: `${sc}20`, border: `1px solid ${sc}40`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12, fontWeight: 600, color: sc, flexShrink: 0 }}>
                                            {c.fullname?.charAt(0)}
                                        </div>
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                            <p style={{ fontSize: 13, color: C.text, fontWeight: 500 }}>{c.fullname}</p>
                                            <p style={{ fontSize: 11, color: C.textSub, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.email}</p>
                                        </div>
                                        <SegmentPill label={c.segmentlabel || 'Unknown'} />
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                                    </button>
                                )
                            })}
                        </Stack>
                    ) : (
                        <Empty icon="◎" title="No customers found" sub={`No customers match "${term}"`} />
                    )}
                </Card>
            )}

            {/* default overview — shown when not searching */}
            {!showSearch && !searching && <CustomerOverview />}

            {searching && <Loader h={200} />}
        </Stack>
    )
}