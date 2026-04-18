import { useState, useEffect } from 'react'
import {
    AreaChart, Area, BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
    CartesianGrid, PieChart, Pie, Cell, Legend
} from 'recharts'
import { C, card, CHART_PALETTE, SEG_COLORS } from '../theme.js'
import { KpiCard, Card, Grid, Stack, SectionTitle, QueryBadge, Loader, StatRow } from '../components/UI.jsx'
import { runSQL } from '../supabaseClient.js'

const TT = { contentStyle: { background: '#10141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, padding: '8px 12px' }, labelStyle: { color: C.textSub, marginBottom: 4 }, itemStyle: { color: C.text } }

export default function Overview() {
    const [kpis, setKpis] = useState(null)
    const [monthly, setMonthly] = useState([])
    const [segs, setSegs] = useState([])
    const [catRev, setCatRev] = useState([])
    const [newCust, setNewCust] = useState([])

    useEffect(() => {
        Promise.all([
            runSQL('SELECT COUNT(*) AS v FROM customers'),
            runSQL('SELECT SUM(totalamount) AS v FROM transactions'),
            runSQL('SELECT COUNT(*) AS v FROM behavioral_metrics WHERE recencyofpurchase>180 AND purchasefrequency>=2'),
            runSQL("SELECT COUNT(*) AS v FROM segmentation_results WHERE segmentlabel IN ('High Value','VIP Loyalists')"),
            runSQL("SELECT TO_CHAR(transactiondate,'YYYY-MM') AS month, SUM(totalamount) AS revenue, COUNT(DISTINCT customerid) AS customers FROM transactions GROUP BY month ORDER BY month"),
            runSQL('SELECT segmentlabel, COUNT(*) AS cnt FROM segmentation_results GROUP BY segmentlabel ORDER BY cnt DESC'),
            runSQL("SELECT p.category, SUM(t.totalamount) AS revenue FROM transactions t JOIN products p ON t.productid=p.productid GROUP BY p.category ORDER BY revenue DESC"),
            runSQL("SELECT TO_CHAR(registrationdate,'YYYY-MM') AS month, COUNT(*) AS cnt FROM customers GROUP BY month ORDER BY month"),
        ]).then(([tc, tr, cc, hv, mo, sg, cr, nc]) => {
            const total = Number(tc[0]?.v || 0), rev = Number(tr[0]?.v || 0), churn = Number(cc[0]?.v || 0)
            setKpis({ total, rev, churn, hv: Number(hv[0]?.v || 0), ret: total ? Math.round((total - churn) / total * 1000) / 10 : 0 })
            setMonthly(mo.map(r => ({ ...r, revenue: Math.round(Number(r.revenue)) })))
            setSegs(sg.map(r => ({ name: r.segmentlabel, value: Number(r.cnt) })))
            setCatRev(cr.map(r => ({ name: r.category, revenue: Math.round(Number(r.revenue)) })))
            setNewCust(nc.map(r => ({ ...r, cnt: Number(r.cnt) })))
        })
    }, [])

    if (!kpis) return <Loader h={400} />

    return (
        <Stack gap={20}>
            {/* KPIs */}
            <Grid cols={5} gap={14}>
                <KpiCard label="Total customers" value={kpis.total.toLocaleString()} accent="var(--accent)" delta={`${kpis.total.toLocaleString()} registered`} />
                <KpiCard label="Total revenue" value={`$${(kpis.rev / 1000).toFixed(1)}k`} accent="var(--green)" delta={`$${(kpis.rev / kpis.total).toFixed(0)}/customer`} dir="up" />
                <KpiCard label="Churn risk" value={kpis.churn.toLocaleString()} accent="var(--amber)" sub="inactive 180+ days" dir="down" delta={`${(kpis.churn / kpis.total * 100).toFixed(1)}% of base`} />
                <KpiCard label="High-value" value={kpis.hv.toLocaleString()} accent="var(--purple)" sub="VIP + High Value" />
                <KpiCard label="Retention rate" value={`${kpis.ret}%`} accent={kpis.ret > 80 ? 'var(--green)' : 'var(--amber)'} sub="non-churned" />
            </Grid>

            {/* Revenue trend + Segments */}
            <Grid cols="3fr 2fr" gap={16} style={{ gridTemplateColumns: '3fr 2fr' }}>
                <Card>
                    <SectionTitle sub="Aggregated monthly from all transactions">Monthly revenue trend</SectionTitle>
                    <QueryBadge>SUM(totalamount) GROUP BY TO_CHAR(transactiondate,'YYYY-MM')</QueryBadge>
                    <ResponsiveContainer width="100%" height={230}>
                        <AreaChart data={monthly} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <defs>
                                <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#4f7fff" stopOpacity={0.3} />
                                    <stop offset="95%" stopColor="#4f7fff" stopOpacity={0} />
                                </linearGradient>
                            </defs>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                            <Area type="monotone" dataKey="revenue" stroke="#4f7fff" strokeWidth={2} fill="url(#rg)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <SectionTitle sub="Current segment distribution">Customer segments</SectionTitle>
                    <QueryBadge>COUNT(*) GROUP BY segmentlabel</QueryBadge>
                    <ResponsiveContainer width="100%" height={160}>
                        <PieChart>
                            <Pie data={segs} cx="50%" cy="50%" innerRadius={48} outerRadius={70} dataKey="value" paddingAngle={2}>
                                {segs.map((_, i) => <Cell key={i} fill={Object.values(SEG_COLORS)[i] || CHART_PALETTE[i]} />)}
                            </Pie>
                            <Tooltip {...TT} />
                        </PieChart>
                    </ResponsiveContainer>
                    <Stack gap={0}>
                        {segs.map((s, i) => (
                            <StatRow key={s.name} label={s.name} value={s.value.toLocaleString()} color={Object.values(SEG_COLORS)[i]} pct={s.value} total={segs.reduce((a, r) => a + r.value, 0)} />
                        ))}
                    </Stack>
                </Card>
            </Grid>

            {/* Category revenue + new customers */}
            <Grid cols={2} gap={16}>
                <Card>
                    <SectionTitle sub="Total revenue by product category">Category performance</SectionTitle>
                    <QueryBadge>JOIN products ON productid, SUM(totalamount) GROUP BY category</QueryBadge>
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={catRev} layout="vertical" margin={{ left: 0, right: 30, top: 0, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
                            <XAxis type="number" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <YAxis type="category" dataKey="name" tick={{ fill: C.textSub, fontSize: 11 }} axisLine={false} tickLine={false} width={76} />
                            <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`, 'Revenue']} />
                            <Bar dataKey="revenue" radius={[0, 4, 4, 0]}>
                                {catRev.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i]} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>

                <Card>
                    <SectionTitle sub="New registrations per month">Customer acquisition</SectionTitle>
                    <QueryBadge>COUNT(*) GROUP BY TO_CHAR(registrationdate,'YYYY-MM')</QueryBadge>
                    <ResponsiveContainer width="100%" height={210}>
                        <BarChart data={newCust} margin={{ left: 0, right: 8, top: 4, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <Tooltip {...TT} />
                            <Bar dataKey="cnt" name="New customers" radius={[3, 3, 0, 0]}>
                                {newCust.map((_, i) => <Cell key={i} fill={`rgba(34,197,94,${0.4 + i / newCust.length * 0.6})`} />)}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </Card>
            </Grid>
        </Stack>
    )
}