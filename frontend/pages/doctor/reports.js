import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn, GhostBtn } from '../../components/UI'
import { patientApi, reportApi, agentApi } from '../../lib/api'
import styles from '../../styles/Doctor.module.css'

export default function DoctorReports() {
  const [patients, setPatients]   = useState([])
  const [selected, setSelected]   = useState('')
  const [reports, setReports]     = useState([])
  const [loading, setLoading]     = useState(false)
  const [generating, setGenerating] = useState(false)
  const [approveId, setApproveId] = useState(null)
  const [doctorNotes, setDoctorNotes] = useState('')

  useEffect(() => {
    patientApi.list().then(r => {
      const list = r.data || []
      setPatients(list)
      if (list.length) { setSelected(list[0].id); loadReports(list[0].id) }
    })
  }, [])

  const loadReports = (patientId) => {
    setLoading(true)
    reportApi.forPatient(patientId)
      .then(r => setReports(r.data || []))
      .catch(() => setReports([]))
      .finally(() => setLoading(false))
  }

  const onSelectPatient = (id) => {
    setSelected(id)
    loadReports(id)
    setApproveId(null)
  }

  const generateReport = async () => {
    if (!selected) return
    setGenerating(true)
    try {
      await agentApi.generateReport({ patient_id: selected })
      loadReports(selected)
    } catch {
      alert('Report generation failed. Make sure the AI agent is configured.')
    } finally {
      setGenerating(false)
    }
  }

  const downloadReport = (reportId) => {
    const token = localStorage.getItem('ns_token')
    const url   = `http://localhost:8000/api/reports/${reportId}/download`
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.blob())
      .then(blob => {
        const a = document.createElement('a')
        a.href = URL.createObjectURL(blob)
        a.download = `NeuroStride_Report_${reportId}.docx`
        a.click()
      })
      .catch(() => alert('Download failed. Check backend is running.'))
  }

  const approve = async (reportId) => {
    try {
      await reportApi.approve(reportId, doctorNotes)
      setReports(prev => prev.map(r => r.id === reportId ? { ...r, doctor_approved: true, doctor_notes: doctorNotes } : r))
      setApproveId(null)
      setDoctorNotes('')
    } catch {
      alert('Could not approve report.')
    }
  }

  return (
    <Layout title="Progress Reports">
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Patient selector */}
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: 12, position: 'sticky', top: 'calc(var(--header-h) + 28px)' }}>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Select patient</p>
          {patients.map(p => (
            <div
              key={p.id}
              className={`${styles.patientListItem} ${selected === p.id ? styles.patientListActive : ''}`}
              onClick={() => onSelectPatient(p.id)}
            >
              <div className={styles.patientAvatar}>{(p.full_name || 'P').charAt(0)}</div>
              <span style={{ fontSize: 13, color: 'var(--text-primary)' }}>{p.full_name}</span>
            </div>
          ))}
        </div>

        {/* Reports panel */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <Card>
            <SectionHeader
              title="AI progress reports"
              action={
                <PrimaryBtn onClick={generateReport} disabled={!selected || generating}>
                  {generating ? 'Generating...' : 'Generate new report'}
                </PrimaryBtn>
              }
            />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 0 }}>
              Reports are AI-generated from session data and require your approval before being shared with the patient.
            </p>
          </Card>

          {loading ? <Spinner /> : reports.length === 0 ? (
            <EmptyState message="No reports yet. Generate one using the button above." />
          ) : (
            reports.map(report => (
              <Card key={report.id}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-primary)' }}>
                      {report.period_start} — {report.period_end}
                    </p>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 2 }}>
                      Generated {new Date(report.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </p>
                  </div>
                  <Badge type={report.doctor_approved ? 'success' : 'warning'}>
                    {report.doctor_approved ? 'Approved' : 'Pending approval'}
                  </Badge>
                </div>

                {/* AI Summary */}
                <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 14 }}>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.05em' }}>AI Summary</p>
                  <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.75 }}>{report.ai_summary}</p>
                </div>

                {/* Strengths & Improvements */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 14 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--success)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Strengths</p>
                    {(report.strengths || []).map((s, i) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>• {s}</p>
                    ))}
                  </div>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--warning)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Areas to improve</p>
                    {(report.improvements || []).map((s, i) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6, lineHeight: 1.5 }}>• {s}</p>
                    ))}
                  </div>
                </div>

                {/* Recommendations */}
                {(report.recommendations || []).length > 0 && (
                  <div style={{ background: 'var(--info-bg)', borderRadius: 'var(--radius-md)', padding: 12, marginBottom: 14 }}>
                    <p style={{ fontSize: 12, color: 'var(--info)', fontWeight: 600, marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.04em' }}>Recommendations</p>
                    {report.recommendations.map((r, i) => (
                      <p key={i} style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 6 }}>• {r}</p>
                    ))}
                  </div>
                )}

                {/* Doctor notes (if approved) */}
                {report.doctor_approved && report.doctor_notes && (
                  <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 4 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 4 }}>Your notes</p>
                    <p style={{ fontSize: 13, color: 'var(--text-secondary)', fontStyle: 'italic' }}>{report.doctor_notes}</p>
                  </div>
                )}

                {/* Approve section */}
                {!report.doctor_approved && (
                  approveId === report.id ? (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 14, marginTop: 4 }}>
                      <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>Add notes before approving (optional):</p>
                      <textarea
                        rows={2}
                        placeholder="Clinical notes, follow-up instructions..."
                        value={doctorNotes}
                        onChange={e => setDoctorNotes(e.target.value)}
                        style={{ marginBottom: 10, resize: 'vertical' }}
                      />
                      <div style={{ display: 'flex', gap: 8 }}>
                        <PrimaryBtn small onClick={() => approve(report.id)}>Approve & share</PrimaryBtn>
                        <GhostBtn onClick={() => setApproveId(null)}>Cancel</GhostBtn>
                      </div>
                    </div>
                  ) : (
                    <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: 12, marginTop: 4 }}>
                      <PrimaryBtn small onClick={() => setApproveId(report.id)}>Review & approve</PrimaryBtn>
                    </div>
                  )
                )}
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
