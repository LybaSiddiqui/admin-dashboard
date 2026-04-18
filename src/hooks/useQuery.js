import { useState, useEffect, useCallback } from 'react'
import { runSQL, supabase } from '../supabaseClient'

export function useQuery(sql, deps = []) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    const fetch = useCallback(async () => {
        if (!sql) return
        setLoading(true); setError(null)
        try {
            const rows = await runSQL(sql)
            setData(rows)
        } catch (e) {
            setError(e.message)
        } finally {
            setLoading(false)
        }
    }, [sql])

    useEffect(() => { fetch() }, [fetch, ...deps])
    return { data, loading, error, refetch: fetch }
}

export function useTable(table, select = '*', opts = {}) {
    const [data, setData] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        let q = supabase.from(table).select(select)
        if (opts.order) q = q.order(opts.order, { ascending: opts.asc ?? false })
        if (opts.limit) q = q.limit(opts.limit)
        if (opts.filter) opts.filter(q)
        q.then(({ data, error }) => {
            if (error) setError(error.message)
            else setData(data || [])
            setLoading(false)
        })
    }, [table])

    return { data, loading, error }
}