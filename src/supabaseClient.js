import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: true, storageKey: 'dbmt-admin' }
})

export async function runSQL(sql) {
    const clean = sql.trim().replace(/;$/, '')
    const { data, error } = await supabase.rpc('exec_sql', { query: clean })
    if (error) throw new Error(error.message)
    return data || []
}