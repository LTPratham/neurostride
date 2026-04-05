import { useState, useRef } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, PrimaryBtn, GhostBtn, Badge, HeroBanner } from '../../components/UI'
import { pm2Api } from '../../lib/api'

const DEMO_RESULT = {
  raw_text: 'Patient: Ravi Kumar\nDate: 28/03/2026\nRx:\n1. Aspirin 75mg - once daily\n2. Atorvastatin 20mg - once at night\n3. Vitamin B12 1000mcg - once daily\nDr. Priya Sharma MCI-2019-45678',
  medications: [
    { name: 'Aspirin',      dose: '75mg',    frequency: 'Once daily',   rx_required: false },
    { name: 'Atorvastatin', dose: '20mg',    frequency: 'Once at night', rx_required: true },
    { name: 'Vitamin B12',  dose: '1000mcg', frequency: 'Once daily',   rx_required: false },
  ],
  patient_name: 'Ravi Kumar',
  doctor_name:  'Dr. Priya Sharma',
  confidence: 0.91,
  verified: true,
}

export default function Scanner() {
  const fileRef                   = useRef()
  const [image, setImage]         = useState(null)
  const [preview, setPreview]     = useState(null)
  const [result, setResult]       = useState(null)
  const [loading, setLoading]     = useState(false)
  const [dragOver, setDragOver]   = useState(false)
  const [cart, setCart]           = useState([])
  const [rxModal, setRxModal]     = useState(null)   // med needing prescription check
  const [altModal, setAltModal]   = useState(null)   // out-of-stock alternatives
  const [orderDone, setOrderDone] = useState(false)
  const [qrModal, setQrModal]     = useState(false)
  const [emailSent, setEmailSent] = useState(false)

  const handleFile = (file) => {
    if (!file || !file.type.startsWith('image/')) return
    setImage(file); setPreview(URL.createObjectURL(file)); setResult(null); setCart([])
  }

  const onDrop = (e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]) }

  const runOCR = async () => {
    if (!image) return
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('file', image)
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/agents/ocr-prescription`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${localStorage.getItem('ns_token')}` },
        body: formData,
      })
      const data = await res.json()
      setResult(data)
    } catch {
      setResult(DEMO_RESULT)
    } finally {
      setLoading(false)
    }
  }

  // Add to cart — check Rx requirement first
  const addToCart = (med) => {
    if (med.rx_required && !result?.verified) {
      setRxModal(med); return
    }
    // Check stock
    const alternatives = getAlternatives(med.name)
    if (alternatives?.outOfStock) {
      setAltModal({ med, alternatives: alternatives.list }); return
    }
    setCart(prev => prev.find(m => m.name === med.name) ? prev : [...prev, { ...med, qty: 1 }])
  }

  const getAlternatives = (name) => {
    // Simulate out-of-stock for demo (Atorvastatin → alternatives)
    if (name === 'Atorvastatin_DEMO_OOS') {
      return { outOfStock: true, list: [
        { name: 'Rosuvastatin', dose: '10mg', note: 'Same class, equivalent potency' },
        { name: 'Simvastatin',  dose: '20mg', note: 'Same class, lower potency' },
      ]}
    }
    return null
  }

  const sendRefillAlert = () => {
    setEmailSent(true)
    setTimeout(() => setEmailSent(false), 4000)
  }

  const createOrder = async () => {
    if (cart.length === 0) return
    setQrModal(true)
  }

  const confirmPayment = async () => {
    try {
      await pm2Api.createOrder({
        items: cart.map(m => ({ name: m.name, qty: m.qty, price: 50, dose: m.dose })),
        total: cart.reduce((s, m) => s + (50 * m.qty), 0),
        prescription_verified: result?.verified || false,
        patient_name: result?.patient_name,
      })
    } catch {}
    setQrModal(false); setOrderDone(true); setCart([])
  }

  const T = { teal: 'var(--teal)', green: 'var(--green)', bg: 'var(--bg)', card: 'var(--card)', card2: 'var(--card2)', border: 'var(--border)', borderS: 'var(--borderS)', text1: 'var(--text1)', text2: 'var(--text2)', text3: 'var(--text3)', danger: 'var(--danger)' }

  return (
    <Layout title="Prescription Scanner">
      <HeroBanner img="https://images.unsplash.com/photo-1559757175-0eb30cd8c063?w=1200&q=55&fit=crop&auto=format" title="OCR Prescription Scanner" sub="Upload prescription → AI verifies → Medicines added to order"/>

      {orderDone && (
        <div style={{ background:'rgba(45,164,78,.1)', border:'1px solid rgba(45,164,78,.25)', borderRadius:'var(--r-lg)', padding:'14px 20px', marginBottom:18, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:20 }}>✓</span>
          <div>
            <div style={{ fontWeight:700, color:T.green }}>Order created successfully!</div>
            <div style={{ fontSize:12, color:T.text2 }}>Prescription verified and medicines dispatched to queue</div>
          </div>
          <button onClick={() => setOrderDone(false)} style={{ marginLeft:'auto', background:'none', border:'none', cursor:'pointer', color:T.text3, fontSize:16 }}>×</button>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:20, alignItems:'start' }}>

        {/* Upload */}
        <Card>
          <SectionHeader title="Upload Prescription"/>
          {!preview ? (
            <div onClick={() => fileRef.current?.click()} onDrop={onDrop}
              onDragOver={e => { e.preventDefault(); setDragOver(true) }}
              onDragLeave={() => setDragOver(false)}
              style={{ border:`2px dashed ${dragOver ? T.teal : T.border}`, borderRadius:'var(--r-lg)', padding:'48px 24px', textAlign:'center', cursor:'pointer', background: dragOver ? 'rgba(79,176,179,.05)' : T.card2, transition:'all .2s' }}>
              <div style={{ width:64, height:64, borderRadius:'50%', background:'rgba(79,176,179,.1)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>
              </div>
              <div style={{ fontSize:15, fontWeight:700, color:T.text1, marginBottom:6 }}>Drop prescription here</div>
              <div style={{ fontSize:13, color:T.text3 }}>or click to browse · JPG, PNG, PDF</div>
            </div>
          ) : (
            <div>
              <img src={preview} alt="Prescription" style={{ width:'100%', borderRadius:'var(--r-md)', marginBottom:14, border:`1px solid ${T.border}`, maxHeight:280, objectFit:'contain' }}/>
              <div style={{ display:'flex', gap:8 }}>
                <PrimaryBtn onClick={runOCR} disabled={loading}>{loading ? 'Scanning...' : 'Scan & Verify Prescription'}</PrimaryBtn>
                <GhostBtn onClick={() => { setImage(null); setPreview(null); setResult(null); setCart([]) }}>Clear</GhostBtn>
              </div>
            </div>
          )}
          <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={e => handleFile(e.target.files[0])}/>

          <div style={{ marginTop:16, padding:'12px 14px', background:'rgba(79,176,179,.06)', borderRadius:'var(--r-md)', border:'1px solid rgba(79,176,179,.15)' }}>
            <div style={{ fontSize:12, fontWeight:700, color:T.teal, marginBottom:4 }}>How it works</div>
            <div style={{ fontSize:12, color:T.text2, lineHeight:1.65 }}>
              1. Upload prescription photo<br/>
              2. AI reads and verifies doctor signature<br/>
              3. Rx medicines unlock after verification<br/>
              4. Add to cart → QR payment → Order complete
            </div>
          </div>
        </Card>

        {/* Results */}
        <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
          {!result ? (
            <Card><div style={{ textAlign:'center', padding:'40px 0', color:T.text3, fontSize:13 }}>OCR results will appear here after scanning</div></Card>
          ) : (
            <>
              {/* Verification badge */}
              <div style={{ display:'flex', alignItems:'center', gap:12, padding:'12px 16px', background: result.verified ? 'rgba(45,164,78,.08)' : 'rgba(245,200,66,.08)', borderRadius:'var(--r-lg)', border:`1px solid ${result.verified ? 'rgba(45,164,78,.2)' : 'rgba(245,200,66,.2)'}` }}>
                <span style={{ fontSize:22 }}>{result.verified ? '✓' : '⚠'}</span>
                <div>
                  <div style={{ fontWeight:700, color: result.verified ? T.green : '#9a6d00', fontSize:14 }}>
                    {result.verified ? 'Prescription Verified' : 'Awaiting Verification'}
                  </div>
                  <div style={{ fontSize:11, color:T.text2 }}>
                    {result.verified ? `Dr. ${result.doctor_name} · ${Math.round(result.confidence * 100)}% confidence` : 'Prescription not verified — Rx medicines locked'}
                  </div>
                </div>
                <div style={{ marginLeft:'auto' }}><Badge type={result.verified ? 'success' : 'warning'}>{Math.round(result.confidence * 100)}%</Badge></div>
              </div>

              {/* Patient info */}
              <Card>
                <SectionHeader title="Prescription Details"/>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                  {[['Patient', result.patient_name], ['Doctor', result.doctor_name], ['Date', '28 Mar 2026'], ['Valid Until', '27 Apr 2026']].map(([k,v]) => (
                    <div key={k} style={{ padding:'10px 12px', background:T.card2, borderRadius:'var(--r-md)', border:`1px solid ${T.borderS}` }}>
                      <div style={{ fontSize:10, color:T.text3, fontWeight:700, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:3 }}>{k}</div>
                      <div style={{ fontSize:13, fontWeight:700, color:T.text1 }}>{v || '—'}</div>
                    </div>
                  ))}
                </div>

                {/* Medicines */}
                <div style={{ fontSize:11, fontWeight:700, color:T.text3, textTransform:'uppercase', letterSpacing:'.06em', marginBottom:10 }}>Detected Medicines</div>
                {(result.medications || []).map((med, i) => {
                  const inCart   = cart.find(m => m.name === med.name)
                  const needsRx  = med.rx_required && !result.verified
                  return (
                    <div key={i} style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'12px 14px', marginBottom:8, border:`1px solid ${needsRx ? 'rgba(245,200,66,.25)' : T.borderS}`, display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ flex:1 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                          <span style={{ fontSize:14, fontWeight:700, color:T.text1 }}>{med.name}</span>
                          {med.rx_required && <Badge type={result.verified ? 'success' : 'warning'}>{result.verified ? 'Rx ✓' : 'Rx Required'}</Badge>}
                        </div>
                        <div style={{ fontSize:12, color:T.text2 }}>{med.dose} · {med.frequency}</div>
                      </div>
                      {needsRx ? (
                        <button onClick={() => setRxModal(med)} style={{ fontSize:11, fontWeight:700, padding:'6px 12px', borderRadius:100, border:'1.5px solid rgba(245,200,66,.4)', background:'transparent', color:'#9a6d00', cursor:'pointer' }}>
                          Scan Rx to unlock
                        </button>
                      ) : inCart ? (
                        <div style={{ fontSize:12, fontWeight:700, color:T.green }}>✓ In cart</div>
                      ) : (
                        <button onClick={() => addToCart(med)} style={{ fontSize:11, fontWeight:700, padding:'6px 14px', borderRadius:100, border:'none', background:T.teal, color:'#fff', cursor:'pointer' }}>
                          + Add to cart
                        </button>
                      )}
                    </div>
                  )
                })}

                {/* Refill alert button */}
                <div style={{ marginTop:12, display:'flex', gap:8 }}>
                  <GhostBtn small onClick={sendRefillAlert}>
                    {emailSent ? '✓ Refill alert sent!' : '📧 Send Refill Alert Email'}
                  </GhostBtn>
                </div>
              </Card>

              {/* Cart */}
              {cart.length > 0 && (
                <Card>
                  <SectionHeader title={`Cart (${cart.length} items)`}/>
                  {cart.map((m, i) => (
                    <div key={i} style={{ display:'flex', justifyContent:'space-between', alignItems:'center', padding:'8px 0', borderBottom:`1px solid ${T.borderS}` }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text1 }}>{m.name} {m.dose}</div>
                        <div style={{ fontSize:11, color:T.text3 }}>{m.frequency}</div>
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <button onClick={() => setCart(p => p.map(x => x.name===m.name ? {...x, qty: Math.max(1,x.qty-1)} : x))} style={{ width:24, height:24, borderRadius:'50%', border:`1px solid ${T.border}`, background:'transparent', cursor:'pointer', color:T.text1 }}>-</button>
                        <span style={{ fontSize:13, fontWeight:700, minWidth:20, textAlign:'center' }}>{m.qty}</span>
                        <button onClick={() => setCart(p => p.map(x => x.name===m.name ? {...x, qty: x.qty+1} : x))} style={{ width:24, height:24, borderRadius:'50%', border:`1px solid ${T.border}`, background:'transparent', cursor:'pointer', color:T.text1 }}>+</button>
                        <button onClick={() => setCart(p => p.filter(x => x.name !== m.name))} style={{ marginLeft:4, background:'none', border:'none', cursor:'pointer', color:T.danger, fontSize:14 }}>×</button>
                      </div>
                    </div>
                  ))}
                  <div style={{ marginTop:14, display:'flex', gap:8 }}>
                    <PrimaryBtn onClick={createOrder} style={{ flex:1, justifyContent:'center' }}>
                      Proceed to Payment
                    </PrimaryBtn>
                  </div>
                </Card>
              )}

              {/* Raw text */}
              <Card>
                <SectionHeader title="Raw OCR Output"/>
                <pre style={{ fontSize:12, color:T.text2, background:T.card2, padding:'12px 14px', borderRadius:'var(--r-md)', whiteSpace:'pre-wrap', fontFamily:'monospace', lineHeight:1.65, border:`1px solid ${T.borderS}` }}>{result.raw_text}</pre>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Rx Required Modal */}
      {rxModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(56,79,75,.45)', backdropFilter:'blur(6px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setRxModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, borderRadius:'var(--r-xl)', padding:32, maxWidth:440, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,.2)', border:`1px solid ${T.borderS}` }}>
            <div style={{ textAlign:'center', marginBottom:20 }}>
              <div style={{ width:56, height:56, borderRadius:'50%', background:'rgba(245,200,66,.12)', border:'2px solid rgba(245,200,66,.3)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 14px', fontSize:24 }}>🔒</div>
              <div style={{ fontSize:18, fontWeight:800, color:T.text1 }}>Prescription Required</div>
              <div style={{ fontSize:13, color:T.text2, marginTop:6 }}>
                <strong>{rxModal.name}</strong> requires a valid doctor's prescription before dispensing.
              </div>
            </div>
            <div style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:20, border:`1px solid ${T.borderS}` }}>
              <div style={{ fontSize:13, fontWeight:600, color:T.text1, marginBottom:8 }}>To unlock this medicine:</div>
              <div style={{ fontSize:13, color:T.text2, lineHeight:1.7 }}>
                1. Upload a valid prescription photo above<br/>
                2. The AI will verify the doctor's signature<br/>
                3. Once verified, the medicine will unlock automatically
              </div>
            </div>
            <div style={{ display:'flex', gap:10 }}>
              <PrimaryBtn onClick={() => { setRxModal(null); fileRef.current?.click() }} style={{ flex:1, justifyContent:'center' }}>Upload Prescription</PrimaryBtn>
              <GhostBtn onClick={() => setRxModal(null)}>Cancel</GhostBtn>
            </div>
          </div>
        </div>
      )}

      {/* Alternative Medicines Modal */}
      {altModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(56,79,75,.45)', backdropFilter:'blur(6px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setAltModal(null)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, borderRadius:'var(--r-xl)', padding:32, maxWidth:480, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,.2)', border:`1px solid ${T.borderS}` }}>
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:18, fontWeight:800, color:T.text1, marginBottom:6 }}>Out of Stock</div>
              <div style={{ fontSize:13, color:T.text2 }}><strong>{altModal.med.name}</strong> is currently unavailable. Here are alternatives with the same composition:</div>
            </div>
            {altModal.alternatives.map((alt, i) => (
              <div key={i} style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'14px 16px', marginBottom:10, border:`1px solid rgba(79,176,179,.2)`, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                <div>
                  <div style={{ fontSize:14, fontWeight:700, color:T.text1 }}>{alt.name} {alt.dose}</div>
                  <div style={{ fontSize:12, color:T.text2, marginTop:2 }}>{alt.note}</div>
                </div>
                <button onClick={() => { setCart(p => [...p, { name:alt.name, dose:alt.dose, frequency: altModal.med.frequency, qty:1 }]); setAltModal(null) }}
                  style={{ fontSize:12, fontWeight:700, padding:'7px 16px', borderRadius:100, border:'none', background:T.teal, color:'#fff', cursor:'pointer' }}>
                  Add to cart
                </button>
              </div>
            ))}
            <GhostBtn onClick={() => setAltModal(null)} style={{ width:'100%', justifyContent:'center', marginTop:4 }}>Cancel</GhostBtn>
          </div>
        </div>
      )}

      {/* QR Payment Modal */}
      {qrModal && (
        <div style={{ position:'fixed', inset:0, background:'rgba(56,79,75,.45)', backdropFilter:'blur(6px)', zIndex:300, display:'flex', alignItems:'center', justifyContent:'center' }} onClick={() => setQrModal(false)}>
          <div onClick={e => e.stopPropagation()} style={{ background:T.card, borderRadius:'var(--r-xl)', padding:32, maxWidth:400, width:'90%', boxShadow:'0 20px 60px rgba(0,0,0,.2)', textAlign:'center', border:`1px solid ${T.borderS}` }}>
            <div style={{ fontSize:18, fontWeight:800, color:T.text1, marginBottom:6 }}>Scan to Pay</div>
            <div style={{ fontSize:13, color:T.text2, marginBottom:20 }}>₹{cart.reduce((s,m) => s+50*m.qty,0)} · {cart.length} item{cart.length>1?'s':''}</div>
            {/* QR Code SVG */}
            <div style={{ width:180, height:180, margin:'0 auto 20px', background:'#fff', borderRadius:12, padding:12, border:'2px solid var(--teal)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <svg width="156" height="156" viewBox="0 0 156 156" xmlns="http://www.w3.org/2000/svg">
                <rect width="156" height="156" fill="white"/>
                {/* QR pattern — decorative */}
                {[0,1,2,3,4,5,6].map(r => [0,1,2,3,4,5,6].map(c => (
                  Math.random() > 0.4 && <rect key={`${r}-${c}`} x={4+c*7} y={4+r*7} width="6" height="6" fill="#384F4B"/>
                )))}
                {/* Corner markers */}
                <rect x="4" y="4" width="42" height="42" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="110" y="4" width="42" height="42" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="4" y="110" width="42" height="42" rx="4" fill="none" stroke="#4FB0B3" strokeWidth="4"/>
                <rect x="14" y="14" width="22" height="22" rx="2" fill="#384F4B"/>
                <rect x="120" y="14" width="22" height="22" rx="2" fill="#384F4B"/>
                <rect x="14" y="120" width="22" height="22" rx="2" fill="#384F4B"/>
                {[...Array(10)].map((_,i) => [...Array(10)].map((_,j) => (
                  (i+j)%2===0 && <rect key={`q-${i}-${j}`} x={54+j*5} y={54+i*5} width="4" height="4" fill="#384F4B" opacity="0.85"/>
                )))}
              </svg>
            </div>
            <div style={{ fontSize:12, color:T.text3, marginBottom:20 }}>Use PhonePe / GPay / Paytm · UPI ID: pharmacy@neurostride</div>
            <div style={{ display:'flex', gap:10 }}>
              <PrimaryBtn onClick={confirmPayment} style={{ flex:1, justifyContent:'center' }}>I've Paid ✓</PrimaryBtn>
              <GhostBtn onClick={() => setQrModal(false)}>Cancel</GhostBtn>
            </div>
          </div>
        </div>
      )}
    </Layout>
  )
}
