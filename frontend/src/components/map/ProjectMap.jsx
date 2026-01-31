import { useEffect, useState, useCallback, useRef, useMemo } from 'react'
import { MapContainer, TileLayer, useMap, LayersControl, LayerGroup } from 'react-leaflet'
import MarkerClusterGroup from 'react-leaflet-cluster'
import { useMapStore } from '@/stores/mapStore'
import MapMarker from './MapMarker'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'

// Fix for default markers
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

let DefaultIcon = L.icon({
  iconUrl: markerIcon,
  shadowUrl: markerShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
})

L.Marker.prototype.options.icon = DefaultIcon

// Cluster icon colors by project type
const clusterColors = {
  'wifi': '#22c55e',
  'pnpki': '#ef4444',
  'iidb': '#3b82f6',
  'elgu': '#eab308',
  'default': '#6b7280'
}

// Create custom cluster icon
const createClusterCustomIcon = function(cluster) {
  const childCount = cluster.getChildCount()
  const markers = cluster.getAllChildMarkers()
  
  // Determine dominant project type in cluster
  const typeCounts = {}
  markers.forEach(marker => {
    const type = marker.options.projectType?.toLowerCase().replace(/[^a-z]/g, '') || 'default'
    typeCounts[type] = (typeCounts[type] || 0) + 1
  })
  
  // Find most common type
  const dominantType = Object.entries(typeCounts)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'default'
  const color = clusterColors[dominantType] || clusterColors['default']
  
  // Size based on count
  let size = 40
  if (childCount < 10) size = 40
  else if (childCount < 100) size = 50
  else size = 60
  
  return L.divIcon({
    html: `
      <div style="
        background-color: ${color};
        width: ${size}px;
        height: ${size}px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: ${childCount < 100 ? '14px' : '12px'};
        border: 3px solid white;
        box-shadow: 0 2px 5px rgba(0,0,0,0.3);
      ">${childCount}</div>
    `,
    className: 'marker-cluster-custom',
    iconSize: L.point(size, size)
  })
}

// Map bounds controller component
const MapBoundsController = ({ markers }) => {
  const map = useMap()
  const hasFitted = useRef(false)
  
  useEffect(() => {
    if (markers && markers.length > 0 && !hasFitted.current) {
      const bounds = L.latLngBounds(markers.map(m => [m.latitude, m.longitude]))
      map.fitBounds(bounds, { padding: [50, 50] })
      hasFitted.current = true
    }
  }, [map, markers])
  
  return null
}

// Map events handler
const MapEvents = ({ onBoundsChange }) => {
  const map = useMap()
  
  useEffect(() => {
    const handleMoveEnd = () => {
      const bounds = map.getBounds()
      onBoundsChange({
        north: bounds.getNorth(),
        south: bounds.getSouth(),
        east: bounds.getEast(),
        west: bounds.getWest()
      })
    }
    
    map.on('moveend', handleMoveEnd)
    return () => map.off('moveend', handleMoveEnd)
  }, [map, onBoundsChange])
  
  return null
}

const ProjectMap = ({ filters = {} }) => {
  const { markers, selectedMarker, fetchMapData, setMapBounds, selectMarker } = useMapStore()
  const [isLoading, setIsLoading] = useState(true)
  const [layerVisibility, setLayerVisibility] = useState({
    wifi: true,
    pnpki: true,
    iidb: true,
    elgu: true
  })
  const hasLoaded = useRef(false)

  // Load initial data
  useEffect(() => {
    if (!hasLoaded.current) {
      hasLoaded.current = true
      const loadData = async () => {
        setIsLoading(true)
        await fetchMapData(filters)
        setIsLoading(false)
      }
      loadData()
    }
  }, [filters]) // Only depend on filters, not fetchMapData

  const handleBoundsChange = useCallback((bounds) => {
    setMapBounds(bounds)
  }, [setMapBounds])

  // Handle GeoJSON features - extract properties and add geometry data
  const processedMarkers = useMemo(() => {
    return markers.map(feature => ({
      ...feature.properties,
      id: feature.properties.id,
      longitude: feature.geometry.coordinates[0],
      latitude: feature.geometry.coordinates[1]
    }))
  }, [markers])

  const filteredMarkers = useMemo(() => {
    return processedMarkers.filter(marker => {
      const typeKey = marker.project_type?.toLowerCase().replace(/[^a-z]/g, '')
      return layerVisibility[typeKey] !== false
    })
  }, [processedMarkers, layerVisibility])

  // Group markers by type
  const markersByType = useMemo(() => {
    return filteredMarkers.reduce((acc, marker) => {
      const type = marker.project_type || 'Unknown'
      if (!acc[type]) acc[type] = []
      acc[type].push(marker)
      return acc
    }, {})
  }, [filteredMarkers])

  if (isLoading) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-gray-100">
        <div className="spinner mr-2"></div>
        <span className="text-gray-600">Loading map data...</span>
      </div>
    )
  }

  return (
    <div className="relative w-full h-full">
      <MapContainer
        center={[12.8797, 121.7740]} // Philippines center
        zoom={6}
        className="w-full h-full"
        style={{ minHeight: '400px' }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        
        <MapBoundsController markers={filteredMarkers} />
        <MapEvents onBoundsChange={handleBoundsChange} />
        
        <LayersControl position="topright">
          {Object.entries(markersByType).map(([type, typeMarkers]) => (
            <LayersControl.Overlay 
              key={type} 
              checked={layerVisibility[type?.toLowerCase().replace(/[^a-z]/g, '')] !== false}
              name={`${type} (${typeMarkers.length})`}
            >
              <LayerGroup>
                <MarkerClusterGroup
                  chunkedLoading
                  spiderfyDistanceMultiplier={2}
                  showCoverageOnHover={false}
                  maxClusterRadius={80}
                  iconCreateFunction={createClusterCustomIcon}
                >
                  {typeMarkers.map((marker) => (
                    <MapMarker
                      key={marker.id}
                      project={marker}
                      isSelected={selectedMarker?.id === marker.id}
                      onClick={() => selectMarker(marker)}
                    />
                  ))}
                </MarkerClusterGroup>
              </LayerGroup>
            </LayersControl.Overlay>
          ))}
        </LayersControl>
      </MapContainer>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white rounded-lg shadow-lg p-4 z-[1000]">
        <h4 className="text-sm font-semibold text-gray-800 mb-2">Project Types</h4>
        <div className="space-y-2">
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
            <span className="text-xs text-gray-600">Free-WIFI</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-red-500 mr-2"></div>
            <span className="text-xs text-gray-600">PNPKI</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
            <span className="text-xs text-gray-600">IIDB</span>
          </div>
          <div className="flex items-center">
            <div className="w-3 h-3 rounded-full bg-yellow-500 mr-2"></div>
            <span className="text-xs text-gray-600">eLGU</span>
          </div>
        </div>
      </div>
      
      {/* Marker count */}
      <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg px-3 py-2 z-[1000]">
        <span className="text-sm font-medium text-gray-800">
          {filteredMarkers.length} projects visible
        </span>
      </div>
    </div>
  )
}

export default ProjectMap
