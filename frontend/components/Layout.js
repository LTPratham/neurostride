import { useEffect, useRef } from 'react'
import { useRouter } from 'next/router'
import Link from 'next/link'
import { useAuth } from '../context/AuthContext'

const NAV = {
  doctor: [
    { href: '/doctor',           label: 'Dashboard'      },
    { href: '/doctor/patients',  label: 'Patients'       },
    { href: '/doctor/prescribe', label: 'Prescribe'      },
    { href: '/doctor/plans',     label: 'Exercise Plans' },
    { href: '/doctor/reports',   label: 'Reports'        },
  ],
  patient: [
    { href: '/patient',           label: 'Dashboard'    },
    { href: '/patient/sessions',  label: 'My Sessions'  },
    { href: '/patient/exercises', label: 'Exercises'    },
    { href: '/patient/sensor',    label: 'Sensor Live'  },
    { href: '/patient/reports',   label: 'My Reports'   },
    { href: '/patient/chat',      label: 'AI Assistant' },
  ],
  pharmacist: [
    { href: '/pharmacy',            label: 'Dashboard'     },
    { href: '/pharmacy/pharmamind', label: 'AI Pharmacist' },
    { href: '/pharmacy/scanner',    label: 'OCR Scanner'   },
  ],
}

const ROLE_IMAGES = {
  doctor:     'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=80&q=80&fit=crop&crop=top',
  patient:    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&q=80&fit=crop&crop=top',
  pharmacist: 'https://images.unsplash.com/photo-1551601651-2a8555f1a136?w=80&q=80&fit=crop&crop=top',
}

export default function Layout({ children, title }) {
  const { user, logout } = useAuth()
  const router           = useRouter()
  const links            = NAV[user?.role] || []
  const initialized      = useRef(false)

  useEffect(() => {
    // Apply saved theme
    const saved = typeof window !== 'undefined' && localStorage.getItem('ns-theme')
    if (saved) {
      document.documentElement.setAttribute('data-theme', saved)
      const btn = document.getElementById('theme-toggle-btn')
      if (btn) btn.textContent = saved === 'dark' ? '☀️' : '🌙'
    }
  }, [])

  useEffect(() => {
    // Scroll reveal
    const els = document.querySelectorAll('.rv, .rvl, .rvr')
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) e.target.classList.add('vis') })
    }, { threshold: 0.1, rootMargin: '0px 0px -32px 0px' })
    els.forEach(el => obs.observe(el))
    return () => obs.disconnect()
  }, [router.pathname])

  const toggleTheme = () => {
    const html   = document.documentElement
    const isDark = html.getAttribute('data-theme') === 'dark'
    const next   = isDark ? 'light' : 'dark'
    html.setAttribute('data-theme', next)
    const btn = document.getElementById('theme-toggle-btn')
    if (btn) btn.textContent = isDark ? '🌙' : '☀️'
    localStorage.setItem('ns-theme', next)
  }

  const roleImg = ROLE_IMAGES[user?.role]

  return (
    <div className="layout-root">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round">
              <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
            </svg>
          </div>
          <div>
            <div className="sidebar-logo-text">NeuroStride</div>
            <div className="sidebar-logo-role">{user?.role || 'Platform'}</div>
          </div>
        </div>

        <nav className="sidebar-nav">
          {links.map(link => (
            <Link key={link.href} href={link.href}
              className={`sidebar-nav-item ${router.pathname === link.href ? 'active' : ''}`}>
              {link.label}
            </Link>
          ))}
        </nav>

        {user && (
          <div className="sidebar-user">
            <div className="sidebar-user-info">
              <div className="sidebar-avatar">
                {roleImg
                  ? <img src={roleImg} alt={user.full_name} onError={e => { e.target.style.display='none'; e.target.nextSibling.style.display='flex' }}/>
                  : null}
                <span style={{ display: roleImg ? 'none' : 'flex' }}>
                  {user.full_name?.[0]?.toUpperCase() || '?'}
                </span>
              </div>
              <div style={{ minWidth: 0 }}>
                <div className="sidebar-user-name">{user.full_name}</div>
                <div className="sidebar-user-role">{user.role}</div>
              </div>
            </div>
            <button className="sidebar-signout" onClick={logout}>Sign out</button>
          </div>
        )}
      </aside>

      <main className="main-content">
        <header className="main-header">
          <span className="main-header-title">{title || 'NeuroStride'}</span>
          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{
              fontSize: 10, color: 'var(--teal)', fontWeight: 700,
              background: 'var(--teal-l)', border: '1px solid rgba(79,176,179,0.25)',
              borderRadius: 100, padding: '3px 12px', letterSpacing: '0.06em',
            }}>
              IDEATHON LPU 2026
            </span>
            <button
              id="theme-toggle-btn"
              className="theme-toggle"
              onClick={toggleTheme}
              title="Toggle dark mode"
            >🌙</button>
          </div>
        </header>
        <div className="main-body">{children}</div>
      </main>
    </div>
  )
}
