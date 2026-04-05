import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { StatCard, Badge, Spinner, Card, SectionHeader, PrimaryBtn, GhostBtn, HeroBanner } from '../../components/UI'
import { pm2Api } from '../../lib/api'

const STATUS_COLOR = {
  pending:'warning', processing:'info', ready:'accent', delivered:'success', cancelled:'danger',
  // capitalised variants from backend default
  Pending:'warning', Processing:'info', Ready:'accent', Delivered:'success', Cancelled:'danger',
}

const downloadBill = (orderId, orderCode) => {
  const token = localStorage.getItem('ns_token')
  fetch(`http://localhost:8000/api/pharmacy2/orders/${orderId}/bill`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => r.ok ? r.blob() : null)
    .then(blob => { if (!blob) return; const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `Bill_${orderCode}.docx`; a.click() })
    .catch(() => alert('Bill generation failed'))
}

export default function PharmacyDashboard() {
  const router = useRouter()
  const [orders, setOrders]       = useState([])
  const [medicines, setMedicines] = useState([])
  const [analytics, setAnalytics] = useState(null)
  const [loading, setLoading]     = useState(true)
  const [filter, setFilter]       = useState('all')
  const [search, setSearch]       = useState('')
  const [updating, setUpdating]   = useState(null)

  const load = () => {
    Promise.all([
      pm2Api.orders().catch(() => ({ data: [] })),
      pm2Api.medicines().catch(() => ({ data: [] })),
      pm2Api.analytics().catch(() => ({ data: null })),
    ]).then(([o, m, a]) => {
      setOrders(Array.isArray(o.data) ? o.data : [])
      setMedicines(Array.isArray(m.data) ? m.data : [])
      setAnalytics(a.data || null)
    }).finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const advanceOrder = async (order) => {
    const s    = (order.status || '').toLowerCase()
    const next = { pending:'processing', processing:'ready', ready:'delivered' }[s]
    if (!next) return
    setUpdating(order.id)
    try {
      await pm2Api.updateOrder(order.id, { status: next })
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    } catch {}
    setUpdating(null)
  }

  const filtered = orders.filter(o => {
    if (filter !== 'all' && (o.status || '').toLowerCase() !== filter.toLowerCase()) return false
    if (search && !JSON.stringify(o).toLowerCase().includes(search.toLowerCase())) return false
    return true
  })

  const pending   = orders.filter(o => (o.status||'').toLowerCase() === 'pending').length
  const today     = orders.filter(o => new Date(o.created_at).toDateString() === new Date().toDateString()).length
  const lowStock  = medicines.filter(m => m.stock_quantity < 20)
  const revenue   = analytics?.total_revenue ?? orders.filter(o => (o.status||'').toLowerCase() === 'delivered').reduce((s, o) => s + (o.total || 0), 0)

  if (loading) return <Layout title="PharmaMind Dashboard"><Spinner /></Layout>

  return (
    <Layout title="PharmaMind Dashboard">
      <HeroBanner
        img="https://images.unsplash.com/photo-1576602976047-174e57a47881?w=1200&q=55&fit=crop&auto=format"
        title="PharmaMind — AI Pharmacy"
        sub={`${orders.length} total orders · ${pending} pending · ${medicines.length} medicines in stock`}
      />

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:22 }}>
        <StatCard label="Total Orders"   value={orders.length}   sub="All time"        accent="var(--teal)"    />
        <StatCard label="Pending"        value={pending}         sub="Need processing"  accent="var(--warning)" />
        <StatCard label="Today's Orders" value={today}           sub="New today"        accent="var(--green)"   />
        <StatCard label="Low Stock"      value={lowStock.length} sub="Need reorder"     accent="var(--danger)"  />
      </div>

      {/* Main grid */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:18, marginBottom:22 }}>

        {/* Orders table */}
        <Card>
          <SectionHeader title="All Orders"
            action={
              <div style={{ display:'flex', gap:8, alignItems:'center' }}>
                <input style={{ width:180 }} placeholder="Search orders..." value={search} onChange={e => setSearch(e.target.value)}/>
                <PrimaryBtn small onClick={() => router.push('/pharmacy/pharmamind')}>+ New Order</PrimaryBtn>
              </div>
            }/>

          {/* Filter tabs */}
          <div style={{ display:'flex', gap:6, marginBottom:16, flexWrap:'wrap' }}>
            {['all','pending','processing','ready','delivered','cancelled'].map(s => (
              <button key={s} onClick={() => setFilter(s)} style={{
                padding:'5px 14px', borderRadius:100, fontSize:12, fontWeight:600, cursor:'pointer',
                border:'1.5px solid', fontFamily:'Outfit, sans-serif',
                borderColor: filter===s ? 'var(--teal)' : 'var(--border)',
                background:  filter===s ? 'var(--teal-l)' : 'transparent',
                color:       filter===s ? 'var(--teal)' : 'var(--text2)',
                textTransform:'capitalize',
              }}>{s === 'all' ? `All (${orders.length})` : `${s} (${orders.filter(o=>(o.status||'').toLowerCase()===s.toLowerCase()).length})`}</button>
            ))}
          </div>

          {filtered.length === 0 ? (
            <div style={{ textAlign:'center', padding:'32px', color:'var(--text3)', fontSize:13 }}>No orders found.</div>
          ) : (
            <table>
              <thead><tr>
                <th>Order</th><th>Patient</th><th>Items</th><th>Total</th>
                <th>Date</th><th>Status</th><th>Actions</th>
              </tr></thead>
              <tbody>
                {filtered.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight:700, color:'var(--teal)', fontFamily:'monospace', fontSize:13 }}>
                      {o.order_code || o.id?.toString().slice(0,8)}
                    </td>
                    <td>
                      <div style={{ fontWeight:600, fontSize:13, color:'var(--text1)' }}>{o.patient_name || o.user_id?.slice(0,8) || 'Walk-in'}</div>
                      {o.patient_email && <div style={{ fontSize:11, color:'var(--text3)' }}>{o.patient_email}</div>}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text2)' }}>
                      {o.items?.length || 0} item{o.items?.length !== 1 ? 's' : ''}
                    </td>
                    <td style={{ fontWeight:700, color:'var(--text1)', fontSize:13 }}>
                      ₹{(o.total || 0).toFixed(0)}
                    </td>
                    <td style={{ fontSize:12, color:'var(--text3)' }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short' })}
                    </td>
                    <td>
                      <Badge type={STATUS_COLOR[o.status] || 'default'}>{o.status}</Badge>
                    </td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        {['pending','processing','ready'].includes((o.status||'').toLowerCase()) && (
                          <button disabled={updating === o.id} onClick={() => advanceOrder(o)}
                            style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:100, border:'none', background:'var(--teal)', color:'#fff', cursor:'pointer', opacity: updating===o.id ? 0.6 : 1 }}>
                            {updating === o.id ? '...' : { pending:'Process', processing:'Mark Ready', ready:'Deliver' }[(o.status||'').toLowerCase()] || '→'}
                          </button>
                        )}
                        <button onClick={() => downloadBill(o.id, o.order_code)}
                          style={{ fontSize:11, fontWeight:700, padding:'5px 10px', borderRadius:100, border:'1.5px solid var(--teal)', background:'transparent', color:'var(--teal)', cursor:'pointer' }}>
                          ⬇ Bill
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>

        {/* Right sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

          {/* Quick actions */}
          <Card>
            <SectionHeader title="Quick Actions"/>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              <PrimaryBtn onClick={() => router.push('/pharmacy/pharmamind')} style={{ justifyContent:'center' }}>
                AI Pharmacist Chat
              </PrimaryBtn>
              <GhostBtn onClick={() => router.push('/pharmacy/scanner')} style={{ justifyContent:'center' }}>
                OCR Scanner
              </GhostBtn>
            </div>
          </Card>

          {/* Analytics */}
          {analytics && (
            <Card>
              <SectionHeader title="Revenue"/>
              <div style={{ fontSize:28, fontWeight:900, color:'var(--teal)', marginBottom:4 }}>
                ₹{(analytics.total_revenue || 0).toLocaleString('en-IN')}
              </div>
              <div style={{ fontSize:12, color:'var(--text3)', marginBottom:14 }}>Total revenue</div>
              {analytics.top_medicines?.slice(0,3).map((m, i) => (
                <div key={i} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--borderS)' }}>
                  <span style={{ fontSize:13, color:'var(--text1)', fontWeight:500 }}>{m.name}</span>
                  <span style={{ fontSize:12, color:'var(--teal)', fontWeight:700 }}>{m.sold} sold</span>
                </div>
              ))}
            </Card>
          )}

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <Card>
              <SectionHeader title="Low Stock Alerts"/>
              <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                {lowStock.slice(0, 5).map(m => (
                  <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 10px', background:'rgba(229,83,75,.05)', border:'1px solid rgba(229,83,75,.15)', borderRadius:'var(--r-sm)' }}>
                    <div>
                      <div style={{ fontSize:12, fontWeight:700, color:'var(--text1)' }}>{m.name}</div>
                      <div style={{ fontSize:10, color:'var(--danger)' }}>{m.stock_quantity} left</div>
                    </div>
                    <Badge type="danger">Low</Badge>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Medicine count */}
          <Card>
            <SectionHeader title="Inventory" action={
              <a href="/pharmacy/pharmamind" style={{ fontSize:12, color:'var(--teal)', fontWeight:600 }}>Manage →</a>
            }/>
            <div style={{ fontSize:32, fontWeight:900, color:'var(--text1)', marginBottom:4 }}>{medicines.length}</div>
            <div style={{ fontSize:12, color:'var(--text3)' }}>Medicines in stock</div>
            <div style={{ marginTop:12, display:'flex', flexWrap:'wrap', gap:6 }}>
              {medicines.slice(0, 6).map(m => (
                <span key={m.id} style={{ fontSize:11, padding:'3px 9px', borderRadius:100, background:'var(--teal-l)', color:'var(--teal)', fontWeight:600, border:'1px solid rgba(79,176,179,.2)' }}>
                  {m.name}
                </span>
              ))}
              {medicines.length > 6 && <span style={{ fontSize:11, color:'var(--text3)' }}>+{medicines.length - 6} more</span>}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
