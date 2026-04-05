import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn, GhostBtn, HeroBanner } from '../../components/UI'
import { planApi } from '../../lib/api'
import { useAuth } from '../../context/AuthContext'

const STREAK_KEY = 'ns_exercise_streak'
const DONE_KEY   = 'ns_exercise_done'

function getStreak() {
  try { return JSON.parse(localStorage.getItem(STREAK_KEY)) || { count:0, lastDate:null, history:[] } }
  catch { return { count:0, lastDate:null, history:[] } }
}
function getDone() {
  try { return JSON.parse(localStorage.getItem(DONE_KEY)) || {} }
  catch { return {} }
}

const MILESTONES = [
  { days:3,   label:'3-Day Streak',   icon:'🔥', reward:'Consistency starter' },
  { days:7,   label:'Week Warrior',   icon:'⚡', reward:'7 days strong!' },
  { days:14,  label:'2-Week Hero',    icon:'💪', reward:'Habit forming!' },
  { days:30,  label:'Monthly Master', icon:'🏆', reward:'1 month champion' },
  { days:60,  label:'Recovery Star',  icon:'⭐', reward:'60-day dedication' },
]

const T = {
  teal:'var(--teal)', green:'var(--green)', card:'var(--card)', card2:'var(--card2)',
  border:'var(--border)', borderS:'var(--borderS)', text1:'var(--text1)', text2:'var(--text2)', text3:'var(--text3)',
}

