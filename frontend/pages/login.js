import { useState, useEffect, useRef } from 'react'
import { useAuth } from '../context/AuthContext'

const DEMOS = [
  { label: 'Doctor',     email: 'dr.sharma@neurostride.in', pw: 'doctor123',   color: '#4FB0B3' },
  { label: 'Patient',    email: 'ravi@neurostride.in',       pw: 'patient123',  color: '#2DA44E' },
  { label: 'Pharmacist', email: 'pharmacy@neurostride.in',  pw: 'pharmacy123', color: '#F5C842' },
]

const BG_IMG = 'https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1400&q=80&fit=crop'

export default function Login() {
  const { login } = useAuth()
  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [error, setError]       = useState('')
  const [loading, setLoading]   = useState(false)

  const doLogin = async (em, pw) => {
    setError(''); setLoading(true)
    try { await login(em, pw) }
    catch { setError('Login failed. Check your credentials.') }
    finally { setLoading(false) }
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', fontFamily: "'Outfit', sans-serif", overflow: 'hidden' }}>


      {/* Left — image */}
      <div style={{ flex: 1, position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
        <img src={BG_IMG} alt="Healthcare" style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy"/>
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(135deg, rgba(56,79,75,.85) 0%, rgba(79,176,179,.4) 100%)' }} />
        <div style={{ position: 'relative', zIndex: 1, padding: '0 52px', maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
            <div style={{ width: 44, height: 44, borderRadius: 12, background: '#4FB0B3', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(79,176,179,.4)' }}>
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            </div>
            <div>
              <div style={{ fontSize: 20, fontWeight: 900, color: '#fff', letterSpacing: '-0.02em' }}>NeuroStride</div>
              <div style={{ fontSize: 11, color: 'rgba(255,255,255,.6)', letterSpacing: '0.06em' }}>AI REHABILITATION PLATFORM</div>
            </div>
          </div>
          <h1 style={{ fontSize: 'clamp(32px,3.5vw,48px)', fontWeight: 900, color: '#fff', letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: 18 }}>
            Rehab powered<br/>by <span style={{ color: '#4FB0B3' }}>Neural AI</span>
          </h1>
          <p style={{ fontSize: 16, color: 'rgba(255,255,255,.65)', lineHeight: 1.75, fontFamily: 'DM Sans, sans-serif', marginBottom: 36 }}>
            BCI intent detection, 6-agent AI pharmacy, and clinical tools in one platform for paralysis and stroke recovery.
          </p>
          <div style={{ display: 'flex', gap: 20 }}>
            {[['1,200+','Patients Treated'],['98%','Satisfaction'],['24/7','AI Support']].map(([v,l]) => (
              <div key={l}>
                <div style={{ fontSize: 24, fontWeight: 900, color: '#fff' }}>{v}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,.55)', marginTop: 2 }}>{l}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right — form */}
      <div style={{ width: 460, background: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '40px 48px', boxShadow: '-8px 0 40px rgba(56,79,75,.12)' }}>
        <div className="login-card" style={{ width: '100%', maxWidth: 360 }}>
          <div style={{ marginBottom: 36 }}>
            <h2 style={{ fontSize: 28, fontWeight: 900, color: '#384F4B', letterSpacing: '-0.025em', marginBottom: 6 }}>Welcome back</h2>
            <p style={{ fontSize: 14, color: '#697A86', fontFamily: 'DM Sans, sans-serif' }}>Sign in to your account</p>
          </div>

          <form onSubmit={e => { e.preventDefault(); doLogin(email, password) }}>
            <div style={{ marginBottom: 16 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#697A86', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                placeholder="you@neurostride.in" required
                style={{ background: '#F5F8F8', border: '1.5px solid rgba(163,168,169,.25)', borderRadius: 12, padding: '11px 14px', color: '#384F4B', fontSize: 14, width: '100%' }}/>
            </div>
            <div style={{ marginBottom: 22 }}>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#697A86', display: 'block', marginBottom: 7, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" required
                style={{ background: '#F5F8F8', border: '1.5px solid rgba(163,168,169,.25)', borderRadius: 12, padding: '11px 14px', color: '#384F4B', fontSize: 14, width: '100%' }}/>
            </div>
            {error && <div style={{ marginBottom: 16, padding: '10px 14px', background: 'rgba(229,83,75,.08)', border: '1px solid rgba(229,83,75,.2)', borderRadius: 10, fontSize: 13, color: '#b52d27', fontWeight: 500 }}>{error}</div>}
            <button type="submit" disabled={loading} className="login-btn"
              style={{ width: '100%', padding: 13, borderRadius: 100, border: 'none', background: '#4FB0B3', color: '#fff', fontSize: 14, fontWeight: 800, cursor: 'pointer', boxShadow: '0 6px 20px rgba(79,176,179,.35)', opacity: loading ? 0.7 : 1 }}>
              {loading ? 'Signing in...' : 'Sign in →'}
            </button>
          </form>

          <div style={{ display: 'flex', alignItems: 'center', gap: 10, margin: '24px 0' }}>
            <div style={{ flex: 1, height: 1, background: 'rgba(163,168,169,.2)' }}/>
            <span style={{ fontSize: 11, color: '#A3A8A9', fontWeight: 600, letterSpacing: '0.06em' }}>DEMO ACCOUNTS</span>
            <div style={{ flex: 1, height: 1, background: 'rgba(163,168,169,.2)' }}/>
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            {DEMOS.map(d => (
              <button key={d.label} className="demo-btn" onClick={() => doLogin(d.email, d.pw)} disabled={loading}
                style={{ flex: 1, padding: '10px 0', borderRadius: 12, border: `1.5px solid rgba(163,168,169,.2)`, background: '#F5F8F8', color: '#384F4B', fontSize: 12, fontWeight: 700, cursor: 'pointer', boxShadow: '0 2px 8px rgba(56,79,75,.06)' }}>
                {d.label}
              </button>
            ))}
          </div>

          <p style={{ textAlign: 'center', fontSize: 11, color: '#A3A8A9', marginTop: 28, lineHeight: 1.6 }}>
            NeuroStride · Team LUNATICS · LPU Ideathon 2026
          </p>
        </div>
      </div>
    </div>
  )
}
