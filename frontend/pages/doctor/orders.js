import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn } from '../../components/UI'
import { pharmacyApi } from '../../lib/api'
import styles from '../../styles/Pharmacy.module.css'

const STATUSES = ['all', 'pending', 'processing', 'ready', 'dispensed']
const STATUS_TYPE = { pending: 'warning', processing: 'info', ready: 'accent', dispensed: 'success', cancelled: 'danger' }

const NEXT_STATUS = { pending: 'processing', processing: 'ready', ready: 'dispensed' }
const NEXT_LABEL  = { pending: 'Mark processing', processing: 'Mark ready', ready: 'Dispense' }

export default function Orders() {
  const [orders, setOrders]     = useState([])
  const [filter, setFilter]     = useState('all')
  const [loading, setLoading]   = useState(true)
  const [updating, setUpdating] = useState(null)

  useEffect(() => {
    pharmacyApi.orders()
      .then(r => setOrders(r.data || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = filter === 'all' ? orders : orders.filter(o => o.status === filter)

  const advance = async (order) => {
    const next = NEXT_STATUS[order.status]
    if (!next) return
    setUpdating(order.id)
    try {
      await pharmacyApi.updateOrder(order.id, { status: next })
      setOrders(prev => prev.map(o => o.id === order.id ? { ...o, status: next } : o))
    } catch {}
    setUpdating(null)
  }

  return (
    <Layout title="Order Queue">
      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 20 }}>
        {STATUSES.map(s => (
          <button
            key={s}
            onClick={() => setFilter(s)}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 13,
              border: '1px solid',
              borderColor: filter === s ? 'var(--accent)' : 'var(--border)',
              background:   filter === s ? 'var(--accent-muted)' : 'var(--bg-elevated)',
              color:        filter === s ? 'var(--accent-light)' : 'var(--text-secondary)',
              cursor: 'pointer',
              transition: 'all 150ms',
            }}
          >
            {s.charAt(0).toUpperCase() + s.slice(1)}
            {s !== 'all' && (
              <span style={{ marginLeft: 6, background: 'var(--bg-card)', borderRadius: 10, padding: '1px 6px', fontSize: 11 }}>
                {orders.filter(o => o.status === s).length}
              </span>
            )}
          </button>
        ))}
      </div>

      <Card>
        <SectionHeader title={`${filtered.length} order${filtered.length !== 1 ? 's' : ''}`} />
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message="No orders in this category." />
        ) : (
          <table className={styles.ordersTable || styles.table}>
            <thead>
              <tr>
                <th style={thStyle}>Order ID</th>
                <th style={thStyle}>Created</th>
                <th style={thStyle}>Status</th>
                <th style={thStyle}>Dispensed</th>
                <th style={thStyle}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(order => (
                <tr key={order.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={tdStyle}>
                    <span style={{ fontFamily: 'monospace', fontSize: 13, color: 'var(--text-primary)', fontWeight: 600 }}>
                      #{order.id.slice(-8).toUpperCase()}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
                      {new Date(order.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}
                    </span>
                  </td>
                  <td style={tdStyle}>
                    <Badge type={STATUS_TYPE[order.status] || 'default'}>{order.status}</Badge>
                  </td>
                  <td style={tdStyle}>
                    <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
                      {order.dispensed_at
                        ? new Date(order.dispensed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                        : '—'
                      }
                    </span>
                  </td>
                  <td style={tdStyle}>
                    {NEXT_STATUS[order.status] ? (
                      <PrimaryBtn
                        small
                        onClick={() => advance(order)}
                        disabled={updating === order.id}
                      >
                        {updating === order.id ? '...' : NEXT_LABEL[order.status]}
                      </PrimaryBtn>
                    ) : (
                      <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>—</span>
                    )}
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

const thStyle = {
  textAlign: 'left',
  padding: '10px 14px',
  color: 'var(--text-muted)',
  fontWeight: 500,
  fontSize: 12,
  textTransform: 'uppercase',
  letterSpacing: '0.04em',
  borderBottom: '1px solid var(--border-subtle)',
}
const tdStyle = {
  padding: '12px 14px',
  verticalAlign: 'middle',
}
