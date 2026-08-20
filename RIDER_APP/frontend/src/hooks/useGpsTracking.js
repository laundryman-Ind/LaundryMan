import { useEffect, useRef, useCallback, useState } from 'react'
import { updateRiderLocation } from '../services/api'

const TRACKING_INTERVAL_MS = 5000 // Update location every 5 seconds
const MIN_DISTANCE_METERS = 10 // Only update if moved more than 10 meters

/**
 * Calculate distance between two lat/lng points using Haversine formula
 * Returns distance in meters
 */
const getDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371e3 // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180
  const φ2 = (lat2 * Math.PI) / 180
  const Δφ = ((lat2 - lat1) * Math.PI) / 180
  const Δλ = ((lng2 - lng1) * Math.PI) / 180

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) *
    Math.sin(Δλ / 2) * Math.sin(Δλ / 2)
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

  return R * c
}

/**
 * useGpsTracking — Hook that tracks the rider's GPS location and syncs it to Supabase
 * 
 * @param {boolean} enabled - Whether GPS tracking is active
 * @param {string|null} riderId - The rider's ID (used to skip updates if position hasn't changed)
 * @returns {{ location: {lat, lng} | null, error: string | null, isTracking: boolean }}
 */
export const useGpsTracking = (enabled, riderId) => {
  const [location, setLocation] = useState(null)
  const [error, setError] = useState(null)
  const [isTracking, setIsTracking] = useState(false)
  const lastLocationRef = useRef(null)
  const watchIdRef = useRef(null)
  const intervalRef = useRef(null)

  // Sync location to database
  const syncLocation = useCallback(async (lat, lng) => {
    try {
      await updateRiderLocation(lat, lng)
      lastLocationRef.current = { lat, lng }
      setLocation({ lat, lng })
      setError(null)
    } catch (e) {
      console.warn('Failed to sync GPS location:', e)
      setError(e.message || 'Failed to update location')
    }
  }, [])

  // Start tracking
  useEffect(() => {
    if (!enabled) {
      // Stop tracking when disabled
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsTracking(false)
      return
    }

    // Check if geolocation is available
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      return
    }

    setIsTracking(true)

    // Watch position continuously
    watchIdRef.current = navigator.geolocation.watchPosition(
      (position) => {
        const { latitude, longitude } = position.coords
        const newLoc = { lat: latitude, lng: longitude }
        
        // Only sync if moved significantly or first position
        if (!lastLocationRef.current) {
          syncLocation(latitude, longitude)
        } else {
          const distance = getDistance(
            lastLocationRef.current.lat,
            lastLocationRef.current.lng,
            latitude,
            longitude
          )
          if (distance >= MIN_DISTANCE_METERS) {
            syncLocation(latitude, longitude)
          }
        }
      },
      (err) => {
        console.error('Geolocation error:', err)
        setError(err.message || 'Failed to get location')
        setIsTracking(false)
      },
      {
        enableHighAccuracy: true,
        maximumAge: 10000, // Accept positions up to 10 seconds old
        timeout: 15000, // Fail after 15 seconds
      }
    )

    // Also sync periodically in case the rider stops moving but we still want fresh data
    intervalRef.current = setInterval(() => {
      if (lastLocationRef.current) {
        syncLocation(lastLocationRef.current.lat, lastLocationRef.current.lng)
      }
    }, TRACKING_INTERVAL_MS)

    // Cleanup
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current)
        watchIdRef.current = null
      }
      if (intervalRef.current) {
        clearInterval(intervalRef.current)
        intervalRef.current = null
      }
      setIsTracking(false)
    }
  }, [enabled, riderId, syncLocation])

  return { location, error, isTracking }
}

export default useGpsTracking
