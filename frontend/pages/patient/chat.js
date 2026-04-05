import { useState, useRef, useEffect } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, PrimaryBtn, GhostBtn, HeroBanner } from '../../components/UI'
import { agentApi, prescriptionApi, pm2Api } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const TABS = ['AI Assistant', 'My Prescriptions', 'Order Medicines']

const T = {
  teal:'var(--teal)', green:'var(--green)', card:'var(--card)', card2:'var(--card2)',
  border:'var(--border)', borderS:'var(--borderS)', text1:'var(--text1)',
  text2:'var(--text2)', text3:'var(--text3)', danger:'var(--danger)',
  warning:'var(--warning)',
}

const QUICK = [
  'What medicines am I on?',
  'Side effects of Baclofen?',
  'Can I take Aspirin with Warfarin?',
  'How do I store my medicines?',
]

export default function PatientChat() {
  const { user }               = useAuth()
  const [tab, setTab]          = useState('AI Assistant')
  const [msgs, setMsgs]        = useState([{
    role: 'assistant',
    text: "Hi! I'm your NeuroStride AI assistant. I can help you understand your medicines, answer health questions, or help you order medicines from your prescriptions. How can I help?",
  }])
  const [input, setInput]      = useState('')
  const [loading, setLoading]  = useState(false)
  const [prescriptions, setPrescriptions] = useState([])
  const [medicines, setMedicines] = useState([])
  const [cart, setCart]        = useState([])
  const [rxLoading, setRxLoading] = useState(false)
  const [search, setSearch]    = useState('')
  const [orderDone, setOrderDone] = useState(false)
  const [qrModal, setQrModal]  = useState(false)
  const [rxModal, setRxModal]  = useState(null)
  const bottomRef              = useRef()

  useEffect(() => {
    if (!user) return
    // Load prescriptions
    setRxLoading(true)
    prescriptionApi.forPatient(user.profile_id || user.id)
      .then(r => setPrescriptions(r.data || []))
      .catch(() => {})
      .finally(() => setRxLoading(false))
    // Load medicines
    pm2Api.medicines().then(r => setMedicines(r.data || [])).catch(() => {})
  }, [user])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [msgs, loading])

  const send = async (text) => {
    const msg = text || input.trim()
    if (!msg) return
    setInput('')
    setMsgs(prev => [...prev, { role:'user', text: msg }])
    setLoading(true)
    try {
      const res = await agentApi.chat({ message: msg, patient_id: user?.profile_id || user?.id })
      const reply = res.data?.response || res.data?.message || 'I could not process that request.'
      setMsgs(prev => [...prev, { role:'assistant', text: reply }])
    } catch {
      setMsgs(prev => [...prev, { role:'assistant', text: 'Sorry, I had trouble connecting. Please try again.' }])
    }
    setLoading(false)
  }


  // Calculate qty from frequency + duration strings
  const calcQty = (freq, dur) => {
    const freqMap = {
      'once daily': 1, 'twice daily': 2, 'two times daily': 2,
      'three times daily': 3, 'thrice daily': 3, 'four times daily': 4,
      'once at night': 1, 'sos (as needed)': 0, 'before meals': 3,
      'after meals': 3, 'morning': 1, 'evening': 1,
    }
    const durMap = {
      '3 days': 3, '5 days': 5, '7 days': 7, '10 days': 10,
      '14 days': 14, '1 month': 30, '3 months': 90, 'ongoing': 30,
    }
    const f = freqMap[String(freq || '').toLowerCase().trim()] ?? 1
    const d = durMap[String(dur  || '').toLowerCase().trim()] ?? 7
    return Math.max(1, f * d)
  }

  // Add medicine to cart — check if Rx required
  const addToCart = (med, qty = 1) => {
    if (med.rx_required) {
      // Check if patient has a valid prescription for this medicine
      const hasPrescription = prescriptions.some(rx => {
        const meds = Array.isArray(rx.medications) ? rx.medications : []
        return meds.some(m => {
          const name = String(m.name || m.medicine_name || '').toLowerCase()
          return name.includes(med.name.toLowerCase()) || med.name.toLowerCase().includes(name)
        })
      })
      if (!hasPrescription) {
        setRxModal(med)
        return
      }
    }
    setCart(prev => {
      const exists = prev.find(x => x.id === med.id)
      if (exists) return prev.map(x => x.id === med.id ? { ...x, qty: Math.max(x.qty, qty) } : x)
      return [...prev, { ...med, qty }]
    })
  }

  // Add all medicines from a prescription to cart
  const addPrescriptionToCart = (rx) => {
    const meds = Array.isArray(rx.medications) ? rx.medications : []
    let added = 0
    meds.forEach(m => {
      const name = String(m.name || m.medicine_name || '')
      const freq = String(m.frequency || '')
      const dur  = String(m.duration  || '')
      const qty  = calcQty(freq, dur)
      const match = medicines.find(med =>
        med.name.toLowerCase().includes(name.toLowerCase()) ||
        name.toLowerCase().includes(med.name.toLowerCase())
      )
      if (match) {
        setCart(prev => {
          const exists = prev.find(x => x.id === match.id)
          if (exists) return prev.map(x => x.id === match.id ? { ...x, qty } : x)
          return [...prev, { ...match, qty, freq, dur }]
        })
        added++
      }
    })
    if (added === 0) alert('No medicines from this prescription were found in inventory. Please contact the pharmacist.')
  }

  const placeOrder = async () => {
    if (cart.length === 0) return
    setQrModal(true)
  }

  const confirmPayment = async () => {
    try {
      const total = cart.reduce((s, m) => s + (m.price || 0) * m.qty, 0)
      await pm2Api.createOrder({
        items: cart.map(m => ({ name: m.name, qty: m.qty, price: m.price || 0 })),
        total,
        patient_name: user?.full_name || 'Patient',
        user_id: user?.id,
      })
    } catch {}
    setQrModal(false)
    setOrderDone(true)
    setCart([])
    setTimeout(() => setOrderDone(false), 5000)
  }

  const filteredMeds = medicines.filter(m =>
    !search || m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <Layout title="AI Assistant & Medicines">
      <HeroBanner
        img="https://images.unsplash.com/photo-1587854692152-cbe660dbde88?w=1200&q=55&fit=crop&auto=format"
        title="AI Assistant & Medicines"
        sub="Chat with your health AI · View prescriptions · Order medicines directly"
      />

      {orderDone && (
        <div style={{ background:'rgba(45,164,78,.1)', border:'1px solid rgba(45,164,78,.25)', borderRadius:'var(--r-lg)', padding:'14px 20px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22 }}>✅</span>
          <div>
            <div style={{ fontWeight:700, color:T.green }}>Order placed successfully!</div>
            <div style={{ fontSize:12, color:T.text2 }}>The pharmacy has received your order and will prepare it shortly.</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:`2px solid ${T.borderS}`, marginBottom:20 }}>
        {TABS.map(t => (
          <button key={t} onClick={() => setTab(t)} style={{
            padding:'9px 22px', fontSize:13, fontWeight: tab===t ? 800 : 500,
            color: tab===t ? T.teal : T.text2,
            borderBottom: tab===t ? '2px solid var(--teal)' : '2px solid transparent',
            marginBottom:-2, border:'none', background:'none', cursor:'pointer',
            fontFamily:'Outfit,sans-serif', borderRadius:'8px 8px 0 0',
          }}>
            {t}
            {t==='My Prescriptions' && prescriptions.length > 0 &&
              <span style={{ marginLeft:6, fontSize:11, background:T.teal, color:'#fff', borderRadius:100, padding:'1px 7px' }}>{prescriptions.length}</span>}
            {t==='Order Medicines' && cart.length > 0 &&
              <span style={{ marginLeft:6, fontSize:11, background:T.danger, color:'#fff', borderRadius:100, padding:'1px 7px' }}>{cart.length}</span>}
          </button>
        ))}
      </div>

      {/* ── AI ASSISTANT TAB ── */}
      {tab === 'AI Assistant' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:18 }}>
          <Card style={{ display:'flex', flexDirection:'column', height:'calc(100vh - 280px)', minHeight:500 }}>
            {/* Messages */}
            <div style={{ flex:1, overflowY:'auto', padding:'16px 20px', display:'flex', flexDirection:'column', gap:12 }}>
              {msgs.map((m, i) => (
                <div key={i} style={{ display:'flex', gap:10, alignItems:'flex-start', flexDirection: m.role==='user' ? 'row-reverse' : 'row' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background: m.role==='user' ? T.teal : T.card2, border:`2px solid ${T.borderS}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, fontWeight:800, color: m.role==='user' ? '#fff' : T.teal, flexShrink:0 }}>
                    {m.role==='user' ? (user?.full_name?.[0] || 'P') : '🤖'}
                  </div>
                  <div style={{ maxWidth:'75%', padding:'11px 15px', borderRadius: m.role==='user' ? '16px 4px 16px 16px' : '4px 16px 16px 16px', background: m.role==='user' ? T.teal : T.card2, color: m.role==='user' ? '#fff' : T.text1, fontSize:13, lineHeight:1.65, border:`1px solid ${m.role==='user' ? 'transparent' : T.borderS}` }}>
                    {m.text}
                  </div>
                </div>
              ))}
              {loading && (
                <div style={{ display:'flex', gap:10, alignItems:'flex-start' }}>
                  <div style={{ width:32, height:32, borderRadius:'50%', background:T.card2, border:`2px solid ${T.borderS}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13 }}>🤖</div>
                  <div style={{ padding:'11px 15px', borderRadius:'4px 16px 16px 16px', background:T.card2, border:`1px solid ${T.borderS}` }}>
                    <div style={{ display:'flex', gap:4 }}>
                      {[0,1,2].map(i => <div key={i} style={{ width:6, height:6, borderRadius:'50%', background:T.teal, animation:`bounce 0.8s ${i*0.15}s infinite` }}/>)}
                    </div>
                  </div>
                </div>
              )}
              <div ref={bottomRef}/>
            </div>

            {/* Quick prompts */}
            <div style={{ padding:'8px 16px', borderTop:`1px solid ${T.borderS}`, display:'flex', gap:6, flexWrap:'wrap' }}>
              {QUICK.map((q,i) => (
                <button key={i} onClick={() => send(q)} style={{ fontSize:11, color:T.teal, background:'rgba(79,176,179,.08)', border:'1px solid rgba(79,176,179,.2)', borderRadius:100, padding:'4px 12px', cursor:'pointer', fontFamily:'Outfit,sans-serif', transition:'all .15s' }}>
                  {q}
                </button>
              ))}
            </div>

            {/* Input */}
            <div style={{ padding:'12px 16px', borderTop:`1px solid ${T.borderS}`, display:'flex', gap:10 }}>
              <input value={input} onChange={e => setInput(e.target.value)}
                onKeyDown={e => e.key==='Enter' && !e.shiftKey && send()}
                placeholder="Ask about your medicines, health, or treatment..."
                style={{ flex:1, borderRadius:100, fontSize:13 }}/>
              <button onClick={() => send()} disabled={loading || !input.trim()}
                style={{ width:40, height:40, borderRadius:'50%', border:'none', background: input.trim() ? T.teal : T.borderS, color:'#fff', cursor: input.trim() ? 'pointer' : 'default', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, transition:'all .2s' }}>
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              </button>
            </div>
          </Card>

          {/* Right panel - prescription summary */}
          <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
            <Card>
              <SectionHeader title="Your Active Prescriptions"/>
              {rxLoading ? <Spinner/> : prescriptions.length === 0 ? (
                <div style={{ fontSize:12, color:T.text3, textAlign:'center', padding:'20px 0' }}>No prescriptions yet</div>
              ) : prescriptions.slice(0,2).map((rx, i) => {
                const meds = Array.isArray(rx.medications) ? rx.medications : []
                return (
                  <div key={rx.id} style={{ marginBottom:12, paddingBottom:12, borderBottom:`1px solid ${T.borderS}` }}>
                    <div style={{ fontSize:12, fontWeight:700, color:T.text1, marginBottom:6 }}>
                      Prescription {prescriptions.length - i}
                      <span style={{ marginLeft:8, fontSize:10, color:T.text3 }}>{rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN') : ''}</span>
                    </div>
                    {meds.slice(0,3).map((m,j) => (
                      <div key={j} style={{ fontSize:12, color:T.text2, display:'flex', gap:5, marginBottom:2 }}>
                        <span style={{ color:T.teal }}>›</span>
                        <span>{String(m.name || m.medicine_name || 'Medicine')}</span>
                      </div>
                    ))}
                    <button onClick={() => { addPrescriptionToCart(rx); setTab('Order Medicines') }}
                      style={{ marginTop:8, fontSize:11, fontWeight:700, padding:'5px 12px', borderRadius:100, border:'none', background:T.teal, color:'#fff', cursor:'pointer' }}>
                      Order these medicines →
                    </button>
                  </div>
                )
              })}
              <button onClick={() => setTab('My Prescriptions')} style={{ fontSize:12, color:T.teal, background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>
                View all prescriptions →
              </button>
            </Card>
            <Card>
              <SectionHeader title="Quick Actions"/>
              {[
                { label:'📋 View my prescriptions', action: () => setTab('My Prescriptions') },
                { label:'💊 Order medicines',        action: () => setTab('Order Medicines') },
                { label:'📊 My progress reports',    action: () => window.location.href='/patient/reports' },
              ].map((a,i) => (
                <button key={i} onClick={a.action} style={{ display:'block', width:'100%', textAlign:'left', padding:'10px 14px', background:T.card2, border:`1px solid ${T.borderS}`, borderRadius:'var(--r-md)', fontSize:13, fontWeight:600, color:T.text1, cursor:'pointer', marginBottom:8, transition:'all .2s', fontFamily:'Outfit,sans-serif' }}
                  onMouseOver={e => { e.currentTarget.style.borderColor=T.teal; e.currentTarget.style.color=T.teal }}
                  onMouseOut={e => { e.currentTarget.style.borderColor=T.borderS; e.currentTarget.style.color=T.text1 }}>
                  {a.label}
                </button>
              ))}
            </Card>
          </div>
        </div>
      )}

      {/* ── MY PRESCRIPTIONS TAB ── */}
      {tab === 'My Prescriptions' && (
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {rxLoading ? <Spinner/> : prescriptions.length === 0 ? (
            <Card style={{ textAlign:'center', padding:'52px 20px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:15, fontWeight:700, color:T.text1, marginBottom:6 }}>No prescriptions yet</div>
              <div style={{ fontSize:13, color:T.text3 }}>Your doctor will add prescriptions after your consultation.</div>
            </Card>
          ) : prescriptions.map((rx, i) => {
            const meds = Array.isArray(rx.medications) ? rx.medications : []
            return (
              <Card key={rx.id}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:T.text1 }}>Prescription {prescriptions.length - i}</div>
                    <div style={{ fontSize:12, color:T.text3, marginTop:2 }}>
                      Issued: {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'long', year:'numeric'}) : '—'}
                    </div>
                  </div>
                  <div style={{ display:'flex', gap:8 }}>
                    <Badge type="success">Active</Badge>
                    <button onClick={() => { addPrescriptionToCart(rx); setTab('Order Medicines') }}
                      style={{ fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:100, border:'none', background:T.teal, color:'#fff', cursor:'pointer', boxShadow:'0 4px 12px rgba(79,176,179,.3)' }}>
                      Order all medicines
                    </button>
                  </div>
                </div>

                {/* Medicines list */}
                <div style={{ marginBottom: rx.notes ? 14 : 0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Prescribed Medicines</div>
                  {meds.length === 0 ? (
                    <div style={{ fontSize:13, color:T.text3 }}>No medicines listed</div>
                  ) : meds.map((m, j) => {
                    const name = String(m.name || m.medicine_name || 'Unknown')
                    const dose = String(m.dose || m.dosage || '')
                    const freq = String(m.frequency || '')
                    const dur  = String(m.duration || '')
                    const inCart = cart.find(x => x.name.toLowerCase().includes(name.toLowerCase()))
                    return (
                      <div key={j} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 14px', background:T.card2, borderRadius:'var(--r-md)', border:`1px solid ${T.borderS}`, marginBottom:8 }}>
                        <div style={{ width:36, height:36, borderRadius:'50%', background:'rgba(79,176,179,.1)', border:`2px solid rgba(79,176,179,.2)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>💊</div>
                        <div style={{ flex:1 }}>
                          <div style={{ fontSize:14, fontWeight:700, color:T.text1 }}>{name}</div>
                          <div style={{ fontSize:12, color:T.text2, marginTop:2 }}>
                            {[dose, freq, dur].filter(Boolean).join(' · ') || 'As directed'}
                          </div>
                        </div>
                        {inCart ? (
                          <Badge type="success">In cart ✓</Badge>
                        ) : (
                          <button onClick={() => {
                            const match = medicines.find(med => med.name.toLowerCase().includes(name.toLowerCase()))
                            if (match) { addToCart(match, calcQty(freq, dur)); setTab('Order Medicines') }
                            else alert(`${name} not found in inventory. Contact pharmacist.`)
                          }} style={{ fontSize:12, fontWeight:700, padding:'6px 14px', borderRadius:100, border:`1.5px solid ${T.teal}`, background:'transparent', color:T.teal, cursor:'pointer', transition:'all .2s', whiteSpace:'nowrap' }}>
                            Order
                          </button>
                        )}
                      </div>
                    )
                  })}
                </div>

                {rx.notes && typeof rx.notes === 'string' && (
                  <div style={{ padding:'10px 14px', background:'rgba(245,200,66,.06)', borderRadius:'var(--r-md)', border:'1px solid rgba(245,200,66,.2)', fontSize:13, color:T.text2 }}>
                    <span style={{ fontWeight:700, color:'#9a6d00' }}>Doctor's note: </span>{rx.notes}
                  </div>
                )}
              </Card>
            )
          })}
        </div>
      )}

      {/* ── ORDER MEDICINES TAB ── */}
      {tab === 'Order Medicines' && (
        <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:18 }}>
          {/* Medicine browser */}
          <div>
            <div style={{ marginBottom:16 }}>
              <input value={search} onChange={e => setSearch(e.target.value)}
                placeholder="Search medicines by name or category..."
                style={{ borderRadius:100, fontSize:14 }}/>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(200px,1fr))', gap:12 }}>
              {filteredMeds.map(med => {
                const inCart = cart.find(x => x.id === med.id)
                const outOfStock = med.stock_quantity === 0 || med.stock === 0
                return (
                  <div key={med.id} style={{ background:T.card, borderRadius:'var(--r-lg)', border:`1px solid ${inCart?'rgba(79,176,179,.4)':T.borderS}`, overflow:'hidden', boxShadow:'var(--sh)', transition:'all .25s', cursor: outOfStock ? 'default' : 'pointer', opacity: outOfStock ? 0.6 : 1 }}
                    onMouseOver={e => { if (!outOfStock) e.currentTarget.style.transform='translateY(-3px)' }}
                    onMouseOut={e => e.currentTarget.style.transform='none'}>
                    <div style={{ padding:'14px 14px 0' }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:6 }}>
                        <div style={{ fontSize:14, fontWeight:800, color:T.text1, lineHeight:1.3 }}>{med.name}</div>
                        {med.rx_required && <Badge type="warning" style={{ flexShrink:0 }}>Rx</Badge>}
                      </div>
                      <div style={{ fontSize:11, color:T.text3, marginBottom:4 }}>{med.category}</div>
                      <div style={{ fontSize:12, color:T.text2, marginBottom:10 }}>{med.strength} · {med.dosage_form}</div>
                      <div style={{ fontSize:16, fontWeight:900, color:T.teal, marginBottom:12 }}>₹{med.price}</div>
                    </div>
                    <div style={{ padding:'0 14px 14px' }}>
                      {outOfStock ? (
                        <div style={{ fontSize:11, color:T.danger, fontWeight:700 }}>Out of stock</div>
                      ) : inCart ? (
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <button onClick={() => setCart(p => p.map(x => x.id===med.id ? {...x,qty:Math.max(1,x.qty-1)} : x))} style={{ width:26,height:26,borderRadius:'50%',border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',fontSize:16,color:T.text1 }}>-</button>
                          <span style={{ fontSize:14, fontWeight:700, color:T.text1 }}>{inCart.qty}</span>
                          <button onClick={() => setCart(p => p.map(x => x.id===med.id ? {...x,qty:x.qty+1} : x))} style={{ width:26,height:26,borderRadius:'50%',border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',fontSize:16,color:T.text1 }}>+</button>
                          <button onClick={() => setCart(p => p.filter(x => x.id !== med.id))} style={{ marginLeft:'auto',fontSize:18,color:T.danger,background:'none',border:'none',cursor:'pointer' }}>×</button>
                        </div>
                      ) : (
                        <button onClick={() => addToCart(med)} style={{ width:'100%', padding:'8px', borderRadius:100, border:'none', background:T.teal, color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 3px 10px rgba(79,176,179,.25)' }}>
                          Add to cart
                        </button>
                      )}
                    </div>
                  </div>
                )
              })}
              {filteredMeds.length === 0 && (
                <div style={{ gridColumn:'1/-1', textAlign:'center', padding:'40px', color:T.text3, fontSize:13 }}>No medicines found</div>
              )}
            </div>
          </div>

          {/* Cart */}
          <div style={{ position:'sticky', top:80 }}>
            <Card>
              <SectionHeader title={`Cart (${cart.length} items)`}/>
              {cart.length === 0 ? (
                <div style={{ textAlign:'center', padding:'32px 0', color:T.text3, fontSize:13 }}>
                  <div style={{ fontSize:28, marginBottom:8 }}>🛒</div>
                  Add medicines from your prescription or browse the catalogue
                </div>
              ) : (
                <>
                  {cart.map((m,i) => (
                    <div key={i} style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 0', borderBottom:`1px solid ${T.borderS}` }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text1 }}>{m.name}</div>
                        <div style={{ fontSize:11, color:T.text3 }}>
                          ₹{m.price} each
                          {m.freq && m.dur && <span style={{ marginLeft:6, color:'var(--teal)' }}>· {m.freq} × {m.dur}</span>}
                        </div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                        <button onClick={() => setCart(p => p.map(x => x.id===m.id ? {...x,qty:Math.max(1,x.qty-1)} : x))} style={{ width:22,height:22,borderRadius:'50%',border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',color:T.text1 }}>-</button>
                        <span style={{ fontSize:13, fontWeight:700, minWidth:16, textAlign:'center' }}>{m.qty}</span>
                        <button onClick={() => setCart(p => p.map(x => x.id===m.id ? {...x,qty:x.qty+1} : x))} style={{ width:22,height:22,borderRadius:'50%',border:`1px solid ${T.border}`,background:'transparent',cursor:'pointer',color:T.text1 }}>+</button>
                        <button onClick={() => setCart(p => p.filter(x => x.id !== m.id))} style={{ fontSize:16, color:T.danger, background:'none', border:'none', cursor:'pointer' }}>×</button>
                      </div>
                    </div>
                  ))}

                  <div style={{ display:'flex', justifyContent:'space-between', padding:'14px 0 10px', borderTop:`2px solid ${T.border}`, marginTop:4 }}>
                    <span style={{ fontSize:14, fontWeight:700, color:T.text1 }}>Total</span>
                    <span style={{ fontSize:20, fontWeight:900, color:T.teal }}>₹{cart.reduce((s,m) => s + (m.price||0)*m.qty, 0).toFixed(0)}</span>
                  </div>

                  <PrimaryBtn onClick={placeOrder} style={{ width:'100%', justifyContent:'center', marginBottom:8 }}>
                    Place Order
                  </PrimaryBtn>
                  <GhostBtn onClick={() => setCart([])} style={{ width:'100%', justifyContent:'center' }}>Clear cart</GhostBtn>
                </>
              )}
            </Card>

            {/* Prescription shortcut */}
            {prescriptions.length > 0 && (
              <Card style={{ marginTop:14 }}>
                <SectionHeader title="Order from Prescription"/>
                <div style={{ fontSize:12, color:T.text2, marginBottom:12, lineHeight:1.65 }}>
                  Click below to auto-add all medicines from your latest prescription to the cart.
                </div>
                <PrimaryBtn small onClick={() => addPrescriptionToCart(prescriptions[0])} style={{ width:'100%', justifyContent:'center' }}>
                  Add latest prescription
                </PrimaryBtn>
              </Card>
            )}
          </div>
        </div>
      )}

      {/* Rx Required Modal */}
      {rxModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(56,79,75,.5)', backdropFilter:'blur(6px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setRxModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, borderRadius:'var(--r-xl)', padding:32, maxWidth:420, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>🔒</div>
            <div style={{ fontSize:18, fontWeight:800, color:T.text1, marginBottom:8 }}>Prescription Required</div>
            <div style={{ fontSize:13, color:T.text2, marginBottom:20, lineHeight:1.7 }}>
              <strong>{rxModal.name}</strong> requires a valid prescription from your doctor. Please ask your doctor to prescribe it, then it will appear in your "My Prescriptions" tab and unlock here automatically.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <PrimaryBtn onClick={() => { setRxModal(null); setTab('My Prescriptions') }}>View my prescriptions</PrimaryBtn>
              <GhostBtn onClick={() => setRxModal(null)}>Cancel</GhostBtn>
            </div>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {qrModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(56,79,75,.5)', backdropFilter:'blur(6px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setQrModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, borderRadius:'var(--r-xl)', padding:32, maxWidth:380, width:'90%', textAlign:'center' }}>
            <div style={{ fontSize:18, fontWeight:800, color:T.text1, marginBottom:4 }}>Scan to Pay</div>
            <div style={{ fontSize:13, color:T.text2, marginBottom:20 }}>₹{cart.reduce((s,m) => s+(m.price||0)*m.qty, 0).toFixed(0)} · {cart.length} item{cart.length>1?'s':''}</div>
            <div style={{ width:160, height:160, margin:'0 auto 20px', background:'#fff', borderRadius:12, padding:10, border:'2px solid var(--teal)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="140" height="140" viewBox="0 0 140 140" xmlns="http://www.w3.org/2000/svg">
                <rect width="140" height="140" fill="white"/>
                <rect x="4" y="4" width="38" height="38" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="98" y="4" width="38" height="38" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="4" y="98" width="38" height="38" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="12" y="12" width="22" height="22" rx="2" fill="#384F4B"/>
                <rect x="106" y="12" width="22" height="22" rx="2" fill="#384F4B"/>
                <rect x="12" y="106" width="22" height="22" rx="2" fill="#384F4B"/>
                {[...Array(8)].map((_,i) => [...Array(8)].map((_,j) => (
                  (i+j+i*j)%3!==0 && <rect key={`${i}-${j}`} x={50+j*5} y={50+i*5} width="4" height="4" fill="#384F4B" opacity="0.8"/>
                )))}
              </svg>
            </div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:20 }}>PhonePe / GPay / Paytm · UPI: pharmacy@neurostride</div>
            <div style={{ display:'flex', gap:10 }}>
              <PrimaryBtn onClick={confirmPayment} style={{ flex:1, justifyContent:'center' }}>Confirm Payment ✓</PrimaryBtn>
              <GhostBtn onClick={() => setQrModal(false)}>Cancel</GhostBtn>
            </div>
          </div>
        </div>
      )}

      <style jsx global>{`
        @keyframes bounce { 0%,80%,100%{transform:scale(0)} 40%{transform:scale(1)} }
      `}</style>
    </Layout>
  )
}
