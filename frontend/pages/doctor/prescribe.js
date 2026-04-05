import { useEffect, useState, useRef } from 'react'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'
import { Card, SectionHeader, PrimaryBtn, Badge, Spinner } from '../../components/UI'
import { patientApi, prescriptionApi, agentApi, medicineSearch } from '../../lib/api'
import styles from '../../styles/Doctor.module.css'

function MedicineInput({ med, index, onUpdate, onRemove, showRemove }) {
  const [suggestions, setSuggestions] = useState([])
  const [showDrop, setShowDrop]       = useState(false)
  const dropRef                        = useRef(null)

  const handleNameChange = async (val) => {
    onUpdate(index, 'name', val)
    onUpdate(index, 'dose', '')
    onUpdate(index, 'strength', '')
    if (val.length >= 2) {
      try {
        const res = await medicineSearch(val)
        setSuggestions(res.data || [])
        setShowDrop(true)
      } catch { setSuggestions([]) }
    } else {
      setSuggestions([])
      setShowDrop(false)
    }
  }

  const selectSuggestion = (item) => {
    onUpdate(index, 'name',     item.name)
    onUpdate(index, 'dose',     item.strength || '')
    onUpdate(index, 'strength', item.strength || '')
    onUpdate(index, 'unit',     item.unit     || '')
    setSuggestions([])
    setShowDrop(false)
  }

  useEffect(() => {
    const handler = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) setShowDrop(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  return (
    <div style={{ background: 'var(--bg-elevated)', borderRadius: 'var(--radius-md)', padding: '12px 14px', marginBottom: 8 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr 1fr auto', gap: 8, alignItems: 'start' }}>

        {/* Medicine name with autocomplete */}
        <div style={{ position: 'relative' }} ref={dropRef}>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Medicine name</p>
          <input
            placeholder="Type to search..."
            value={med.name}
            onChange={e => handleNameChange(e.target.value)}
            onFocus={() => suggestions.length > 0 && setShowDrop(true)}
            autoComplete="off"
          />
          {showDrop && suggestions.length > 0 && (
            <div style={{
              position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 100,
              background: 'var(--bg-card)', border: '1px solid var(--border)',
              borderRadius: 'var(--radius-md)', marginTop: 4,
              boxShadow: '0 8px 24px rgba(0,0,0,0.3)', overflow: 'hidden',
            }}>
              {suggestions.map((s, i) => (
                <div
                  key={i}
                  onMouseDown={() => selectSuggestion(s)}
                  style={{
                    padding: '10px 14px', cursor: 'pointer',
                    borderBottom: i < suggestions.length - 1 ? '1px solid var(--border-subtle)' : 'none',
                    transition: 'background 100ms',
                  }}
                  onMouseOver={e => e.currentTarget.style.background = 'var(--bg-elevated)'}
                  onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                >
                  <p style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-primary)', marginBottom: 2 }}>
                    {s.name}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {s.strength} · {s.unit} · Stock: {s.stock_quantity}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Dosage (auto-filled from suggestion, editable) */}
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Dosage</p>
          <input
            placeholder="e.g. 500mg"
            value={med.dose}
            onChange={e => onUpdate(index, 'dose', e.target.value)}
          />
        </div>

        {/* Frequency */}
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Frequency</p>
          <select value={med.frequency} onChange={e => onUpdate(index, 'frequency', e.target.value)}>
            <option value="">Select...</option>
            <option>Once daily</option>
            <option>Twice daily</option>
            <option>Three times daily</option>
            <option>Four times daily</option>
            <option>Once at night</option>
            <option>SOS (as needed)</option>
            <option>Before meals</option>
            <option>After meals</option>
          </select>
        </div>

        {/* Duration */}
        <div>
          <p style={{ fontSize: 11, color: 'var(--text-muted)', marginBottom: 4 }}>Duration</p>
          <select value={med.duration} onChange={e => onUpdate(index, 'duration', e.target.value)}>
            <option value="">Select...</option>
            <option>3 days</option>
            <option>5 days</option>
            <option>7 days</option>
            <option>10 days</option>
            <option>14 days</option>
            <option>1 month</option>
            <option>3 months</option>
            <option>Ongoing</option>
          </select>
        </div>

        {/* Remove */}
        <div style={{ paddingTop: 20 }}>
          {showRemove && (
            <button
              onClick={() => onRemove(index)}
              style={{
                background: 'var(--danger-bg)', border: '1px solid var(--danger)',
                color: 'var(--danger)', borderRadius: 'var(--radius-sm)',
                padding: '8px 10px', cursor: 'pointer', fontSize: 12, whiteSpace: 'nowrap',
              }}
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Show full medicine info if selected from DB */}
      {med.strength && (
        <p style={{ fontSize: 11, color: 'var(--success)', marginTop: 6 }}>
          From inventory: {med.name} {med.strength} · {med.unit}
        </p>
      )}
    </div>
  )
}

export default function Prescribe() {
  const router                          = useRouter()
  const [patients, setPatients]         = useState([])
  const [patientId, setPatientId]       = useState(router.query.patient || '')
  const [selected, setSelected]         = useState(null)
  const [meds, setMeds]                 = useState([{ name: '', dose: '', frequency: '', duration: '', strength: '', unit: '' }])
  const [notes, setNotes]               = useState('')
  const [interactionResult, setInteractionResult] = useState(null)
  const [checking, setChecking]         = useState(false)
  const [submitting, setSubmitting]     = useState(false)
  const [success, setSuccess]           = useState(false)

  useEffect(() => {
    patientApi.list().then(r => {
      const list = r.data || []
      setPatients(list)
      // Auto-select from query param after patients load
      const qid = router.query.patient
      if (qid) {
        setPatientId(qid)
        const p = list.find(x => String(x.id) === String(qid))
        if (p) setSelected(p)
      }
    })
  }, [router.query.patient])

  useEffect(() => {
    if (patientId && patients.length > 0) {
      const p = patients.find(x => String(x.id) === String(patientId))
      setSelected(p || null)
    }
  }, [patientId, patients])

  const addMed    = () => setMeds(prev => [...prev, { name: '', dose: '', frequency: '', duration: '', strength: '', unit: '' }])
  const removeMed = (i) => setMeds(prev => prev.filter((_, idx) => idx !== i))
  const updateMed = (i, field, val) => setMeds(prev => prev.map((m, idx) => idx === i ? { ...m, [field]: val } : m))

  const checkInteractions = async () => {
    if (!selected) return
    setChecking(true)
    try {
      const res = await agentApi.checkDrugInteraction(meds, selected.allergies || [])
      setInteractionResult(res.data)
    } catch {
      setInteractionResult({ safe: true, warnings: [], summary: 'Could not check — verify manually.' })
    } finally {
      setChecking(false)
    }
  }

  const handleSubmit = async () => {
    if (!patientId || meds.some(m => !m.name)) return
    setSubmitting(true)
    try {
      await prescriptionApi.create({ patient_id: patientId, medications: meds, notes })
      setSuccess(true)
      setTimeout(() => router.push('/doctor'), 1800)
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || 'Unknown error'
      alert(`Failed to submit prescription: ${msg}`)
      console.error('Prescription error:', err?.response?.data || err)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Layout title="Write Prescription">
      {success && (
        <div style={{ background: 'var(--success-bg)', border: '1px solid var(--success)', borderRadius: 'var(--radius-md)', padding: 14, marginBottom: 20, color: 'var(--success)', fontSize: 14 }}>
          Prescription submitted. Pharmacy has been notified.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 20, alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

          {/* Patient selector */}
          <Card>
            <SectionHeader title="Select patient" />
            <select value={patientId} onChange={e => setPatientId(e.target.value)}>
              <option value="">— Select a patient —</option>
              {patients.map(p => (
                <option key={p.id} value={String(p.id)}>{p.full_name} — {p.diagnosis || 'No diagnosis'}</option>
              ))}
            </select>
          </Card>

          {/* Medications */}
          <Card>
            <SectionHeader title="Medications" action={<PrimaryBtn small onClick={addMed}>+ Add medicine</PrimaryBtn>} />
            <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Start typing a medicine name to search from the pharmacy inventory.
            </p>
            {meds.map((med, i) => (
              <MedicineInput
                key={i}
                med={med}
                index={i}
                onUpdate={updateMed}
                onRemove={removeMed}
                showRemove={meds.length > 1}
              />
            ))}
          </Card>

          {/* Notes */}
          <Card>
            <SectionHeader title="Clinical notes" />
            <textarea
              rows={3}
              placeholder="Follow-up schedule, special instructions..."
              value={notes}
              onChange={e => setNotes(e.target.value)}
              style={{ resize: 'vertical' }}
            />
          </Card>

          <div style={{ display: 'flex', gap: 12 }}>
            <PrimaryBtn onClick={checkInteractions} disabled={!patientId || checking}>
              {checking ? 'Checking...' : 'Check drug interactions'}
            </PrimaryBtn>
            <PrimaryBtn onClick={handleSubmit} disabled={!patientId || submitting || success}>
              {submitting ? 'Submitting...' : 'Submit prescription'}
            </PrimaryBtn>
          </div>
        </div>

        {/* Patient info + interaction result */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {selected && (
            <Card>
              <SectionHeader title="Patient info" />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Name',        selected.full_name],
                  ['Diagnosis',   selected.diagnosis    || '—'],
                  ['Blood group', selected.blood_group  || '—'],
                  ['Allergies',   Array.isArray(selected.allergies) ? (selected.allergies.join(', ') || 'None') : (String(selected.allergies || '') || 'None')],
                ].map(([k, v]) => (
                  <div key={k} style={{ display: 'flex', gap: 8, fontSize: 13 }}>
                    <span style={{ color: 'var(--text-muted)', minWidth: 90 }}>{k}</span>
                    <span style={{ color: k === 'Allergies' && v !== 'None' ? 'var(--danger)' : 'var(--text-primary)' }}>{v}</span>
                  </div>
                ))}
                {selected.current_meds?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 6 }}>Current medications</p>
                    {(Array.isArray(selected.current_meds) ? selected.current_meds : []).map((m, i) => (
                      <p key={i} style={{ fontSize: 12, color: 'var(--text-secondary)', marginBottom: 3 }}>
                        • {typeof m === 'string' ? m : `${m.name || ''} ${m.dose || ''} — ${m.frequency || ''}`}
                      </p>
                    ))}
                  </div>
                )}
              </div>
            </Card>
          )}

          {interactionResult && (
            <Card>
              <SectionHeader
                title="Interaction check"
                action={<Badge type={interactionResult.safe ? 'success' : 'danger'}>
                  {interactionResult.safe ? 'Safe' : 'Warning'}
                </Badge>}
              />
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.7 }}>
                {interactionResult.summary}
              </p>
              {interactionResult.warnings?.map((w, i) => (
                <p key={i} style={{ fontSize: 13, color: 'var(--warning)', marginTop: 8 }}>⚠ {w}</p>
              ))}
              {interactionResult.interactions?.map((inter, i) => (
                <div key={i} style={{ marginTop: 8, background: 'var(--bg-elevated)', borderRadius: 'var(--radius-sm)', padding: '8px 12px' }}>
                  <p style={{ fontSize: 12, color: inter.severity === 'severe' ? 'var(--danger)' : 'var(--warning)', fontWeight: 600, marginBottom: 3 }}>
                    {inter.severity?.toUpperCase()} — {inter.drugs?.join(' + ')}
                  </p>
                  <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{inter.description}</p>
                </div>
              ))}
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
