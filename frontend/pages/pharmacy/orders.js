import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn } from '../../components/UI'
import { pharmacyApi } from '../../lib/api'

const STATUSES   = ['all', 'pending', 'processing', 'ready', 'dispensed']
const STATUS_TYPE = { pending: 'warning', processing: 'info', ready: 'accent', dispensed: 'success', cancelled: 'danger' }
const NEXT_STATUS = { pending: 'processing', processing: 'ready', ready: 'dispensed' }
const NEXT_LABEL  = { pending: 'Mark processing', processing: 'Mark ready', ready: 'Dispense' }

const downloadBill = (orderId) => {
  const token = localStorage.getItem('ns_token')
  fetch(`http://localhost:8000/api/pharmacy/orders/${orderId}/bill`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  .then(r => {
    if (!r.ok) throw new Error('Failed')
    return r.blob()
  })
  .then(blob => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `NeuroStride_Bill_${orderId}.docx`
    a.click()
    URL.revokeObjectURL(a.href)
  })
  .catch(() => alert('Bill generation failed. Make sure backend is running.'))
}

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
          <button key={s} onClick={() => setFilter(s)} style={{
            padding: '6px 16px', borderRadius: 20, fontSize: 13, border: '1px solid',
            borderColor: filter === s ? 'var(--accent)' : 'var(--border)',
            background:  filter === s ? 'var(--accent-muted)' : 'transparent',
            color:       filter === s ? 'var(--accent)' : 'var(--text-secondary)',
            cursor: 'pointer', textTransform: 'capitalize', fontWeight: filter === s ? 600 : 400
          }}>{s}</button>
        ))}
      </div>

      <Card>
        <SectionHeader title={`${filtered.length} orders`} />
        {loading ? <Spinner /> : filtered.length === 0 ? (
          <EmptyState message="No orders found." />
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Order ID', 'Patient', 'Prescription', 'Created', 'Status', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(o => (
                <tr key={o.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  <td style={{ padding: '11px 14px', fontWeight: 600, color: 'var(--text-primary)', fontFamily: 'monospace', fontSize: 12 }}>
                    {o.id?.slice(0, 8).toUpperCase()}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>
                    {o.prescription?.patient?.full_name || o.patient_id?.slice(0, 8) || '—'}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {o.prescription_id?.slice(0, 8) || '—'}
                  </td>
                  <td style={{ padding: '11px 14px', color: 'var(--text-muted)', fontSize: 12 }}>
                    {new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <Badge type={STATUS_TYPE[o.status] || 'default'}>
                      {o.status}
                    </Badge>
                  </td>
                  <td style={{ padding: '11px 14px' }}>
                    <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                      {NEXT_STATUS[o.status] && (
                        <PrimaryBtn
                          small
                          disabled={updating === o.id}
                          onClick={() => advance(o)}
                        >
                          {updating === o.id ? '...' : NEXT_LABEL[o.status]}
                        </PrimaryBtn>
                      )}
                      <button
                        onClick={() => downloadBill(o.id)}
                        title="Download bill as Word document"
                        style={{
                          fontSize: 12, color: 'var(--success)',
                          background: 'var(--success-bg)',
                          border: '1px solid var(--success)',
                          borderRadius: 'var(--radius-sm)',
                          padding: '5px 10px', cursor: 'pointer',
                          fontWeight: 600, whiteSpace: 'nowrap'
                        }}
                      >
                        ⬇ Bill
                      </button>
                    </div>
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
