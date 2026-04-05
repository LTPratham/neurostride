import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { StatCard, Badge, Spinner, Card, SectionHeader, HeroBanner } from '../../components/UI'
import { sessionApi, planApi, reportApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts'

export default function PatientDashboard() {
  const { user } = useAuth()
  const [sessions, setSessions] = useState([])
  const [plans, setPlans]       = useState([])
  const [reports, setReports]   = useState([])
  const [loading, setLoading]   = useState(true)

  useEffect(() => {
    if (!user) return
    Promise.all([
      sessionApi.forPatient(user.profile_id || user.id).catch(() => ({ data: [] })),
      planApi.forPatient(user.profile_id || user.id).catch(() => ({ data: [] })),
      reportApi.forPatient(user.profile_id || user.id).catch(() => ({ data: [] })),
    ]).then(([s, p, r]) => {
      setSessions(s.data || []); setPlans(p.data || []); setReports(r.data || [])
    }).finally(() => setLoading(false))
  }, [user])

  const chartData = sessions.slice(0, 14).reverse().map((s, i) => ({
    day: `D${i+1}`, formScore: Math.round((s.avg_form_score||0)*100), reps: s.total_reps||0, emg: Math.round(s.emg_avg_rms||0),
  }))
  const avgForm = sessions.length ? Math.round(sessions.reduce((a,b) => a+(b.avg_form_score||0),0)/sessions.length*100) : 0
  const totalReps = sessions.reduce((a,b) => a+(b.total_reps||0),0)

  if (loading) return <Layout title="My Recovery Dashboard"><Spinner /></Layout>

  return (
    <Layout title="My Recovery Dashboard">
      <HeroBanner
        img="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1400&q=75&fit=crop"
        title={`Welcome back, ${user?.full_name?.split(' ')[0] || 'Patient'}`}
        sub={`${sessions.length} sessions completed · Keep up the great work!`}
      />

      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:22 }}>
        <StatCard label="Total Sessions"  value={sessions.length} sub="All time"           accent="var(--teal)"    />
        <StatCard label="Avg Form Score"  value={`${avgForm}%`}   sub="Last 14 sessions"   accent="var(--green)"   />
        <StatCard label="Total Reps"      value={totalReps}        sub="Across all sessions" accent="var(--blue)"   />
        <StatCard label="BCI Triggers"    value={sessions[0]?.intent_count||0} sub="Last session" accent="var(--warning)"/>
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:22 }}>
        <Card>
          <SectionHeader title="Form score trend — last 14 sessions"/>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={chartData}>
              <defs>
                <linearGradient id="fg" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#4FB0B3" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#4FB0B3" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borderS)"/>
              <XAxis dataKey="day" tick={{ fill:'var(--text3)', fontSize:11 }}/>
              <YAxis domain={[0,100]} tick={{ fill:'var(--text3)', fontSize:11 }} unit="%"/>
              <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10 }} labelStyle={{ color:'var(--text1)' }}/>
              <Area type="monotone" dataKey="formScore" stroke="#4FB0B3" fill="url(#fg)" strokeWidth={2} dot={false}/>
            </AreaChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <SectionHeader title="EMG signal strength"/>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--borderS)"/>
              <XAxis dataKey="day" tick={{ fill:'var(--text3)', fontSize:11 }}/>
              <YAxis tick={{ fill:'var(--text3)', fontSize:11 }}/>
              <Tooltip contentStyle={{ background:'var(--card)', border:'1px solid var(--border)', borderRadius:10 }} labelStyle={{ color:'var(--text1)' }}/>
              <Line type="monotone" dataKey="emg" stroke="#2DA44E" strokeWidth={2} dot={false}/>
            </LineChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Bottom row */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:18 }}>
        {/* Active plan */}
        <Card>
          <SectionHeader title="Active exercise plan" action={plans[0] ? <a href="/patient/exercises" style={{ fontSize:12, color:'var(--teal)', fontWeight:600 }}>View all →</a> : null}/>
          {plans[0] ? (
            <div>
              <div style={{ fontWeight:700, color:'var(--text1)', marginBottom:8 }}>{plans[0].title}</div>
              <div style={{ fontSize:13, color:'var(--text2)', marginBottom:12, fontFamily:'DM Sans, sans-serif' }}>{plans[0].description}</div>
              <div style={{ display:'flex', gap:12 }}>
                <Badge type="info">{plans[0].frequency_per_week}x / week</Badge>
                <Badge type="default">{plans[0].duration_weeks} weeks</Badge>
              </div>
              <div style={{ marginTop:16, borderRadius:'var(--r-md)', overflow:'hidden', height:100 }}>
                <img src="https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=600&q=75&fit=crop" alt="Exercise" style={{ width:'100%',height:'100%',objectFit:'cover' }} loading="lazy"/>
              </div>
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)', fontSize:13 }}>No active plan yet. Ask your doctor.</div>
          )}
        </Card>

        {/* Latest report */}
        <Card>
          <SectionHeader title="Latest progress report" action={reports.length ? <a href="/patient/reports" style={{ fontSize:12, color:'var(--teal)', fontWeight:600 }}>View all →</a> : null}/>
          {reports[0] ? (
            <div>
              <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                <Badge type={reports[0].doctor_approved ? 'success' : 'warning'}>
                  {reports[0].doctor_approved ? '✓ Doctor approved' : 'Pending approval'}
                </Badge>
                <Badge type="default">{reports[0].period_start} → {reports[0].period_end}</Badge>
              </div>
              <p style={{ fontSize:13, color:'var(--text2)', lineHeight:1.7, fontFamily:'DM Sans, sans-serif' }}>
                {(reports[0].ai_summary || '').slice(0,200)}...
              </p>
              {reports[0].strengths?.length > 0 && (
                <div style={{ marginTop:12 }}>
                  {reports[0].strengths.slice(0,2).map((s,i) => (
                    <div key={i} style={{ display:'flex', gap:8, alignItems:'flex-start', marginBottom:6 }}>
                      <span style={{ color:'var(--green)', fontSize:14, marginTop:1 }}>✓</span>
                      <span style={{ fontSize:12, color:'var(--text2)', fontFamily:'DM Sans, sans-serif' }}>{s}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div style={{ textAlign:'center', padding:'24px 0', color:'var(--text3)', fontSize:13 }}>No reports yet. Complete more sessions!</div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
