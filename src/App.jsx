import { useState, useEffect, useMemo } from 'react'
import { supabase } from './supabaseClient'
import { ThemeProvider, useTheme, useColors } from './theme.jsx'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  Cell, PieChart, Pie, Legend, LineChart, Line, CartesianGrid,
  AreaChart, Area, RadialBarChart, RadialBar,
} from 'recharts'

// Tooltip
function Tip({ active, payload, label }) {
  const C = useColors()
  if (!active || !payload?.length) return null
  return (
    <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', fontSize: 12, minWidth: 130 }}>
      {label && <p style={{ color: C.textSub, marginBottom: 6, fontWeight: 500 }}>{label}</p>}
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color || C.text, fontFamily: 'IBM Plex Mono,monospace', fontSize: 12 }}>
          {p.name}: {typeof p.value === 'number' ? p.value.toLocaleString(undefined, { maximumFractionDigits: 1 }) : p.value}
        </p>
      ))}
    </div>
  )
}

// Shared Dashboard
function Card({ children, style }) {
  const C = useColors()
  return (
    <div style={{ background: C.surface, border: `1px solid ${C.border}`, borderRadius: 12, padding: 22, ...style }}>
      {children}
    </div>
  )
}

function SectionHead({ title, sub, right }) {
  const C = useColors()
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
      <div>
        <h3 style={{ fontFamily: 'Syne,sans-serif', fontSize: 14, fontWeight: 700, color: C.text, letterSpacing: '0.01em' }}>{title}</h3>
        {sub && <p style={{ fontSize: 11, color: C.textSub, marginTop: 3 }}>{sub}</p>}
      </div>
      {right}
    </div>
  )
}

function Badge({ children, color }) {
  const C = useColors()
  const bg = color === 'green' ? C.green : color === 'red' ? C.red : color === 'amber' ? C.amber : C.blue
  return (
    <span style={{ fontSize: 10, fontWeight: 600, background: `${bg}20`, color: bg, border: `1px solid ${bg}40`, borderRadius: 5, padding: '2px 7px', letterSpacing: '0.04em', textTransform: 'uppercase' }}>
      {children}
    </span>
  )
}

function Loader() {
  const C = useColors()
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 180, color: C.textSub, fontSize: 13, gap: 8 }}>
      <span style={{ display: 'inline-block', width: 14, height: 14, border: `2px solid ${C.border}`, borderTopColor: C.blue, borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      Loading data…
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  )
}

function Kpi({ label, value, sub, accent, delta, deltaDir }) {
  const C = useColors()
  const dColor = deltaDir === 'up' ? C.green : deltaDir === 'down' ? C.red : C.textSub
  return (
    <Card style={{ flex: 1, minWidth: 0 }}>
      <p style={{ fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 12, fontWeight: 500 }}>{label}</p>
      <p style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 26, fontWeight: 500, color: accent || C.text, lineHeight: 1, marginBottom: 6 }}>{value}</p>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {delta && <span style={{ fontSize: 11, color: dColor, fontFamily: 'IBM Plex Mono,monospace' }}>{deltaDir === 'up' ? '↑' : '↓'} {delta}</span>}
        {sub && <span style={{ fontSize: 11, color: C.textMut }}>{sub}</span>}
      </div>
    </Card>
  )
}

