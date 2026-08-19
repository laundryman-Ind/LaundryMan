import React, { useEffect, useRef, useState } from 'react'
import maplibregl, { Map as MaplibreMap, Marker as MaplibreMarker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Icon from './Icon'

const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || ''

const PALETTE = {
  paper: '#F3F1E9',
  cell: '#FFFFFF',
  ink: '#0E1116',
  cobalt: '#2540FF',
  cobaltDeep: '#16279E',
  sun: '#FFC42E',
  mint: '#BFEDD4',
  building: '#E7E4DB',
}

const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`

// Recolour the MapTiler style to match the app theme
const setPaint = (map, id, type, prop, value) => {
  try {
    if (map.getLayer(id)?.type === type) map.setPaintProperty(id, prop, value)
  } catch { /* skip */ }
}
const applyTheme = (map) => {
  for (const l of map.getStyle().layers || []) {
    const id = l.id
    const lid = id.toLowerCase()
    if (l.type === 'background') {
      setPaint(map, id, 'background', 'background-color', PALETTE.paper)
    } else if (lid.includes('water') || lid.includes('river')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.cobaltDeep)
      setPaint(map, id, 'line', 'line-color', PALETTE.cobaltDeep)
    } else if (lid.includes('grass') || lid.includes('park') || lid.includes('wood') || lid.includes('forest') || lid.includes('meadow') || lid.includes('scrub')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.mint)
    } else if (lid.includes('outline') || lid.includes('casing')) {
      setPaint(map, id, 'line', 'line-color', PALETTE.ink)
    } else if (lid.includes('road') || lid.includes('highway') || lid.includes('street') || lid.includes('tunnel') || lid.includes('bridge')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.cell)
      setPaint(map, id, 'line', 'line-color', PALETTE.cell)
    } else if (lid.includes('building')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.building)
    } else if (lid.includes('transit') || lid.includes('poi')) {
      try { if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none') } catch { /* ignore */ }
    } else if (lid.includes('label') || lid.includes('place') || lid.includes('name') || lid.includes('housenumber')) {
      setPaint(map, id, 'symbol', 'text-color', PALETTE.ink)
    }
  }
}

// Marker HTML elements
const PICKUP_PIN = `
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#0E1116" stroke="#fff" stroke-width="2"/>
    <path d="M7 15V9.5L12 6l5 3.5V15H7Z" fill="#fff"/>
    <circle cx="12" cy="12" r="2" fill="#FFC42E"/>
  </svg>`

const DELIVERY_PIN = `
  <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#2540FF" stroke="#fff" stroke-width="2"/>
    <path d="M7 15V9.5L12 6l5 3.5V15H7Z" fill="#fff"/>
    <circle cx="12" cy="10" r="1.6" fill="#2540FF"/>
    <path d="M9.5 13a2.5 2.8 0 0 0 5 0V11h-5z" fill="#2540FF"/>
  </svg>`

const RIDER_PIN = `
  <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24">
    <circle cx="12" cy="12" r="11" fill="#E5484D" stroke="#fff" stroke-width="2"/>
    <circle cx="12" cy="10" r="3" fill="#fff"/>
    <path d="M8 17.5c0-2.2 1.8-4 4-4s4 1.8 4 4" fill="#fff"/>
    <circle cx="12" cy="12" r="5" fill="none" stroke="rgba(229,72,77,.3)" stroke-width="2">
      <animate attributeName="r" values="5;9;5" dur="2s" repeatCount="indefinite"/>
      <animate attributeName="opacity" values="0.6;0;0.6" dur="2s" repeatCount="indefinite"/>
    </circle>
  </svg>`

// Default center: Siliguri, West Bengal (the app's home city)
const DEFAULT_CENTER = [88.4261, 26.7271]

/**
 * TrackingMap — read-only MapLibre map for order tracking.
 *
 * Props:
 *   pickup   { lat, lng }  — pickup location (defaults to center - 0.015 lng)
 *   delivery { lat, lng }  — delivery location (defaults to center + 0.015 lng)
 *   rider    { lat, lng }  — current rider position (defaults to pickup)
 *   statusKey               — order status, used to decide marker visibility
 */
const TrackingMap = ({ pickup, delivery, rider, statusKey }) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const riderMarkerRef = useRef(null)
  const loadedRef = useRef(false)
  const [failed, setFailed] = useState(false)

  // Resolve coordinates — fall back to sensible defaults around Siliguri
  const pickupCoords = pickup
    ? [pickup.lng, pickup.lat]
    : [DEFAULT_CENTER[0] - 0.015, DEFAULT_CENTER[1] - 0.008]
  const deliveryCoords = delivery
    ? [delivery.lng, delivery.lat]
    : [DEFAULT_CENTER[0] + 0.015, DEFAULT_CENTER[1] + 0.008]
  const riderCoords = rider
    ? [rider.lng, rider.lat]
    : pickupCoords

  useEffect(() => {
    const el = containerRef.current
    if (!el || !MAPTILER_KEY) return

    // Centre between pickup and delivery
    const midLng = (pickupCoords[0] + deliveryCoords[0]) / 2
    const midLat = (pickupCoords[1] + deliveryCoords[1]) / 2

    const map = new MaplibreMap({
      container: el,
      style: STYLE_URL,
      center: [midLng, midLat],
      zoom: 14,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: false,
    })

    map.addControl(new NavigationControl({ showCompass: false, visualizePitch: false }), 'top-right')
    map.on('style.load', () => applyTheme(map))
    map.on('load', () => {
      loadedRef.current = true

      // Fit map to show both markers with padding
      const bounds = new maplibregl.LngLatBounds()
        .extend(pickupCoords)
        .extend(deliveryCoords)
      map.fitBounds(bounds, { padding: 60, maxZoom: 15, duration: 0 })

      // Draw the dashed route line
      map.addSource('route', {
        type: 'geojson',
        data: {
          type: 'Feature',
          geometry: {
            type: 'LineString',
            coordinates: [pickupCoords, deliveryCoords],
          },
        },
      })
      map.addLayer({
        id: 'route-casing',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': PALETTE.ink,
          'line-width': 5,
          'line-opacity': 0.18,
          'line-dasharray': [7, 7],
        },
      })
      map.addLayer({
        id: 'route-line',
        type: 'line',
        source: 'route',
        paint: {
          'line-color': PALETTE.cobalt,
          'line-width': 3,
          'line-dasharray': [7, 7],
        },
      })

      // Pickup marker
      const pickupEl = document.createElement('div')
      pickupEl.innerHTML = PICKUP_PIN
      pickupEl.style.cursor = 'default'
      new MaplibreMarker({ element: pickupEl, anchor: 'center' })
        .setLngLat(pickupCoords)
        .addTo(map)

      // Delivery marker
      const deliveryEl = document.createElement('div')
      deliveryEl.innerHTML = DELIVERY_PIN
      deliveryEl.style.cursor = 'default'
      new MaplibreMarker({ element: deliveryEl, anchor: 'center' })
        .setLngLat(deliveryCoords)
        .addTo(map)

      // Rider marker
      const riderEl = document.createElement('div')
      riderEl.innerHTML = RIDER_PIN
      riderEl.style.cursor = 'default'
      riderEl.style.filter = 'drop-shadow(0 2px 6px rgba(229,72,77,.45))'
      const riderMarker = new MaplibreMarker({ element: riderEl, anchor: 'center' })
        .setLngLat(riderCoords)
        .addTo(map)
      riderMarkerRef.current = riderMarker

      setTimeout(() => map.resize(), 60)
    })

    map.once('error', () => {
      if (!loadedRef.current) setFailed(true)
    })

    mapRef.current = map

    return () => {
      map.remove()
      mapRef.current = null
      riderMarkerRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep rider marker in sync when props change
  useEffect(() => {
    const marker = riderMarkerRef.current
    const map = mapRef.current
    if (!marker || !map || !loadedRef.current) return
    marker.setLngLat(riderCoords)
    map.easeTo({ center: riderCoords, duration: 500 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [riderCoords[0], riderCoords[1]])

  // No API key — show fallback
  if (!MAPTILER_KEY) {
    return (
      <div className="track-map track-map-fallback">
        <Icon name="location" style={{ width: 24, height: 24 }} />
        <span>Map requires a MapTiler API key</span>
      </div>
    )
  }

  return (
    <div
      className="track-map-wrap"
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div ref={containerRef} className="track-map" />
      {failed && (
        <div className="track-map-msg">
          <p>Couldn't load map tiles</p>
        </div>
      )}
    </div>
  )
}

export default TrackingMap
