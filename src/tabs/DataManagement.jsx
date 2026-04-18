import { useState } from 'react'
import { C } from '../theme.js'
import { Card, Stack, Grid, SectionTitle, Input, Select, Btn, DataTable, Alert, Tabs } from '../components/UI.jsx'
import { supabase } from '../supabaseClient.js'
import { useTable } from '../hooks/useQuery.js'

export default function DataManagement() {
    const [activeTab, setActiveTab] = useState('product')
    const [toast, setToast] = useState(null)
    const [saving, setSaving] = useState(false)

    const [pName, setPName] = useState('')
    const [pCat, setPCat] = useState('Books')
    const [pPrice, setPPrice] = useState('')

    const [cFirst, setCFirst] = useState('')
    const [cLast, setCLast] = useState('')
    const [cEmail, setCEmail] = useState('')
    const [cPhone, setCPhone] = useState('')
    const [cAge, setCAge] = useState('')
    const [cGender, setCGender] = useState('Male')
    const [cDate, setCDate] = useState(new Date().toISOString().slice(0, 10))

    const [tCid, setTCid] = useState('')
    const [tPid, setTPid] = useState('')
    const [tQty, setTQty] = useState('1')
    const [tAmt, setTAmt] = useState('')
    const [tDate2, setTDate2] = useState(new Date().toISOString().slice(0, 10))

    const { data: recentProds, refetch: refP } = useTable('products', '*', { order: 'productid', asc: false, limit: 6 })
    const { data: recentCusts, refetch: refC } = useTable('customers', '*', { order: 'customerid', asc: false, limit: 6 })
    const { data: recentTxns, refetch: refT } = useTable('transactions', '*', { order: 'transactionid', asc: false, limit: 6 })

    const notify = (msg, type = 'success') => { setToast({ msg, type }); setTimeout(() => setToast(null), 4000) }

    async function addProduct(e) {
        e.preventDefault()
        if (!pName.trim()) return notify('Product name is required.', 'error')
        if (Number(pPrice) < 0) return notify('Price cannot be negative.', 'error')
        setSaving(true)
        const { error } = await supabase.from('products').insert({ productname: pName.trim(), category: pCat, price: Number(pPrice) })
        if (error) notify(`Insert failed: ${error.message}`, 'error')
        else { notify(`"${pName}" added successfully.`); setPName(''); setPPrice(''); refP() }
        setSaving(false)
    }

    async function addCustomer(e) {
        e.preventDefault()
        if (!cFirst.trim() || !cLast.trim()) return notify('First and last name required.', 'error')
        if (!cEmail.includes('@')) return notify('Valid email required.', 'error')
        if (Number(cAge) < 18) return notify('Age must be 18 or older.', 'error')
        setSaving(true)
        const { error } = await supabase.from('customers').insert({ firstname: cFirst.trim(), lastname: cLast.trim(), email: cEmail.trim().toLowerCase(), phone: cPhone.trim() || null, age: Number(cAge), gender: cGender, registrationdate: cDate })
        if (error) notify(`Insert failed: ${error.message}`, 'error')
        else { notify(`${cFirst} ${cLast} added.`); setCFirst(''); setCLast(''); setCEmail(''); setCPhone(''); setCAge(''); refC() }
        setSaving(false)
    }

    async function addTransaction(e) {
        e.preventDefault()
        if (!tCid || !tPid || !tAmt) return notify('Customer ID, Product ID and amount required.', 'error')
        setSaving(true)
        const { error } = await supabase.from('transactions').insert({ customerid: Number(tCid), productid: Number(tPid), quantity: Number(tQty), totalamount: Number(tAmt), transactiondate: tDate2 })
        if (error) notify(`Insert failed: ${error.message}`, 'error')
        else { notify('Transaction recorded.'); setTCid(''); setTPid(''); setTAmt(''); refT() }
        setSaving(false)
    }

    const TABS = [
        { id: 'product', label: 'New product' },
        { id: 'customer', label: 'New customer' },
        { id: 'transaction', label: 'New transaction' },
    ]

    const inputStyle = { background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '9px 12px', color: 'var(--text)', fontSize: 13, outline: 'none', width: '100%', transition: 'border-color 0.15s', fontFamily: 'var(--font)' }
    const labelStyle = { fontSize: 11, color: C.textSub, fontWeight: 500, letterSpacing: '0.04em', display: 'block', marginBottom: 5 }

    return (
        <Stack gap={20}>
            {toast && <Alert type={toast.type === 'error' ? 'error' : 'success'}>{toast.msg}</Alert>}

            <Tabs tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {activeTab === 'product' && (
                <Grid cols="5fr 7fr" gap={20} style={{ gridTemplateColumns: '5fr 7fr' }}>
                    <Card>
                        <SectionTitle sub="Record a new product in the database">Add product</SectionTitle>
                        <form onSubmit={addProduct}>
                            <Stack gap={14}>
                                <div>
                                    <label style={labelStyle}>Product name <span style={{ color: C.red }}>*</span></label>
                                    <input value={pName} onChange={e => setPName(e.target.value)} placeholder="e.g. Product_501" style={inputStyle} required
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Category <span style={{ color: C.red }}>*</span></label>
                                    <select value={pCat} onChange={e => setPCat(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                                        {['Books', 'Sports', 'Electronics', 'Beauty', 'Home', 'Clothing', 'Other'].map(c => <option key={c}>{c}</option>)}
                                    </select>
                                </div>
                                <div>
                                    <label style={labelStyle}>Price ($) <span style={{ color: C.red }}>*</span></label>
                                    <input type="number" value={pPrice} onChange={e => setPPrice(e.target.value)} placeholder="99.99" min="0.01" step="0.01" style={inputStyle} required
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <Btn variant="success" size="lg" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                                    {saving ? 'Saving…' : 'Add product'}
                                </Btn>
                            </Stack>
                        </form>
                    </Card>
                    <Card>
                        <SectionTitle sub="Last 6 products added to the database">Recently added</SectionTitle>
                        <DataTable columns={['ID', 'Product', 'Category', 'Price']}
                            rows={recentProds.map(p => [p.productid, p.productname, p.category, `$${Number(p.price).toFixed(2)}`])} height={300} />
                    </Card>
                </Grid>
            )}

            {activeTab === 'customer' && (
                <Grid cols="5fr 7fr" gap={20} style={{ gridTemplateColumns: '5fr 7fr' }}>
                    <Card>
                        <SectionTitle sub="Register a new customer account">Add customer</SectionTitle>
                        <form onSubmit={addCustomer}>
                            <Stack gap={12}>
                                {[['First name', cFirst, setCFirst, 'Sarah', true], ['Last name', cLast, setCLast, 'Brown', true], ['Email', cEmail, setCEmail, 'sarah@example.com', true], ['Phone', cPhone, setCPhone, '9773957037', false]].map(([l, v, s, p, req]) => (
                                    <div key={l}>
                                        <label style={labelStyle}>{l}{req && <span style={{ color: C.red }}> *</span>}</label>
                                        <input value={v} onChange={e => s(e.target.value)} placeholder={p} style={inputStyle} required={req}
                                            onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                    </div>
                                ))}
                                <Grid cols={2} gap={10}>
                                    <div>
                                        <label style={labelStyle}>Age <span style={{ color: C.red }}>*</span></label>
                                        <input type="number" value={cAge} onChange={e => setCAge(e.target.value)} placeholder="30" min="18" max="100" style={inputStyle} required
                                            onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Gender</label>
                                        <select value={cGender} onChange={e => setCGender(e.target.value)} style={{ ...inputStyle, appearance: 'none' }}>
                                            {['Male', 'Female', 'Other', 'Prefer not to say'].map(g => <option key={g}>{g}</option>)}
                                        </select>
                                    </div>
                                </Grid>
                                <div>
                                    <label style={labelStyle}>Registration date</label>
                                    <input type="date" value={cDate} onChange={e => setCDate(e.target.value)} style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <Btn variant="success" size="lg" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                                    {saving ? 'Saving…' : 'Add customer'}
                                </Btn>
                            </Stack>
                        </form>
                    </Card>
                    <Card>
                        <SectionTitle sub="Last 6 customers registered">Recently added</SectionTitle>
                        <DataTable columns={['ID', 'Name', 'Email', 'Gender', 'Age', 'Registered']}
                            rows={recentCusts.map(c => [c.customerid, `${c.firstname} ${c.lastname}`, c.email, c.gender, c.age, String(c.registrationdate).slice(0, 10)])} height={340} />
                    </Card>
                </Grid>
            )}

            {activeTab === 'transaction' && (
                <Grid cols="5fr 7fr" gap={20} style={{ gridTemplateColumns: '5fr 7fr' }}>
                    <Card>
                        <SectionTitle sub="Link a customer to a product purchase">Record transaction</SectionTitle>
                        <form onSubmit={addTransaction}>
                            <Stack gap={14}>
                                <div>
                                    <label style={labelStyle}>Customer ID <span style={{ color: C.red }}>*</span></label>
                                    <input type="number" value={tCid} onChange={e => setTCid(e.target.value)} placeholder="e.g. 1" style={inputStyle} required
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <div>
                                    <label style={labelStyle}>Product ID <span style={{ color: C.red }}>*</span></label>
                                    <input type="number" value={tPid} onChange={e => setTPid(e.target.value)} placeholder="e.g. 42" style={inputStyle} required
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <Grid cols={2} gap={10}>
                                    <div>
                                        <label style={labelStyle}>Quantity</label>
                                        <input type="number" value={tQty} onChange={e => setTQty(e.target.value)} min="1" style={inputStyle}
                                            onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                    </div>
                                    <div>
                                        <label style={labelStyle}>Total amount ($) <span style={{ color: C.red }}>*</span></label>
                                        <input type="number" value={tAmt} onChange={e => setTAmt(e.target.value)} placeholder="99.99" min="0.01" step="0.01" style={inputStyle} required
                                            onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                    </div>
                                </Grid>
                                <div>
                                    <label style={labelStyle}>Transaction date</label>
                                    <input type="date" value={tDate2} onChange={e => setTDate2(e.target.value)} style={inputStyle}
                                        onFocus={e => e.target.style.borderColor = 'rgba(79,127,255,0.5)'} onBlur={e => e.target.style.borderColor = 'var(--border)'} />
                                </div>
                                <Btn variant="primary" size="lg" disabled={saving} style={{ width: '100%', justifyContent: 'center' }}>
                                    {saving ? 'Recording…' : 'Record transaction'}
                                </Btn>
                            </Stack>
                        </form>
                    </Card>
                    <Card>
                        <SectionTitle sub="Last 6 transactions recorded">Recent transactions</SectionTitle>
                        <DataTable columns={['Tx ID', 'Customer', 'Product', 'Qty', 'Amount', 'Date']}
                            rows={recentTxns.map(t => [t.transactionid, t.customerid, t.productid, t.quantity, `$${Number(t.totalamount).toFixed(2)}`, String(t.transactiondate).slice(0, 10)])} height={300} />
                    </Card>
                </Grid>
            )}
        </Stack>
    )
}