import { useMemo } from 'react'
import { useApp } from '../context/AppContext'
import { IMG, formatPrice } from '../data/mockData'

// Activity stats derived from the user's actual orders (replaces the old
// hardcoded STATS). Loads = delivered orders; Total spent = their sum;
// Avg. turnaround = mean pickup→delivery time from real timestamps.
export const useActivityStats = () => {
  const { orders } = useApp()

  return useMemo(() => {
    const delivered = orders.filter((o) => o.statusKey === 'delivered')
    const loadsCompleted = delivered.length
    const totalSpent = delivered.reduce((sum, o) => sum + (Number(o.total) || 0), 0)

    // Only orders that carry real placedAt → deliveredAt timestamps count.
    const durations = delivered
      .map((o) => (o.placedAt && o.deliveredAt ? (o.deliveredAt - o.placedAt) / 36e5 : null))
      .filter((d) => d !== null)
    const avgHrs = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null

    return [
      {
        label: 'Loads completed',
        value: String(loadsCompleted),
        delta: loadsCompleted > 0 ? 'Across all time' : 'No deliveries yet',
        flat: true,
      },
      {
        label: 'Total spent',
        value: formatPrice(totalSpent),
        delta: totalSpent > 0 ? 'On delivered orders' : 'No spending yet',
        photo: IMG('1610557892470-55d9e80c0bce', 700),
        tone: '#16279E',
      },
      {
        label: 'Avg. turnaround',
        value: avgHrs === null ? '—' : avgHrs < 1 ? '<1h' : `${Math.round(avgHrs)}h`,
        delta: 'Pickup to delivery',
        photo: IMG('1626806787461-102c1bfaaea1', 700),
        tone: '#1F7A50',
        // Defaults to span-2 (pairs with “Total spent” on Home). Profile
        // overrides this to span-4 for its single full-width card.
      },
    ]
  }, [orders])
}
