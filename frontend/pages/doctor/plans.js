import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn, GhostBtn } from '../../components/UI'
import { patientApi, planApi, agentApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const EXERCISE_TEMPLATES = [
  { name: 'Shoulder raise',   reps: 10, sets: 3, notes: 'Keep elbow straight' },
  { name: 'Elbow flexion',    reps: 12, sets: 3, notes: 'Slow controlled movement' },
  { name: 'Wrist rotation',   reps: 15, sets: 2, notes: 'Both directions' },
  { name: 'Finger spread',    reps: 20, sets: 3, notes: 'Hold spread for 2 seconds' },
  { name: 'Grip squeeze',     reps: 15, sets: 3, notes: 'Use soft ball' },
  { name: 'Arm reach forward',reps: 10, sets: 3, notes: 'Keep shoulder level' },
]

export default function DoctorPlans() {
  const router                        = useRouter()
  const { user }                      = useAuth()
  const [patients, setPatients]       = useState([])
  const [patientId, setPatientId]     = useState(router.query.patient || '')
  const [plans, setPlans]             = useState([])
  const [loading, setLoading]         = useState(false)
  const [generating, setGenerating]   = useState(false)
  const [submitting, setSubmitting]   = useState(false)
  const [showForm, setShowForm]       = useState(false)
  const [title, setTitle]             = useState('')
  const [description, setDescription] = useState('')
  const [exercises, setExercises]     = useState([{ name: '', reps: 10, sets: 3, notes: '' }])
  const [freqPerWeek, setFreqPerWeek] = useState(5)
  const [durationWeeks, setDurationWeeks] = useState(4)

  useEffect(() => {
    patientApi.list().then(r => {
      const list = r.data || []
      setPatients(list)
      const pid = router.query.patient || (list[0]?.id)
      if (pid) { setPatientId(pid); loadPlans(pid) }
    })
  }, [])

  const loadPlans = (pid) => {
    setLoading(true)
    planApi.forPatient(pid)
      .then(r => setPlans(r.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }

  const onPatientChange = (pid) => {
    setPatientId(pid)
    loadPlans(pid)
  }

  const generateWithAI = async () => {
    if (!patientId) return
    setGenerating(true)
    try {
      const patient = patients.find(p => p.id === patientId)
      const res = await agentApi.generatePlan({
        patient_id: patientId,
        diagnosis:  patient?.diagnosis,
        affected_side: patient?.affected_side,
        paralysis_level: patient?.paralysis_level,
      })
      const plan = res.data
      setTitle(plan.title || 'AI Generated Exercise Plan')
      setDescription(plan.description || '')
      setExercises(plan.exercises || EXERCISE_TEMPLATES.slice(0, 4))
      setShowForm(true)
    } catch {
      // Fallback to template
      const patient = patients.find(p => p.id === patientId)
      setTitle(`Rehabilitation Plan — ${patient?.full_name || 'Patient'}`)
      setDescription('Evidence-based exercise plan for neurological rehabilitation.')
      setExercises(EXERCISE_TEMPLATES.slice(0, 4))
      setShowForm(true)
    } finally {
      setGenerating(false)
    }
  }

  const addExercise    = () => setExercises(prev => [...prev, { name: '', reps: 10, sets: 3, notes: '' }])
  const removeExercise = (i) => setExercises(prev => prev.filter((_, idx) => idx !== i))
  const updateEx       = (i, field, val) => setExercises(prev => prev.map((e, idx) => idx === i ? { ...e, [field]: val } : e))

  const submitPlan = async () => {
    if (!patientId || !title || exercises.some(e => !e.name)) return
    setSubmitting(true)
    try {
      await planApi.create({
        patient_id: patientId, title, description,
        exercises, frequency_per_week: freqPerWeek, duration_weeks: durationWeeks
      })
      setShowForm(false)
      setTitle(''); setDescription(''); setExercises([{ name: '', reps: 10, sets: 3, notes: '' }])
      loadPlans(patientId)
    } catch { alert('Failed to create plan.') }
    finally { setSubmitting(false) }
  }

  return (
    <Layout title="Exercise Plans">
      <div style={{ display: 'grid', gridTemplateColumns: '220px 1fr', gap: 16, alignItems: 'start' }}>
        {/* Patient selector */}
        <Card>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Patient</p>
          <select value={patientId} onChange={e => onPatientChange(e.target.value)} style={{ marginBottom: 0 }}>
            <option value="">Select...</option>
            {patients.map(p => <option key={p.id} value={p.id}>{p.full_name}</option>)}
          </select>
        </Card>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Actions */}
          <Card>
            <SectionHeader
              title="Exercise plans"
              action={
                <div style={{ display: 'flex', gap: 8 }}>
                  <PrimaryBtn small onClick={generateWithAI} disabled={!patientId || generating}>
                    {generating ? 'Generating...' : 'Generate with AI'}
                  </PrimaryBtn>
                  <GhostBtn onClick={() => setShowForm(!showForm)} disabled={!patientId}>
                    {showForm ? 'Cancel' : 'Create manually'}
                  </GhostBtn>
                </div>
              }
            />
            <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
              Use AI to generate an evidence-based plan based on the patient diagnosis, or create one manually.
            </p>
          </Card>

          {/* Create form */}
          {showForm && (
            <Card>
              <SectionHeader title="New exercise plan" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                  <div>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Plan title</p>
                    <input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Post-Stroke Recovery Phase 1" />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Days/week</p>
                      <input type="number" min={1} max={7} value={freqPerWeek} onChange={e => setFreqPerWeek(+e.target.value)} />
                    </div>
                    <div>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Duration (weeks)</p>
                      <input type="number" min={1} max={52} value={durationWeeks} onChange={e => setDurationWeeks(+e.target.value)} />
                    </div>
                  </div>
                </div>

                <div>
                  <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 5 }}>Description</p>
                  <textarea rows={2} value={description} onChange={e => setDescription(e.target.value)} placeholder="Plan description..." style={{ resize: 'vertical' }} />
                </div>

                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>Exercises</p>
                    <PrimaryBtn small onClick={addExercise}>+ Add exercise</PrimaryBtn>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {exercises.map((ex, i) => (
                      <div key={i} style={{ display: 'grid', gridTemplateColumns: '2fr 80px 80px 2fr auto', gap: 8, alignItems: 'end' }}>
                        <input placeholder="Exercise name" value={ex.name} onChange={e => updateEx(i, 'name', e.target.value)} />
                        <input type="number" placeholder="Reps" value={ex.reps} onChange={e => updateEx(i, 'reps', +e.target.value)} />
                        <input type="number" placeholder="Sets" value={ex.sets} onChange={e => updateEx(i, 'sets', +e.target.value)} />
                        <input placeholder="Notes" value={ex.notes} onChange={e => updateEx(i, 'notes', e.target.value)} />
                        {exercises.length > 1 && (
                          <button onClick={() => removeExercise(i)} style={{ background: 'var(--danger-bg)', border: '1px solid var(--danger)', color: 'var(--danger)', borderRadius: 'var(--radius-sm)', padding: '8px 12px', cursor: 'pointer', fontSize: 12 }}>Remove</button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <PrimaryBtn onClick={submitPlan} disabled={submitting || !title}>
                  {submitting ? 'Saving...' : 'Save exercise plan'}
                </PrimaryBtn>
              </div>
            </Card>
          )}

          {/* Existing plans */}
          {loading ? <Spinner /> : plans.length === 0 ? (
            <EmptyState message="No plans yet. Create one above." />
          ) : (
            plans.map(plan => (
              <Card key={plan.id}>
                <SectionHeader
                  title={plan.title}
                  action={
                    <div style={{ display: 'flex', gap: 8 }}>
                      <Badge type={plan.is_active ? 'success' : 'default'}>{plan.is_active ? 'Active' : 'Inactive'}</Badge>
                      {plan.ai_generated && <Badge type="info">AI generated</Badge>}
                    </div>
                  }
                />
                <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 12 }}>
                  {plan.frequency_per_week}x/week · {plan.duration_weeks} weeks · {(plan.exercises || []).length} exercises
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {(plan.exercises || []).map((ex, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', fontSize: 13 }}>
                      <span style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{ex.name}</span>
                      <span style={{ color: 'var(--text-secondary)' }}>{ex.sets} × {ex.reps} reps</span>
                    </div>
                  ))}
                </div>
              </Card>
            ))
          )}
        </div>
      </div>
    </Layout>
  )
}
