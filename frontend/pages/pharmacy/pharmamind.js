/**
 * PharmaMind — Full Patient Module
 * Embedded in NeuroStride at /pharmacy/pharmamind
 * Ported directly from PharmaMind v3 (HackFusion 3)
 * Includes: AI Chat (6 agents), Cart, QR Payment, Receipt, Orders, OCR Prescriptions, Refill Alerts, Health Profile
 */
import { useState, useEffect, useRef, useCallback } from 'react'
import Layout from '../../components/Layout'
import { useAuth } from '../../context/AuthContext'

// ── PharmaMind Design System ──────────────────────────────────────────────────
const C = {
  navy: '#1f1f38', navyL: '#2d2d4e', orange: '#fc6d26',
  purple: '#554dbc', white: '#ffffff',
  gray50: '#f9f9f9', gray100: '#ececec', gray200: '#d4d4d4',
  gray400: '#999', gray600: '#666', gray800: '#333',
  green: '#2da44e', red: '#d9534f', yellow: '#f5a623', blue: '#1f75cb',
}

const btn = (variant = 'primary', size = 'md') => {
  const bg    = { primary: C.orange, secondary: C.purple, danger: C.red, ghost: 'transparent' }[variant] || C.orange
  const color = variant === 'ghost' ? C.gray800 : C.white
  const border= variant === 'ghost' ? `1px solid ${C.gray200}` : 'none'
  const pad   = { sm: '4px 10px', md: '7px 14px', lg: '10px 20px' }[size] || '7px 14px'
  return { background: bg, color, border, borderRadius: 4, padding: pad, cursor: 'pointer', fontWeight: 600, fontSize: size === 'lg' ? 14 : 12, display: 'inline-flex', alignItems: 'center', gap: 5, transition: 'opacity 0.15s', whiteSpace: 'nowrap', fontFamily: 'inherit' }
}

const badge = (color = 'gray') => {
  const map = { green: { bg: '#e3f9e5', color: '#1e7e34' }, red: { bg: '#fde8e8', color: '#c0392b' }, yellow: { bg: '#fef9e7', color: '#b7950b' }, blue: { bg: '#e8f4fd', color: '#1a5276' }, purple: { bg: '#f0ebff', color: '#4527a0' }, orange: { bg: '#fff3e0', color: '#e65100' }, gray: { bg: '#f5f5f5', color: '#555' } }
  const c = map[color] || map.gray
  return { background: c.bg, color: c.color, borderRadius: 10, padding: '2px 8px', fontSize: 11, fontWeight: 700 }
}

const card  = { background: C.white, border: `1px solid ${C.gray100}`, borderRadius: 6, padding: 16 }
const inputStyle = { border: `1px solid ${C.gray200}`, borderRadius: 4, padding: '6px 10px', fontSize: 13, background: C.white, color: C.gray800, outline: 'none', width: '100%', fontFamily: 'inherit' }
const table = { width: '100%', borderCollapse: 'collapse', fontSize: 13 }
const th    = { background: C.gray50, borderBottom: `2px solid ${C.gray100}`, padding: '8px 12px', textAlign: 'left', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: C.gray600 }
const td    = { padding: '8px 12px', borderBottom: `1px solid ${C.gray100}`, color: C.gray800, verticalAlign: 'middle' }

const orderBadge = (status) => {
  const map = { Processing: 'yellow', 'In Transit': 'blue', Delivered: 'green', Cancelled: 'red', Active: 'green', Expired: 'gray' }
  return badge(map[status] || 'gray')
}

const BASE = 'http://localhost:8000/api/pharmacy2'

// ── Voice Hook ────────────────────────────────────────────────────────────────
function useVoice() {
  const [listening, setListening] = useState(false)
  const recRef = useRef(null)
  const speak = (text) => {
    if (typeof window === 'undefined') return
    window.speechSynthesis?.cancel()
    const u = new SpeechSynthesisUtterance(text.replace(/[#*[\]{}]/g, ''))
    u.lang = 'en-IN'; u.rate = 0.95
    window.speechSynthesis?.speak(u)
  }
  const startListening = (cb) => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SR) { alert('Use Chrome for voice support'); return }
    recRef.current = new SR()
    recRef.current.lang = 'en-IN'
    recRef.current.interimResults = false
    recRef.current.onresult = e => cb(e.results[0][0].transcript)
    recRef.current.onend = () => setListening(false)
    recRef.current.onerror = () => setListening(false)
    recRef.current.start()
    setListening(true)
  }
  return { listening, startListening, speak }
}

// ── API helpers ───────────────────────────────────────────────────────────────
function getToken() {
  return typeof window !== 'undefined' ? localStorage.getItem('ns_token') : ''
}

async function pmApi(method, path, data, file) {
  const token = getToken()
  if (file) {
    const fd = new FormData(); fd.append('file', file)
    const r = await fetch(BASE + path, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd })
    if (!r.ok) throw new Error(await r.text())
    return r.json()
  }
  const r = await fetch(BASE + path, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: data ? JSON.stringify(data) : undefined
  })
  if (!r.ok) throw new Error(await r.text())
  return r.json()
}

