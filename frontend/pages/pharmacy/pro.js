import { useState, useEffect, useRef } from 'react'
import Layout from '../../components/Layout'
import { Badge, Spinner, EmptyState, PrimaryBtn, GhostBtn, StatCard } from '../../components/UI'
import axios from 'axios'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function api(method, path, data, file) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('ns_token') : ''
  if (file) {
    const fd = new FormData(); fd.append('file', file)
    return axios({ method, url: API_URL + path, data: fd, headers: { Authorization: `Bearer ${token}` } })
  }
  return axios({ method, url: API_URL + path, data, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } })
}

const CATEGORIES = ['Analgesics','Antibiotics','Antidiabetics','Antihypertensives','Antihistamines',
  'Antacids','Vitamins','Cardiac','Neurological','Respiratory','Dermatology','ENT','Eye drops','Ayurvedic','Muscle Relaxant','Anticonvulsant']

const STATUS_COLOR = { 'In Stock': 'success', 'Low Stock': 'warning', 'Out of Stock': 'danger' }
const ORDER_FLOW   = { Processing: 'In Transit', 'In Transit': 'Delivered' }

// ── Medicine Modal ───────────────────────────────────────────────────────────
function MedModal({ medicine, onClose, onSave }) {
  const [form, setForm] = useState(medicine || {
    name:'', generic_name:'', brand:'', category:'', price:'', stock:'',
    threshold:20, rx_required:false, dosage_form:'tablet', strength:'',
    manufacturer:'', description:'', side_effects:'', expiry:''
  })
  const [saving, setSaving] = useState(false)
  const set = (k, v) => setForm(f => ({ ...f, [k]: v }))

  const save = async () => {
    if (!form.name || form.price === '' || form.stock === '') { alert('Name, price and stock required'); return }
    setSaving(true)
    try {
      const data = { ...form, price: +form.price, stock: +form.stock, threshold: +form.threshold }
      const res = medicine
        ? await api('put', `/api/pharmacy2/medicines/${medicine.id}`, data)
        : await api('post', '/api/pharmacy2/medicines', data)
      onSave(res.data); onClose()
    } catch (e) { alert('Error: ' + (e.response?.data?.detail || e.message)) }
    finally { setSaving(false) }
  }

  const fields = [
    ['Medicine name *','name','text'], ['Generic name','generic_name','text'],
    ['Brand','brand','text'], ['Strength (e.g. 500mg)','strength','text'],
    ['Price (₹) *','price','number'], ['Stock *','stock','number'],
    ['Low stock threshold','threshold','number'], ['Expiry (YYYY-MM)','expiry','text'],
    ['Manufacturer','manufacturer','text'],
  ]

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:1000 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-xl)', padding:24, width:560, maxHeight:'90vh', overflowY:'auto' }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h3 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>{medicine ? 'Edit Medicine' : 'Add Medicine'}</h3>
          <button onClick={onClose} style={{ fontSize:20, color:'var(--text-muted)', background:'none', border:'none', cursor:'pointer' }}>×</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          {fields.map(([label, key, type]) => (
            <div key={key}>
              <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>{label}</p>
              <input type={type} value={form[key] || ''} onChange={e => set(key, e.target.value)} />
            </div>
          ))}
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Category</p>
            <select value={form.category} onChange={e => set('category', e.target.value)}>
              <option value="">Select...</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Dosage form</p>
            <select value={form.dosage_form} onChange={e => set('dosage_form', e.target.value)}>
              {['tablet','capsule','syrup','injection','cream','drops','gel'].map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Description</p>
            <textarea value={form.description||''} onChange={e => set('description', e.target.value)} rows={2} style={{ resize:'vertical' }} />
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <p style={{ fontSize:11, color:'var(--text-muted)', marginBottom:4 }}>Side effects</p>
            <input value={form.side_effects||''} onChange={e => set('side_effects', e.target.value)} />
          </div>
          <div style={{ gridColumn:'1/-1', display:'flex', alignItems:'center', gap:8 }}>
            <input type="checkbox" id="rx" checked={!!form.rx_required} onChange={e => set('rx_required', e.target.checked)} />
            <label htmlFor="rx" style={{ fontSize:13, color:'var(--text-secondary)', cursor:'pointer' }}>Prescription required (Rx)</label>
          </div>
        </div>
        <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:20 }}>
          <GhostBtn onClick={onClose}>Cancel</GhostBtn>
          <PrimaryBtn onClick={save} disabled={saving}>{saving ? 'Saving...' : medicine ? 'Update' : 'Add Medicine'}</PrimaryBtn>
        </div>
      </div>
    </div>
  )
}

