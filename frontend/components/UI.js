// NeuroStride — UI Components (MedEase Theme)

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="stat-card">
      <div style={{ fontSize: 'clamp(24px,3vw,34px)', fontWeight: 900, letterSpacing: '-0.025em', color: accent || 'var(--teal)', lineHeight: 1.1, marginBottom: 5 }}>{value}</div>
      <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text1)', marginBottom: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 11, color: 'var(--text3)', fontWeight: 400 }}>{sub}</div>}
    </div>
  )
}

export function Badge({ type = 'default', children }) {
  const map = { success:'badge-success', warning:'badge-warning', danger:'badge-danger', info:'badge-info', default:'badge-default', accent:'badge-accent' }
  return <span className={`badge ${map[type] || 'badge-default'}`}>{children}</span>
}

export function Spinner() { return <div className="spinner" /> }

export function EmptyState({ message }) {
  return (
    <div className="empty-state">
      <div style={{ width: 48, height: 48, borderRadius: '50%', background: 'var(--teal-l)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 14px' }}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--teal)" strokeWidth="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
      </div>
      {message || 'Nothing here yet.'}
    </div>
  )
}

export function Card({ children, style }) {
  return <div className="card" style={style}>{children}</div>
}

export function SectionHeader({ title, action }) {
  return (
    <div className="section-header">
      <span className="section-header-title">{title}</span>
      {action && <div>{action}</div>}
    </div>
  )
}

export function PrimaryBtn({ children, onClick, disabled, small, style }) {
  return (
    <button className="btn-primary ripple" onClick={e => { rippleEffect(e); onClick && onClick(e) }} disabled={disabled}
      style={{ ...(small ? { padding: '6px 16px', fontSize: 12 } : {}), ...style }}>
      {children}
    </button>
  )
}

export function GhostBtn({ children, onClick, disabled, small, style }) {
  return (
    <button className="btn-ghost" onClick={onClick} disabled={disabled}
      style={{ ...(small ? { padding: '6px 14px', fontSize: 12 } : {}), ...style }}>
      {children}
    </button>
  )
}

function rippleEffect(e) {
  const btn = e.currentTarget
  const r = document.createElement('span')
  const d = Math.max(btn.clientWidth, btn.clientHeight)
  const rect = btn.getBoundingClientRect()
  r.className = 'ripple-effect'
  r.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX-rect.left-d/2}px;top:${e.clientY-rect.top-d/2}px`
  btn.appendChild(r)
  setTimeout(() => r.remove(), 600)
}

// Doctor card with real image
export function DoctorCard({ name, spec, rating, count, available, imgSrc, onClick, selected }) {
  return (
    <div className="doc-card" onClick={onClick} style={selected ? { borderColor: 'var(--teal)', boxShadow: '0 0 0 4px rgba(79,176,179,0.15), var(--sh-md)' } : {}}>
      <div className="doc-card-img">
        {imgSrc ? (
          <img src={imgSrc} alt={name} loading="lazy"/>
        ) : (
          <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,var(--teal-l),rgba(79,176,179,.2))', fontSize: 48, fontWeight: 900, color: 'var(--teal-d)' }}>
            {name?.[0]}
          </div>
        )}
      </div>
      <div className="doc-card-overlay">
        <div style={{ fontSize: 13, fontWeight: 800, color: '#fff' }}>{name}</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,.75)', margin: '2px 0 8px' }}>{spec}</div>
        <button style={{ background: 'var(--teal)', color: '#fff', border: 'none', borderRadius: 100, padding: '5px 14px', fontSize: 11, fontWeight: 700, cursor: 'pointer' }}>Book Now</button>
      </div>
      <div className="doc-card-info">
        <div className="doc-card-name">{name}</div>
        <div className="doc-card-spec">{spec}</div>
        <div className="doc-card-rating"><span className="stars">★★★★★</span> {rating} ({count})</div>
        {available && <div className="doc-avail"><span className="avail-dot"></span>{available}</div>}
      </div>
    </div>
  )
}

// Hero banner with real image
export function HeroBanner({ img, title, sub }) {
  return (
    <div className="hero-banner">
      <img src={img} alt={title} loading="lazy"/>
      <div className="hero-banner-overlay">
        <div>
          <div className="hero-banner-title">{title}</div>
          {sub && <div className="hero-banner-sub">{sub}</div>}
        </div>
      </div>
    </div>
  )
}