// Overview
function Overview() {
  const C = useColors()
  const [data, setData] = useState(null)

  useEffect(() => {
    async function load() {
      const [cust, tx, bm, churn, seg] = await Promise.all([
        supabase.from('customers').select('*', { count: 'exact', head: true }),
        supabase.from('transactions').select('totalamount,transactiondate'),
        supabase.from('behavioral_metrics').select('averagespending,purchasefrequency').gt('averagespending', 0),
        supabase.from('behavioral_metrics').select('*', { count: 'exact', head: true }).gt('recencyofpurchase', 180).gte('purchasefrequency', 2),
        supabase.from('segmentation_results').select('segmentlabel').in('segmentlabel', ['High Value', 'VIP Loyalists']),
      ])

      const txRows = tx.data || []
      const revenue = txRows.reduce((s, r) => s + Number(r.totalamount), 0)
      const avgSpend = bm.data?.length ? bm.data.reduce((s, r) => s + Number(r.averagespending), 0) / bm.data.length : 0
      const avgFreq = bm.data?.length ? bm.data.reduce((s, r) => s + Number(r.purchasefrequency), 0) / bm.data.length : 0

      const highVal = seg.data?.length || 0

      // Monthly revenue
      const monthly = {}
      txRows.forEach(r => {
        const m = r.transactiondate?.slice(0, 7)
        if (m) monthly[m] = (monthly[m] || 0) + Number(r.totalamount)
      })
      const monthlyData = Object.entries(monthly).sort((a, b) => a[0].localeCompare(b[0]))
        .slice(-6).map(([m, v]) => ({ month: m.slice(5), revenue: Math.round(v) }))

      setData({ customers: cust.count || 0, revenue, avgSpend, avgFreq, churnRisk: churn.count || 0, highVal, monthlyData })
    }
    load()
  }, [])

  if (!data) return <Loader />

  const retRate = Math.round(((data.customers - data.churnRisk) / data.customers) * 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Kpi label="Total customers" value={data.customers.toLocaleString()} sub="registered accounts" />
        <Kpi label="Total revenue" value={`$${(data.revenue / 1000).toFixed(1)}k`} accent={C.green} delta={`${((data.revenue / data.customers)).toFixed(0)} / customer`} deltaDir="up" />
        <Kpi label="Avg spend per customer" value={`$${data.avgSpend.toFixed(0)}`} accent={C.blue} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        <Kpi label="Churn risk customers" value={data.churnRisk} accent={C.amber} sub="inactive 180+ days" delta={`${((data.churnRisk / data.customers) * 100).toFixed(1)}% of base`} deltaDir="down" />
        <Kpi label="High-value customers" value={data.highVal} accent={C.purple} sub="top segment" />
        <Kpi label="Retention rate" value={`${retRate}%`} accent={retRate > 80 ? C.green : C.amber} sub="non-churned customers" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 14 }}>
        <Card>
          <SectionHead title="Revenue trend" sub="Last 6 months" />
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={data.monthlyData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.25} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip content={<Tip />} />
              <Area type="monotone" dataKey="revenue" name="Revenue ($)" stroke={C.blue} strokeWidth={2} fill="url(#revGrad)" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Avg purchase frequency" sub="Across active customers" />
          <div style={{ textAlign: 'center', paddingTop: 16 }}>
            <p style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 52, fontWeight: 500, color: C.cyan, lineHeight: 1 }}>{data.avgFreq.toFixed(1)}</p>
            <p style={{ fontSize: 12, color: C.textSub, marginTop: 8 }}>purchases / customer</p>
            <div style={{ marginTop: 24, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: '1× buyers', pct: 28, color: C.textMut },
                { label: '2–3× buyers', pct: 41, color: C.blue },
                { label: '4–6× buyers', pct: 22, color: C.green },
                { label: '7×+ buyers', pct: 9, color: C.purple },
              ].map(r => (
                <div key={r.label} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <p style={{ fontSize: 11, color: C.textSub, width: 82, textAlign: 'right', flexShrink: 0 }}>{r.label}</p>
                  <div style={{ flex: 1, height: 6, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                    <div style={{ width: `${r.pct}%`, height: '100%', background: r.color, borderRadius: 3 }} />
                  </div>
                  <p style={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: r.color, width: 30 }}>{r.pct}%</p>
                </div>
              ))}
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}

