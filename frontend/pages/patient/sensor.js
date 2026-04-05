import { useEffect, useRef, useState, useCallback } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner } from '../../components/UI'
import {
  LineChart, Line, AreaChart, Area,
  BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

const WS_URL     = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:8765'
const MAX_WAVE   = 200   // waveform points
const MAX_HIST   = 60    // RMS history points
const THRESHOLD  = 150   // EMG threshold — Neuphony filtered output is ~0-centred

// Simulated EEG band powers (when live they'd come from FFT on backend)
function fakeBands(rms) {
  const base = rms / 1023
  return {
    delta: +(0.35 + base * 0.1  + (Math.random()-.5)*.05).toFixed(3),
    theta: +(0.20 + base * 0.08 + (Math.random()-.5)*.04).toFixed(3),
    alpha: +(0.15 - base * 0.05 + (Math.random()-.5)*.03).toFixed(3),
    beta:  +(0.20 + base * 0.15 + (Math.random()-.5)*.05).toFixed(3),
    gamma: +(0.10 + base * 0.12 + (Math.random()-.5)*.04).toFixed(3),
  }
}

const BAND_INFO = {
  delta: { color:'#1F75CB', label:'δ Delta',  hz:'0.5–4 Hz',   meaning:'Deep rest / recovery' },
  theta: { color:'#9B59B6', label:'θ Theta',  hz:'4–8 Hz',     meaning:'Relaxed focus' },
  alpha: { color:'#4FB0B3', label:'α Alpha',  hz:'8–13 Hz',    meaning:'Calm alertness' },
  beta:  { color:'#2DA44E', label:'β Beta',   hz:'13–30 Hz',   meaning:'Active motor intent' },
  gamma: { color:'#F5C842', label:'γ Gamma',  hz:'30–100 Hz',  meaning:'High concentration' },
}

export default function SensorLive() {
  const wsRef                         = useRef(null)
  const simRef                        = useRef(null)
  const tRef                          = useRef(0)
  const sessionStartRef               = useRef(null)
  const lastIntentRef                 = useRef(false)
  const contractionRef                = useRef(0)

  const [connected, setConnected]     = useState(false)
  const [simMode, setSimMode]         = useState(false)
  const [waveData, setWaveData]       = useState([])
  const [rmsHistory, setRmsHistory]   = useState([])
  const [bands, setBands]             = useState({ delta:.35, theta:.2, alpha:.15, beta:.2, gamma:.1 })
  const [stats, setStats]             = useState({ emg_rms:0, intent:false, contractions:0 })
  const [sessionActive, setSessionActive] = useState(false)
  const [sessionTime, setSessionTime] = useState(0)
  const [sessionLog, setSessionLog]   = useState([])   // { t, rms, intent, bands }
  const [savedSessions, setSavedSessions] = useState(() => {
    try { return JSON.parse(localStorage.getItem('ns_eeg_sessions') || '[]') } catch { return [] }
  })
  const [viewTab, setViewTab]         = useState('live')
  const [armState, setArmState]       = useState('idle') // idle | opening | open | closing

  // Session timer
  useEffect(() => {
    if (!sessionActive) return
    const iv = setInterval(() => setSessionTime(t => t + 1), 1000)
    return () => clearInterval(iv)
  }, [sessionActive])

  // WebSocket connect
  useEffect(() => {
    connectWs()
    return () => { wsRef.current?.close(); clearInterval(simRef.current) }
  }, [])

  const connectWs = () => {
    try {
      const ws = new WebSocket(WS_URL)
      wsRef.current = ws
      ws.onopen    = () => { setConnected(true); setSimMode(false) }
      ws.onclose   = () => { setConnected(false); startSim() }
      ws.onerror   = () => ws.close()
      ws.onmessage = (e) => {
        const p = JSON.parse(e.data)
        pushSample({
          samples: p.samples || [],
          emg_rms: p.emg_rms,
          intent:  p.intent,
          contractions: p.contractions,
          bands: p.bands,
          mode: 'live',
        })
      }
    } catch { startSim() }
  }

  const pushSample = useCallback((p) => {
    const rms    = p.emg_rms || 0
    const intent = p.intent  || false
    const b      = p.bands   || fakeBands(rms)

    // Waveform
    setWaveData(prev => {
      const pts = (p.samples||[rms]).map((v, i) => ({ t: prev.length + i, v, threshold: THRESHOLD }))
      return [...prev, ...pts].slice(-MAX_WAVE)
    })

    // RMS history
    setRmsHistory(prev => [...prev, { t: prev.length, rms: Math.round(rms) }].slice(-MAX_HIST))

    // Bands
    setBands(b)

    // Stats
    contractionRef.current = p.contractions || contractionRef.current
    setStats({ emg_rms: rms, intent, contractions: contractionRef.current })

    // Arm animation on intent edge
    if (intent && !lastIntentRef.current) {
      setArmState('opening')
      setTimeout(() => setArmState('open'), 400)
    }
    if (!intent && lastIntentRef.current) {
      setArmState('closing')
      setTimeout(() => setArmState('idle'), 400)
    }
    lastIntentRef.current = intent

    // Session logging
    if (sessionActive) {
      setSessionLog(prev => [...prev, {
        t: sessionTime, rms: Math.round(rms), intent, bands: b,
      }])
    }
  }, [sessionActive, sessionTime])

  const startSim = () => {
    setSimMode(true)
    let t = 0
    simRef.current = setInterval(() => {
      t += 1
      const noise  = 512 + (Math.random() - .5) * 30
      const burst  = (t % 80 < 20) ? 200 * Math.sin((t % 80) * 0.5) : 0
      const val    = Math.max(0, Math.min(1023, Math.round(noise + burst)))
      const rms    = Math.sqrt(val * val * 0.92)
      const intent = rms > THRESHOLD
      if (intent && !lastIntentRef.current) contractionRef.current += 1
      pushSample({ samples:[val], emg_rms:rms, intent, contractions:contractionRef.current, bands:null })
    }, 20)
  }

  const retry = () => {
    clearInterval(simRef.current)
    setWaveData([]); setRmsHistory([])
    setSimMode(false); setConnected(false)
    connectWs()
  }

  const startSession = () => {
    sessionStartRef.current = Date.now()
    contractionRef.current  = 0
    setSessionTime(0); setSessionLog([]); setSessionActive(true)
  }

  const endSession = () => {
    setSessionActive(false)
    const duration = Math.round((Date.now() - sessionStartRef.current) / 1000)
    const avgRms   = sessionLog.length
      ? Math.round(sessionLog.reduce((s,l) => s + l.rms, 0) / sessionLog.length)
      : 0
    const intents  = sessionLog.filter(l => l.intent).length
    const newSess = {
      id:         Date.now(),
      date:       new Date().toLocaleString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' }),
      duration,
      avg_rms:    avgRms,
      contractions: contractionRef.current,
      intent_pct: sessionLog.length ? Math.round(intents / sessionLog.length * 100) : 0,
      log:        sessionLog.slice(0, 200),
    }
    const updated = [newSess, ...savedSessions].slice(0, 20)
    setSavedSessions(updated)
    localStorage.setItem('ns_eeg_sessions', JSON.stringify(updated))
  }

  const fmt = (s) => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`
  const intentColor = stats.intent ? '#2DA44E' : 'var(--text3)'
  const rmsColor = stats.emg_rms > THRESHOLD ? '#2DA44E' : stats.emg_rms > 520 ? '#F5C842' : 'var(--text2)'

  const bandData = Object.entries(bands).map(([k,v]) => ({
    name: BAND_INFO[k].label, value: +(v*100).toFixed(1), color: BAND_INFO[k].color
  }))

  return (
    <Layout title="EEG / EMG Live Monitor">

      {/* Top bar */}
      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div style={{ width:10, height:10, borderRadius:'50%', background: connected ? '#2DA44E' : simMode ? '#F5C842' : 'var(--danger)', boxShadow: connected ? '0 0 8px #2DA44E' : simMode ? '0 0 8px #F5C842' : 'none', animation: (connected||simMode) ? 'pulse 1.5s infinite' : 'none' }}/>
          <span style={{ fontSize:14, fontWeight:700, color:'var(--text1)' }}>
            {connected ? 'Neuphony EXG Connected' : 'Simulation Mode'}
          </span>
          <Badge type={connected ? 'success' : 'warning'}>{connected ? 'LIVE HARDWARE' : 'SIMULATED'}</Badge>
          {!connected && <button onClick={retry} style={{ fontSize:12, color:'var(--teal)', background:'none', border:'none', cursor:'pointer', fontWeight:600 }}>↻ Retry hardware</button>}
        </div>

        {/* Session controls */}
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          {sessionActive && (
            <div style={{ display:'flex', alignItems:'center', gap:8, padding:'6px 14px', background:'rgba(229,83,75,.08)', border:'1px solid rgba(229,83,75,.2)', borderRadius:100 }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--danger)', animation:'pulse 1s infinite' }}/>
              <span style={{ fontSize:13, fontWeight:700, color:'var(--danger)' }}>REC {fmt(sessionTime)}</span>
            </div>
          )}
          {sessionActive ? (
            <button onClick={endSession} style={{ padding:'8px 20px', borderRadius:100, border:'none', background:'var(--danger)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer' }}>
              Stop & Save Session
            </button>
          ) : (
            <button onClick={startSession} style={{ padding:'8px 20px', borderRadius:100, border:'none', background:'var(--teal)', color:'#fff', fontSize:13, fontWeight:700, cursor:'pointer', boxShadow:'0 4px 14px rgba(79,176,179,.3)' }}>
              ▶ Record Session
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div style={{ display:'flex', gap:4, borderBottom:'2px solid var(--borderS)', marginBottom:18 }}>
        {['live','history'].map(t => (
          <button key={t} onClick={() => setViewTab(t)} style={{
            padding:'8px 20px', fontSize:13, fontWeight: viewTab===t ? 800 : 500,
            color: viewTab===t ? 'var(--teal)' : 'var(--text2)',
            borderBottom: viewTab===t ? '2px solid var(--teal)' : '2px solid transparent',
            marginBottom:-2, border:'none', background:'none', cursor:'pointer',
            fontFamily:'Outfit,sans-serif', borderRadius:'8px 8px 0 0',
            textTransform:'capitalize',
          }}>
            {t === 'live' ? '⚡ Live Monitor' : `📊 Session History (${savedSessions.length})`}
          </button>
        ))}
      </div>

      {viewTab === 'live' && (
        <>
          {/* Stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:18 }}>
            {[
              { label:'EMG RMS',    value: Math.round(stats.emg_rms), unit:'ADC', color:rmsColor },
              { label:'Intent',     value: stats.intent ? 'YES' : 'NO', unit:'', color:intentColor },
              { label:'Contractions', value:stats.contractions, unit:'count', color:'var(--teal)' },
              { label:'β Beta Power', value:`${(bands.beta*100).toFixed(1)}%`, unit:'motor', color:'#2DA44E' },
              { label:'Session',    value: sessionActive ? fmt(sessionTime) : '--:--', unit: sessionActive?'recording':'idle', color: sessionActive?'var(--danger)':'var(--text3)' },
            ].map(s => (
              <div key={s.label} style={{ background:'var(--card)', borderRadius:'var(--r-lg)', padding:'16px 14px', boxShadow:'var(--sh)', border:'1px solid var(--borderS)', position:'relative', overflow:'hidden' }}>
                <div style={{ position:'absolute', bottom:0, left:0, right:0, height:3, background:s.color, opacity:.6, borderRadius:'0 0 var(--r-lg) var(--r-lg)' }}/>
                <div style={{ fontSize:22, fontWeight:900, color:s.color, lineHeight:1.1 }}>{s.value}</div>
                <div style={{ fontSize:10, color:'var(--text3)', marginTop:3 }}>{s.label}</div>
                {s.unit && <div style={{ fontSize:9, color:'var(--text3)', opacity:.7 }}>{s.unit}</div>}
              </div>
            ))}
          </div>

          {/* Main grid */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 280px', gap:16, marginBottom:16 }}>

            {/* EMG Waveform */}
            <Card>
              <SectionHeader title="EMG Signal — Raw Waveform" action={
                <div style={{ display:'flex', gap:12, fontSize:11, color:'var(--text3)' }}>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'var(--teal)', display:'inline-block', borderRadius:1 }}/> Signal</span>
                  <span style={{ display:'flex', alignItems:'center', gap:4 }}><span style={{ width:12, height:2, background:'var(--danger)', display:'inline-block', borderRadius:1 }}/> Threshold</span>
                </div>
              }/>
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={waveData}>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--borderS)"/>
                  <XAxis dataKey="t" hide/>
                  <YAxis domain={[-300, 500]} tick={{ fill:'var(--text3)', fontSize:10 }} width={35}/>
                  <ReferenceLine y={THRESHOLD} stroke="var(--danger)" strokeDasharray="4 3" strokeWidth={1.5}/>
                  <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }} formatter={v => [`${v} ADC`,'EMG']}/>
                  <Line type="linear" dataKey="v" stroke="var(--teal)" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                </LineChart>
              </ResponsiveContainer>
            </Card>

            {/* Robotic arm visualizer */}
            <Card style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
              <SectionHeader title="BCI → Arm Control"/>
              <div style={{ textAlign:'center', flex:1, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}>
                {/* Arm SVG */}
                <svg width="120" height="160" viewBox="0 0 120 160" style={{ marginBottom:12 }}>
                  {/* Shoulder */}
                  <circle cx="60" cy="20" r="14" fill="var(--teal)" opacity=".85"/>
                  <text x="60" y="25" textAnchor="middle" fontSize="10" fill="#fff" fontWeight="800">EXG</text>
                  {/* Upper arm */}
                  <rect x="50" y="32" width="20" height="48" rx="8" fill="var(--card2)" stroke="var(--teal)" strokeWidth="2"/>
                  {/* Elbow */}
                  <circle cx="60" cy="85" r="10" fill="var(--card2)" stroke="var(--teal)" strokeWidth="2"/>
                  {/* Lower arm */}
                  <rect x="50" y="94" width="20" height="40" rx="8" fill="var(--card2)" stroke={armState==='open'?'#2DA44E':'var(--teal)'} strokeWidth="2" style={{ transition:'stroke .3s' }}/>
                  {/* Hand / fingers */}
                  {armState === 'open' || armState === 'opening' ? (
                    <>
                      <line x1="42" y1="134" x2="36" y2="148" stroke="#2DA44E" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="50" y1="134" x2="48" y2="152" stroke="#2DA44E" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="60" y1="134" x2="60" y2="154" stroke="#2DA44E" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="70" y1="134" x2="72" y2="152" stroke="#2DA44E" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="78" y1="134" x2="84" y2="148" stroke="#2DA44E" strokeWidth="4" strokeLinecap="round"/>
                    </>
                  ) : (
                    <>
                      <line x1="42" y1="134" x2="50" y2="144" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="50" y1="134" x2="54" y2="144" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="60" y1="134" x2="60" y2="145" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="70" y1="134" x2="66" y2="144" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                      <line x1="78" y1="134" x2="70" y2="144" stroke="var(--teal)" strokeWidth="4" strokeLinecap="round"/>
                    </>
                  )}
                </svg>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 14px', borderRadius:100, background: armState==='open'||armState==='opening' ? 'rgba(45,164,78,.1)' : 'var(--card2)', border:`1px solid ${armState==='open'||armState==='opening'?'rgba(45,164,78,.25)':'var(--borderS)'}`, transition:'all .3s' }}>
                  <div style={{ width:7, height:7, borderRadius:'50%', background: armState==='open'||armState==='opening' ? '#2DA44E' : 'var(--text3)', transition:'background .3s' }}/>
                  <span style={{ fontSize:12, fontWeight:700, color: armState==='open'||armState==='opening'?'#2DA44E':'var(--text3)', transition:'color .3s' }}>
                    {armState === 'open' ? 'HAND OPEN' : armState === 'opening' ? 'OPENING...' : armState === 'closing' ? 'CLOSING...' : 'HAND CLOSED'}
                  </span>
                </div>
                <div style={{ marginTop:8, fontSize:11, color:'var(--text3)', textAlign:'center', lineHeight:1.6 }}>
                  Contract muscle to open.<br/>Relax to close.
                </div>
              </div>
            </Card>
          </div>

          {/* Bottom row */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>

            {/* EEG Band powers */}
            <Card>
              <SectionHeader title="EEG Frequency Bands" action={<Badge type="info">Real-time FFT</Badge>}/>
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:12 }}>
                {Object.entries(bands).map(([k,v]) => {
                  const b = BAND_INFO[k]
                  return (
                    <div key={k} style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <div style={{ width:48, fontSize:12, fontWeight:800, color:b.color }}>{b.label}</div>
                      <div style={{ flex:1, height:10, borderRadius:5, background:'var(--card2)', overflow:'hidden' }}>
                        <div style={{ height:'100%', width:`${Math.min(100,v*200)}%`, background:b.color, borderRadius:5, transition:'width .3s ease' }}/>
                      </div>
                      <div style={{ width:38, fontSize:12, fontWeight:700, color:b.color, textAlign:'right' }}>{(v*100).toFixed(1)}%</div>
                      <div style={{ width:80, fontSize:10, color:'var(--text3)' }}>{b.hz}</div>
                    </div>
                  )
                })}
              </div>
              <ResponsiveContainer width="100%" height={100}>
                <BarChart data={bandData} margin={{ top:0, right:0, left:-20, bottom:0 }}>
                  <XAxis dataKey="name" tick={{ fill:'var(--text3)', fontSize:9 }}/>
                  <YAxis tick={{ fill:'var(--text3)', fontSize:9 }} domain={[0,50]} unit="%"/>
                  <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }} formatter={v => [`${v}%`]}/>
                  <Bar dataKey="value" radius={[4,4,0,0]}>
                    {bandData.map((e,i) => (
                      <rect key={i} fill={e.color}/>
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </Card>

            {/* RMS trend */}
            <Card>
              <SectionHeader title="EMG RMS Trend" action={
                <span style={{ fontSize:12, color:'var(--text3)' }}>Last {MAX_HIST} samples</span>
              }/>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={rmsHistory}>
                  <defs>
                    <linearGradient id="rg" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%"  stopColor="#2DA44E" stopOpacity={0.2}/>
                      <stop offset="95%" stopColor="#2DA44E" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="2 4" stroke="var(--borderS)"/>
                  <XAxis dataKey="t" hide/>
                  <YAxis tick={{ fill:'var(--text3)', fontSize:10 }} domain={[-300, 500]} width={35}/>
                  <ReferenceLine y={THRESHOLD} stroke="var(--danger)" strokeDasharray="4 3" strokeWidth={1.5}/>
                  <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:8, fontSize:11 }} formatter={v => [`${v} ADC`,'RMS']}/>
                  <Area type="monotone" dataKey="rms" stroke="#2DA44E" fill="url(#rg)" strokeWidth={2} dot={false} isAnimationActive={false}/>
                </AreaChart>
              </ResponsiveContainer>

              {/* How to connect */}
              <div style={{ marginTop:12, padding:'10px 12px', background:'var(--card2)', borderRadius:'var(--r-md)', border:'1px solid var(--borderS)' }}>
                <div style={{ fontSize:11, fontWeight:700, color:'var(--teal)', marginBottom:5 }}>🔌 Connect Hardware</div>
                <div style={{ fontSize:11, color:'var(--text3)', lineHeight:1.65 }}>
                  1. Plug Neuphony EXG Synapse via USB<br/>
                  2. Place EMG electrodes on forearm<br/>
                  3. Run: <code style={{ background:'var(--bg)', padding:'1px 5px', borderRadius:3, fontFamily:'monospace' }}>python neuphony_bridge.py --port COM3</code><br/>
                  4. Click "↻ Retry hardware" above
                </div>
              </div>
            </Card>
          </div>
        </>
      )}

      {/* History tab */}
      {viewTab === 'history' && (
        <div>
          {savedSessions.length === 0 ? (
            <Card style={{ textAlign:'center', padding:'52px 20px' }}>
              <div style={{ fontSize:36, marginBottom:12 }}>📡</div>
              <div style={{ fontSize:15, fontWeight:700, color:'var(--text1)', marginBottom:6 }}>No sessions recorded yet</div>
              <div style={{ fontSize:13, color:'var(--text3)' }}>Switch to Live Monitor and press "Record Session" to start tracking.</div>
            </Card>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
              {savedSessions.map((s, i) => (
                <Card key={s.id}>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr repeat(5,auto)', gap:16, alignItems:'center' }}>
                    <div>
                      <div style={{ fontSize:14, fontWeight:800, color:'var(--text1)', marginBottom:3 }}>Session {savedSessions.length - i}</div>
                      <div style={{ fontSize:12, color:'var(--text3)' }}>{s.date}</div>
                    </div>
                    {[
                      ['Duration',     fmt(s.duration),          'var(--teal)'],
                      ['Avg RMS',      `${s.avg_rms} ADC`,       'var(--green)'],
                      ['Contractions', s.contractions,            '#1F75CB'],
                      ['Intent %',     `${s.intent_pct}%`,        '#F5C842'],
                    ].map(([l,v,c]) => (
                      <div key={l} style={{ textAlign:'center', padding:'10px 14px', background:'var(--card2)', borderRadius:'var(--r-md)', border:'1px solid var(--borderS)' }}>
                        <div style={{ fontSize:18, fontWeight:900, color:c }}>{v}</div>
                        <div style={{ fontSize:10, color:'var(--text3)', marginTop:2 }}>{l}</div>
                      </div>
                    ))}
                    {s.log?.length > 0 && (
                      <div style={{ width:120, height:40 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={s.log.map((l,j)=>({t:j,rms:l.rms}))}>
                            <Line type="monotone" dataKey="rms" stroke="var(--teal)" strokeWidth={1.5} dot={false} isAnimationActive={false}/>
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
              <button onClick={() => { setSavedSessions([]); localStorage.removeItem('ns_eeg_sessions') }}
                style={{ alignSelf:'flex-end', fontSize:12, color:'var(--danger)', background:'none', border:'none', cursor:'pointer', padding:'4px 8px' }}>
                Clear all history
              </button>
            </div>
          )}
        </div>
      )}

      <style jsx global>{`
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:.4} }
      `}</style>
    </Layout>
  )
}
