import { useState, useEffect, useMemo } from 'react'
import {
    ScatterChart, Scatter, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
    LineChart, Line, ReferenceLine, BarChart, Bar, Cell
} from 'recharts'
import { C, SEG_COLORS, CHART_PALETTE } from '../theme.js'
import { Card, Stack, Grid, SectionTitle, MLBadge, QueryBadge, Loader, KpiCard, DataTable, SegmentPill } from '../components/UI.jsx'
import { runSQL } from '../supabaseClient.js'
import { linearRegression, detectAnomalies, computeRFM, exponentialSmoothing, computeAffinity, predictCLV, paretoAnalysis } from '../ml/algorithms.js'

const TT = { contentStyle: { background: '#10141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, fontSize: 12, padding: '8px 12px' }, labelStyle: { color: C.textSub }, itemStyle: { color: C.text } }

const ML_TABS = [
    { id: 'rfm', label: 'RFM Analysis', desc: 'Customer scoring across 3 dimensions' },
    { id: 'forecast', label: 'Revenue Forecast', desc: 'Linear regression + exponential smoothing' },
    { id: 'anomaly', label: 'Anomaly Detection', desc: 'Z-score based outlier identification' },
    { id: 'affinity', label: 'Product Affinity', desc: 'Co-purchase pattern analysis' },
    { id: 'pareto', label: 'Pareto / 80-20', desc: 'Revenue concentration analysis' },
    { id: 'clv', label: 'CLV Prediction', desc: '24-month lifetime value estimates' },
]

export default function MLInsights() {
    const [active, setActive] = useState('rfm')
    const [rfmData, setRfmData] = useState([])
    const [monthly, setMonthly] = useState([])
    const [anomTxns, setAnomTxns] = useState([])
    const [affinity, setAffinity] = useState([])
    const [topCusts, setTopCusts] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        Promise.all([
            runSQL(`SELECT c.customerid, c.firstname||' '||c.lastname AS name, s.segmentlabel, bm.purchasefrequency, bm.averagespending, bm.recencyofpurchase FROM behavioral_metrics bm JOIN customers c ON bm.customerid=c.customerid JOIN segmentation_results s ON bm.customerid=s.customerid WHERE bm.purchasefrequency>0 LIMIT 500`),
            runSQL(`SELECT TO_CHAR(transactiondate,'YYYY-MM') AS month, SUM(totalamount) AS revenue FROM transactions WHERE TO_CHAR(transactiondate,'YYYY-MM') < TO_CHAR(CURRENT_DATE,'YYYY-MM') GROUP BY month ORDER BY month`),
            runSQL(`SELECT t.transactionid, t.totalamount, t.transactiondate, t.customerid, p.category FROM transactions t JOIN products p ON t.productid=p.productid LIMIT 2000`),
            runSQL(`SELECT c.customerid, c.firstname||' '||c.lastname AS name, s.segmentlabel, SUM(t.totalamount) AS ltv, COUNT(t.transactionid) AS orders, ROUND(AVG(t.totalamount)::numeric,2) AS avg_order FROM transactions t JOIN customers c ON t.customerid=c.customerid JOIN segmentation_results s ON t.customerid=s.customerid GROUP BY c.customerid, c.firstname, c.lastname, s.segmentlabel ORDER BY ltv DESC LIMIT 3000`),
        ]).then(([bm, mo, txns, tc]) => {
            setRfmData(bm.map(r => ({ ...r, recencyofpurchase: Number(r.recencyofpurchase), purchasefrequency: Number(r.purchasefrequency), averagespending: Number(r.averagespending) })))
            setMonthly(mo.map(r => ({ month: r.month, revenue: Math.round(Number(r.revenue)) })))
            setAnomTxns(txns.map(r => ({ ...r, totalamount: Number(r.totalamount) })))
            setAffinity(computeAffinity(txns))
            setTopCusts(tc.map(r => ({ ...r, ltv: Number(r.ltv), orders: Number(r.orders), avg_order: Number(r.avg_order) })))
            setLoading(false)
        })
    }, [])

    const rfmScored = useMemo(() => rfmData.length ? computeRFM(rfmData) : [], [rfmData])

    const forecast = useMemo(() => {
        if (monthly.length < 3) return { chart: [], r2: 0, forecasts: [0, 0, 0] }
        const xs = monthly.map((_, i) => i)
        const ys = monthly.map(m => m.revenue)
        const reg = linearRegression(xs, ys)
        const { smoothed } = exponentialSmoothing(ys, 0.4, 0)
        const lastSmoothed = smoothed[smoothed.length - 1]
        const regForecasts = [1, 2, 3].map(i => {
            const regVal = reg.predict(monthly.length + i - 1)
            return Math.max(0, Math.round(regVal * 0.7 + lastSmoothed * 0.3))
        })
        const chart = [
            ...monthly.map((m, i) => ({
                month: m.month,
                actual: m.revenue,
                trend: Math.round(smoothed[i] ?? reg.predict(i)),
            })),
            ...['Next 1', 'Next 2', 'Next 3'].map((m, i) => ({
                month: m,
                forecast: regForecasts[i],
                trend: Math.round(reg.predict(monthly.length + i)),
            })),
        ]
        return { chart, r2: Math.round(reg.r2 * 100), forecasts: regForecasts }
    }, [monthly])

    const anomalies = useMemo(() => {
        if (!anomTxns.length) return []
        const amounts = anomTxns.map(t => t.totalamount)
        const scored = detectAnomalies(amounts, 2.5)
        return anomTxns.map((t, i) => ({ ...t, ...scored[i] })).filter(t => t.isAnomaly)
    }, [anomTxns])

    const pareto = useMemo(() => topCusts.length ? paretoAnalysis(topCusts, 'ltv') : [], [topCusts])

    const clvData = useMemo(() => rfmData.slice(0, 20).map(c => ({
        name: c.name?.split(' ')[0] || `#${c.customerid}`,
        clv: predictCLV(c.averagespending, c.purchasefrequency),
        segment: c.segmentlabel,
    })).sort((a, b) => b.clv - a.clv), [rfmData])

    if (loading) return <Loader h={400} />

    return (
        <Stack gap={20}>
            {/* tab selector */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 8 }}>
                {ML_TABS.map(t => (
                    <button key={t.id} onClick={() => setActive(t.id)}
                        style={{ padding: '10px 12px', borderRadius: 'var(--radius)', background: active === t.id ? 'var(--surface3)' : 'var(--surface)', border: `1px solid ${active === t.id ? 'rgba(79,127,255,0.35)' : 'var(--border)'}`, cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                        <p style={{ fontSize: 12, fontWeight: 600, color: active === t.id ? 'var(--accent-lt)' : C.text, marginBottom: 3 }}>{t.label}</p>
                        <p style={{ fontSize: 10, color: C.textMut, lineHeight: 1.4 }}>{t.desc}</p>
                    </button>
                ))}
            </div>

            {/* RFM */}
            {active === 'rfm' && (
                <Stack gap={16}>
                    <Card>
                        <SectionTitle sub="All customers plotted — X=spend, Y=frequency, color=segment">RFM scatter map</SectionTitle>
                        <MLBadge>NTILE(3) bucketing across Recency, Frequency, Monetary — composite score 3–9</MLBadge>
                        <QueryBadge>behavioral_metrics × customers × segmentation_results</QueryBadge>
                        <ResponsiveContainer width="100%" height={320}>
                            <ScatterChart margin={{ left: 0, right: 20, top: 10, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" />
                                <XAxis dataKey="averagespending" name="Avg Spend ($)" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${v}`} />
                                <YAxis dataKey="purchasefrequency" name="Frequency" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                <Tooltip {...TT} cursor={{ fill: 'transparent' }}
                                    content={({ payload }) => payload?.[0] ? (
                                        <div style={{ background: '#10141f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 8, padding: '10px 14px', fontSize: 12 }}>
                                            <p style={{ color: C.text, fontWeight: 600, marginBottom: 4 }}>{payload[0].payload.name}</p>
                                            <p style={{ color: C.textSub }}>{payload[0].payload.segmentlabel}</p>
                                            <p style={{ color: C.textSub }}>RFM: <b style={{ color: C.text }}>{payload[0].payload.rfmTotal}/9</b></p>
                                        </div>
                                    ) : null} />
                                {Object.entries(SEG_COLORS).map(([seg, color]) => (
                                    <Scatter key={seg} name={seg} data={rfmScored.filter(r => r.segmentlabel === seg)} fill={color} fillOpacity={0.75} />
                                ))}
                            </ScatterChart>
                        </ResponsiveContainer>
                        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap', marginTop: 12 }}>
                            {Object.entries(SEG_COLORS).map(([seg, color]) => (
                                <div key={seg} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
                                    <span style={{ fontSize: 11, color: C.textSub }}>{seg}</span>
                                </div>
                            ))}
                        </div>
                    </Card>
                    <Grid cols={2} gap={16}>
                        <Card>
                            <SectionTitle sub="Highest RFM composite scores">Top 10 by RFM</SectionTitle>
                            <DataTable columns={['Customer', 'Segment', 'RFM', 'R', 'F', 'M']}
                                rows={rfmScored.sort((a, b) => b.rfmTotal - a.rfmTotal).slice(0, 10).map(r => [r.name, <SegmentPill label={r.segmentlabel} />, <b style={{ color: C.green }}>{r.rfmTotal}/9</b>, r.rScore, r.fScore, r.mScore])} height={280} />
                        </Card>
                        <Card>
                            <SectionTitle sub="Lowest RFM — highest churn risk">Bottom 10 by RFM</SectionTitle>
                            <DataTable columns={['Customer', 'Segment', 'RFM', 'Recency', 'Freq', 'Spend']}
                                rows={rfmScored.sort((a, b) => a.rfmTotal - b.rfmTotal).slice(0, 10).map(r => [r.name, <SegmentPill label={r.segmentlabel} />, <b style={{ color: C.red }}>{r.rfmTotal}/9</b>, `${r.r}d`, `${r.f}×`, `$${r.m?.toFixed(0)}`])} height={280} />
                        </Card>
                    </Grid>
                </Stack>
            )}

            {/* FORECAST */}
            {active === 'forecast' && (
                <Card>
                    <SectionTitle sub={`Linear regression (R²=${forecast.r2}%) blended with last smoothed value — excludes current incomplete month`}>Revenue forecast</SectionTitle>
                    <MLBadge>Linear regression on complete months only · 70% regression trend + 30% last smoothed value</MLBadge>
                    <Grid cols={3} gap={14} style={{ marginBottom: 20 }}>
                        {(forecast.forecasts || [0, 0, 0]).map((val, i) => (
                            <KpiCard key={i} label={`Next ${i + 1}`} value={`$${(val / 1000).toFixed(1)}k`} sub="Forecasted revenue" accent="var(--cyan)" />
                        ))}
                    </Grid>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={forecast.chart} margin={{ left: 0, right: 30, top: 10, bottom: 0 }}>
                            <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="month" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                            <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`]} />
                            <ReferenceLine x="Next 1" stroke="rgba(255,255,255,0.1)" strokeDasharray="4 4" />
                            <Line type="monotone" dataKey="actual" stroke="#4f7fff" strokeWidth={2} dot={false} name="Actual" />
                            <Line type="monotone" dataKey="trend" stroke="rgba(255,255,255,0.15)" strokeWidth={1} dot={false} strokeDasharray="4 4" name="Trend" />
                            <Line type="monotone" dataKey="forecast" stroke="#22d3ee" strokeWidth={2} dot={{ fill: '#22d3ee', r: 4 }} name="Forecast" />
                        </LineChart>
                    </ResponsiveContainer>
                </Card>
            )}

            {/* ANOMALY */}
            {active === 'anomaly' && (
                <Stack gap={16}>
                    <Grid cols={3} gap={14}>
                        <KpiCard label="Anomalies found" value={anomalies.length} accent="var(--red)" sub="Z-score > 2.5σ" />
                        <KpiCard label="Anomaly rate" value={`${(anomalies.length / anomTxns.length * 100).toFixed(2)}%`} accent="var(--amber)" />
                        <KpiCard label="Highest Z-score" value={anomalies.length ? `${Math.max(...anomalies.map(a => a.zScore)).toFixed(2)}σ` : '—'} accent="var(--red)" />
                    </Grid>
                    <Card>
                        <SectionTitle sub="Transactions more than 2.5 standard deviations from the mean amount">Flagged transactions</SectionTitle>
                        <MLBadge>Z-Score: |x − μ| / σ — values with |z| &gt; 2.5 flagged as anomalies</MLBadge>
                        <QueryBadge>transactions JOIN products — all amounts analyzed client-side</QueryBadge>
                        {anomalies.length > 0
                            ? <DataTable columns={['Tx ID', 'Amount', 'Z-Score', 'Category', 'Date', 'Customer ID']}
                                rows={anomalies.sort((a, b) => b.zScore - a.zScore).slice(0, 30).map(a => [a.transactionid, `$${Number(a.totalamount).toFixed(2)}`, <span style={{ color: C.red, fontFamily: 'var(--font-mono)', fontWeight: 600 }}>{a.zScore.toFixed(2)}σ</span>, a.category, String(a.transactiondate).slice(0, 10), a.customerid])} height={400} />
                            : <div style={{ textAlign: 'center', padding: '40px', color: C.textSub, fontSize: 13 }}>No anomalies detected at the 2.5σ threshold.</div>}
                    </Card>
                </Stack>
            )}

            {/* AFFINITY */}
            {active === 'affinity' && (
                <Card>
                    <SectionTitle sub="Which product categories are most often bought together by the same customer">Category co-purchase affinity</SectionTitle>
                    <MLBadge>Co-occurrence matrix — customers who bought from A also bought from B</MLBadge>
                    <QueryBadge>transactions GROUP BY customerid — category pairs extracted and counted</QueryBadge>
                    <Grid cols="3fr 2fr" gap={20} style={{ gridTemplateColumns: '3fr 2fr', marginTop: 8 }}>
                        <ResponsiveContainer width="100%" height={320}>
                            <BarChart data={affinity} layout="vertical" margin={{ left: 20, right: 30 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" horizontal={false} />
                                <XAxis type="number" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis type="category" dataKey="pair" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} width={130} />
                                <Tooltip {...TT} />
                                <Bar dataKey="count" name="Co-purchases" radius={[0, 4, 4, 0]}>
                                    {affinity.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                        <Stack gap={12}>
                            <p style={{ fontSize: 13, color: C.textSub, lineHeight: 1.7 }}>Category pairs ranked by co-purchase frequency — customers who buy from one category are most likely to also buy from the paired category. Use this to drive cross-sell campaigns.</p>
                            <DataTable columns={['Category Pair', 'Co-purchases']} rows={affinity.map(a => [a.pair, a.count])} height={220} />
                        </Stack>
                    </Grid>
                </Card>
            )}

            {/* PARETO */}
            {active === 'pareto' && (() => {
                // show curve up to the point where 90% is reached (or all if never reached)
                const at80 = pareto.find(p => p.cumulativePct >= 80)
                const at90 = pareto.find(p => p.cumulativePct >= 90)
                const cutoff = at90 ? at90.rank + 5 : pareto.length
                const chartData = pareto.slice(0, Math.min(cutoff, pareto.length))
                const pct80 = at80 ? Math.round((at80.rank / topCusts.length) * 100) : null
                return (
                    <Card>
                        <SectionTitle sub="Cumulative revenue contribution — what % of customers generate 80% of revenue?">Pareto / 80-20 analysis</SectionTitle>
                        <MLBadge>Pareto principle — sorted by LTV, cumulative % calculated from ranked list</MLBadge>
                        <QueryBadge>SUM(totalamount) GROUP BY customerid ORDER BY ltv DESC — cumulative %</QueryBadge>
                        <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={chartData} margin={{ left: 0, right: 50, top: 10, bottom: 16 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="rank" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false}
                                    label={{ value: 'Customer rank (sorted by lifetime value)', fill: C.textMut, fontSize: 10, position: 'insideBottom', offset: -8 }} />
                                <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false}
                                    tickFormatter={v => `${v}%`} domain={[0, 100]} />
                                <Tooltip {...TT} formatter={v => [`${Number(v).toFixed(1)}%`, 'Cumulative Revenue']} />
                                <ReferenceLine y={80} stroke={C.amber} strokeDasharray="5 3"
                                    label={{ value: '80% threshold', fill: C.amber, fontSize: 11, position: 'right' }} />
                                {at80 && <ReferenceLine x={at80.rank} stroke={C.amber} strokeDasharray="5 3"
                                    label={{ value: `Rank ${at80.rank}`, fill: C.amber, fontSize: 10, position: 'top' }} />}
                                <Line type="monotone" dataKey="cumulativePct" stroke="#4f7fff" strokeWidth={2.5} dot={false} name="Cumulative Revenue %" />
                            </LineChart>
                        </ResponsiveContainer>
                        <div style={{ marginTop: 16, padding: '12px 16px', background: 'rgba(245,158,11,0.08)', borderRadius: 'var(--radius-sm)', border: '1px solid rgba(245,158,11,0.2)' }}>
                            {pct80 != null ? (
                                <p style={{ fontSize: 13, color: C.text }}>
                                    <span style={{ color: C.amber, fontWeight: 600 }}>{pct80}% of customers</span>
                                    {' '}(top <span style={{ fontFamily: 'var(--font-mono)', color: C.accentLt }}>{at80.rank}</span> out of{' '}
                                    <span style={{ fontFamily: 'var(--font-mono)', color: C.accentLt }}>{topCusts.length}</span>) generate 80% of all revenue.
                                    {pct80 <= 25 ? ' Strong 80/20 concentration — a small group drives most revenue.' : ' Revenue is relatively evenly distributed across customers.'}
                                </p>
                            ) : (
                                <p style={{ fontSize: 13, color: C.textSub }}>Loading Pareto data — make sure customers have transaction history.</p>
                            )}
                        </div>
                    </Card>
                )
            })()}

            {/* CLV */}
            {active === 'clv' && (
                <Stack gap={16}>
                    <Card>
                        <SectionTitle sub="Predicted 24-month lifetime value based on current behavioral metrics">Customer lifetime value forecast</SectionTitle>
                        <MLBadge>CLV = AOV × (purchase frequency / 12 months) × 24-month horizon</MLBadge>
                        <QueryBadge>behavioral_metrics — averagespending × purchasefrequency</QueryBadge>
                        <ResponsiveContainer width="100%" height={260}>
                            <BarChart data={clvData} margin={{ left: 0, right: 30, top: 4, bottom: 0 }}>
                                <CartesianGrid stroke="rgba(255,255,255,0.05)" strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} />
                                <YAxis tick={{ fill: C.textSub, fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={v => `$${(v / 1000).toFixed(0)}k`} />
                                <Tooltip {...TT} formatter={v => [`$${Number(v).toLocaleString()}`, 'Predicted CLV (24mo)']} />
                                <Bar dataKey="clv" radius={[3, 3, 0, 0]}>
                                    {clvData.map((_, i) => <Cell key={i} fill={CHART_PALETTE[i % CHART_PALETTE.length]} />)}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </Card>
                    <Card>
                        <SectionTitle sub="Top 20 by predicted 24-month CLV">CLV detail table</SectionTitle>
                        <DataTable columns={['Customer', 'Segment', 'Predicted CLV (24mo)']}
                            rows={clvData.map(c => [c.name, <SegmentPill label={c.segment} />, `$${c.clv.toLocaleString()}`])} height={340} />
                    </Card>
                </Stack>
            )}
        </Stack>
    )
}