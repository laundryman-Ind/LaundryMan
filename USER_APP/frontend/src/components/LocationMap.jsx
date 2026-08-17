import React, { useEffect, useRef, useState } from 'react'
import { Map as MaplibreMap, Marker as MaplibreMarker, NavigationControl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import Icon from './Icon'

// MapTiler Free API key — never hardcoded; read from the environment.
const MAPTILER_KEY = import.meta.env.VITE_MAPTILER_API_KEY || ''

// LaundryMan-styled pin — cobalt fill, ink outline, sun core (the app's
// `location` icon look, filled). Rendered as a marker element so no image
// assets are needed.
const PIN_HTML = `
  <svg xmlns="http://www.w3.org/2000/svg" width="34" height="34" viewBox="0 0 24 24">
    <path d="M12 21.5s-7.2-6.2-7.2-11.4a7.2 7.2 0 1 1 14.4 0C19.2 15.3 12 21.5 12 21.5Z" fill="#2540FF" stroke="#0E1116" stroke-width="1.3"/>
    <circle cx="12" cy="10.1" r="3" fill="#FFC42E" stroke="#0E1116" stroke-width="1.1"/>
  </svg>`

// LaundryMan palette (see styles.css design tokens).
const PALETTE = {
  paper: '#F3F1E9',
  cell: '#FFFFFF',
  ink: '#0E1116',
  cobaltDeep: '#16279E',
  mint: '#BFEDD4',
  building: '#E7E4DB',
}

// MapTiler Free tile style (streets-v2). Required attribution ("© MapTiler ©
// OpenStreetMap contributors") comes from the style and is kept in the map's
// attribution control — just styled subtle (see styles.css).
const STYLE_URL = `https://api.maptiler.com/maps/streets-v2/style.json?key=${MAPTILER_KEY}`

// Recolour the MapTiler style at runtime so the map reads like the app:
// paper land, mint parks, cobalt-deep water, white roads with ink casing,
// ink labels. POI icons are hidden for a clean look; text stays readable.
const setPaint = (map, id, type, prop, value) => {
  try {
    if (map.getLayer(id)?.type === type) map.setPaintProperty(id, prop, value)
  } catch {
    /* layer type mismatch — skip */
  }
}
const applyTheme = (map) => {
  for (const l of map.getStyle().layers || []) {
    const id = l.id
    // MapTiler's current styles use capitalized semantic ids ("Water",
    // "Minor road outline", ...) — match case-insensitively so the theme
    // survives style revisions.
    const lid = id.toLowerCase()
    if (l.type === 'background') {
      setPaint(map, id, 'background', 'background-color', PALETTE.paper)
    } else if (lid.includes('water') || lid.includes('river')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.cobaltDeep)
      setPaint(map, id, 'line', 'line-color', PALETTE.cobaltDeep)
    } else if (lid.includes('grass') || lid.includes('park') || lid.includes('wood') || lid.includes('forest') || lid.includes('meadow') || lid.includes('scrub')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.mint)
    } else if (lid.includes('outline') || lid.includes('casing')) {
      // Road outlines / casings → ink, for the app's white-road look.
      setPaint(map, id, 'line', 'line-color', PALETTE.ink)
    } else if (lid.includes('road') || lid.includes('highway') || lid.includes('street') || lid.includes('tunnel') || lid.includes('bridge')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.cell)
      setPaint(map, id, 'line', 'line-color', PALETTE.cell)
    } else if (lid.includes('building')) {
      setPaint(map, id, 'fill', 'fill-color', PALETTE.building)
    } else if (lid.includes('transit') || lid.includes('poi')) {
      try {
        if (map.getLayer(id)) map.setLayoutProperty(id, 'visibility', 'none')
      } catch {
        /* ignore */
      }
    } else if (lid.includes('label') || lid.includes('place') || lid.includes('name') || lid.includes('housenumber')) {
      setPaint(map, id, 'symbol', 'text-color', PALETTE.ink)
    }
  }
}

// Interactive map showing the exact selected location with a draggable pin.
// Dragging the pin reports the new latitude/longitude via onChange — the pin
// position (not any text address) is the source of truth for the location.
const LocationMap = ({ latitude, longitude, onChange }) => {
  const containerRef = useRef(null)
  const mapRef = useRef(null)
  const markerRef = useRef(null)
  const loadedRef = useRef(false)
  const [ready, setReady] = useState(false)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el || !MAPTILER_KEY) return

    const map = new MaplibreMap({
      container: el,
      style: STYLE_URL,
      center: [longitude, latitude],
      zoom: 17,
      scrollZoom: false,
      dragRotate: false,
      pitchWithRotate: false,
      attributionControl: { compact: true },
    })

    map.addControl(new NavigationControl({ showCompass: false }), 'top-left')
    map.on('style.load', () => applyTheme(map))
    map.on('load', () => {
      loadedRef.current = true
      setReady(true)
      // The map can mount inside a freshly revealed card — make sure it lays out.
      setTimeout(() => map.resize(), 60)
    })
    // Only a failure before the style loads is fatal (individual tile hiccups
    // fire error events too and must not kill the map).
    map.once('error', () => {
      if (!loadedRef.current) setFailed(true)
    })

    const pinEl = document.createElement('div')
    pinEl.className = 'loc-pin'
    pinEl.innerHTML = PIN_HTML
    const marker = new MaplibreMarker({ element: pinEl, anchor: 'bottom', draggable: true })
      .setLngLat([longitude, latitude])
      .addTo(map)
    marker.on('dragend', () => {
      const p = marker.getLngLat()
      onChange(p.lat, p.lng)
    })

    mapRef.current = map
    markerRef.current = marker

    return () => {
      map.remove()
      mapRef.current = null
      markerRef.current = null
      loadedRef.current = false
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Keep the pin in sync with the parent (fresh GPS fix, or after a drag).
  useEffect(() => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker || !loadedRef.current) return
    marker.setLngLat([longitude, latitude])
    map.easeTo({ center: [longitude, latitude], duration: 400 })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude])

  const recenter = () => {
    const map = mapRef.current
    const marker = markerRef.current
    if (!map || !marker) return
    map.easeTo({ center: marker.getLngLat(), duration: 400 })
  }

  // No key configured — graceful, honest placeholder instead of a blank box.
  if (!MAPTILER_KEY) {
    return (
      <div className="loc-map-wrap">
        <div className="loc-map loc-map-fallback">
          <Icon name="location" style={{ width: 26, height: 26 }} />
          <p>
            Map unavailable — add your MapTiler API key to <code>.env</code>{' '}
            (<code>VITE_MAPTILER_API_KEY</code>) and restart the dev server.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="loc-map-wrap"
      // Keep the app's pull-to-refresh from hijacking pin drags.
      onTouchStart={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
      onTouchEnd={(e) => e.stopPropagation()}
    >
      <div ref={containerRef} className="loc-map" />
      {failed && (
        <div className="loc-map-msg">
          <p>Couldn't load the map tiles — check your key and connection.</p>
        </div>
      )}
      {ready && (
        <button className="loc-recenter" aria-label="Re-center map" onClick={recenter}>
          <Icon name="location" />
        </button>
      )}
    </div>
  )
}

export default LocationMap