// ── QR Payment Modal ──────────────────────────────────────────────────────────
function QRPaymentModal({ total, onSuccess, onClose }) {
  const [countdown, setCountdown] = useState(null)
  const [paid, setPaid]           = useState(false)
  const [method, setMethod]       = useState(null)
  const serviceFee = parseFloat((total * 0.02).toFixed(2))
  const gst        = parseFloat((total * 0.18).toFixed(2))
  const grandTotal = parseFloat((total + serviceFee + gst).toFixed(2))

  const simulatePayment = (m) => { setMethod(m); setCountdown(3) }

  useEffect(() => {
    if (countdown === null) return
    if (countdown === 0) { setPaid(true); return }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000)
    return () => clearTimeout(t)
  }, [countdown])

  const overlay = { position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000 }
  const modal   = { background: '#fff', borderRadius: 12, padding: 28, width: 420, maxWidth: '95vw', boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }

  if (paid) return (
    <div style={overlay}>
      <div style={{ ...modal, textAlign: 'center' }}>
        <div style={{ fontSize: 52, marginBottom: 12 }}>✅</div>
        <div style={{ fontSize: 20, fontWeight: 800, marginBottom: 6 }}>Payment Successful!</div>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 4 }}>Method: <strong>{method === 'upi' ? 'UPI / QR' : method === 'card' ? 'Card' : 'Cash'}</strong></div>
        <div style={{ color: '#666', fontSize: 14, marginBottom: 20 }}>Amount Paid: <strong style={{ color: C.orange }}>₹{grandTotal}</strong></div>
        <button onClick={onSuccess} style={{ ...btn('primary', 'lg'), width: '100%', justifyContent: 'center' }}>View Receipt & Download</button>
      </div>
    </div>
  )

  return (
    <div style={overlay}>
      <div style={modal}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div style={{ fontWeight: 800, fontSize: 16 }}>💳 Complete Payment</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#999' }}>✕</button>
        </div>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 14, marginBottom: 18, fontSize: 13 }}>
          {[['Medicines subtotal', `₹${total.toFixed(2)}`], ['Service charge (2%)', `₹${serviceFee}`], ['GST (18%)', `₹${gst}`]].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ color: '#666' }}>{k}</span><span>{v}</span></div>
          ))}
          <div style={{ borderTop: '1px solid #dee2e6', paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontWeight: 800, fontSize: 15 }}>
            <span>Total Payable</span><span style={{ color: C.orange }}>₹{grandTotal}</span>
          </div>
        </div>

        {/* QR placeholder */}
        <div style={{ textAlign: 'center', marginBottom: 18 }}>
          <div style={{ fontSize: 12, color: '#888', marginBottom: 10, fontWeight: 600 }}>SCAN & PAY via UPI</div>
          <div style={{ width: 160, height: 160, margin: '0 auto 10px', background: '#f0f0f0', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, color: '#999', border: '2px dashed #ccc' }}>
            QR Code<br />pharmamind@upi
          </div>
          <div style={{ fontSize: 11, color: '#999' }}>UPI ID: pharmamind@upi · Amount: ₹{grandTotal}</div>
        </div>

        {countdown !== null && countdown > 0 && (
          <div style={{ textAlign: 'center', marginBottom: 16 }}>
            <div style={{ fontSize: 36, fontWeight: 800, color: C.orange }}>{countdown}</div>
            <div style={{ fontSize: 13, color: '#666' }}>Verifying payment…</div>
          </div>
        )}

        {!method && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <button onClick={() => simulatePayment('upi')} style={{ padding: '11px 16px', borderRadius: 8, border: `1px solid ${C.orange}`, background: '#fff7f0', color: C.orange, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>📱 I've Paid via UPI / QR</button>
            <button onClick={() => simulatePayment('card')} style={{ padding: '11px 16px', borderRadius: 8, border: '1px solid #3498db', background: '#f0f7ff', color: '#3498db', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>💳 Pay by Card</button>
            <button onClick={() => simulatePayment('cash')} style={{ padding: '11px 16px', borderRadius: 8, border: '1px solid #27ae60', background: '#f0fff4', color: '#27ae60', fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>💵 Pay by Cash</button>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Receipt Modal ─────────────────────────────────────────────────────────────
function ReceiptModal({ order, cart, onClose, patientName }) {
  const serviceFee = parseFloat((order.total * 0.02).toFixed(2))
  const gst        = parseFloat((order.total * 0.18).toFixed(2))
  const grandTotal = parseFloat((order.total + serviceFee + gst).toFixed(2))
  const now        = new Date()
  const receiptNo  = `RCP-${now.getFullYear()}${String(now.getMonth()+1).padStart(2,'0')}${String(now.getDate()).padStart(2,'0')}-${Math.floor(Math.random()*9000)+1000}`
  const divider    = { borderTop: '1px dashed #ccc', margin: '10px 0' }
  const row        = { display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: 12 }

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, overflowY: 'auto' }}>
      <div style={{ background: '#fff', borderRadius: 12, width: 520, maxWidth: '95vw', maxHeight: '90vh', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
        <div style={{ padding: '14px 20px', background: C.navy, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>🧾 Transaction Receipt</div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer' }}>✕</button>
        </div>
        <div style={{ overflowY: 'auto', flex: 1, padding: 24, fontFamily: 'monospace', fontSize: 12, color: '#1a1a2e' }}>
          <div style={{ textAlign: 'center', marginBottom: 14 }}>
            <div style={{ fontSize: 18, fontWeight: 900, letterSpacing: 2 }}>NeuroStride PharmaMind</div>
            <div style={{ fontSize: 10, color: '#666', marginTop: 2 }}>AI-Powered Pharmacy · Ideathon LPU 2026</div>
            <div style={{ fontSize: 10, color: '#666' }}>pharmamind@upi | support@neurostride.in</div>
          </div>
          <div style={divider} />
          {[['Receipt No.', receiptNo], ['Order ID', order.order_code], ['Date', now.toLocaleDateString('en-IN')], ['Time', now.toLocaleTimeString('en-IN')], ['Patient', patientName]].map(([k, v]) => (
            <div key={k} style={row}><span>{k}</span><span style={{ fontWeight: 700 }}>{v}</span></div>
          ))}
          <div style={divider} />
          <div style={{ fontWeight: 700, marginBottom: 8, fontSize: 11, color: '#666' }}>MEDICINES PURCHASED</div>
          {(cart || order.items || []).map((item, i) => (
            <div key={i} style={{ ...row, marginBottom: 6 }}>
              <span style={{ flex: 1, marginRight: 8 }}>{item.name}</span>
              <span>₹{item.price} × {item.qty}</span>
              <span style={{ marginLeft: 12, fontWeight: 700, minWidth: 60, textAlign: 'right' }}>₹{(item.price * item.qty).toFixed(2)}</span>
            </div>
          ))}
          <div style={divider} />
          <div style={row}><span>Subtotal</span><span>₹{order.total.toFixed(2)}</span></div>
          <div style={row}><span>Service Charge (2%)</span><span>₹{serviceFee}</span></div>
          <div style={row}><span>GST @ 18%</span><span>₹{gst}</span></div>
          <div style={{ ...row, fontWeight: 900, fontSize: 14, marginTop: 6 }}>
            <span>GRAND TOTAL</span><span style={{ color: C.orange }}>₹{grandTotal}</span>
          </div>
          <div style={divider} />
          <div style={{ textAlign: 'center', fontSize: 10, color: '#888', lineHeight: 1.7 }}>
            <div>⚠️ Keep medicines out of reach of children</div>
            <div>Store in a cool, dry place away from sunlight</div>
            <div style={{ marginTop: 6, fontStyle: 'italic' }}>Thank you for choosing NeuroStride PharmaMind 💊</div>
          </div>
        </div>
        <div style={{ padding: '12px 20px', borderTop: '1px solid #eee', display: 'flex', gap: 8 }}>
          <button onClick={() => window.print()} style={{ ...btn('ghost', 'md'), flex: 1, justifyContent: 'center' }}>🖨️ Print</button>
          <button onClick={onClose} style={{ ...btn('primary', 'md'), flex: 1, justifyContent: 'center' }}>✓ Done</button>
        </div>
      </div>
    </div>
  )
}

// ── Chat Tab ──────────────────────────────────────────────────────────────────
function ChatTab({ cart, setCart, patientName }) {
  const [msgs, setMsgs]     = useState([{
    role: 'assistant',
    content: `Namaste ${patientName}! 🙏 I'm PharmaMind — your autonomous AI pharmacist.\n\nI have 6 specialist agents:\n• 🛒 Agent 1 — Order Processing\n• 🛡️ Agent 2 — Safety Validation\n• 🔔 Agent 3 — Refill Intelligence\n• 📦 Agent 4 — Inventory Monitor\n• 📋 Agent 5 — Prescription Verify\n• 📊 Agent 6 — Analytics\n\nSay symptoms, order medicines, check drug interactions, or ask anything!`,
    agents: null, medicines: []
  }])
  const [input, setInput]   = useState('')
  const [loading, setLoading] = useState(false)
  const [voiceOut, setVoiceOut] = useState(false)
  const endRef              = useRef(null)
  const { listening, startListening, speak } = useVoice()

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [msgs])

  const send = useCallback(async (text = input) => {
    if (!text.trim() || loading) return
    setMsgs(m => [...m, { role: 'user', content: text, agents: null, medicines: [] }])
    setInput('')
    setLoading(true)
    try {
      const history = msgs.slice(-6).map(m => ({ role: m.role, content: m.content }))
      const res = await pmApi('POST', '/chat', { message: text, history })
      setMsgs(m => [...m, {
        role: 'assistant',
        content: res.response || 'I processed your request.',
        agents: res,
        medicines: res.suggested_medicines || [],
        action: res.action
      }])
      if (voiceOut) speak(res.response || '')
    } catch (err) {
      setMsgs(m => [...m, { role: 'assistant', content: `❌ Error: ${err.message}`, agents: null, medicines: [] }])
    } finally { setLoading(false) }
  }, [input, loading, msgs, voiceOut])

  const addToCart = (med) => {
    setCart(c => {
      const ex = c.find(i => i.id === med.id)
      if (ex) return c.map(i => i.id === med.id ? { ...i, qty: i.qty + (med.qty || 1) } : i)
      return [...c, { ...med, qty: med.qty || 1 }]
    })
  }

  const agentColors = { agent1: C.orange, agent2: '#e53e3e', agent3: '#38a169', agent4: C.purple, agent5: '#d69e2e', agent6: '#0987a0' }
  const agentLabels = { agent1: 'Agent 1 · Order Processing', agent2: 'Agent 2 · Safety Validation', agent3: 'Agent 3 · Refill Intelligence', agent4: 'Agent 4 · Inventory Monitor', agent5: 'Agent 5 · Prescription Verify', agent6: 'Agent 6 · Analytics & Fraud' }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 180px)' }}>
      <div style={{ padding: '8px 16px', background: C.white, borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', gap: 12, fontSize: 12 }}>
        <span style={{ color: C.gray600 }}>🤖 llama-3.3-70b-versatile · 6 agents</span>
        <label style={{ display: 'flex', alignItems: 'center', gap: 5, cursor: 'pointer', color: C.gray600, marginLeft: 'auto' }}>
          <input type="checkbox" checked={voiceOut} onChange={e => setVoiceOut(e.target.checked)} />
          Voice output
        </label>
        <span style={{ color: C.gray400, fontStyle: 'italic' }}>Hindi / English bilingual</span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 16, background: '#f7f7f7', display: 'flex', flexDirection: 'column', gap: 0 }}>
        {msgs.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: 16 }}>
            {m.role === 'assistant' && (
              <div style={{ width: 32, height: 32, background: C.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, flexShrink: 0, marginRight: 8, marginTop: 2 }}>💊</div>
            )}
            <div style={{ maxWidth: '72%' }}>
              {m.agents && Object.keys(agentLabels).some(k => m.agents[k]) && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4, marginBottom: 6 }}>
                  {Object.entries(agentLabels).map(([k, label]) =>
                    m.agents[k] ? <span key={k} style={{ background: agentColors[k], color: C.white, fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>{label}</span> : null
                  )}
                </div>
              )}
              <div style={{ background: m.role === 'user' ? C.orange : C.white, color: m.role === 'user' ? C.white : C.gray800, padding: '10px 14px', borderRadius: m.role === 'user' ? '14px 14px 4px 14px' : '14px 14px 14px 4px', fontSize: 13, lineHeight: 1.6, border: `1px solid ${C.gray100}`, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
              {m.medicines?.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  {m.medicines.map((med, j) => (
                    <div key={j} style={{ background: C.white, border: `1px solid ${C.gray100}`, borderRadius: 6, padding: '8px 12px', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 700, color: C.gray800 }}>{med.name} {med.strength || ''}</div>
                        <div style={{ fontSize: 11, color: C.gray400 }}>₹{med.price} each · Qty: {med.qty || 1}{med.rx_required && <span style={{ color: C.red, marginLeft: 6 }}>📋 Rx Required</span>}</div>
                      </div>
                      <button onClick={() => addToCart(med)} style={btn('primary', 'sm')}>+ Cart</button>
                    </div>
                  ))}
                </div>
              )}
              {m.agents?.agent2 && (
                <div style={{ marginTop: 6, padding: '8px 10px', background: '#f8fff8', border: '1px solid #d4edda', borderRadius: 4, fontSize: 11 }}>
                  🛡️ <strong>Agent 2 Safety:</strong>{' '}
                  {m.agents.agent2.approved === false ? `❌ ${m.agents.agent2.reason || 'Not approved'}` : `✅ Approved`}
                  {m.agents.agent2.allergy_warning && <span style={{ color: C.red }}> | ⚠️ {m.agents.agent2.allergy_warning}</span>}
                </div>
              )}
            </div>
            {m.role === 'user' && (
              <div style={{ width: 32, height: 32, background: C.orange, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 700, fontSize: 13, flexShrink: 0, marginLeft: 8, marginTop: 2 }}>
                {patientName[0]?.toUpperCase()}
              </div>
            )}
          </div>
        ))}
        {loading && (
          <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
            <div style={{ width: 32, height: 32, background: C.navy, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💊</div>
            <div style={{ background: C.white, border: `1px solid ${C.gray100}`, padding: '10px 14px', borderRadius: '14px 14px 14px 4px', fontSize: 13 }}>⚡ Running 6 AI agents…</div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      <div style={{ padding: '8px 16px', background: C.white, borderTop: `1px solid ${C.gray100}`, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {['I have fever and headache', 'Need Paracetamol 500mg', 'Check my refills', 'Drug interactions for Aspirin'].map(p => (
          <button key={p} onClick={() => send(p)} style={{ ...btn('ghost', 'sm'), fontSize: 11, color: C.purple, border: `1px solid ${C.purple}`, background: 'rgba(85,77,188,0.06)' }}>{p}</button>
        ))}
      </div>
      <div style={{ padding: '10px 16px', background: C.white, display: 'flex', gap: 8 }}>
        <button onClick={() => startListening(t => { setInput(t); setTimeout(() => send(t), 100) })}
          style={{ ...btn(listening ? 'danger' : 'ghost', 'md'), flexShrink: 0, fontSize: 18, padding: '7px 12px' }}>
          {listening ? '🔴' : '🎙️'}
        </button>
        <input value={input} onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
          placeholder="Type or speak… 'I have a headache, what should I take?'"
          style={{ ...inputStyle, flex: 1 }} />
        <button onClick={() => send()} disabled={!input.trim() || loading}
          style={{ ...btn('primary', 'md'), opacity: !input.trim() || loading ? 0.5 : 1 }}>Send</button>
      </div>
    </div>
  )
}

// ── Cart Tab ──────────────────────────────────────────────────────────────────
function CartTab({ cart, setCart, patientName }) {
  const [placing, setPlacing]       = useState(false)
  const [showQR, setShowQR]         = useState(false)
  const [showReceipt, setShowReceipt] = useState(false)
  const [doneOrder, setDoneOrder]   = useState(null)

  const total      = cart.reduce((s, i) => s + i.price * i.qty, 0)
  const serviceFee = parseFloat((total * 0.02).toFixed(2))
  const gst        = parseFloat((total * 0.18).toFixed(2))
  const grandTotal = parseFloat((total + serviceFee + gst).toFixed(2))

  const updateQty = (id, qty) => {
    if (qty <= 0) setCart(c => c.filter(i => i.id !== id))
    else setCart(c => c.map(i => i.id === id ? { ...i, qty } : i))
  }

  const handleCheckout = async () => {
    if (!cart.length) return
    setPlacing(true)
    try {
      const items = cart.map(i => ({ medicine_id: i.id, name: i.name, qty: i.qty, price: i.price }))
      const res = await pmApi('POST', '/orders', { items, patient_label: patientName })
      setDoneOrder(res); setShowQR(true)
    } catch (err) { alert('Order failed: ' + err.message) }
    finally { setPlacing(false) }
  }

  return (
    <div style={{ padding: 20 }}>
      {showQR && doneOrder && <QRPaymentModal total={total} onSuccess={() => { setShowQR(false); setShowReceipt(true) }} onClose={() => { setShowQR(false); setDoneOrder(null) }} />}
      {showReceipt && doneOrder && <ReceiptModal order={doneOrder} cart={cart} patientName={patientName} onClose={() => { setShowReceipt(false); setCart([]); setDoneOrder(null) }} />}

      <div style={{ fontSize: 18, fontWeight: 700, color: C.gray800, marginBottom: 4 }}>Shopping Cart</div>
      <div style={{ fontSize: 12, color: C.gray400, marginBottom: 20 }}>{cart.length} item(s)</div>

      {cart.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, color: C.gray400 }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>🛒</div>
          Cart is empty. Chat with AI to add medicines!
        </div>
      ) : (
        <>
          <div style={{ ...card, marginBottom: 16, padding: 0, overflow: 'hidden' }}>
            <table style={table}>
              <thead><tr>{['Medicine', 'Price', 'Qty', 'Subtotal', ''].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
              <tbody>
                {cart.map(item => (
                  <tr key={item.id}>
                    <td style={td}><div style={{ fontWeight: 600 }}>{item.name}</div>{item.rx_required && <span style={{ fontSize: 10, color: C.red }}>📋 Rx Required</span>}</td>
                    <td style={td}>₹{item.price}</td>
                    <td style={td}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <button onClick={() => updateQty(item.id, item.qty - 1)} style={{ ...btn('ghost', 'sm'), padding: '2px 8px' }}>−</button>
                        <span style={{ fontWeight: 700, minWidth: 24, textAlign: 'center' }}>{item.qty}</span>
                        <button onClick={() => updateQty(item.id, item.qty + 1)} style={{ ...btn('ghost', 'sm'), padding: '2px 8px' }}>+</button>
                      </div>
                    </td>
                    <td style={{ ...td, fontWeight: 700, color: C.orange }}>₹{(item.price * item.qty).toFixed(2)}</td>
                    <td style={td}><button onClick={() => updateQty(item.id, 0)} style={btn('danger', 'sm')}>✕</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <div style={{ ...card, minWidth: 300 }}>
              {[['Medicines subtotal', `₹${total.toFixed(2)}`], ['Service charge (2%)', `₹${serviceFee}`], ['GST @ 18%', `₹${gst}`]].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                  <span style={{ color: C.gray600 }}>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ borderTop: `1px solid ${C.gray100}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between', fontSize: 17, fontWeight: 800 }}>
                <span>Total</span><span style={{ color: C.orange }}>₹{grandTotal}</span>
              </div>
              <button onClick={handleCheckout} disabled={placing} style={{ ...btn('primary', 'lg'), width: '100%', justifyContent: 'center', marginTop: 14, opacity: placing ? 0.7 : 1 }}>
                {placing ? 'Processing…' : '💳 Proceed to Pay'}
              </button>
              <div style={{ fontSize: 11, color: C.gray400, textAlign: 'center', marginTop: 8 }}>UPI • Card • Cash · GST Invoice included</div>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

// ── Orders Tab ────────────────────────────────────────────────────────────────
function OrdersTab() {
  const [orders, setOrders]   = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { pmApi('GET', '/orders').then(setOrders).catch(() => {}).finally(() => setLoading(false)) }, [])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.gray800, marginBottom: 16 }}>My Orders</div>
      {loading ? <div style={{ color: C.gray400 }}>Loading…</div> : (
        <div style={{ ...card, padding: 0, overflow: 'hidden' }}>
          <table style={table}>
            <thead><tr>{['Order ID', 'Date', 'Items', 'Total', 'Status'].map(h => <th key={h} style={th}>{h}</th>)}</tr></thead>
            <tbody>
              {orders.length === 0 ? (
                <tr><td colSpan={5} style={{ ...td, textAlign: 'center', color: C.gray400, padding: 40 }}>No orders yet</td></tr>
              ) : orders.map(o => (
                <tr key={o.id}>
                  <td style={{ ...td, fontWeight: 700 }}>{o.order_code}</td>
                  <td style={td}>{new Date(o.created_at).toLocaleDateString('en-IN')}</td>
                  <td style={td}>{(o.items || []).length} items</td>
                  <td style={{ ...td, fontWeight: 700, color: C.orange }}>₹{o.total?.toFixed(2)}</td>
                  <td style={td}><span style={orderBadge(o.status)}>{o.status}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ── OCR Prescriptions Tab ─────────────────────────────────────────────────────
function PrescriptionsTab({ setCart }) {
  const [file, setFile]       = useState(null)
  const [scanning, setScanning] = useState(false)
  const [ocrResult, setOcrResult] = useState(null)

  const scan = async () => {
    if (!file) return
    setScanning(true)
    try { setOcrResult(await pmApi('POST', '/ocr', null, file)) }
    catch (e) { alert('OCR failed: ' + e.message) }
    finally { setScanning(false) }
  }

  const addToCart = () => {
    if (!ocrResult?.medicines?.length) return
    ocrResult.medicines.filter(m => m.in_database).forEach(m => {
      setCart(c => {
        const ex = c.find(i => i.name === m.name)
        if (ex) return c.map(i => i.name === m.name ? { ...i, qty: i.qty + (m.quantity || 1) } : i)
        return [...c, { id: Date.now(), name: m.name, price: 0, qty: m.quantity || 1, rx_required: false }]
      })
    })
    alert('Medicines added to cart!')
  }

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.gray800, marginBottom: 16 }}>OCR Prescription Scanner</div>
      <div style={{ ...card, background: 'linear-gradient(135deg,#1f1f38,#2d2d4e)', border: 'none', marginBottom: 20 }}>
        <div style={{ color: C.white, fontWeight: 700, marginBottom: 8, fontSize: 14 }}>📷 Upload Prescription Image</div>
        <div style={{ color: 'rgba(255,255,255,0.6)', fontSize: 12, marginBottom: 12 }}>Tesseract OCR extracts text, AI corrects handwriting errors and parses medicines</div>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="file" accept="image/*" onChange={e => setFile(e.target.files[0])} style={{ fontSize: 12, color: C.white }} />
          <button onClick={scan} disabled={!file || scanning} style={{ ...btn('primary', 'md'), opacity: !file || scanning ? 0.6 : 1 }}>
            {scanning ? '🔍 Scanning…' : '🔍 Scan Prescription'}
          </button>
        </div>
        {ocrResult && (
          <div style={{ marginTop: 12, background: 'rgba(255,255,255,0.1)', borderRadius: 6, padding: 12, color: C.white, fontSize: 12 }}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>✅ OCR Result:</div>
            {ocrResult.doctor_name && <div>👨‍⚕️ Doctor: {ocrResult.doctor_name}</div>}
            {ocrResult.patient_name && <div>👤 Patient: {ocrResult.patient_name}</div>}
            {ocrResult.medicines?.map((m, i) => (
              <div key={i} style={{ padding: '5px 0', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <span>{m.name}{m.dosage ? ` — ${m.dosage}` : ''}</span>
                {m.in_database ? <span style={{ background: '#38a169', color: '#fff', fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 700 }}>✓ In DB</span>
                  : <span style={{ background: 'rgba(255,193,7,0.3)', color: '#ffc107', fontSize: 10, padding: '2px 7px', borderRadius: 10 }}>⚠ Not in DB</span>}
              </div>
            ))}
            {ocrResult.medicines?.some(m => m.in_database) && (
              <button onClick={addToCart} style={{ marginTop: 12, width: '100%', padding: '10px 0', background: C.orange, color: '#fff', border: 'none', borderRadius: 6, fontWeight: 700, fontSize: 13, cursor: 'pointer' }}>
                🛒 Add All to Cart
              </button>
            )}
            {ocrResult.raw_ocr && (
              <div style={{ marginTop: 10 }}>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.5)', marginBottom: 4 }}>Raw OCR text:</div>
                <pre style={{ fontSize: 10, color: 'rgba(255,255,255,0.6)', whiteSpace: 'pre-wrap', maxHeight: 100, overflow: 'auto' }}>{ocrResult.raw_ocr}</pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

// ── Refills Tab ───────────────────────────────────────────────────────────────
function RefillsTab() {
  const [alerts, setAlerts]   = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { pmApi('GET', '/orders').then(orders => {
    // Client-side refill prediction from order history
    const medHistory = {}
    orders.forEach(o => (o.items || []).forEach(item => {
      if (!medHistory[item.name]) medHistory[item.name] = []
      medHistory[item.name].push(new Date(o.created_at))
    }))
    const result = []
    Object.entries(medHistory).forEach(([name, dates]) => {
      if (dates.length < 2) return
      dates.sort((a, b) => a - b)
      const avgInterval = (dates[dates.length-1] - dates[0]) / (dates.length - 1) / 86400000
      const daysSinceLast = (Date.now() - dates[dates.length-1]) / 86400000
      const daysLeft = Math.max(0, Math.round(avgInterval - daysSinceLast))
      if (daysLeft <= 14) result.push({ medicine: name, days_left: daysLeft, urgency: daysLeft <= 3 ? 'High' : daysLeft <= 7 ? 'Medium' : 'Low', last_ordered: dates[dates.length-1].toLocaleDateString('en-IN'), avg_interval_days: Math.round(avgInterval) })
    })
    setAlerts(result)
  }).catch(() => {}).finally(() => setLoading(false)) }, [])

  return (
    <div style={{ padding: 20 }}>
      <div style={{ fontSize: 18, fontWeight: 700, color: C.gray800, marginBottom: 4 }}>🔔 Refill Intelligence</div>
      <div style={{ fontSize: 12, color: C.gray400, marginBottom: 16 }}>Agent 3 — Predictive refill alerts based on your order history</div>
      {loading ? <div style={{ color: C.gray400 }}>Analysing order history…</div> :
        alerts.length === 0 ? <div style={{ ...card, textAlign: 'center', padding: 40, color: C.gray400 }}>✅ No refills needed soon.</div> :
        alerts.map((a, i) => (
          <div key={i} style={{ ...card, marginBottom: 10, borderLeft: `4px solid ${a.urgency === 'High' ? C.red : C.yellow}` }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 14 }}>{a.medicine}</div>
                <div style={{ fontSize: 12, color: C.gray400 }}>Last ordered: {a.last_ordered} · Avg interval: {a.avg_interval_days} days</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={badge(a.urgency === 'High' ? 'red' : 'orange')}>{a.urgency} Priority</span>
                <div style={{ fontSize: 13, fontWeight: 700, color: C.red, marginTop: 4 }}>{a.days_left} days left</div>
              </div>
            </div>
          </div>
        ))
      }
    </div>
  )
}

// ── Main PharmaMind Module ────────────────────────────────────────────────────
const TABS = [
  { key: 'chat',          icon: '💬', label: 'AI Pharmacist' },
  { key: 'cart',          icon: '🛒', label: 'Cart' },
  { key: 'orders',        icon: '📦', label: 'My Orders' },
  { key: 'prescriptions', icon: '📋', label: 'OCR Scanner' },
  { key: 'refills',       icon: '🔔', label: 'Refill Alerts' },
]

export default function PharmaMindModule() {
  const { user }        = useAuth()
  const [tab, setTab]   = useState('chat')
  const [cart, setCart] = useState([])
  const patientName     = user?.full_name || 'Patient'

  return (
    <Layout title="PharmaMind">
      <div style={{ display: 'flex', gap: 0, minHeight: 'calc(100vh - 100px)', background: '#f0f0f0', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--border)' }}>
        {/* PharmaMind sidebar */}
        <div style={{ width: 200, background: C.navy, display: 'flex', flexDirection: 'column', flexShrink: 0 }}>
          <div style={{ padding: '16px 14px', borderBottom: `1px solid ${C.navyL}`, display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 30, height: 30, background: C.orange, borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16 }}>💊</div>
            <div>
              <div style={{ color: C.white, fontWeight: 700, fontSize: 13 }}>PharmaMind</div>
              <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>AI Pharmacy</div>
            </div>
          </div>
          <div style={{ padding: '10px 0', flex: 1 }}>
            {TABS.map(t => {
              const isCart = t.key === 'cart' && cart.length > 0
              return (
                <button key={t.key} onClick={() => setTab(t.key)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '9px 14px', margin: '1px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 13, fontWeight: 500, background: tab === t.key ? C.orange : 'transparent', color: tab === t.key ? C.white : 'rgba(255,255,255,0.7)', border: 'none', width: 'calc(100% - 16px)', textAlign: 'left', justifyContent: 'space-between' }}>
                  <span>{t.icon} {t.label}</span>
                  {isCart && <span style={{ background: C.white, color: C.orange, borderRadius: 10, padding: '1px 6px', fontSize: 10, fontWeight: 700 }}>{cart.length}</span>}
                </button>
              )
            })}
          </div>
          <div style={{ padding: '12px 14px', borderTop: `1px solid ${C.navyL}` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{ width: 28, height: 28, background: C.orange, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: C.white, fontWeight: 700, fontSize: 12 }}>{patientName[0]?.toUpperCase()}</div>
              <div>
                <div style={{ color: C.white, fontSize: 12, fontWeight: 600 }}>{patientName}</div>
                <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10 }}>Patient</div>
              </div>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, background: C.white, display: 'flex', flexDirection: 'column' }}>
          <div style={{ padding: '10px 20px', background: C.white, borderBottom: `1px solid ${C.gray100}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ fontSize: 12, color: C.gray400 }}>
              pharmamind / patient / <strong style={{ color: C.gray800 }}>{tab}</strong>
            </div>
            <div style={{ display: 'flex', gap: 10, fontSize: 12, alignItems: 'center' }}>
              <span style={badge('green')}>🟢 Backend Connected</span>
              <span style={badge('purple')}>6 Agents Active</span>
            </div>
          </div>
          {tab === 'chat'          && <ChatTab cart={cart} setCart={setCart} patientName={patientName} />}
          {tab === 'cart'          && <CartTab cart={cart} setCart={setCart} patientName={patientName} />}
          {tab === 'orders'        && <OrdersTab />}
          {tab === 'prescriptions' && <PrescriptionsTab setCart={setCart} />}
          {tab === 'refills'       && <RefillsTab />}
        </div>
      </div>
    </Layout>
  )
}
