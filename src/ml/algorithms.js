// ─── K-Means Clustering ───────────────────────────────────────
export function kMeans(points, k = 3, maxIter = 100) {
    if (points.length < k) return { clusters: [], centroids: [] }
    let centroids = points.slice(0, k).map(p => ({ ...p }))

    const assign = () => points.map(p => {
        let minDist = Infinity, cluster = 0
        centroids.forEach((c, i) => {
            const d = Math.sqrt(
                Object.keys(p).filter(k => typeof p[k] === 'number').reduce((sum, key) => {
                    return sum + Math.pow((p[key] || 0) - (c[key] || 0), 2)
                }, 0)
            )
            if (d < minDist) { minDist = d; cluster = i }
        })
        return cluster
    })

    const updateCentroids = (assignments) => {
        const numKeys = Object.keys(points[0]).filter(k => typeof points[0][k] === 'number')
        return Array.from({ length: k }, (_, i) => {
            const members = points.filter((_, j) => assignments[j] === i)
            if (!members.length) return centroids[i]
            return Object.fromEntries(numKeys.map(key => [
                key, members.reduce((s, p) => s + (p[key] || 0), 0) / members.length
            ]))
        })
    }

    let assignments = assign()
    for (let iter = 0; iter < maxIter; iter++) {
        const newCentroids = updateCentroids(assignments)
        const newAssignments = assign()
        if (newAssignments.every((a, i) => a === assignments[i])) break
        centroids = newCentroids
        assignments = newAssignments
    }

    return { assignments, centroids }
}

// ─── Linear Regression ────────────────────────────────────────
export function linearRegression(xs, ys) {
    const n = xs.length
    if (n < 2) return { slope: 0, intercept: 0, r2: 0, predict: () => 0 }
    const meanX = xs.reduce((a, b) => a + b, 0) / n
    const meanY = ys.reduce((a, b) => a + b, 0) / n
    const ssXX = xs.reduce((s, x) => s + Math.pow(x - meanX, 2), 0)
    const ssXY = xs.reduce((s, x, i) => s + (x - meanX) * (ys[i] - meanY), 0)
    const slope = ssXX ? ssXY / ssXX : 0
    const intercept = meanY - slope * meanX
    const ssTot = ys.reduce((s, y) => s + Math.pow(y - meanY, 2), 0)
    const ssRes = ys.reduce((s, y, i) => s + Math.pow(y - (slope * xs[i] + intercept), 2), 0)
    const r2 = ssTot ? 1 - ssRes / ssTot : 0
    return { slope, intercept, r2, predict: (x) => slope * x + intercept }
}

// ─── Anomaly Detection (Z-Score) ─────────────────────────────
export function detectAnomalies(values, threshold = 2.5) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length
    const std = Math.sqrt(values.reduce((s, v) => s + Math.pow(v - mean, 2), 0) / values.length)
    return values.map(v => ({
        value: v,
        zScore: std ? Math.abs((v - mean) / std) : 0,
        isAnomaly: std ? Math.abs((v - mean) / std) > threshold : false,
    }))
}

// ─── RFM Scoring ──────────────────────────────────────────────
export function computeRFM(customers) {
    const scores = customers.map(c => ({
        ...c,
        r: Number(c.recencyofpurchase) || 0,
        f: Number(c.purchasefrequency) || 0,
        m: Number(c.averagespending) || 0,
    }))
    const ntile = (arr, key, n, desc = false) => {
        const sorted = [...arr].sort((a, b) => desc ? b[key] - a[key] : a[key] - b[key])
        return new Map(sorted.map((item, i) => [item, Math.ceil((i + 1) * n / sorted.length)]))
    }
    const rTile = ntile(scores, 'r', 3, false) // lower recency = better
    const fTile = ntile(scores, 'f', 3, true)
    const mTile = ntile(scores, 'm', 3, true)
    return scores.map(c => ({
        ...c,
        rScore: rTile.get(c) || 1,
        fScore: fTile.get(c) || 1,
        mScore: mTile.get(c) || 1,
        rfmTotal: (rTile.get(c) || 1) + (fTile.get(c) || 1) + (mTile.get(c) || 1),
    }))
}