// Individual product view
function ProductDetail({ product, allProducts, onBack }) {
  const C = useColors()
  const [monthly, setMonthly] = useState([])
  const [buyers, setBuyers] = useState([])
  const [loadingDt, setLoadingDt] = useState(true)

  const rank = allProducts.findIndex(p => p.productname === product.productname) + 1
  const totalRev = allProducts.reduce((s, p) => s + Number(p.revenue), 0)
  const catProds = allProducts.filter(p => p.category === product.category)
  const catAvgRev = catProds.reduce((s, p) => s + Number(p.revenue), 0) / catProds.length
  const vsAvg = ((Number(product.revenue) - catAvgRev) / catAvgRev * 100).toFixed(1)
  const revPerUnit = product.units > 0 ? (Number(product.revenue) / Number(product.units)).toFixed(2) : 0

  useEffect(() => {
    async function load() {
      const { data: txData } = await supabase
        .from('transactions')
        .select('totalamount, quantity, transactiondate, customerid, customers(firstname,lastname)')
        .eq('productid', product.productid)

      if (txData) {
        const mo = {}
        txData.forEach(t => {
          const m = t.transactiondate?.slice(0, 7)
          if (m) mo[m] = { revenue: (mo[m]?.revenue || 0) + Number(t.totalamount), units: (mo[m]?.units || 0) + Number(t.quantity) }
        })
        setMonthly(Object.entries(mo).sort((a, b) => a[0].localeCompare(b[0]))
          .map(([m, v]) => ({ month: m.slice(5) + '/' + m.slice(2, 4), revenue: Math.round(v.revenue), units: v.units })))

        const custMap = {}
        txData.forEach(t => {
          const id = t.customerid
          if (!custMap[id]) custMap[id] = { id, name: `${t.customers?.firstname || ''} ${t.customers?.lastname || ''}`.trim(), orders: 0, spent: 0 }
          custMap[id].orders++
          custMap[id].spent += Number(t.totalamount)
        })
        setBuyers(Object.values(custMap).sort((a, b) => b.spent - a.spent).slice(0, 10))
      }
      setLoadingDt(false)
    }
    load()
  }, [product.productid])

  const th = { padding: '7px 0', fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: `1px solid ${C.border}` }
  const td = { padding: '10px 0', borderBottom: `1px solid ${C.border}25`, fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button onClick={onBack}
          style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 12px', borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, color: C.textSub, fontSize: 13, cursor: 'pointer' }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 5l-7 7 7 7" /></svg>
          Back
        </button>
        <div>
          <h2 style={{ fontFamily: 'Syne,sans-serif', fontSize: 18, fontWeight: 800, color: C.text, letterSpacing: '-0.01em' }}>{product.productname}</h2>
          <p style={{ fontSize: 12, color: C.textSub, marginTop: 2 }}>{product.category} · Rank #{rank} of {allProducts.length}</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <Kpi label="Total revenue" value={`$${Number(product.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}`} accent={C.green}
          sub={`${((Number(product.revenue) / totalRev) * 100).toFixed(1)}% of all revenue`} />
        <Kpi label="Units sold" value={Number(product.units).toLocaleString()} accent={C.blue} />
        <Kpi label="Revenue / unit" value={`$${revPerUnit}`} accent={C.cyan} />
        <Kpi label="vs category avg" value={`${vsAvg > 0 ? '+' : ''}${vsAvg}%`} accent={Number(vsAvg) >= 0 ? C.green : C.red}
          sub={`Category avg $${Math.round(catAvgRev).toLocaleString()}`} deltaDir={Number(vsAvg) >= 0 ? 'up' : 'down'} />
      </div>

      {loadingDt ? <Loader /> : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
            <Card>
              <SectionHead title="Monthly revenue" sub="Revenue and units sold over time" />
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={monthly} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                  <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <YAxis yAxisId="rev" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                  <YAxis yAxisId="units" orientation="right" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                  <Tooltip content={<Tip />} />
                  <Bar yAxisId="rev" dataKey="revenue" name="Revenue ($)" fill={C.blue} fillOpacity={0.85} radius={[3, 3, 0, 0]} />
                  <Bar yAxisId="units" dataKey="units" name="Units" fill={C.green} fillOpacity={0.6} radius={[3, 3, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>

            <Card>
              <SectionHead title="Performance summary" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  { label: 'Overall rank', value: `#${rank} / ${allProducts.length}`, color: rank <= 5 ? C.green : rank > allProducts.length - 5 ? C.red : C.blue },
                  { label: 'Category', value: product.category, color: C.text },
                  { label: 'Category rank', value: `#${catProds.findIndex(p => p.productname === product.productname) + 1} / ${catProds.length}`, color: C.blue },
                  { label: 'Revenue share', value: `${((Number(product.revenue) / totalRev) * 100).toFixed(2)}%`, color: C.cyan },
                  { label: 'Avg order value', value: `$${revPerUnit}`, color: C.text },
                  { label: 'Total transactions', value: Number(product.units).toLocaleString(), color: C.text },
                ].map((r, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10, borderBottom: `1px solid ${C.border}25` }}>
                    <span style={{ fontSize: 12, color: C.textSub }}>{r.label}</span>
                    <span style={{ fontSize: 13, fontFamily: 'IBM Plex Mono,monospace', color: r.color, fontWeight: 500 }}>{r.value}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>

          <Card>
            <SectionHead title="Top buyers" sub="Customers who spent the most on this product" />
            {buyers.length === 0
              ? <p style={{ color: C.textMut, fontSize: 13, padding: '20px 0', textAlign: 'center' }}>No transaction data found for this product.</p>
              : <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead><tr>{['Rank', 'Customer', 'Orders', 'Total spent', 'Avg per order'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
                <tbody>
                  {buyers.map((b, i) => (
                    <tr key={i}>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut, width: 30 }}>#{i + 1}</td>
                      <td style={{ ...td, color: C.text, fontWeight: 500 }}>{b.name || `Customer #${b.id}`}</td>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textSub }}>{b.orders}</td>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.green }}>${b.spent.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                      <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textSub }}>${(b.spent / b.orders).toFixed(0)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            }
          </Card>
        </>
      )}
    </div>
  )
}

