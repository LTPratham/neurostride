import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, StatCard } from '../../components/UI'
import { sessionApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'

export default function PatientSessions() {
  const { user }              = useAuth()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    sessionApi.forPatient(user.profile_id || user.id)
      .then(r => setSessions(r.data || []))
      .catch(() => setSessions([]))
      .finally(() => setLoading(false))
  }, [user])

  const chartData = sessions.slice(0, 10).reverse().map((s, i) => ({
    day:  `S${i + 1}`,
    form: Math.round((s.avg_form_score || 0) * 100),
    reps: s.total_reps || 0,
  }))

  const avgForm    = sessions.length ? Math.round(sessions.reduce((a, b) => a + (b.avg_form_score || 0), 0) / sessions.length * 100) : 0
  const totalReps  = sessions.reduce((a, b) => a + (b.total_reps || 0), 0)
  const totalMins  = Math.round(sessions.reduce((a, b) => a + (b.duration_seconds || 0), 0) / 60)
  const liveCount  = sessions.filter(s => s.session_mode === 'live').length

  if (loading) return <Layout title="My Sessions"><Spinner /></Layout>

  return (
    <Layout title="My Sessions">
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14, marginBottom: 20 }}>
        <StatCard label="Total sessions"  value={sessions.length} sub="All time"          accent="#2F7BE8" />
        <StatCard label="Total minutes"   value={totalMins}       sub="Time in therapy"   accent="#2EA043" />
        <StatCard label="Total reps"      value={totalReps}       sub="Across all"        accent="#A371F7" />
        <StatCard label="Avg form score"  value={`${avgForm}%`}   sub="All sessions"      accent="#D29922" />
      </div>

      {chartData.length > 0 && (
        <Card>
          <SectionHeader title="Form score per session" />
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262D" />
              <XAxis dataKey="day" tick={{ fill: '#8B949E', fontSize: 11 }} />
              <YAxis domain={[0, 100]} tick={{ fill: '#8B949E', fontSize: 11 }} unit="%" />
              <Tooltip contentStyle={{ background: '#1C2333', border: '1px solid #30363D', borderRadius: 8 }} />
              <Bar dataKey="form" fill="#2F7BE8" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card style={{ marginTop: 16 }}>
        <SectionHeader title={`${sessions.length} sessions`} />
        {sessions.length === 0 ? <EmptyState message="No sessions recorded yet." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Date', 'Duration', 'Reps', 'Form score', 'EMG RMS', 'BCI triggers', 'Mode'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '11px 14px', color: 'var(--text-primary)', fontWeight: 500 }}>
                    {new Date(s.started_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{Math.round((s.duration_seconds || 0) / 60)} min</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{s.total_reps || 0}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <span style={{ color: (s.avg_form_score || 0) >= 0.8 ? 'var(--success)' : 'var(--warning)', fontWeight: 600 }}>
                      {Math.round((s.avg_form_score || 0) * 100)}%
                    </span>
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{Math.round(s.emg_avg_rms || 0)}</td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{s.intent_count || 0}</td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge type={s.session_mode === 'live' ? 'success' : 'default'}>{s.session_mode}</Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </Layout>
  )
}
