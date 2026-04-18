import { useState, useEffect } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
  ComposedChart, Line, Cell, PieChart, Pie, Legend
} from 'recharts'
import { C, CHART_PALETTE, SEG_COLORS, CAT_COLORS } from '../theme.js'
import {
  Card, Stack, Grid, SectionTitle, QueryBadge, KpiCard, DataTable,
  Loader, Empty, BackBtn, Label, SegmentPill, ProgressBar
} from '../components/UI.jsx'
import { runSQL } from '../supabaseClient.js'

const TT = {
  contentStyle: { background: '#10141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, padding: '8px 12px' },
  labelStyle: { color: C.textSub },
  itemStyle: { color: C.text },
}

// ── default overview loaded on mount ──────────────────────────
function ProductOverview({ onSelect }) {
  const [top5, setTop5] = useState([])
  const [bottom5, setBottom5] = useState([])
  const [catRev, setCatRev] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      runSQL(`
        SELECT p.productid, p.productname, p.category, p.price,
               COALESCE(SUM(t.totalamount),0) AS revenue,
               COALESCE(SUM(t.quantity),0)    AS units,
               COALESCE(COUNT(DISTINCT t.customerid),0) AS buyers
        FROM products p LEFT JOIN transactions t ON p.productid=t.productid
        GROUP BY p.productid, p.productname, p.category, p.price
        ORDER BY revenue DESC
      `),
      runSQL(`
        SELECT p.category, SUM(t.totalamount) AS revenue,
               COUNT(t.transactionid) AS orders
        FROM transactions t JOIN products p ON t.productid=p.productid
        GROUP BY p.category ORDER BY revenue DESC
      `),
    ]).then(([prods, cats]) => {
      const mapped = prods.map(r => ({ ...r, revenue: Number(r.revenue), units: Number(r.units), buyers: Number(r.buyers) }))
      setTop5(mapped.slice(0, 5))
      setBottom5(mapped.filter(r => r.revenue > 0).slice(-5).reverse())
      setCatRev(cats.map(r => ({ ...r, revenue: Math.round(Number(r.revenue)) })))
      setLoading(false)
    })
  }, [])

  if (loading) return <Loader h={400} />

  const allProducts = [...top5, ...bottom5]
  const chartData = [
    ...top5.map(p => ({ name: p.productname, revenue: p.revenue, type: 'top' })),
    ...bottom5.map(p => ({ name: p.productname, revenue: p.revenue, type: 'bottom' })),
  ]
  const totalCatRev = catRev.reduce((s, r) => s + r.revenue, 0)

  return (
    <Stack gap={16}>
      <Grid cols="3fr 2fr" gap={16} style={{ gridTemplateColumns: '3fr 2fr' }}>
        {/* bar chart */}
        <Card>
          <SectionTitle sub="Top 5 and bottom 3 shown — click a product to drill down">Revenue by product</SectionTitle>
          <QueryBadge>products LEFT JOIN transactions — SUM(totalamount) GROUP BY productid ORDER BY revenue</QueryBadge>
          <ResponsiveContainer width="100%" height={310}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 10, right: 40, top: 4, bottom: 0 }}
              onClick={e => {
                if (!e?.activePayload) return
                const name = e.activePayload[0]?.payload?.name
                const prod = allProducts.find(p => p.productname === name)
                if (prod) onSelect(prod)
              }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="name" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} width={130} />
              <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue ($)']} />
              <Bar dataKey="revenue" radius={[0, 4, 4, 0]} cursor="pointer">
                {chartData.map((d, i) => <Cell key={i} fill={d.type === 'top' ? '#4f7fff' : '#ef4444'} fillOpacity={d.type === 'top' ? 0.85 : 0.6} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        {/* donut */}
        <Card>
          <SectionTitle sub="Share of total">Revenue by category</SectionTitle>
          <QueryBadge>JOIN products, SUM(totalamount) GROUP BY category</QueryBadge>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catRev} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="revenue" nameKey="category" paddingAngle={2}>
                {catRev.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i]} />)}
              </Pie>
              <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`]} />
              <Legend formatter={v => <span style={{ fontSize: 11, color: C.textSub }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <Stack gap={0} style={{ marginTop: 4 }}>
            {catRev.map((r, i) => (
              <div key={r.category} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '4px 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ width: 7, height: 7, borderRadius: '50%', background: CHART_PALETTE[i], flexShrink: 0 }} />
                <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>{r.category}</span>
                <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.text }}>
                  {totalCatRev ? `${(r.revenue / totalCatRev * 100).toFixed(1)}%` : '—'}
                </span>
              </div>
            ))}
          </Stack>
        </Card>
      </Grid>

      {/* top 5 + underperformers */}
      <Grid cols={2} gap={16}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Top 5 performers</p>
              <p style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Click any row to view full breakdown</p>
            </div>
            <Label color={C.green}>TOP</Label>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['#', 'Product', 'Category', 'Revenue', 'Units'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textSub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {top5.map((p, i) => (
                  <tr key={p.productid} onClick={() => onSelect(p)} style={{ cursor: 'pointer', transition: 'background 0.12s', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'}>
                    <td style={{ padding: '9px 12px', color: C.textMut, fontFamily: 'var(--font-mono)' }}>{i + 1}</td>
                    <td style={{ padding: '9px 12px', color: C.text, fontWeight: 600 }}>{p.productname}</td>
                    <td style={{ padding: '9px 12px', color: C.textSub }}>{p.category}</td>
                    <td style={{ padding: '9px 12px', color: C.green, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${p.revenue.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', color: C.textSub, fontFamily: 'var(--font-mono)' }}>{p.units}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: C.text }}>Underperformers</p>
              <p style={{ fontSize: 11, color: C.textSub, marginTop: 2 }}>Click any row to view full breakdown</p>
            </div>
            <Label color={C.red}>ACTION NEEDED</Label>
          </div>
          <div style={{ overflowX: 'auto', borderRadius: 6, border: '1px solid var(--border)', marginTop: 12 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ background: 'var(--surface2)' }}>
                  {['Product', 'Category', 'Revenue', 'Units', 'Rev/Unit'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: C.textSub, fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.07em', borderBottom: '1px solid var(--border)', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bottom5.map((p, i) => (
                  <tr key={p.productid} onClick={() => onSelect(p)} style={{ cursor: 'pointer', transition: 'background 0.12s', background: i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--surface3)'}
                    onMouseLeave={e => e.currentTarget.style.background = i % 2 === 0 ? 'var(--surface)' : 'var(--surface2)'}>
                    <td style={{ padding: '9px 12px', color: C.text, fontWeight: 600 }}>{p.productname}</td>
                    <td style={{ padding: '9px 12px', color: C.textSub }}>{p.category}</td>
                    <td style={{ padding: '9px 12px', color: C.red, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>${p.revenue.toLocaleString()}</td>
                    <td style={{ padding: '9px 12px', color: C.textSub, fontFamily: 'var(--font-mono)' }}>{p.units}</td>
                    <td style={{ padding: '9px 12px', color: C.textMut, fontFamily: 'var(--font-mono)' }}>${p.units ? (p.revenue / p.units).toFixed(0) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </Grid>
    </Stack>
  )
}

// ── drill-down detail view ─────────────────────────────────────
function ProductDetail({ prod, onBack }) {
  const [detail, setDetail] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      runSQL(`SELECT TO_CHAR(t.transactiondate,'YYYY-MM') AS month, SUM(t.totalamount) AS revenue, SUM(t.quantity) AS units, COUNT(DISTINCT t.customerid) AS buyers FROM transactions t WHERE t.productid=${prod.productid} GROUP BY month ORDER BY month`),
      runSQL(`SELECT s.segmentlabel, COUNT(DISTINCT t.customerid) AS buyers, SUM(t.totalamount) AS revenue FROM transactions t JOIN segmentation_results s ON t.customerid=s.customerid WHERE t.productid=${prod.productid} GROUP BY s.segmentlabel ORDER BY revenue DESC`),
      runSQL(`SELECT c.customerid, c.firstname||' '||c.lastname AS name, c.email, s.segmentlabel, SUM(t.totalamount) AS spent, COUNT(t.transactionid) AS orders, MAX(t.transactiondate) AS lastbuy FROM transactions t JOIN customers c ON t.customerid=c.customerid JOIN segmentation_results s ON c.customerid=s.customerid WHERE t.productid=${prod.productid} GROUP BY c.customerid, c.firstname, c.lastname, c.email, s.segmentlabel ORDER BY spent DESC LIMIT 30`),
    ]).then(([mo, seg, buyers]) => {
      setDetail({
        monthly: mo.map(r => ({ ...r, revenue: Math.round(Number(r.revenue)), units: Number(r.units) })),
        segments: seg.map(r => ({ ...r, buyers: Number(r.buyers), revenue: Math.round(Number(r.revenue)) })),
        buyers: buyers.map(r => ({ ...r, spent: Number(r.spent), orders: Number(r.orders) })),
      })
      setLoading(false)
    })
  }, [prod.productid])

  if (loading) return <Loader h={400} />
  const total = detail.segments.reduce((s, r) => s + r.revenue, 0)

  return (
    <Stack gap={20}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <BackBtn onClick={onBack} />
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h2 style={{ fontFamily: 'var(--font-head)', fontSize: 20, fontWeight: 800, color: C.text }}>{prod.productname}</h2>
            <Label color={CAT_COLORS[prod.category]}>{prod.category}</Label>
          </div>
          <p style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>Product #{prod.productid} · Listed at ${Number(prod.price).toFixed(2)}</p>
        </div>
      </div>

      <Grid cols={4} gap={14}>
        <KpiCard label="Total revenue" value={`$${prod.revenue.toLocaleString()}`} accent="var(--green)" />
        <KpiCard label="Units sold" value={prod.units.toLocaleString()} accent="var(--accent)" />
        <KpiCard label="Unique buyers" value={prod.buyers.toLocaleString()} accent="var(--purple)" />
        <KpiCard label="Revenue / unit" value={prod.units ? `$${(prod.revenue / prod.units).toFixed(2)}` : '—'} accent="var(--cyan)" />
      </Grid>

      <Grid cols="3fr 2fr" gap={16} style={{ gridTemplateColumns: '3fr 2fr' }}>
        <Card>
          <SectionTitle sub="Revenue and units over time">Monthly performance</SectionTitle>
          <QueryBadge>transactions WHERE productid={prod.productid} GROUP BY month</QueryBadge>
          <ResponsiveContainer width="100%" height={240}>
            <ComposedChart data={detail.monthly} margin={{ left: 0, right: 30, top: 4, bottom: 0 }}>
              <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <YAxis yAxisId="rev" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
              <YAxis yAxisId="u" orientation="right" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip {...TT} />
              <Bar yAxisId="rev" dataKey="revenue" name="Revenue ($)" fill="rgba(79,127,255,0.7)" radius={[3, 3, 0, 0]} />
              <Line yAxisId="u" dataKey="units" name="Units" stroke="#22c55e" strokeWidth={2} dot={{ fill: '#22c55e', r: 3 }} type="monotone" />
            </ComposedChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionTitle sub="Revenue breakdown by customer segment">Segment affinity</SectionTitle>
          <QueryBadge>JOIN segmentation_results ON customerid WHERE productid={prod.productid}</QueryBadge>
          <Stack gap={12} style={{ marginTop: 8 }}>
            {detail.segments.map(s => (
              <div key={s.segmentlabel}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 5 }}>
                  <SegmentPill label={s.segmentlabel} />
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.text }}>${s.revenue.toLocaleString()}</span>
                </div>
                <ProgressBar value={s.revenue} max={total} color={SEG_COLORS[s.segmentlabel]} />
              </div>
            ))}
          </Stack>
        </Card>
      </Grid>

      <Card>
        <SectionTitle sub={`${detail.buyers.length} customers who purchased this product`}>Top buyers</SectionTitle>
        <QueryBadge>transactions JOIN customers JOIN segmentation_results WHERE productid={prod.productid} GROUP BY customer</QueryBadge>
        <DataTable
          columns={['Customer', 'Email', 'Segment', 'Total Spent', 'Orders', 'Last Purchase']}
          rows={detail.buyers.map(b => [b.name, b.email, <SegmentPill label={b.segmentlabel} />, `$${b.spent.toFixed(0)}`, `${b.orders}×`, String(b.lastbuy).slice(0, 10)])}
          height={320} />
      </Card>
    </Stack>
  )
}

// ── main component ─────────────────────────────────────────────
export default function ProductExplorer() {
  const [term, setTerm] = useState('')
  const [results, setResults] = useState([])
  const [selected, setSelected] = useState(null)
  const [detail, setDetail] = useState(null)
  const [searching, setSearching] = useState(false)
  const [showSearch, setShowSearch] = useState(false)

  async function search() {
    if (!term.trim()) { setShowSearch(false); setResults([]); return }
    setSearching(true); setSelected(null); setDetail(null); setShowSearch(true)
    const rows = await runSQL(`
      SELECT p.productid, p.productname, p.category, p.price,
             COALESCE(SUM(t.totalamount),0) AS revenue,
             COALESCE(SUM(t.quantity),0)    AS units,
             COALESCE(COUNT(DISTINCT t.customerid),0) AS buyers
      FROM products p LEFT JOIN transactions t ON p.productid=t.productid
      WHERE p.productname ILIKE '%${term}%' OR p.category ILIKE '%${term}%'
      GROUP BY p.productid, p.productname, p.category, p.price
      ORDER BY revenue DESC LIMIT 30
    `)
    setResults(rows.map(r => ({ ...r, revenue: Number(r.revenue), units: Number(r.units), buyers: Number(r.buyers) })))
    setSearching(false)
  }

  function clearSearch() {
    setTerm(''); setResults([]); setShowSearch(false); setSelected(null); setDetail(null)
  }

  function selectProduct(prod) {
    setSelected(prod); setShowSearch(false)
  }

  // drill-down view
  if (selected) return <ProductDetail prod={selected} onBack={() => { setSelected(null); setDetail(null) }} />

  return (
    <Stack gap={16}>
      {/* search bar — always visible */}
      <div style={{ display: 'flex', gap: 8 }}>
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8, background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '0 12px', transition: 'border-color 0.15s' }}
          onFocusCapture={e => e.currentTarget.style.borderColor = 'rgba(79,127,255,0.4)'}
          onBlurCapture={e => e.currentTarget.style.borderColor = 'var(--border)'}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" /></svg>
          <input value={term} onChange={e => { setTerm(e.target.value); if (!e.target.value) clearSearch() }}
            onKeyDown={e => e.key === 'Enter' && search()}
            placeholder="Search any product by name or category…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'var(--text)', fontSize: 13, padding: '10px 0' }} />
          {term && <button onClick={clearSearch} style={{ color: C.textMut, fontSize: 18, lineHeight: 1 }}>×</button>}
        </div>
        <button onClick={search}
          style={{ padding: '0 20px', background: 'var(--accent)', color: '#fff', borderRadius: 'var(--radius-sm)', fontSize: 13, fontWeight: 500, cursor: 'pointer', whiteSpace: 'nowrap' }}>
          {searching ? 'Searching…' : 'Search'}
        </button>
      </div>

      {/* search results dropdown */}
      {showSearch && !searching && (
        <Card>
          <SectionTitle sub={`${results.length} products found — click to drill in`}>Search results</SectionTitle>
          {results.length > 0 ? (
            <Stack gap={1}>
              {results.map(p => (
                <button key={p.productid} onClick={() => selectProduct(p)}
                  style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 12px', borderRadius: 'var(--radius-sm)', background: 'transparent', border: 'none', cursor: 'pointer', textAlign: 'left', width: '100%', transition: 'background 0.12s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'var(--surface2)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <Label color={CAT_COLORS[p.category] || C.accent}>{p.category}</Label>
                  <span style={{ flex: 1, fontSize: 13, color: C.text, fontWeight: 500 }}>{p.productname}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.textSub }}>${Number(p.price).toFixed(2)}</span>
                  <span style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: C.green, minWidth: 90, textAlign: 'right' }}>${p.revenue.toLocaleString()}</span>
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}><path d="M9 18l6-6-6-6" /></svg>
                </button>
              ))}
            </Stack>
          ) : (
            <Empty icon="◫" title="No products found" sub={`No products match "${term}"`} />
          )}
        </Card>
      )}

      {/* default overview — always shown when not in search or drill-down */}
      {!showSearch && !searching && (
        <ProductOverview onSelect={selectProduct} />
      )}

      {searching && <Loader h={200} />}
    </Stack>
  )
}