import { useEffect, useState } from 'react'
import Layout from '../../components/Layout'
import { Card, SectionHeader, Badge, Spinner, EmptyState, PrimaryBtn } from '../../components/UI'
import { pharmacyApi, updateStock } from '../../lib/api'

export default function Inventory() {
  const [inventory, setInventory] = useState([])
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [editId, setEditId]       = useState(null)
  const [editQty, setEditQty]     = useState('')
  const [editReorder, setEditReorder] = useState('')
  const [saving, setSaving]       = useState(false)

  useEffect(() => {
    pharmacyApi.inventory()
      .then(r => setInventory(r.data || []))
      .finally(() => setLoading(false))
  }, [])

  const filtered = inventory.filter(m =>
    m.name.toLowerCase().includes(search.toLowerCase()) ||
    (m.category || '').toLowerCase().includes(search.toLowerCase())
  )

  const lowCount = inventory.filter(m => m.stock_quantity <= m.reorder_level).length

  const startEdit = (med) => {
    setEditId(med.id)
    setEditQty(String(med.stock_quantity))
    setEditReorder(String(med.reorder_level))
  }

  const cancelEdit = () => { setEditId(null); setEditQty(''); setEditReorder('') }

  const saveStock = async (id) => {
    setSaving(true)
    try {
      const res = await updateStock(id, {
        stock_quantity: parseInt(editQty),
        reorder_level:  parseInt(editReorder),
      })
      setInventory(prev => prev.map(m => m.id === id ? res.data : m))
      cancelEdit()
    } catch {
      alert('Failed to update stock.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout title="Medicine Inventory">
      <div style={{ display: 'flex', gap: 12, marginBottom: 20, alignItems: 'center' }}>
        <input
          placeholder="Search by name or category..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{ maxWidth: 320 }}
        />
        {lowCount > 0 && (
          <Badge type="danger">{lowCount} items below reorder level</Badge>
        )}
      </div>

      <Card>
        <SectionHeader title={`${filtered.length} medicines`} />
        {loading ? <Spinner /> : filtered.length === 0 ? <EmptyState message="No medicines found." /> : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
            <thead>
              <tr>
                {['Medicine', 'Category', 'Strength', 'Unit', 'In stock', 'Reorder at', 'Price (₹)', 'Expiry', 'Actions'].map(h => (
                  <th key={h} style={{ textAlign: 'left', padding: '10px 14px', color: 'var(--text-muted)', fontWeight: 500, fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.04em', borderBottom: '1px solid var(--border-subtle)' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map(med => {
                const isLow    = med.stock_quantity <= med.reorder_level
                const isEditing = editId === med.id
                return (
                  <tr key={med.id} style={{ borderBottom: '1px solid var(--border-subtle)', background: isLow && !isEditing ? 'var(--danger-bg)' : isEditing ? 'var(--bg-elevated)' : 'transparent' }}>
                    <td style={{ padding: '11px 14px' }}>
                      <p style={{ fontWeight: 600, color: 'var(--text-primary)' }}>{med.name}</p>
                      <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>{med.generic_name}</p>
                    </td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{med.category || '—'}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{med.strength}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>{med.unit}</td>

                    {/* Stock — editable */}
                    <td style={{ padding: '11px 14px' }}>
                      {isEditing ? (
                        <input
                          type="number" min={0}
                          value={editQty}
                          onChange={e => setEditQty(e.target.value)}
                          style={{ width: 80, padding: '4px 8px', fontSize: 13 }}
                        />
                      ) : (
                        <span style={{ fontWeight: 700, fontSize: 15, color: isLow ? 'var(--danger)' : 'var(--text-primary)' }}>
                          {med.stock_quantity}
                        </span>
                      )}
                    </td>

                    {/* Reorder level — editable */}
                    <td style={{ padding: '11px 14px' }}>
                      {isEditing ? (
                        <input
                          type="number" min={0}
                          value={editReorder}
                          onChange={e => setEditReorder(e.target.value)}
                          style={{ width: 70, padding: '4px 8px', fontSize: 13 }}
                        />
                      ) : (
                        <span style={{ color: 'var(--text-muted)' }}>{med.reorder_level}</span>
                      )}
                    </td>

                    <td style={{ padding: '11px 14px', color: 'var(--text-secondary)' }}>₹{med.price?.toFixed(2)}</td>
                    <td style={{ padding: '11px 14px', color: 'var(--text-muted)' }}>{med.expiry_date || '—'}</td>

                    {/* Actions */}
                    <td style={{ padding: '11px 14px' }}>
                      {isEditing ? (
                        <div style={{ display: 'flex', gap: 6 }}>
                          <PrimaryBtn small onClick={() => saveStock(med.id)} disabled={saving}>
                            {saving ? '...' : 'Save'}
                          </PrimaryBtn>
                          <button
                            onClick={cancelEdit}
                            style={{ fontSize: 12, color: 'var(--text-secondary)', background: 'none', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer' }}
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => startEdit(med)}
                          style={{ fontSize: 12, color: 'var(--accent)', background: 'none', border: '1px solid var(--accent-muted)', borderRadius: 'var(--radius-sm)', padding: '5px 10px', cursor: 'pointer' }}
                        >
                          Edit stock
                        </button>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </Card>
    </Layout>
  )
}
