import React, { useMemo } from 'react'
import { useRider } from '../context/RiderContext'

const Earnings = () => {
  const { myOrders } = useRider()

  const stats = useMemo(() => {
    const delivered = myOrders.filter(o => o.statusKey === 'delivered')

    const today = new Date().toDateString()
    const todayOrders = delivered.filter(o => {
      const d = o.deliveredAt || o.placedAt
      if (!d) return false
      const dt = typeof d === 'number' ? new Date(d) : new Date(d)
      return dt.toDateString() === today
    })
    const todayEarnings = todayOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    const now = new Date()
    const dayOfWeek = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - ((dayOfWeek + 6) % 7))
    monday.setHours(0, 0, 0, 0)
    const weekOrders = delivered.filter(o => {
      const d = o.deliveredAt || o.placedAt
      if (!d) return false
      const dt = typeof d === 'number' ? new Date(d) : new Date(d)
      return dt >= monday
    })
    const weekEarnings = weekOrders.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    const totalEarnings = delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    return {
      todayCount: todayOrders.length, todayEarnings,
      weekCount: weekOrders.length, weekEarnings,
      totalCount: delivered.length, totalEarnings,
    }
  }, [myOrders])

  return (
    <div className="container">
      <div className="page-head">
        <div className="page-head-text">
          <div className="page-title">Earnings</div>
          <div className="page-sub">Your delivery earnings</div>
        </div>
      </div>

      {/* Stats */}
      <div className="bento bento-2">
        <div className="cell stat-cell flat-cobalt">
          <div className="stat-label">Today</div>
          <div className="stat-number">₹{stats.todayEarnings}</div>
          <div className="stat-delta">{stats.todayCount} orders</div>
        </div>
        <div className="cell stat-cell flat-sun">
          <div className="stat-label">This Week</div>
          <div className="stat-number">₹{stats.weekEarnings}</div>
          <div className="stat-delta">{stats.weekCount} orders</div>
        </div>
      </div>

      {/* Total */}
      <div className="cell flat-ink" style={{ marginBottom: '14px', textAlign: 'center' }}>
        <div className="stat-label" style={{ color: 'rgba(243,241,233,.7)' }}>Total Earnings</div>
        <div className="stat-number" style={{ color: 'var(--sun)', marginTop: '8px' }}>₹{stats.totalEarnings}</div>
        <div className="stat-delta" style={{ color: 'rgba(243,241,233,.6)', marginTop: '4px' }}>
          {stats.totalCount} delivered orders
        </div>
      </div>

      {/* Per-order breakdown */}
      <div className="section-label"><h3>Per-Order</h3></div>
      {myOrders.filter(o => o.statusKey === 'delivered').length === 0 ? (
        <div className="empty">
          <h3>No delivered orders yet</h3>
          <p>Complete your first delivery to see earnings</p>
        </div>
      ) : (
        myOrders
          .filter(o => o.statusKey === 'delivered')
          .map(o => (
            <div key={o.id} className="cell" style={{ marginBottom: '8px', padding: '14px 16px' }}>
              <div className="spread">
                <span style={{ fontWeight: 700, fontSize: '14px' }}>{o.id}</span>
                <span style={{ fontWeight: 800, fontSize: '14px' }}>₹{o.total || 0}</span>
              </div>
            </div>
          ))
      )}
    </div>
  )
}

export default Earnings