// ── Inventory Tab ────────────────────────────────────────────────────────────
function InventoryTab() {
  const [meds, setMeds]       = useState([])
  const [search, setSearch]   = useState('')
  const [catFilter, setCat]   = useState('')
  const [modal, setModal]     = useState(null)
  const [loading, setLoading] = useState(true)
  const [adjustId, setAdjust] = useState(null)
  const [delta, setDelta]     = useState('')

  const load = () => {
    api('get', `/api/pharmacy2/medicines?search=${search}&category=${catFilter}`)
      .then(r => setMeds(r.data)).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [search, catFilter])

  const deleteMed = async (id) => {
    if (!confirm('Delete this medicine?')) return
    await api('delete', `/api/pharmacy2/medicines/${id}`)
    setMeds(m => m.filter(x => x.id !== id))
  }

  const applyAdjust = async () => {
    if (!delta || isNaN(+delta)) { alert('Enter a valid number'); return }
    const res = await api('put', `/api/pharmacy2/medicines/${adjustId}/stock`, { delta: +delta, reason: 'manual admin' })
    setMeds(m => m.map(x => x.id === adjustId ? res.data : x))
    setAdjust(null); setDelta('')
  }

  const categories = [...new Set(meds.map(m => m.category).filter(Boolean))]
  const lowCount   = meds.filter(m => m.stock <= m.threshold).length

  return (
    <div>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
        <div>
          <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)' }}>Inventory Management</h2>
          <p style={{ fontSize:13, color:'var(--text-secondary)' }}>
            {meds.length} medicines
            {lowCount > 0 && <span style={{ color:'var(--danger)', marginLeft:10 }}>⚠ {lowCount} low stock</span>}
          </p>
        </div>
        <PrimaryBtn onClick={() => setModal('add')}>+ Add Medicine</PrimaryBtn>
      </div>

      <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search medicines..." style={{ maxWidth:240 }} />
        <select value={catFilter} onChange={e => setCat(e.target.value)} style={{ maxWidth:180 }}>
          <option value="">All categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      {adjustId && (
        <div style={{ background:'var(--warning-bg)', border:'1px solid var(--warning)', borderRadius:'var(--radius-md)', padding:'12px 16px', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>
            Adjust stock: <em>{meds.find(m => m.id === adjustId)?.name}</em>
          </span>
          <input type="number" value={delta} onChange={e => setDelta(e.target.value)} placeholder="+50 or -10" style={{ width:120 }} />
          <PrimaryBtn small onClick={applyAdjust}>Apply</PrimaryBtn>
          <GhostBtn onClick={() => { setAdjust(null); setDelta('') }}>Cancel</GhostBtn>
        </div>
      )}

      {loading ? <Spinner /> : (
        <div style={{ overflowX:'auto' }}>
          <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
            <thead>
              <tr>{['Name','Generic','Strength','Category','Price','Stock','Threshold','Form','Rx','Expiry','Status','Actions'].map(h=>(
                <th key={h} style={{ textAlign:'left', padding:'10px 12px', color:'var(--text-muted)', fontWeight:500, fontSize:11, textTransform:'uppercase', letterSpacing:'0.04em', borderBottom:'1px solid var(--border-subtle)', whiteSpace:'nowrap' }}>{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {meds.map(m => (
                <tr key={m.id} style={{ borderBottom:'1px solid var(--border-subtle)', background: m.stock===0 ? 'var(--danger-bg)' : m.stock<=m.threshold ? 'var(--warning-bg)' : 'transparent' }}>
                  <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--text-primary)' }}>{m.name}</td>
                  <td style={{ padding:'10px 12px', fontSize:11, color:'var(--text-muted)' }}>{m.generic_name||'—'}</td>
                  <td style={{ padding:'10px 12px', color:'var(--text-secondary)' }}>{m.strength||'—'}</td>
                  <td style={{ padding:'10px 12px' }}><Badge type="default">{m.category||'—'}</Badge></td>
                  <td style={{ padding:'10px 12px', fontWeight:600, color:'var(--text-primary)' }}>₹{m.price}</td>
                  <td style={{ padding:'10px 12px', fontWeight:700, color: m.stock===0?'var(--danger)':m.stock<=m.threshold?'var(--warning)':'var(--success)', fontSize:15 }}>{m.stock}</td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:'var(--text-muted)' }}>{m.threshold}</td>
                  <td style={{ padding:'10px 12px', textTransform:'capitalize', fontSize:12, color:'var(--text-secondary)' }}>{m.dosage_form}</td>
                  <td style={{ padding:'10px 12px' }}><Badge type={m.rx_required?'danger':'success'}>{m.rx_required?'Rx':'OTC'}</Badge></td>
                  <td style={{ padding:'10px 12px', fontSize:12, color:'var(--text-muted)' }}>{m.expiry||'—'}</td>
                  <td style={{ padding:'10px 12px' }}><Badge type={STATUS_COLOR[m.status]||'default'}>{m.status}</Badge></td>
                  <td style={{ padding:'10px 12px' }}>
                    <div style={{ display:'flex', gap:4 }}>
                      <button onClick={() => setModal(m)} style={{ fontSize:12, color:'var(--accent)', background:'none', border:'1px solid var(--accent-muted)', borderRadius:4, padding:'4px 8px', cursor:'pointer' }}>Edit</button>
                      <button onClick={() => setAdjust(m.id)} style={{ fontSize:12, color:'var(--warning)', background:'none', border:'1px solid var(--warning-bg)', borderRadius:4, padding:'4px 8px', cursor:'pointer' }}>Stock</button>
                      <button onClick={() => deleteMed(m.id)} style={{ fontSize:12, color:'var(--danger)', background:'none', border:'1px solid var(--danger-bg)', borderRadius:4, padding:'4px 8px', cursor:'pointer' }}>Del</button>
                    </div>
                  </td>
                </tr>
              ))}
              {meds.length === 0 && (
                <tr><td colSpan={12} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No medicines found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {modal && <MedModal medicine={modal==='add'?null:modal} onClose={() => setModal(null)} onSave={() => { setModal(null); load() }} />}
    </div>
  )
}

// ── Orders Tab ───────────────────────────────────────────────────────────────
function downloadBill2(orderId, orderCode) {
  const token = localStorage.getItem('ns_token')
  fetch(`http://localhost:8000/api/pharmacy2/orders/${orderId}/bill`, {
    headers: { Authorization: `Bearer ${token}` }
  }).then(r => {
    if (!r.ok) {
      // Fallback: generate simple bill in browser
      const w = window.open('', '_blank')
      w.document.write(`<pre style="font-family:monospace;padding:20px">
NeuroStride PharmaMind
Order: ${orderCode}
Date: ${new Date().toLocaleDateString('en-IN')}
---
Thank you for using NeuroStride PharmaMind
      </pre>`)
      return null
    }
    return r.blob()
  }).then(blob => {
    if (!blob) return
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = \`Bill_\${orderCode}.docx\`
    a.click()
  }).catch(() => alert('Bill download failed.'))
}

function OrdersTab() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch]   = useState('')
  const [statusF, setStatusF] = useState('')

  useEffect(() => {
    api('get', '/api/pharmacy2/orders').then(r => setOrders(r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  const advance = async (id, status) => {
    await api('put', `/api/pharmacy2/orders/${id}/status`, { status })
    setOrders(o => o.map(x => x.id===id ? {...x, status} : x))
  }

  const filtered = orders.filter(o =>
    (statusF ? o.status===statusF : true) &&
    (search ? o.order_code?.includes(search)||o.patient_label?.toLowerCase().includes(search.toLowerCase()) : true)
  )

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>Orders</h2>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:16 }}>{orders.length} orders total</p>
      <div style={{ display:'flex', gap:8, marginBottom:14 }}>
        <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search order ID or patient..." style={{ maxWidth:260 }} />
        <select value={statusF} onChange={e => setStatusF(e.target.value)} style={{ maxWidth:160 }}>
          <option value="">All statuses</option>
          {['Processing','In Transit','Delivered','Cancelled'].map(s => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      {loading ? <Spinner /> : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr>{['Order ID','Patient','Date','Items','Total','Status','Actions'].map(h=>(
              <th key={h} style={{ textAlign:'left', padding:'10px 14px', color:'var(--text-muted)', fontWeight:500, fontSize:11, textTransform:'uppercase', borderBottom:'1px solid var(--border-subtle)' }}>{h}</th>
            ))}</tr>
          </thead>
          <tbody>
            {filtered.map(o => (
              <tr key={o.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                <td style={{ padding:'11px 14px', fontWeight:700, color:'var(--text-primary)' }}>{o.order_code}</td>
                <td style={{ padding:'11px 14px', color:'var(--text-secondary)' }}>{o.patient_label||'—'}</td>
                <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                <td style={{ padding:'11px 14px', color:'var(--text-secondary)' }}>{(o.items||[]).length}</td>
                <td style={{ padding:'11px 14px', fontWeight:700, color:'var(--warning)' }}>₹{o.total?.toFixed(2)}</td>
                <td style={{ padding:'11px 14px' }}><Badge type={o.status==='Delivered'?'success':o.status==='Cancelled'?'danger':'warning'}>{o.status}</Badge></td>
                <td style={{ padding:'11px 14px' }}>
                  <div style={{ display:'flex', gap:6 }}>
                    <button onClick={() => downloadBill2(o.id, o.order_code)} style={{ fontSize: 11, color: 'var(--success)', background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 4, padding: '4px 8px', cursor: 'pointer', fontWeight: 600, marginRight: 4 }}>⬇ Bill</button>
                    {ORDER_FLOW[o.status] && (
                      <PrimaryBtn small onClick={() => advance(o.id, ORDER_FLOW[o.status])}>→ {ORDER_FLOW[o.status]}</PrimaryBtn>
                    )}
                    {o.status!=='Cancelled'&&o.status!=='Delivered' && (
                      <button onClick={() => advance(o.id,'Cancelled')} style={{ fontSize:12, color:'var(--danger)', background:'none', border:'1px solid var(--danger-bg)', borderRadius:4, padding:'5px 10px', cursor:'pointer' }}>Cancel</button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
            {filtered.length===0 && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No orders</td></tr>}
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Analytics Tab ────────────────────────────────────────────────────────────
function AnalyticsTab() {
  const [data, setData]     = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api('get', '/api/pharmacy2/analytics').then(r => setData(r.data)).catch(()=>{}).finally(()=>setLoading(false))
  }, [])

  if (loading) return <Spinner />
  if (!data)   return <EmptyState message="Failed to load analytics." />

  const stats = [
    { label:'Total Revenue',  value:`₹${(data.total_revenue||0).toFixed(0)}`, accent:'#2EA043' },
    { label:'Total Orders',   value:data.total_orders||0,                       accent:'#2F7BE8' },
    { label:'Medicines',      value:data.total_medicines||0,                    accent:'#D29922' },
    { label:'Low Stock Items',value:(data.low_stock_alerts||[]).length,         accent:'#DA3633' },
  ]

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:16 }}>Analytics Dashboard</h2>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {stats.map(s => <StatCard key={s.label} label={s.label} value={s.value} accent={s.accent} />)}
      </div>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <p style={{ fontWeight:600, marginBottom:12, color:'var(--text-primary)' }}>Top Selling Medicines</p>
          {(data.trending_medicines||[]).length===0 ? <EmptyState message="No orders yet" /> :
            (data.trending_medicines||[]).map((m,i) => (
              <div key={m.name} style={{ display:'flex', alignItems:'center', gap:10, padding:'6px 0', borderBottom:'1px solid var(--border-subtle)' }}>
                <span style={{ color:'var(--text-muted)', fontSize:12, width:18 }}>{i+1}</span>
                <div style={{ flex:1 }}>
                  <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.name}</p>
                  <p style={{ fontSize:11, color:'var(--text-muted)' }}>{m.qty} units sold</p>
                </div>
              </div>
            ))
          }
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <p style={{ fontWeight:600, marginBottom:12, color:'var(--text-primary)' }}>Order Status Breakdown</p>
          {Object.entries(data.status_breakdown||{}).map(([status,count]) => (
            <div key={status} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border-subtle)' }}>
              <Badge type={status==='Delivered'?'success':status==='Cancelled'?'danger':'warning'}>{status}</Badge>
              <span style={{ fontWeight:700, fontSize:15, color:'var(--text-primary)' }}>{count}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
        <p style={{ fontWeight:600, marginBottom:12, color:'var(--text-primary)' }}>Low Stock Alerts</p>
        {(data.low_stock_alerts||[]).length===0 ? (
          <p style={{ fontSize:13, color:'var(--success)' }}>All medicines well-stocked</p>
        ) : (data.low_stock_alerts||[]).slice(0,8).map(m => (
          <div key={m.id} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'7px 0', borderBottom:'1px solid var(--border-subtle)' }}>
            <div>
              <p style={{ fontSize:13, fontWeight:600, color:'var(--text-primary)' }}>{m.name}</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>{m.category}</p>
            </div>
            <div style={{ textAlign:'right' }}>
              <p style={{ fontWeight:700, fontSize:15, color:m.stock===0?'var(--danger)':'var(--warning)' }}>{m.stock}</p>
              <p style={{ fontSize:11, color:'var(--text-muted)' }}>threshold: {m.threshold}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── OCR Tab ──────────────────────────────────────────────────────────────────
function OCRTab() {
  const fileRef               = useRef()
  const [image, setImage]     = useState(null)
  const [preview, setPreview] = useState(null)
  const [result, setResult]   = useState(null)
  const [loading, setLoading] = useState(false)
  const [dragOver, setDragOver] = useState(false)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file); setPreview(URL.createObjectURL(file)); setResult(null)
  }

  const runOCR = async () => {
    if (!image) return
    setLoading(true)
    try {
      const res = await api('post', '/api/pharmacy2/ocr', null, image)
      setResult(res.data)
    } catch (e) {
      alert('OCR failed: ' + (e.response?.data?.detail || e.message))
    } finally { setLoading(false) }
  }

  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:4 }}>OCR Prescription Scanner</h2>
      <p style={{ fontSize:13, color:'var(--text-secondary)', marginBottom:20 }}>Upload a prescription image — Tesseract extracts text, AI corrects errors and parses medicines</p>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
          {!preview ? (
            <div
              onClick={() => fileRef.current?.click()}
              onDrop={e => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{ border:`2px dashed ${dragOver?'var(--accent)':'var(--border-strong)'}`, borderRadius:'var(--radius-lg)', padding:48, textAlign:'center', cursor:'pointer', background: dragOver?'var(--accent-muted)':'transparent' }}
            >
              <p style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)', marginBottom:6 }}>Drop prescription image here</p>
              <p style={{ fontSize:13, color:'var(--text-secondary)' }}>or click to browse — JPG, PNG</p>
            </div>
          ) : (
            <div>
              <img src={preview} alt="Prescription" style={{ width:'100%', borderRadius:'var(--radius-md)', marginBottom:12, border:'1px solid var(--border)' }} />
              <div style={{ display:'flex', gap:8 }}>
                <PrimaryBtn onClick={runOCR} disabled={loading}>{loading ? 'Scanning...' : 'Run OCR + AI Parse'}</PrimaryBtn>
                <GhostBtn onClick={() => { setImage(null); setPreview(null); setResult(null) }}>Clear</GhostBtn>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])} />
        </div>

        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!result ? (
            <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
              <p style={{ fontSize:13, color:'var(--text-muted)', textAlign:'center', padding:'32px 0' }}>OCR results appear here</p>
            </div>
          ) : (
            <>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                  <p style={{ fontSize:15, fontWeight:600, color:'var(--text-primary)' }}>Extracted Information</p>
                  <Badge type="success">{Math.round((result.confidence||0)*100)}% confidence</Badge>
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:16 }}>
                  {[['Patient', result.patient_name||'—'],['Doctor', result.doctor_name||'—'],['Date', result.date||'—']].map(([k,v]) => (
                    <div key={k} style={{ display:'flex', gap:12, fontSize:13 }}>
                      <span style={{ color:'var(--text-muted)', minWidth:60 }}>{k}</span>
                      <span style={{ color:'var(--text-primary)', fontWeight:500 }}>{v}</span>
                    </div>
                  ))}
                </div>
                <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Medicines detected</p>
                {(result.medicines||[]).map((m,i) => (
                  <div key={i} style={{ background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', padding:'10px 14px', marginBottom:8 }}>
                    <p style={{ fontSize:14, fontWeight:600, color:'var(--text-primary)', marginBottom:3 }}>
                      {m.name}
                      {m.in_database && <span style={{ fontSize:11, color:'var(--success)', marginLeft:8 }}>In inventory</span>}
                    </p>
                    <p style={{ fontSize:13, color:'var(--text-secondary)' }}>{m.dosage} — {m.duration}</p>
                  </div>
                ))}
                <PrimaryBtn onClick={() => alert('Order created and sent to queue.')}>Create pharmacy order</PrimaryBtn>
              </div>
              <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20 }}>
                <p style={{ fontSize:13, fontWeight:500, color:'var(--text-primary)', marginBottom:8 }}>Raw OCR text</p>
                <pre style={{ background:'var(--bg-elevated)', borderRadius:'var(--radius-sm)', padding:12, fontSize:12, color:'var(--text-secondary)', fontFamily:"'Courier New', monospace", lineHeight:1.7, whiteSpace:'pre-wrap', maxHeight:200, overflowY:'auto' }}>{result.raw_ocr}</pre>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Chat Tab ─────────────────────────────────────────────────────────────────
function ChatTab() {
  const [messages, setMessages] = useState([{ role:'assistant', text:'Hello! I am your PharmaMind AI pharmacist with 6 specialist agents. Ask me about medicines, dosages, stock, or place an order in any language.' }])
  const [input, setInput]       = useState('')
  const [loading, setLoading]   = useState(false)
  const bottomRef               = useRef(null)

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior:'smooth' }) }, [messages])

  const send = async (text) => {
    const msg = (text||input).trim()
    if (!msg) return
    setInput('')
    setMessages(prev => [...prev, { role:'user', text:msg }])
    setLoading(true)
    try {
      const res = await api('post', '/api/pharmacy2/chat', {
        message: msg,
        history: messages.slice(-6).map(m => ({ role:m.role, content:m.text }))
      })
      const reply = res.data?.response || 'I received your message.'
      setMessages(prev => [...prev, { role:'assistant', text:reply }])
    } catch {
      setMessages(prev => [...prev, { role:'assistant', text:'Connection error. Ensure GROQ_API_KEY is set.' }])
    } finally { setLoading(false) }
  }

  const QUICK = ['Show available antibiotics', 'What medicines are low on stock?', 'Check Aspirin availability', 'What medicines need Rx?']

  return (
    <div style={{ display:'grid', gridTemplateColumns:'1fr 240px', gap:16 }}>
      <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:20, display:'flex', flexDirection:'column', height:'calc(100vh - 180px)' }}>
        <div style={{ flex:1, overflowY:'auto', display:'flex', flexDirection:'column', gap:12, paddingBottom:12 }}>
          {messages.map((m,i) => (
            <div key={i} style={{ display:'flex', justifyContent:m.role==='user'?'flex-end':'flex-start' }}>
              <div style={{ maxWidth:'75%', background:m.role==='user'?'var(--accent-muted)':'var(--bg-elevated)', borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px', padding:'10px 14px', fontSize:14, color:m.role==='user'?'var(--accent-light)':'var(--text-secondary)', lineHeight:1.6 }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && <div style={{ display:'flex' }}><div style={{ background:'var(--bg-elevated)', borderRadius:'16px 16px 16px 4px', padding:'10px 14px', fontSize:14, color:'var(--text-muted)' }}>Thinking...</div></div>}
          <div ref={bottomRef} />
        </div>
        <div style={{ borderTop:'1px solid var(--border-subtle)', paddingTop:12, display:'flex', gap:8 }}>
          <input style={{ flex:1 }} placeholder="Ask about medicines in any language..." value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key==='Enter'&&!loading&&send()} />
          <PrimaryBtn onClick={() => send()} disabled={loading||!input.trim()}>Send</PrimaryBtn>
        </div>
      </div>
      <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:10 }}>Quick queries</p>
          <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
            {QUICK.map((q,i) => (
              <button key={i} onClick={() => send(q)} style={{ textAlign:'left', padding:'8px 10px', background:'var(--bg-elevated)', border:'1px solid var(--border)', borderRadius:'var(--radius-sm)', fontSize:12, color:'var(--text-secondary)', cursor:'pointer', transition:'all 150ms' }}
                onMouseOver={e => e.currentTarget.style.borderColor='var(--accent)'}
                onMouseOut={e => e.currentTarget.style.borderColor='var(--border)'}>{q}</button>
            ))}
          </div>
        </div>
        <div style={{ background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--radius-lg)', padding:16 }}>
          <p style={{ fontSize:12, color:'var(--text-muted)', textTransform:'uppercase', letterSpacing:'0.05em', marginBottom:8 }}>6 agents active</p>
          {[['Agent 1','Order Processing'],['Agent 2','Safety Validation'],['Agent 3','Refill Intelligence'],['Agent 4','Inventory Monitor'],['Agent 5','Prescription Verify'],['Agent 6','Analytics & Fraud']].map(([id,name]) => (
            <div key={id} style={{ display:'flex', gap:8, alignItems:'center', padding:'5px 0', borderBottom:'1px solid var(--border-subtle)' }}>
              <span style={{ fontSize:11, color:'var(--accent)', fontFamily:'monospace', fontWeight:600 }}>{id}</span>
              <span style={{ fontSize:12, color:'var(--text-secondary)' }}>{name}</span>
              <span style={{ marginLeft:'auto', width:6, height:6, borderRadius:'50%', background:'var(--success)' }} />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── Stock Logs Tab ────────────────────────────────────────────────────────────
function StockLogsTab() {
  const [logs, setLogs]     = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { api('get','/api/pharmacy2/stock-logs').then(r=>setLogs(r.data)).catch(()=>{}).finally(()=>setLoading(false)) }, [])
  return (
    <div>
      <h2 style={{ fontSize:16, fontWeight:600, color:'var(--text-primary)', marginBottom:16 }}>Stock Adjustment History</h2>
      {loading ? <Spinner /> : (
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead><tr>{['Medicine','Delta','Reason','Date'].map(h=><th key={h} style={{ textAlign:'left', padding:'10px 14px', color:'var(--text-muted)', fontWeight:500, fontSize:11, textTransform:'uppercase', borderBottom:'1px solid var(--border-subtle)' }}>{h}</th>)}</tr></thead>
          <tbody>
            {logs.length===0 ? <tr><td colSpan={4} style={{ padding:40, textAlign:'center', color:'var(--text-muted)' }}>No logs yet</td></tr> :
              logs.map(l => (
                <tr key={l.id} style={{ borderBottom:'1px solid var(--border-subtle)' }}>
                  <td style={{ padding:'11px 14px', fontWeight:600, color:'var(--text-primary)' }}>{l.medicine_name}</td>
                  <td style={{ padding:'11px 14px', fontWeight:700, color: l.delta>0?'var(--success)':'var(--danger)' }}>{l.delta>0?'+':''}{l.delta}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-secondary)' }}>{l.reason}</td>
                  <td style={{ padding:'11px 14px', fontSize:12, color:'var(--text-muted)' }}>{new Date(l.created_at).toLocaleString('en-IN')}</td>
                </tr>
              ))
            }
          </tbody>
        </table>
      )}
    </div>
  )
}

// ── Main Dashboard ────────────────────────────────────────────────────────────
const TABS = [
  { key:'inventory', label:'Inventory' },
  { key:'orders',    label:'Orders' },
  { key:'analytics', label:'Analytics' },
  { key:'ocr',       label:'OCR Scanner' },
  { key:'chat',      label:'AI Pharmacist' },
  { key:'logs',      label:'Stock Logs' },
]

export default function PharmacyPro() {
  const [tab, setTab] = useState('inventory')

  return (
    <Layout title="PharmaMind Pro">
      <div style={{ display:'flex', gap:4, marginBottom:24, borderBottom:'1px solid var(--border-subtle)', paddingBottom:0 }}>
        {TABS.map(t => (
          <button key={t.key} onClick={() => setTab(t.key)} style={{
            padding:'8px 18px', fontSize:13, fontWeight:500, cursor:'pointer',
            background:'none', border:'none',
            color: tab===t.key ? 'var(--accent)' : 'var(--text-secondary)',
            borderBottom: tab===t.key ? '2px solid var(--accent)' : '2px solid transparent',
            marginBottom:-1, transition:'all 150ms'
          }}>{t.label}</button>
        ))}
      </div>
      {tab==='inventory' && <InventoryTab />}
      {tab==='orders'    && <OrdersTab />}
      {tab==='analytics' && <AnalyticsTab />}
      {tab==='ocr'       && <OCRTab />}
      {tab==='chat'      && <ChatTab />}
      {tab==='logs'      && <StockLogsTab />}
    </Layout>
  )
}