export default function PatientExercises() {
  const { user }              = useAuth()
  const [plans, setPlans]     = useState([])
  const [loading, setLoading] = useState(true)
  const [reps, setReps]       = useState({})
  const [done, setDone]       = useState({})
  const [streak, setStreak]   = useState({ count:0, lastDate:null, history:[] })
  const [celebrate, setCelebrate] = useState(null)
  const [allDone, setAllDone] = useState(false)

  useEffect(() => {
    if (!user) return
    setStreak(getStreak())
    setDone(getDone())
    planApi.forPatient(user.profile_id || user.id)
      .then(r => setPlans(r.data || []))
      .catch(() => setPlans([]))
      .finally(() => setLoading(false))
  }, [user])

  const plan = plans[0]

  const countRep = (name, maxReps) => {
    const next = (reps[name] || 0) + 1
    setReps(prev => ({ ...prev, [name]: next }))
    if (next >= maxReps) {
      const newDone = { ...done, [name]: true }
      setDone(newDone)
      localStorage.setItem(DONE_KEY, JSON.stringify(newDone))
      setCelebrate(name)
      setTimeout(() => setCelebrate(null), 2500)
      // Check if all exercises done
      const allExDone = (plan?.exercises || []).every(ex => newDone[ex.name])
      if (allExDone) {
        setAllDone(true)
        updateStreak()
      }
    }
  }

  const updateStreak = () => {
    const today = new Date().toDateString()
    const s = getStreak()
    if (s.lastDate === today) return // already counted today
    const yesterday = new Date(Date.now() - 86400000).toDateString()
    const newCount = s.lastDate === yesterday ? s.count + 1 : 1
    const hist = [...(s.history||[]), today].slice(-30)
    const newStreak = { count: newCount, lastDate: today, history: hist }
    setStreak(newStreak)
    localStorage.setItem(STREAK_KEY, JSON.stringify(newStreak))
    // Check milestone
    const hit = MILESTONES.find(m => m.days === newCount)
    if (hit) setCelebrate(`milestone:${hit.label}`)
  }

  const resetToday = () => {
    const cleared = {}
    setReps({}); setDone(cleared); setAllDone(false)
    localStorage.setItem(DONE_KEY, JSON.stringify(cleared))
  }

  const last7 = Array.from({length:7}, (_,i) => {
    const d = new Date(Date.now() - (6-i)*86400000).toDateString()
    return { date:d, label:['Su','Mo','Tu','We','Th','Fr','Sa'][new Date(d).getDay()], done: streak.history?.includes(d) }
  })

  const nextMilestone = MILESTONES.find(m => m.days > streak.count) || MILESTONES[MILESTONES.length-1]
  const progress = Math.min(100, Math.round((streak.count / nextMilestone.days) * 100))
  const completedCount = (plan?.exercises||[]).filter(ex => done[ex.name]).length
  const totalEx = (plan?.exercises||[]).length

  if (loading) return <Layout title="My Exercises"><Spinner/></Layout>

  return (
    <Layout title="My Exercises">
      <HeroBanner img="https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?w=1200&q=55&fit=crop&auto=format" title="My Exercise Plan" sub="Complete daily exercises to maintain your streak and track recovery"/>

      {/* Celebration overlay */}
      {celebrate && (
        <div style={{ position:'fixed', inset:0, zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(56,79,75,.5)', backdropFilter:'blur(4px)' }}>
          <div style={{ background:T.card, borderRadius:'var(--r-xl)', padding:40, textAlign:'center', boxShadow:'0 24px 60px rgba(0,0,0,.3)', animation:'fadeUp .4s ease' }}>
            <div style={{ fontSize:56, marginBottom:12 }}>{celebrate.startsWith('milestone:') ? MILESTONES.find(m=>`milestone:${m.label}`===celebrate)?.icon || '🏆' : '✅'}</div>
            <div style={{ fontSize:20, fontWeight:900, color:T.text1, marginBottom:6 }}>
              {celebrate.startsWith('milestone:') ? celebrate.replace('milestone:','') : `${celebrate} Complete!`}
            </div>
            <div style={{ fontSize:14, color:T.text2 }}>
              {celebrate.startsWith('milestone:') ? 'You hit a new milestone! Keep it up!' : 'Great work! Keep going!'}
            </div>
          </div>
        </div>
      )}

      {/* All done banner */}
      {allDone && (
        <div style={{ background:'linear-gradient(135deg,rgba(45,164,78,.12),rgba(79,176,179,.12))', border:'1px solid rgba(45,164,78,.25)', borderRadius:'var(--r-lg)', padding:'18px 22px', marginBottom:20, display:'flex', alignItems:'center', gap:16 }}>
          <div style={{ fontSize:36 }}>🎉</div>
          <div>
            <div style={{ fontSize:16, fontWeight:900, color:T.green }}>All exercises completed for today!</div>
            <div style={{ fontSize:13, color:T.text2, marginTop:2 }}>Your streak is now <strong>{streak.count} day{streak.count!==1?'s':''}</strong>. Come back tomorrow!</div>
          </div>
          <GhostBtn small onClick={resetToday} style={{ marginLeft:'auto' }}>Reset</GhostBtn>
        </div>
      )}

      <div style={{ display:'grid', gridTemplateColumns:'1fr 300px', gap:18 }}>

        {/* Exercises */}
        <div>
          {!plan ? (
            <Card><EmptyState message="No active exercise plan. Ask your doctor to create one."/></Card>
          ) : (
            <>
              <Card style={{ marginBottom:16 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                  <div>
                    <div style={{ fontSize:16, fontWeight:800, color:T.text1, marginBottom:4 }}>{plan.title}</div>
                    <div style={{ fontSize:13, color:T.text2, fontFamily:'DM Sans,sans-serif' }}>{plan.description}</div>
                  </div>
                  <Badge type="success">Active Plan</Badge>
                </div>
                <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10 }}>
                  {[
                    [`${plan.frequency_per_week}x / week`, 'Frequency'],
                    [`${plan.duration_weeks} weeks`, 'Duration'],
                    [`${completedCount} / ${totalEx}`, 'Today\'s Progress'],
                  ].map(([v,l]) => (
                    <div key={l} style={{ background:T.card2, borderRadius:'var(--r-md)', padding:'11px 14px', border:`1px solid ${T.borderS}`, textAlign:'center' }}>
                      <div style={{ fontSize:18, fontWeight:900, color:T.teal }}>{v}</div>
                      <div style={{ fontSize:11, color:T.text3, marginTop:3 }}>{l}</div>
                    </div>
                  ))}
                </div>
                {/* Progress bar */}
                <div style={{ marginTop:14 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', fontSize:12, color:T.text3, marginBottom:5 }}>
                    <span>Today's completion</span>
                    <span style={{ fontWeight:700, color:T.teal }}>{totalEx > 0 ? Math.round(completedCount/totalEx*100) : 0}%</span>
                  </div>
                  <div style={{ height:8, borderRadius:4, background:T.card2, overflow:'hidden' }}>
                    <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${T.teal},${T.green})`, width:`${totalEx > 0 ? completedCount/totalEx*100 : 0}%`, transition:'width .4s ease' }}/>
                  </div>
                </div>
              </Card>

              <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
                {(plan.exercises||[]).map((ex, i) => {
                  const rep       = reps[ex.name] || 0
                  const isActive  = reps[ex.name] !== undefined
                  const isDone    = done[ex.name]
                  const target    = ex.reps * ex.sets
                  const pct       = Math.min(100, Math.round(rep/target*100))
                  return (
                    <Card key={i} style={{ borderLeft: isDone ? '4px solid var(--green)' : isActive ? '4px solid var(--teal)' : `4px solid ${T.borderS}`, transition:'all .2s' }}>
                      <div style={{ display:'flex', alignItems:'flex-start', gap:16 }}>
                        {/* Number badge */}
                        <div style={{ width:36, height:36, borderRadius:'50%', background: isDone ? 'var(--green)' : T.card2, border:`2px solid ${isDone?'var(--green)':T.border}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, fontSize:14, fontWeight:800, color: isDone ? '#fff' : T.text3, transition:'all .3s' }}>
                          {isDone ? '✓' : i+1}
                        </div>
                        <div style={{ flex:1 }}>
                          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:4 }}>
                            <div style={{ fontSize:15, fontWeight:700, color: isDone ? T.green : T.text1 }}>{ex.name}</div>
                            {isDone && <Badge type="success">Complete!</Badge>}
                          </div>
                          <div style={{ fontSize:13, color:T.text2, marginBottom: ex.notes ? 4 : 0 }}>
                            <span style={{ color:T.teal, marginRight:4 }}>›</span>{ex.sets} sets × {ex.reps} reps
                          </div>
                          {ex.notes && <div style={{ fontSize:12, color:T.text3, display:'flex', gap:5, marginTop:3 }}><span style={{ color:T.teal }}>›</span><span>{ex.notes}</span></div>}

                          {/* Progress bar */}
                          {isActive && !isDone && (
                            <div style={{ marginTop:10 }}>
                              <div style={{ height:6, borderRadius:3, background:T.card2, overflow:'hidden', marginBottom:4 }}>
                                <div style={{ height:'100%', borderRadius:3, background:T.teal, width:`${pct}%`, transition:'width .3s ease' }}/>
                              </div>
                              <div style={{ fontSize:11, color:T.text3 }}>{rep} / {target} reps</div>
                            </div>
                          )}
                        </div>
                        {/* Action */}
                        <div style={{ flexShrink:0 }}>
                          {isDone ? (
                            <div style={{ fontSize:28 }}>✅</div>
                          ) : isActive ? (
                            <div style={{ textAlign:'center' }}>
                              <div style={{ fontSize:26, fontWeight:900, color: pct>=100?T.green:T.teal, lineHeight:1 }}>{rep}</div>
                              <div style={{ fontSize:10, color:T.text3, marginBottom:6 }}>/ {target}</div>
                              <PrimaryBtn small onClick={() => countRep(ex.name, target)}>
                                + Rep
                              </PrimaryBtn>
                            </div>
                          ) : (
                            <PrimaryBtn small onClick={() => setReps(prev => ({ ...prev, [ex.name]: 0 }))}>
                              Start
                            </PrimaryBtn>
                          )}
                        </div>
                      </div>
                    </Card>
                  )
                })}
              </div>
            </>
          )}
        </div>

        {/* Streak sidebar */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>

          {/* Streak counter */}
          <div style={{ background:`linear-gradient(135deg,${T.teal},#2DA44E)`, borderRadius:'var(--r-lg)', padding:24, textAlign:'center', boxShadow:'0 8px 24px rgba(79,176,179,.3)' }}>
            <div style={{ fontSize:48, marginBottom:4 }}>{streak.count >= 7 ? '🔥' : streak.count >= 3 ? '⚡' : '💪'}</div>
            <div style={{ fontSize:52, fontWeight:900, color:'#fff', lineHeight:1 }}>{streak.count}</div>
            <div style={{ fontSize:14, color:'rgba(255,255,255,.85)', marginTop:4 }}>Day Streak</div>
            {streak.count === 0 && <div style={{ fontSize:11, color:'rgba(255,255,255,.6)', marginTop:6 }}>Complete today's exercises to start!</div>}
          </div>

          {/* 7-day calendar */}
          <Card>
            <SectionHeader title="This Week"/>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(7,1fr)', gap:4 }}>
              {last7.map((d,i) => (
                <div key={i} style={{ textAlign:'center' }}>
                  <div style={{ fontSize:9, color:T.text3, marginBottom:4, fontWeight:600 }}>{d.label}</div>
                  <div style={{ width:30, height:30, borderRadius:'50%', background: d.done ? T.green : T.card2, border:`2px solid ${d.done?T.green:T.border}`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:13, margin:'0 auto', transition:'all .2s' }}>
                    {d.done ? '✓' : ''}
                  </div>
                </div>
              ))}
            </div>
            <div style={{ marginTop:12, fontSize:12, color:T.text3, textAlign:'center' }}>
              {last7.filter(d=>d.done).length}/7 days this week
            </div>
          </Card>

          {/* Next milestone */}
          <Card>
            <SectionHeader title="Next Milestone"/>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:14 }}>
              <div style={{ fontSize:32 }}>{nextMilestone.icon}</div>
              <div>
                <div style={{ fontSize:14, fontWeight:800, color:T.text1 }}>{nextMilestone.label}</div>
                <div style={{ fontSize:12, color:T.text3 }}>{nextMilestone.days - streak.count} days to go</div>
              </div>
            </div>
            <div style={{ height:8, borderRadius:4, background:T.card2, overflow:'hidden', marginBottom:6 }}>
              <div style={{ height:'100%', borderRadius:4, background:`linear-gradient(90deg,${T.teal},#2DA44E)`, width:`${progress}%`, transition:'width .6s ease' }}/>
            </div>
            <div style={{ fontSize:11, color:T.text3 }}>{streak.count} / {nextMilestone.days} days · {progress}%</div>
          </Card>

          {/* Milestones unlocked */}
          <Card>
            <SectionHeader title="Achievements"/>
            <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
              {MILESTONES.map(m => {
                const unlocked = streak.count >= m.days
                return (
                  <div key={m.days} style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 0', opacity: unlocked ? 1 : 0.4 }}>
                    <div style={{ fontSize:20, filter: unlocked ? 'none' : 'grayscale(1)' }}>{m.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:12, fontWeight:700, color: unlocked ? T.text1 : T.text3 }}>{m.label}</div>
                      <div style={{ fontSize:11, color:T.text3 }}>{m.reward}</div>
                    </div>
                    {unlocked && <span style={{ fontSize:14, color:T.green }}>✓</span>}
                  </div>
                )
              })}
            </div>
          </Card>

        </div>
      </div>
    </Layout>
  )
}
