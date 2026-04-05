import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { StatCard, Badge, Spinner, EmptyState, Card, SectionHeader, PrimaryBtn, HeroBanner, DoctorCard } from '../../components/UI'
import { patientApi } from '../../lib/api'

const DOCTOR_IMGS = [
  'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=400&q=80&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?w=400&q=80&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1594824476967-48c8b964273f?w=400&q=80&fit=crop&crop=top',
  'https://images.unsplash.com/photo-1622253692010-333f2da6031d?w=400&q=80&fit=crop&crop=top',
]

export default function DoctorDashboard() {
  const [patients, setPatients] = useState([])
  const [loading, setLoading]   = useState(true)
  const [search, setSearch]     = useState('')

  useEffect(() => {
    patientApi.list().then(r => setPatients(r.data || [])).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const filtered = patients.filter(p =>
    (p.full_name || '').toLowerCase().includes(search.toLowerCase()) ||
    (p.diagnosis  || '').toLowerCase().includes(search.toLowerCase())
  )
  const critical = patients.filter(p => p.paralysis_level === 'complete').length

  if (loading) return <Layout title="Clinical Dashboard"><Spinner /></Layout>

  return (
    <Layout title="Clinical Dashboard">
      <HeroBanner
        img="https://images.unsplash.com/photo-1631217868264-e5b90bb7e133?w=1400&q=75&fit=crop"
        title={`Good morning, Dr. Sharma`}
        sub={`${patients.length} patients under your care · ${critical} critical cases`}
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 22 }}>
        <StatCard label="Total Patients"  value={patients.length} sub="Under your care"    accent="var(--teal)"    />
        <StatCard label="Critical Cases"  value={critical}        sub="Complete paralysis"  accent="var(--danger)"  />
        <StatCard label="Reports Pending" value={2}               sub="Awaiting approval"   accent="var(--warning)" />
        <StatCard label="Sessions Today"  value={8}               sub="Scheduled"           accent="var(--green)"   />
      </div>

      {/* Doctor team */}
      <Card style={{ marginBottom: 22 }}>
        <SectionHeader title="Your specialist team" action={<PrimaryBtn small onClick={() => window.location.href='/doctor/patients'}>All patients</PrimaryBtn>}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 14 }}>
          {DOCTOR_IMGS.map((img, i) => (
            <DoctorCard key={i} name={['Dr. Priya Sharma','Dr. Rajiv Kumar','Dr. Anita Mehta','Dr. Suresh Patel'][i]}
              spec={['Neurologist','Rehabilitation','Physiotherapist','Neurosurgeon'][i]}
              rating="4.9" count="312" available="Available today"
              imgSrc={img} onClick={() => window.location.href='/doctor/patients'}/>
          ))}
        </div>
      </Card>

      {/* Patient list */}
      <Card>
        <SectionHeader title="Patient roster"
          action={
            <div style={{ display: 'flex', gap: 10 }}>
              <input style={{ width: 220 }} placeholder="Search patients..." value={search} onChange={e => setSearch(e.target.value)}/>
              <PrimaryBtn small onClick={() => window.location.href='/doctor/patients'}>View all</PrimaryBtn>
            </div>
          }/>
        {filtered.length === 0 ? <EmptyState message="No patients found." /> : (
          <table>
            <thead><tr>
              <th>Patient</th><th>Diagnosis</th><th>Affected side</th>
              <th>Level</th><th>Blood group</th><th>Actions</th>
            </tr></thead>
            <tbody>
              {filtered.map((p, i) => (
                <tr key={p.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 34, height: 34, borderRadius: '50%', overflow: 'hidden', flexShrink: 0, background: 'var(--teal-l)' }}>
                        <img src={DOCTOR_IMGS[i % DOCTOR_IMGS.length]} alt={p.full_name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={e => e.target.style.display='none'}/>
                      </div>
                      <div>
                        <div style={{ fontWeight: 700, color: 'var(--text1)', fontSize: 13 }}>{p.full_name}</div>
                        <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.email}</div>
                      </div>
                    </div>
                  </td>
                  <td style={{ fontSize: 13 }}>{p.diagnosis || '—'}</td>
                  <td><Badge type="default">{p.affected_side || '—'}</Badge></td>
                  <td><Badge type={p.paralysis_level==='complete'?'danger':p.paralysis_level==='partial'?'warning':'success'}>{p.paralysis_level || '—'}</Badge></td>
                  <td><span style={{ fontWeight: 700, color: 'var(--teal)', fontSize: 13 }}>{p.blood_group || '—'}</span></td>
                  <td>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a href={`/doctor/patients?id=${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--teal)', padding: '4px 10px', borderRadius: 100, background: 'var(--teal-l)', border: '1px solid rgba(79,176,179,.2)', transition: 'all .2s' }}>View</a>
                      <a href={`/doctor/prescribe?patient=${p.id}`} style={{ fontSize: 12, fontWeight: 600, color: 'var(--text2)', padding: '4px 10px', borderRadius: 100, background: 'var(--card2)', border: '1px solid var(--borderS)', transition: 'all .2s' }}>Prescribe</a>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16, marginTop: 22 }}>
        {[
          { href:'/doctor/prescribe', title:'New Prescription',   desc:'Write a prescription for any patient', img:'https://images.unsplash.com/photo-1584308666744-24d5c474f2ae?w=400&q=75&fit=crop', color:'var(--teal)' },
          { href:'/doctor/plans',     title:'Create Exercise Plan',desc:'Design a physiotherapy plan or use AI',  img:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=400&q=75&fit=crop', color:'var(--green)' },
          { href:'/doctor/reports',   title:'Review Reports',      desc:'Approve AI-generated progress reports', img:'https://images.unsplash.com/photo-1454165804606-c3d57bc86b40?w=400&q=75&fit=crop', color:'var(--blue)' },
        ].map(q => (
          <a key={q.href} href={q.href} style={{ borderRadius: 'var(--r-lg)', overflow: 'hidden', position: 'relative', height: 120, display: 'block', cursor: 'pointer', transition: 'transform .25s var(--ease), box-shadow .25s', boxShadow: 'var(--sh)' }}
            onMouseOver={e => { e.currentTarget.style.transform='translateY(-4px)'; e.currentTarget.style.boxShadow='var(--sh-md)' }}
            onMouseOut={e => { e.currentTarget.style.transform='none'; e.currentTarget.style.boxShadow='var(--sh)' }}>
            <img src={q.img} alt={q.title} style={{ width:'100%',height:'100%',objectFit:'cover',objectPosition:'center'}} loading="lazy"/>
            <div style={{ position:'absolute',inset:0,background:'linear-gradient(to right,rgba(56,79,75,.8),rgba(56,79,75,.2))',padding:'0 22px',display:'flex',alignItems:'center' }}>
              <div>
                <div style={{ fontSize:14,fontWeight:800,color:'#fff' }}>{q.title}</div>
                <div style={{ fontSize:11,color:'rgba(255,255,255,.7)',marginTop:2,fontFamily:'DM Sans, sans-serif' }}>{q.desc}</div>
              </div>
            </div>
          </a>
        ))}
      </div>
    </Layout>
  )
}
