import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn, GhostBtn, HeroBanner } from '../../components/UI'
import { patientApi, sessionApi, prescriptionApi, reportApi } from '../../lib/api'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

const PATIENT_IMGS = [
  'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=60&fit=crop&crop=top&auto=format',
  'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=80&q=60&fit=crop&crop=top&auto=format',
  'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&q=60&fit=crop&crop=top&auto=format',
]

const TABS = ['Overview', 'Sessions', 'Prescriptions', 'Reports']

const T = {
  teal:'var(--teal)', green:'var(--green)', danger:'var(--danger)', warning:'var(--warning)',
  text1:'var(--text1)', text2:'var(--text2)', text3:'var(--text3)',
  card:'var(--card)', card2:'var(--card2)', border:'var(--border)', borderS:'var(--borderS)',
}

export default function Patients() {
  const router = useRouter()
  const [patients, setPatients]     = useState([])
  const [selected, setSelected]     = useState(null)
  const [sessions, setSessions]     = useState([])
  const [prescriptions, setPrescriptions] = useState([])
  const [reports, setReports]       = useState([])
  const [tab, setTab]               = useState('Overview')
  const [loading, setLoading]       = useState(true)
  const [detailLoading, setDetailLoading] = useState(false)
  const [search, setSearch]         = useState('')

  useEffect(() => {
    patientApi.list().then(r => {
      const list = r.data || []
      setPatients(list)
      const qid = router.query.id
      const target = qid ? list.find(x => x.id === qid) : list[0]
      if (target) load(target)
    }).finally(() => setLoading(false))
  }, [router.query.id])

  const load = async (p) => {
    setSelected(p); setDetailLoading(true)
    try {
      const [s, rx, rep] = await Promise.all([
        sessionApi.forPatient(p.id).catch(() => ({ data:[] })),
        prescriptionApi.forPatient(p.id).catch(() => ({ data:[] })),
        reportApi.forPatient(p.id).catch(() => ({ data:[] })),
      ])
      setSessions(s.data || [])
      setPrescriptions(rx.data || [])
      setReports(rep.data || [])
    } finally { setDetailLoading(false) }
  }

  const chartData = sessions.slice(0,10).reverse().map((s,i) => ({
    day: `S${i+1}`,
    form: Math.round((s.avg_form_score||0)*100),
    emg: Math.round(s.emg_avg_rms||0),
  }))
  const avgForm = sessions.length ? Math.round(sessions.reduce((a,b)=>a+(b.avg_form_score||0),0)/sessions.length*100) : 0
  const filtered = patients.filter(p => (p.full_name||'').toLowerCase().includes(search.toLowerCase()))

  if (loading) return <Layout title="Patient Management"><Spinner/></Layout>

  return (
    <Layout title="Patient Management">
      <HeroBanner img="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=1200&q=55&fit=crop&auto=format" title="Patient Management" sub={`${patients.length} patients · Select a patient to view full profile`}/>

      <div style={{ display:'grid', gridTemplateColumns:'260px 1fr', gap:18 }}>

        {/* Patient list */}
        <div style={{ background:T.card, borderRadius:'var(--r-lg)', overflow:'hidden', boxShadow:'var(--sh)', border:`1px solid ${T.borderS}`, position:'sticky', top:80, maxHeight:'calc(100vh - 120px)', display:'flex', flexDirection:'column' }}>
          <div style={{ padding:'14px 16px', borderBottom:`1px solid ${T.borderS}` }}>
            <input placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)} style={{ fontSize:13 }}/>
          </div>
          <div style={{ overflowY:'auto', flex:1 }}>
            {filtered.map((p, i) => (
              <div key={p.id} onClick={() => { load(p); setTab('Overview') }}
                style={{ display:'flex', alignItems:'center', gap:10, padding:'12px 14px', cursor:'pointer', transition:'all .15s',
                  background: selected?.id===p.id ? 'rgba(79,176,179,.08)' : 'transparent',
                  borderLeft: selected?.id===p.id ? '3px solid var(--teal)' : '3px solid transparent',
                }}
                onMouseOver={e => { if(selected?.id!==p.id) e.currentTarget.style.background='var(--card2)' }}
                onMouseOut={e => { if(selected?.id!==p.id) e.currentTarget.style.background='transparent' }}>
                <div style={{ width:36, height:36, borderRadius:'50%', overflow:'hidden', flexShrink:0, background:T.card2 }}>
                  <img src={PATIENT_IMGS[i%PATIENT_IMGS.length]} alt={p.full_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'}/>
                </div>
                <div style={{ minWidth:0, flex:1 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:T.text1, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{p.full_name}</div>
                  <div style={{ fontSize:11, color:T.text3, marginTop:1 }}>
                    <span style={{ display:'inline-flex', alignItems:'center', gap:3 }}>
                      <span style={{ width:5, height:5, borderRadius:'50%', background: p.paralysis_level==='complete'?'var(--danger)':p.paralysis_level==='partial'?'var(--warning)':'var(--green)', flexShrink:0 }}></span>
                      {p.paralysis_level || 'Unknown'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {filtered.length === 0 && <div style={{ padding:'32px 16px', textAlign:'center', color:T.text3, fontSize:13 }}>No patients found</div>}
          </div>
        </div>

        {/* Detail panel */}
        <div>
          {!selected ? (
            <EmptyState message="Select a patient from the list"/>
          ) : detailLoading ? <Spinner/> : (
            <>
              {/* Patient header card */}
              <div style={{ background:T.card, borderRadius:'var(--r-lg)', overflow:'hidden', boxShadow:'var(--sh)', marginBottom:18, border:`1px solid ${T.borderS}` }}>
                {/* Colored top bar by severity */}
                <div style={{ height:4, background: selected.paralysis_level==='complete' ? 'var(--danger)' : selected.paralysis_level==='partial' ? 'var(--warning)' : 'var(--green)' }}/>
                <div style={{ padding:'20px 24px' }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:18, marginBottom:20 }}>
                    <div style={{ width:64, height:64, borderRadius:16, overflow:'hidden', background:T.card2, flexShrink:0 }}>
                      <img src={PATIENT_IMGS[patients.findIndex(p=>p.id===selected.id)%PATIENT_IMGS.length]} alt={selected.full_name} style={{ width:'100%', height:'100%', objectFit:'cover' }} onError={e => e.target.style.display='none'}/>
                    </div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:22, fontWeight:900, color:T.text1, letterSpacing:'-.02em', marginBottom:4 }}>{selected.full_name}</div>
                      <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                        <Badge type={selected.paralysis_level==='complete'?'danger':selected.paralysis_level==='partial'?'warning':'success'}>{selected.paralysis_level || 'Unknown'} paralysis</Badge>
                        {selected.blood_group && <Badge type="info">Blood: {selected.blood_group}</Badge>}
                        {selected.affected_side && <Badge type="default">{selected.affected_side} side</Badge>}
                      </div>
                    </div>
                    <div style={{ display:'flex', gap:8 }}>
                      <PrimaryBtn small onClick={() => window.location.href=`/doctor/prescribe?patient=${selected.id}`}>Prescribe</PrimaryBtn>
                      <GhostBtn small onClick={() => window.location.href=`/doctor/reports`}>Reports</GhostBtn>
                    </div>
                  </div>

                  {/* Info blocks — 3 columns, not congested */}
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:12 }}>

                    {/* Diagnosis */}
                    <div style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'16px 18px', border:`1px solid ${T.borderS}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:T.teal }}/>
                        <span style={{ fontSize:11, fontWeight:700, color:T.teal, textTransform:'uppercase', letterSpacing:'.07em' }}>Diagnosis</span>
                      </div>
                      <div style={{ fontSize:14, fontWeight:700, color:T.text1, marginBottom:8 }}>{typeof selected.diagnosis === 'string' ? selected.diagnosis : (selected.diagnosis ? JSON.stringify(selected.diagnosis) : 'Not specified')}</div>
                      {selected.paralysis_level && (
                        <div style={{ fontSize:12, color:T.text2, display:'flex', alignItems:'flex-start', gap:6 }}>
                          <span style={{ color:T.teal, marginTop:1 }}>›</span>
                          <span>Paralysis level: <strong>{selected.paralysis_level}</strong></span>
                        </div>
                      )}
                      {selected.affected_side && (
                        <div style={{ fontSize:12, color:T.text2, display:'flex', alignItems:'flex-start', gap:6, marginTop:4 }}>
                          <span style={{ color:T.teal, marginTop:1 }}>›</span>
                          <span>Affected: <strong>{selected.affected_side} side</strong></span>
                        </div>
                      )}
                    </div>

                    {/* Patient info */}
                    <div style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'16px 18px', border:`1px solid ${T.borderS}` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:'var(--blue,#1F75CB)' }}/>
                        <span style={{ fontSize:11, fontWeight:700, color:'var(--blue,#1F75CB)', textTransform:'uppercase', letterSpacing:'.07em' }}>Patient Info</span>
                      </div>
                      {[
                        ['DOB',       String(selected.date_of_birth || '—')],
                        ['Gender',    String(selected.gender || '—')],
                        ['Blood',     String(selected.blood_group || '—')],
                        ['Weight',    selected.weight_kg ? `${selected.weight_kg} kg` : '—'],
                        ['Height',    selected.height_cm ? `${selected.height_cm} cm` : '—'],
                      ].map(([k,v]) => (
                        <div key={k} style={{ display:'flex', justifyContent:'space-between', fontSize:12, padding:'3px 0', borderBottom:`1px solid ${T.borderS}` }}>
                          <span style={{ color:T.text3 }}>{k}</span>
                          <span style={{ fontWeight:600, color:T.text1 }}>{v}</span>
                        </div>
                      ))}
                    </div>

                    {/* Emergency contact */}
                    <div style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'16px 18px', border:`1px solid rgba(229,83,75,.15)` }}>
                      <div style={{ display:'flex', alignItems:'center', gap:7, marginBottom:12 }}>
                        <div style={{ width:8, height:8, borderRadius:2, background:T.danger }}/>
                        <span style={{ fontSize:11, fontWeight:700, color:T.danger, textTransform:'uppercase', letterSpacing:'.07em' }}>Emergency Contact</span>
                      </div>
                      {selected.emergency_contact ? (
                        <div>
                          <div style={{ fontSize:14, fontWeight:700, color:T.text1, marginBottom:6 }}>{String(selected.emergency_contact).split(',')[0] || String(selected.emergency_contact)}</div>
                          {String(selected.emergency_contact).includes(',') && (
                            <div style={{ fontSize:12, color:T.text2 }}>{String(selected.emergency_contact).split(',').slice(1).join(', ')}</div>
                          )}
                          <a href={`tel:${String(selected.emergency_contact).replace(/\D/g,'')}`}
                            style={{ display:'inline-flex', alignItems:'center', gap:5, marginTop:8, fontSize:12, fontWeight:700, color:T.danger, background:'rgba(229,83,75,.06)', padding:'5px 10px', borderRadius:100, border:'1px solid rgba(229,83,75,.2)' }}>
                            📞 Call Now
                          </a>
                        </div>
                      ) : (
                        <div style={{ fontSize:12, color:T.text3, fontStyle:'italic' }}>No emergency contact on file</div>
                      )}
                      {selected.allergies && (
                        <div style={{ marginTop:10, paddingTop:10, borderTop:`1px solid ${T.borderS}` }}>
                          <div style={{ fontSize:10, fontWeight:700, color:T.danger, textTransform:'uppercase', letterSpacing:'.05em', marginBottom:4 }}>⚠ Allergies</div>
                          <div style={{ fontSize:12, color:T.text1, fontWeight:600 }}>{typeof selected.allergies === 'string' ? selected.allergies : JSON.stringify(selected.allergies)}</div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Current medications row */}
                  {selected.current_meds && (
                    <div style={{ marginTop:12, background:'rgba(245,200,66,.06)', borderRadius:'var(--r-md)', padding:'12px 16px', border:'1px solid rgba(245,200,66,.2)' }}>
                      <div style={{ fontSize:11, fontWeight:700, color:'#9a6d00', marginBottom:6, textTransform:'uppercase', letterSpacing:'.06em' }}>Current Medications</div>
                      <div style={{ fontSize:13, color:T.text2 }}>{typeof selected.current_meds === 'string' ? selected.current_meds : JSON.stringify(selected.current_meds)}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tabs */}
              <div style={{ display:'flex', gap:4, marginBottom:18, borderBottom:`2px solid ${T.borderS}`, paddingBottom:0 }}>
                {TABS.map(t => (
                  <button key={t} onClick={() => setTab(t)} style={{
                    padding:'9px 20px', fontSize:13, fontWeight: tab===t ? 800 : 500,
                    color: tab===t ? T.teal : T.text2,
                    borderBottom: tab===t ? '2px solid var(--teal)' : '2px solid transparent',
                    marginBottom:-2, border:'none', background:'none', cursor:'pointer', fontFamily:'Outfit,sans-serif',
                    borderRadius:'8px 8px 0 0', transition:'all .15s',
                  }}
                  onMouseOver={e => { if(tab!==t) e.currentTarget.style.background='var(--card2)' }}
                  onMouseOut={e => { if(tab!==t) e.currentTarget.style.background='none' }}>
                    {t}
                    {t==='Sessions' && sessions.length > 0 && <span style={{ marginLeft:6, fontSize:11, background:T.teal, color:'#fff', borderRadius:100, padding:'1px 7px' }}>{sessions.length}</span>}
                    {t==='Prescriptions' && prescriptions.length > 0 && <span style={{ marginLeft:6, fontSize:11, background:'var(--warning)', color:'#fff', borderRadius:100, padding:'1px 7px' }}>{prescriptions.length}</span>}
                  </button>
                ))}
              </div>

              {/* Overview tab */}
              {tab === 'Overview' && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <Card>
                    <SectionHeader title="Session Performance"/>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10, marginBottom:16 }}>
                      {[
                        ['Total Sessions', sessions.length, T.teal],
                        ['Avg Form Score', `${avgForm}%`, T.green],
                        ['Total Reps', sessions.reduce((a,b)=>a+(b.total_reps||0),0), '#1F75CB'],
                        ['BCI Triggers', sessions[0]?.intent_count||0, 'var(--warning)'],
                      ].map(([l,v,c]) => (
                        <div key={l} style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'12px 14px', border:`1px solid ${T.borderS}` }}>
                          <div style={{ fontSize:22, fontWeight:900, color:c }}>{v}</div>
                          <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>{l}</div>
                        </div>
                      ))}
                    </div>
                    {chartData.length > 0 && (
                      <ResponsiveContainer width="100%" height={140}>
                        <AreaChart data={chartData}>
                          <defs><linearGradient id="fg2" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#4FB0B3" stopOpacity={0.2}/><stop offset="95%" stopColor="#4FB0B3" stopOpacity={0}/></linearGradient></defs>
                          <CartesianGrid strokeDasharray="3 3" stroke="var(--borderS)"/>
                          <XAxis dataKey="day" tick={{ fill:'var(--text3)', fontSize:10 }}/>
                          <YAxis domain={[0,100]} tick={{ fill:'var(--text3)', fontSize:10 }} unit="%"/>
                          <Tooltip contentStyle={{ background:T.card, border:`1px solid ${T.border}`, borderRadius:8 }}/>
                          <Area type="monotone" dataKey="form" stroke="#4FB0B3" fill="url(#fg2)" strokeWidth={2} dot={false}/>
                        </AreaChart>
                      </ResponsiveContainer>
                    )}
                  </Card>
                  <Card>
                    <SectionHeader title="Quick Actions"/>
                    <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                      {[
                        { label:'Write Prescription', href:`/doctor/prescribe?patient=${selected.id}`, color:T.teal },
                        { label:'Generate Exercise Plan', href:`/doctor/plans`, color:T.green },
                        { label:'View Progress Reports', href:`/doctor/reports`, color:'#1F75CB' },
                      ].map(a => (
                        <a key={a.label} href={a.href} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 16px', background:T.card2, borderRadius:'var(--r-md)', border:`1px solid ${T.borderS}`, fontSize:13, fontWeight:600, color:a.color, transition:'all .2s', textDecoration:'none' }}
                          onMouseOver={e => { e.currentTarget.style.transform='translateX(4px)'; e.currentTarget.style.borderColor=a.color }}
                          onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.borderColor=T.borderS }}>
                          {a.label} <span>›</span>
                        </a>
                      ))}
                    </div>
                  </Card>
                </div>
              )}

              {/* Sessions tab */}
              {tab === 'Sessions' && (
                <Card>
                  <SectionHeader title={`${sessions.length} Rehabilitation Sessions`}/>
                  {sessions.length === 0 ? <EmptyState message="No sessions recorded yet"/> : (
                    <table>
                      <thead><tr><th>#</th><th>Date</th><th>Duration</th><th>Form Score</th><th>Total Reps</th><th>EMG RMS</th><th>BCI</th></tr></thead>
                      <tbody>
                        {sessions.slice(0,20).map((s,i) => (
                          <tr key={s.id}>
                            <td style={{ fontWeight:700, color:T.teal }}>S{sessions.length-i}</td>
                            <td>{new Date(s.started_at).toLocaleDateString('en-IN',{day:'numeric',month:'short',year:'2-digit'})}</td>
                            <td>{Math.round((s.duration_seconds||0)/60)} min</td>
                            <td><span style={{ fontWeight:700, color:Math.round((s.avg_form_score||0)*100)>70?T.green:'var(--warning)' }}>{Math.round((s.avg_form_score||0)*100)}%</span></td>
                            <td>{s.total_reps||0}</td>
                            <td>{Math.round(s.emg_avg_rms||0)}</td>
                            <td>{s.intent_count||0}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card>
              )}

              {/* Prescriptions tab */}
              {tab === 'Prescriptions' && (
                <Card>
                  <SectionHeader title="Prescriptions" action={<PrimaryBtn small onClick={() => window.location.href=`/doctor/prescribe?patient=${selected.id}`}>+ New Prescription</PrimaryBtn>}/>
                  {prescriptions.length === 0 ? <EmptyState message="No prescriptions yet"/> : prescriptions.map((rx,i) => {
                    // Safely get medications as array
                    let meds = []
                    if (Array.isArray(rx.medications)) meds = rx.medications
                    else if (rx.medications && typeof rx.medications === 'object') meds = [rx.medications]
                    return (
                      <div key={rx.id || i} style={{ marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${T.borderS}` }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
                          <div style={{ fontSize:13, fontWeight:700, color:T.text1 }}>Prescription {prescriptions.length - i}</div>
                          <div style={{ fontSize:11, color:T.text3 }}>
                            {rx.created_at ? new Date(rx.created_at).toLocaleDateString('en-IN', {day:'numeric', month:'short', year:'numeric'}) : ''}
                          </div>
                        </div>
                        {meds.map((m, j) => {
                          const name = String(typeof m === 'string' ? m : (m.medicine_name || m.name || m.drug || 'Unknown'))
                          const dose = typeof m === 'object' ? String(m.dose || m.dosage || '') : ''
                          const freq = typeof m === 'object' ? String(m.frequency || m.freq || '') : ''
                          const dur  = typeof m === 'object' ? String(m.duration || '') : ''
                          const detail = [dose, freq, dur].filter(Boolean).join(' · ')
                          return (
                            <div key={j} style={{ display:'flex', alignItems:'flex-start', gap:8, padding:'7px 0', borderBottom:`1px solid ${T.borderS}` }}>
                              <span style={{ color:T.teal, marginTop:1, fontWeight:700 }}>›</span>
                              <div>
                                <span style={{ fontSize:13, fontWeight:700, color:T.text1 }}>{name}</span>
                                {detail && <span style={{ fontSize:12, color:T.text2, marginLeft:8 }}>{detail}</span>}
                              </div>
                            </div>
                          )
                        })}
                        {rx.notes && typeof rx.notes === 'string' && (
                          <div style={{ marginTop:8, fontSize:12, color:T.text2, fontStyle:'italic', padding:'8px 12px', background:T.card2, borderRadius:'var(--r-sm)' }}>
                            Note: {rx.notes}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </Card>
              )}

              {/* Reports tab */}
              {tab === 'Reports' && (
                <Card>
                  <SectionHeader title="Progress Reports" action={<PrimaryBtn small onClick={() => window.location.href='/doctor/reports'}>Manage Reports</PrimaryBtn>}/>
                  {reports.length === 0 ? <EmptyState message="No reports yet"/> : reports.map((r,i) => (
                    <div key={r.id} style={{ marginBottom:16, paddingBottom:16, borderBottom:`1px solid ${T.borderS}` }}>
                      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8 }}>
                        <div style={{ fontSize:13, fontWeight:700, color:T.text1 }}>Report {reports.length-i}</div>
                        <Badge type={r.doctor_approved?'success':'warning'}>{r.doctor_approved?'Approved':'Pending'}</Badge>
                      </div>
                      <div style={{ fontSize:12, color:T.text2, marginBottom:8 }}>{String(r.period_start || '')} → {String(r.period_end || '')}</div>
                      {(r.strengths||[]).slice(0,2).map((s,j) => (
                        <div key={j} style={{ display:'flex', gap:8, fontSize:12, color:T.text2, marginBottom:4 }}>
                          <span style={{ color:T.green }}>✓</span>
                          <span>{typeof s === 'string' ? s : JSON.stringify(s)}</span>
                        </div>
                      ))}
                    </div>
                  ))}
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  )
}