// Products
function Products() {
  const C = useColors()
  const [products, setProducts] = useState([])
  const [catData, setCatData] = useState([])
  const [loading, setLoading] = useState(true)
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState(null)
  const [showDrop, setShowDrop] = useState(false)

  useEffect(() => {
    async function load() {
      const [perfRes, prodRes] = await Promise.all([
        supabase.rpc('product_performance'),
        supabase.from('products').select('productid,productname,category,price'),
      ])
      if (perfRes.data && prodRes.data) {
        const withId = perfRes.data.map(p => {
          const match = prodRes.data.find(r => r.productname === p.productname)
          return { ...p, productid: match?.productid, price: match?.price }
        }).sort((a, b) => b.revenue - a.revenue)
        setProducts(withId)
        const cats = {}
        withId.forEach(p => {
          if (!cats[p.category]) cats[p.category] = { revenue: 0, units: 0 }
          cats[p.category].revenue += Number(p.revenue)
          cats[p.category].units += Number(p.units)
        })
        setCatData(Object.entries(cats).map(([name, v]) => ({ name, revenue: Math.round(v.revenue), units: v.units })).sort((a, b) => b.revenue - a.revenue))
      }
      setLoading(false)
    }
    load()
  }, [])

  const filtered = useMemo(() =>
    query.trim().length < 1 ? [] :
      products.filter(p => p.productname?.toLowerCase().includes(query.toLowerCase()) || p.category?.toLowerCase().includes(query.toLowerCase()))
    , [query, products])

  if (loading) return <Loader />
  if (selected) return <ProductDetail product={selected} allProducts={products} onBack={() => setSelected(null)} />

  const top5 = products.slice(0, 5)
  const bottom5 = [...products].slice(-5).reverse()
  const CAT_COLORS = [C.blue, C.green, C.purple, C.cyan, C.amber, C.red]
  const th = { padding: '7px 0', fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: `1px solid ${C.border}` }
  const td = { padding: '10px 0', borderBottom: `1px solid ${C.border}30`, fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      <Card style={{ padding: '14px 18px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke={C.textMut} strokeWidth="2" style={{ flexShrink: 0 }}>
            <circle cx="11" cy="11" r="8" /><path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={query} onChange={e => { setQuery(e.target.value); setShowDrop(true) }}
            onFocus={() => setShowDrop(true)} onBlur={() => setTimeout(() => setShowDrop(false), 150)}
            placeholder="Search any product by name or category…"
            style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: C.text, fontSize: 14, fontFamily: 'IBM Plex Sans,sans-serif' }}
          />
          {query && (
            <button onClick={() => setQuery('')} style={{ color: C.textMut, fontSize: 18, lineHeight: 1, padding: '0 4px' }}>×</button>
          )}
        </div>
        {showDrop && filtered.length > 0 && (
          <div style={{ marginTop: 10, borderTop: `1px solid ${C.border}`, paddingTop: 10, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {filtered.slice(0, 8).map((p, i) => (
              <button key={i} onMouseDown={() => setSelected(p)}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '8px 10px', borderRadius: 7, background: 'transparent', color: C.text, fontSize: 13, textAlign: 'left', cursor: 'pointer', border: 'none' }}
                onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 10, background: `${C.blue}20`, color: C.blue, border: `1px solid ${C.blue}30`, borderRadius: 4, padding: '2px 6px', fontWeight: 600 }}>{p.category}</span>
                  {p.productname}
                </span>
                <span style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 12, color: C.green }}>${Number(p.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </button>
            ))}
            {filtered.length > 8 && (
              <p style={{ fontSize: 11, color: C.textMut, padding: '6px 10px' }}>+{filtered.length - 8} more — keep typing to narrow down</p>
            )}
          </div>
        )}
        {showDrop && query.trim().length > 0 && filtered.length === 0 && (
          <p style={{ marginTop: 10, paddingTop: 10, borderTop: `1px solid ${C.border}`, fontSize: 13, color: C.textMut }}>No products match "{query}"</p>
        )}
      </Card>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <Card>
          <SectionHead title="Revenue by product" sub="Top 5 and bottom 3 shown — click a product to drill down" />
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={top5.concat(bottom5.slice(0, 3))} layout="vertical" margin={{ left: 6, right: 40, top: 0, bottom: 0 }}
              onClick={e => { if (e?.activePayload?.[0]) { const n = e.activePayload[0].payload.productname; setSelected(products.find(p => p.productname === n)) } }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" horizontal={false} />
              <XAxis type="number" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
              <YAxis type="category" dataKey="productname" width={90} tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} cursor={{ fill: `${C.border}40` }} />
              <Bar dataKey="revenue" name="Revenue ($)" radius={[0, 4, 4, 0]} style={{ cursor: 'pointer' }}>
                {top5.concat(bottom5.slice(0, 3)).map((p, i) => (
                  <Cell key={i} fill={i < 5 ? C.blue : C.red} fillOpacity={i < 5 ? (1 - i * 0.12) : 0.6} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Revenue by category" sub="Share of total" />
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={catData} cx="50%" cy="50%" innerRadius={55} outerRadius={80} dataKey="revenue" paddingAngle={3}>
                {catData.map((_, i) => <Cell key={i} fill={CAT_COLORS[i % CAT_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<Tip />} />
              <Legend formatter={v => <span style={{ fontSize: 11, color: C.textSub }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ marginTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {catData.map((c, i) => {
              const total = catData.reduce((s, r) => s + r.revenue, 0)
              return (
                <div key={c.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: CAT_COLORS[i % CAT_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>{c.name}</span>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', color: C.text }}>{((c.revenue / total) * 100).toFixed(1)}%</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <Card>
          <SectionHead title="Top 5 performers" sub="Click any row to view full breakdown" right={<Badge color="green">Top</Badge>} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['#', 'Product', 'Category', 'Revenue', 'Units'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {top5.map((p, i) => (
                <tr key={i} style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(p)}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut, width: 24 }}>{i + 1}</td>
                  <td style={{ ...td, color: C.text, fontWeight: 500 }}>{p.productname}</td>
                  <td style={{ ...td, color: C.textSub, fontSize: 12 }}>{p.category}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.green }}>${Number(p.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textSub }}>{Number(p.units).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <SectionHead title="Underperformers" sub="Click any row to view full breakdown" right={<Badge color="red">Action needed</Badge>} />
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead><tr>{['Product', 'Category', 'Revenue', 'Units', 'Rev/unit'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {bottom5.map((p, i) => (
                <tr key={i} style={{ cursor: 'pointer' }}
                  onClick={() => setSelected(p)}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, color: C.text }}>{p.productname}</td>
                  <td style={{ ...td, color: C.textSub, fontSize: 12 }}>{p.category}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.red }}>${Number(p.revenue).toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textSub }}>{Number(p.units).toLocaleString()}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut, fontSize: 12 }}>
                    ${p.units > 0 ? (Number(p.revenue) / Number(p.units)).toFixed(0) : 0}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </div>
    </div>
  )
}

// Customers
function Customers() {
  const C = useColors()
  const [segments, setSegments] = useState([])
  const [ageData, setAgeData] = useState([])
  const [genderDat, setGenderDat] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const [segRes, custRes] = await Promise.all([
        supabase.rpc('segment_stats'),
        supabase.from('customers').select('age,gender'),
      ])
      if (segRes.data) setSegments(segRes.data)
      if (custRes.data) {
        const buckets = { '18–25': 0, '26–35': 0, '36–45': 0, '46–55': 0, '56–65': 0, '65+': 0 }
        const genders = {}
        custRes.data.forEach(c => {
          const a = Number(c.age)
          if (a <= 25) buckets['18–25']++
          else if (a <= 35) buckets['26–35']++
          else if (a <= 45) buckets['36–45']++
          else if (a <= 55) buckets['46–55']++
          else if (a <= 65) buckets['56–65']++
          else buckets['65+']++
          genders[c.gender] = (genders[c.gender] || 0) + 1
        })
        setAgeData(Object.entries(buckets).map(([name, count]) => ({ name, count })))
        setGenderDat(Object.entries(genders).map(([name, value]) => ({ name, value })))
      }
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <Loader />

  const SEG_COLORS = {
    'VIP Loyalists': C.purple,
    'High Value': C.green,
    'Regular Customers': C.blue,
    'At Risk': C.amber,
    'Low Value': C.textMut,
    'Dormant / No Purchases': C.red,
  }
  const GEN_COLORS = [C.blue, C.purple, C.cyan]
  const th = { padding: '7px 0', fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: `1px solid ${C.border}` }
  const td = { padding: '11px 0', borderBottom: `1px solid ${C.border}25`, fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 14 }}>
        {segments.map((s, i) => (
          <Card key={i}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 }}>
              <p style={{ fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.08em', fontWeight: 500 }}>{s.segmentlabel}</p>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: SEG_COLORS[s.segmentlabel] || C.blue, display: 'inline-block' }} />
            </div>
            <p style={{ fontFamily: 'IBM Plex Mono,monospace', fontSize: 28, fontWeight: 500, color: SEG_COLORS[s.segmentlabel] || C.blue, marginBottom: 10 }}>{parseInt(s.count).toLocaleString()}</p>
            <div style={{ display: 'flex', gap: 16 }}>
              <div>
                <p style={{ fontSize: 10, color: C.textMut, marginBottom: 2 }}>Avg spend</p>
                <p style={{ fontSize: 13, fontFamily: 'IBM Plex Mono,monospace', color: C.text }}>${Number(s.avg_spend).toFixed(0)}</p>
              </div>
              <div>
                <p style={{ fontSize: 10, color: C.textMut, marginBottom: 2 }}>Avg freq.</p>
                <p style={{ fontSize: 13, fontFamily: 'IBM Plex Mono,monospace', color: C.text }}>{Number(s.avg_frequency).toFixed(1)}×</p>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '3fr 2fr', gap: 16 }}>
        <Card>
          <SectionHead title="Age distribution" sub="Customer count by age group" />
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ageData} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
              <CartesianGrid stroke={C.border} strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey="name" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
              <Tooltip content={<Tip />} />
              <Bar dataKey="count" name="Customers" radius={[4, 4, 0, 0]}>
                {ageData.map((_, i) => <Cell key={i} fill={C.blue} fillOpacity={0.55 + i * 0.07} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <SectionHead title="Gender split" />
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={genderDat} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {genderDat.map((_, i) => <Cell key={i} fill={GEN_COLORS[i % GEN_COLORS.length]} />)}
              </Pie>
              <Tooltip content={<Tip />} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
            {genderDat.map((g, i) => {
              const total = genderDat.reduce((s, r) => s + r.value, 0)
              return (
                <div key={g.name} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: GEN_COLORS[i % GEN_COLORS.length], flexShrink: 0 }} />
                  <span style={{ flex: 1, fontSize: 12, color: C.textSub }}>{g.name}</span>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', color: C.text }}>{((g.value / total) * 100).toFixed(1)}%</span>
                  <span style={{ fontSize: 12, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut }}>{g.value.toLocaleString()}</span>
                </div>
              )
            })}
          </div>
        </Card>
      </div>

      <Card>
        <SectionHead title="Segment detail comparison" sub="Full breakdown across all customer tiers" />
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead><tr>{['Segment', 'Customers', 'Avg spend', 'Avg freq.', 'Est. total value', 'Share of base'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
          <tbody>
            {segments.map((s, i) => {
              const totalCust = segments.reduce((sum, r) => sum + parseInt(r.count), 0)
              const estValue = parseInt(s.count) * Number(s.avg_spend)
              return (
                <tr key={i}>
                  <td style={{ ...td }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ width: 9, height: 9, borderRadius: '50%', background: SEG_COLORS[s.segmentlabel] || C.blue }} />
                      <span style={{ fontWeight: 500, color: C.text }}>{s.segmentlabel}</span>
                    </div>
                  </td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace' }}>{parseInt(s.count).toLocaleString()}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.green }}>${Number(s.avg_spend).toFixed(2)}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace' }}>{Number(s.avg_frequency).toFixed(2)}×</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.blue }}>${estValue.toLocaleString(undefined, { maximumFractionDigits: 0 })}</td>
                  <td style={{ ...td }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ flex: 1, height: 5, background: C.surface3, borderRadius: 3, overflow: 'hidden', minWidth: 60 }}>
                        <div style={{ width: `${(parseInt(s.count) / totalCust * 100)}%`, height: '100%', background: SEG_COLORS[s.segmentlabel] || C.blue, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: C.textSub, width: 36 }}>
                        {((parseInt(s.count) / totalCust) * 100).toFixed(1)}%
                      </span>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

// Churn
function Churn() {
  const C = useColors()
  const [customers, setCustomers] = useState([])
  const [loading, setLoading] = useState(true)
  const [sort, setSort] = useState('recency')
  const [filter, setFilter] = useState('all')

  useEffect(() => {
    async function load() {
      const { data } = await supabase.rpc('churn_risk_customers')
      if (data) setCustomers(data)
      setLoading(false)
    }
    load()
  }, [])

  const riskScore = (c) => {
    const r = Math.min(c.recencyofpurchase / 365, 1) * 50
    const f = Math.max(0, (7 - c.purchasefrequency) / 7) * 30
    const s = c.averagespending > 1000 ? 20 : c.averagespending > 500 ? 10 : 0
    return Math.round(r + f + s)
  }

  const riskLabel = (score) =>
    score >= 75 ? { label: 'Critical', color: C.red } :
      score >= 50 ? { label: 'High', color: C.amber } :
        { label: 'Medium', color: C.blue }

  const sorted = useMemo(() => {
    let list = [...customers].map(c => ({ ...c, score: riskScore(c) }))
    if (filter !== 'all') list = list.filter(c => riskLabel(c.score).label.toLowerCase() === filter)
    return list.sort((a, b) =>
      sort === 'recency' ? b.recencyofpurchase - a.recencyofpurchase :
        sort === 'score' ? b.score - a.score :
          sort === 'spend' ? b.averagespending - a.averagespending : 0
    )
  }, [customers, sort, filter])

  if (loading) return <Loader />

  const all = customers.map(c => ({ ...c, score: riskScore(c) }))
  const critCount = all.filter(c => riskLabel(c.score).label === 'Critical').length
  const highCount = all.filter(c => riskLabel(c.score).label === 'High').length
  const medCount = all.filter(c => riskLabel(c.score).label === 'Medium').length
  const avgDays = Math.round(customers.reduce((s, c) => s + c.recencyofpurchase, 0) / customers.length || 0)

  const btnStyle = (active) => ({
    padding: '5px 12px', borderRadius: 6, fontSize: 12, fontWeight: 500,
    background: active ? C.blue : C.surface3,
    color: active ? '#fff' : C.textSub,
    cursor: 'pointer', border: `1px solid ${active ? C.blue : C.border}`,
  })

  const th = { padding: '7px 0', fontSize: 10, color: C.textSub, textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 600, borderBottom: `1px solid ${C.border}` }
  const td = { padding: '11px 0', borderBottom: `1px solid ${C.border}20`, fontSize: 13 }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
        <Kpi label="Total at-risk" value={customers.length} sub="customers flagged" accent={C.amber} />
        <Kpi label="Critical risk" value={critCount} sub="score ≥ 75" accent={C.red} />
        <Kpi label="High risk" value={highCount} sub="score 50–74" accent={C.amber} />
        <Kpi label="Avg days inactive" value={`${avgDays}d`} sub="across at-risk group" accent={C.textSub} />
      </div>

      <Card>
        <SectionHead
          title="At-risk customer list"
          sub="Customers inactive 180+ days with 2+ past purchases"
          right={
            <div style={{ display: 'flex', gap: 6 }}>
              {['all', 'critical', 'high', 'medium'].map(f => (
                <button key={f} style={btnStyle(filter === f)} onClick={() => setFilter(f)}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
            </div>
          }
        />

        <div style={{ display: 'flex', gap: 8, marginBottom: 16, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.textSub, marginRight: 4 }}>Sort by:</span>
          {[['recency', 'Days inactive'], ['score', 'Risk score'], ['spend', 'Avg spend']].map(([k, label]) => (
            <button key={k} style={btnStyle(sort === k)} onClick={() => setSort(k)}>{label}</button>
          ))}
          <span style={{ fontSize: 11, color: C.textMut, marginLeft: 'auto', fontFamily: 'IBM Plex Mono,monospace' }}>{sorted.length} customers shown</span>
        </div>

        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>{['Customer', 'ID', 'Segment', 'Days inactive', 'Purchases', 'Avg spend', 'Risk score', 'Level'].map(h => <th key={h} style={th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {sorted.slice(0, 50).map((c, i) => {
              const risk = riskLabel(c.score)
              return (
                <tr key={i} style={{ transition: 'background 0.1s' }}
                  onMouseEnter={e => e.currentTarget.style.background = C.surface2}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                  <td style={{ ...td, fontWeight: 500, color: C.text }}>{c.firstname} {c.lastname}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut, fontSize: 11 }}>#{c.customerid}</td>
                  <td style={{ ...td, fontSize: 12, color: C.textSub }}>{c.segmentlabel}</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: c.recencyofpurchase > 300 ? C.red : C.amber }}>
                    {c.recencyofpurchase}d
                  </td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace' }}>{c.purchasefrequency}×</td>
                  <td style={{ ...td, fontFamily: 'IBM Plex Mono,monospace', color: C.text }}>${Number(c.averagespending).toFixed(0)}</td>
                  <td style={{ ...td }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <div style={{ width: 48, height: 5, background: C.surface3, borderRadius: 3, overflow: 'hidden' }}>
                        <div style={{ width: `${c.score}%`, height: '100%', background: risk.color, borderRadius: 3 }} />
                      </div>
                      <span style={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: risk.color }}>{c.score}</span>
                    </div>
                  </td>
                  <td style={{ ...td }}>
                    <span style={{ fontSize: 10, fontWeight: 600, background: `${risk.color}20`, color: risk.color, border: `1px solid ${risk.color}40`, borderRadius: 5, padding: '2px 7px' }}>
                      {risk.label}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {sorted.length > 50 && (
          <p style={{ fontSize: 12, color: C.textMut, textAlign: 'center', marginTop: 14 }}>
            Showing top 50 of {sorted.length} — filter to narrow down
          </p>
        )}
      </Card>
    </div>
  )
}

// Login
function Login() {
  const C = useColors()
  const { dark, toggle } = useTheme()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e) => {
    e.preventDefault(); setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false) }
  }

  const inp = { width: '100%', background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 8, padding: '10px 14px', color: C.text, fontSize: 14, outline: 'none' }
  const lbl = { display: 'block', marginBottom: 6, fontSize: 10, color: C.textSub, letterSpacing: '0.08em', textTransform: 'uppercase', fontWeight: 500 }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: C.bg }}>
      <button onClick={toggle} style={{ position: 'absolute', top: 20, right: 20, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, padding: '6px 12px', color: C.textSub, fontSize: 12 }}>
        {dark ? '☀ Light' : '◑ Dark'}
      </button>
      <div style={{ width: 380, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 16, padding: 44 }}>
        <div style={{ textAlign: 'center', marginBottom: 36 }}>
          <div style={{ width: 48, height: 48, background: C.blue, borderRadius: 12, margin: '0 auto 20px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1" fill="white" />
            </svg>
          </div>
          <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: C.text, marginBottom: 6, letterSpacing: '-0.02em' }}>DataMT Admin</h1>
          <p style={{ color: C.textSub, fontSize: 13 }}>Sign in to your dashboard</p>
        </div>
        <form onSubmit={handleLogin}>
          <div style={{ marginBottom: 16 }}>
            <label style={lbl}>Email address</label>
            <input type="email" value={email} onChange={e => setEmail(e.target.value)} required style={inp} placeholder="you@example.com" />
          </div>
          <div style={{ marginBottom: 24 }}>
            <label style={lbl}>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} required style={inp} placeholder="••••••••" />
          </div>
          {error && <p style={{ color: C.red, fontSize: 13, marginBottom: 16, padding: '8px 12px', background: `${C.red}15`, borderRadius: 6, border: `1px solid ${C.red}30` }}>{error}</p>}
          <button type="submit" disabled={loading}
            style={{ width: '100%', background: C.blue, color: '#fff', borderRadius: 8, padding: '11px 20px', fontWeight: 600, fontSize: 14, opacity: loading ? 0.7 : 1, cursor: loading ? 'default' : 'pointer' }}>
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>
    </div>
  )
}

// Sidebar
const NAV = [
  { id: 'overview', label: 'Overview', icon: 'M3 3h7v7H3zm11 0h7v7h-7zM3 14h7v7H3zm11 4h2v-2h-2zm0-4h2v2h-2zm4 0h-2v2h2zm0 4h-2v-2h2zM14 18h2v2h-2z' },
  { id: 'products', label: 'Products', icon: 'M20 7H4a1 1 0 00-1 1v11a1 1 0 001 1h16a1 1 0 001-1V8a1 1 0 00-1-1zM9 5V3h6v2H9z' },
  { id: 'customers', label: 'Customers', icon: 'M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zm14 10v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75' },
  { id: 'churn', label: 'Churn risk', icon: 'M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0zM12 9v4m0 4h.01', warn: true },
]

function Sidebar({ active, setActive, user, onLogout }) {
  const C = useColors()
  const { dark, toggle } = useTheme()
  return (
    <div style={{ width: 230, minHeight: '100vh', background: C.surface, borderRight: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', padding: '0', flexShrink: 0 }}>
      <div style={{ padding: '24px 20px 20px', borderBottom: `1px solid ${C.border}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 0 }}>
          <div style={{ width: 32, height: 32, background: C.blue, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
              <rect x="3" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="14" y="3" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="3" y="14" width="7" height="7" rx="1" stroke="white" strokeWidth="1.5" />
              <rect x="14" y="14" width="7" height="7" rx="1" fill="white" />
            </svg>
          </div>
          <div>
            <p style={{ fontFamily: 'Syne,sans-serif', fontSize: 15, fontWeight: 800, color: C.text, letterSpacing: '-0.01em', lineHeight: 1 }}>DataMT</p>
            <p style={{ fontSize: 10, color: C.textMut, marginTop: 2 }}>Admin Portal</p>
          </div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: '12px 10px' }}>
        <p style={{ fontSize: 9, color: C.textMut, textTransform: 'uppercase', letterSpacing: '0.1em', padding: '6px 10px 8px', fontWeight: 600 }}>Navigation</p>
        {NAV.map(n => {
          const isActive = active === n.id
          return (
            <button key={n.id} onClick={() => setActive(n.id)}
              style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, background: isActive ? C.surface2 : 'transparent', color: isActive ? C.text : C.textSub, fontWeight: isActive ? 500 : 400, fontSize: 13, marginBottom: 1, transition: 'all 0.1s', border: `1px solid ${isActive ? C.borderMd : 'transparent'}` }}>
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: isActive ? 1 : 0.7 }}>
                <path d={n.icon} />
              </svg>
              <span style={{ flex: 1, textAlign: 'left' }}>{n.label}</span>
              {n.warn && <span style={{ width: 7, height: 7, borderRadius: '50%', background: C.amber, flexShrink: 0 }} />}
            </button>
          )
        })}
      </nav>

      <div style={{ padding: '12px 10px', borderTop: `1px solid ${C.border}` }}>
        <button onClick={toggle} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, background: C.surface2, color: C.textSub, fontSize: 12, border: `1px solid ${C.border}`, marginBottom: 8 }}>
          <span style={{ fontSize: 14 }}>{dark ? '☀' : '◑'}</span>
          {dark ? 'Light mode' : 'Dark mode'}
        </button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', marginBottom: 6 }}>
          <div style={{ width: 28, height: 28, borderRadius: '50%', background: C.blue, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#fff', fontWeight: 600, flexShrink: 0 }}>
            {user?.email?.[0]?.toUpperCase()}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <p style={{ fontSize: 11, color: C.text, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{user?.email?.split('@')[0]}</p>
            <p style={{ fontSize: 10, color: C.textMut }}>Administrator</p>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '7px 10px', borderRadius: 8, color: C.textSub, fontSize: 12 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" /><polyline points="16 17 21 12 16 7" /><line x1="21" y1="12" x2="9" y2="12" /></svg>
          Sign out
        </button>
      </div>
    </div>
  )
}

// Main
const PAGE_TITLES = {
  overview: { title: 'Overview', sub: 'All key metrics at a glance' },
  products: { title: 'Product performance', sub: 'Sales, revenue, and underperformers' },
  customers: { title: 'Customer statistics', sub: 'Demographics and segment breakdown' },
  churn: { title: 'Churn risk', sub: 'Customers at risk of leaving — sorted by risk score' },
}

function Shell() {
  const C = useColors()
  const [session, setSession] = useState(null)
  const [tab, setTab] = useState('overview')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => { setSession(session); setLoading(false) })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setSession(s))
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return null
  if (!session) return <Login />

  const pg = PAGE_TITLES[tab]

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: C.bg }}>
      <Sidebar active={tab} setActive={setTab} user={session.user} onLogout={() => supabase.auth.signOut()} />
      <main style={{ flex: 1, padding: 28, overflowY: 'auto', minWidth: 0 }}>
        <div style={{ marginBottom: 24, paddingBottom: 20, borderBottom: `1px solid ${C.border}` }}>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            <div>
              <h1 style={{ fontFamily: 'Syne,sans-serif', fontSize: 24, fontWeight: 800, color: C.text, letterSpacing: '-0.02em', marginBottom: 4 }}>{pg.title}</h1>
              <p style={{ fontSize: 12, color: C.textSub }}>{pg.sub}</p>
            </div>
            <p style={{ fontSize: 11, fontFamily: 'IBM Plex Mono,monospace', color: C.textMut }}>
              {new Date().toLocaleDateString('en-US', { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}
            </p>
          </div>
        </div>
        {tab === 'overview' && <Overview />}
        {tab === 'products' && <Products />}
        {tab === 'customers' && <Customers />}
        {tab === 'churn' && <Churn />}
      </main>
    </div>
  )
}

export default function App() {
  return <ThemeProvider><Shell /></ThemeProvider>
}