// ─── Churn Probability (logistic-inspired scoring) ────────────
export function churnProbability(recency, frequency, avgSpend, maxRecency = 365) {
    const rNorm = Math.min(recency / maxRecency, 1)
    const fNorm = Math.max(0, 1 - frequency / 10)
    const mNorm = Math.max(0, 1 - avgSpend / 2500)
    const raw = 0.5 * rNorm + 0.3 * fNorm + 0.2 * mNorm
    return Math.round(Math.min(raw, 1) * 100)
}

// ─── Simple Exponential Smoothing (revenue forecast) ─────────
// Holt double exponential smoothing — carries trend so forecasts are not all flat
export function exponentialSmoothing(values, alpha = 0.3, periods = 3) {
    if (!values.length) return { smoothed: [], forecasts: [] }
    const beta = 0.2
    let level = values[0]
    let trend = values.length > 1 ? values[1] - values[0] : 0
    const smoothed = [level]
    for (let i = 1; i < values.length; i++) {
        const prevLevel = level
        level = alpha * values[i] + (1 - alpha) * (level + trend)
        trend = beta * (level - prevLevel) + (1 - beta) * trend
        smoothed.push(level)
    }
    const forecasts = []
    for (let i = 1; i <= periods; i++) {
        forecasts.push(Math.max(0, Math.round(level + i * trend)))
    }
    return { smoothed, forecasts }
}

// ─── Product Affinity (simplified co-purchase) ───────────────
export function computeAffinity(transactions) {
    // group by customer
    const byCustomer = {}
    transactions.forEach(t => {
        if (!byCustomer[t.customerid]) byCustomer[t.customerid] = new Set()
        byCustomer[t.customerid].add(t.category)
    })
    const pairs = {}
    Object.values(byCustomer).forEach(cats => {
        const arr = [...cats]
        for (let i = 0; i < arr.length; i++) {
            for (let j = i + 1; j < arr.length; j++) {
                const key = [arr[i], arr[j]].sort().join('→')
                pairs[key] = (pairs[key] || 0) + 1
            }
        }
    })
    return Object.entries(pairs)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([pair, count]) => ({ pair, count }))
}

// ─── Customer Lifetime Value Prediction ──────────────────────
export function predictCLV(avgOrderValue, purchaseFrequency, avgLifespanMonths = 24) {
    // Simple CLV = avg order value × purchase frequency per month × lifespan
    const monthlyFreq = purchaseFrequency / 12
    return Math.round(avgOrderValue * monthlyFreq * avgLifespanMonths)
}

// ─── Pareto Analysis (80/20 rule) ────────────────────────────
export function paretoAnalysis(items, valueKey) {
    const sorted = [...items].sort((a, b) => b[valueKey] - a[valueKey])
    const total = sorted.reduce((s, i) => s + i[valueKey], 0)
    let running = 0
    return sorted.map((item, idx) => {
        running += item[valueKey]
        return { ...item, cumulativePct: Math.round((running / total) * 100), rank: idx + 1 }
    })
}

// ─── Cohort Retention ────────────────────────────────────────
export function buildCohortMatrix(transactions) {
    const cohorts = {}
    transactions.forEach(t => {
        const month = t.transactiondate?.slice(0, 7)
        const cid = t.customerid
        if (!cohorts[cid]) cohorts[cid] = { first: month, months: new Set() }
        if (month < cohorts[cid].first) cohorts[cid].first = month
        cohorts[cid].months.add(month)
    })
    const cohortGroups = {}
    Object.values(cohorts).forEach(({ first, months }) => {
        if (!cohortGroups[first]) cohortGroups[first] = { customers: 0, retained: {} }
        cohortGroups[first].customers++
        months.forEach(m => {
            cohortGroups[first].retained[m] = (cohortGroups[first].retained[m] || 0) + 1
        })
    })
    return cohortGroups
}