import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState } from '../../components/UI'
import { reportApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

export default function PatientReports() {
  const { user }              = useAuth()
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!user) return
    reportApi.forPatient(user.profile_id || user.id)
      .then(r => setReports(r.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }, [user])

  if (loading) return <Layout title="My Reports"><Spinner /></Layout>

  return (
    <Layout title="My Progress Reports">
      {reports.length === 0 ? (
        <Card><EmptyState message="No reports yet. Your doctor will generate one after reviewing your sessions." /></Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {reports.map(r => (
            <Card key={r.id}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                <div>
                  <p style={{ fontSize: 15, fontWeight: 600, color: 'var(--text-primary)' }}>
                    {r.period_start} — {r.period_end}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                    {new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </p>
                </div>
                <Badge type={r.doctor_approved ? 'success' : 'warning'}>
                  {r.doctor_approved ? 'Doctor approved' : 'Pending approval'}
                </Badge>
              </div>

              <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{r.ai_summary}</p>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: r.recommendations?.length ? 12 : 0 }}>
                {r.strengths?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strengths</p>
                    {r.strengths.map((s, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {s}</p>)}
                  </div>
                )}
                {r.improvements?.length > 0 && (
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Improve</p>
                    {r.improvements.map((s, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {s}</p>)}
                  </div>
                )}
              </div>

              {r.recommendations?.length > 0 && (
                <div style={{ background: 'var(--info-bg)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--info)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Doctor recommendations</p>
                  {r.recommendations.map((rec, i) => <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 5 }}>• {rec}</p>)}
                </div>
              )}

              {r.doctor_notes && (
                <div style={{ marginTop: 12, borderTop: '1px solid var(--border-subtle)', paddingTop: 12 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Doctor notes</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{r.doctor_notes}</p>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
    </Layout>
  )
}
