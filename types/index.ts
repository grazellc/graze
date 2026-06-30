export type DietType = 'all' | 'vegetarian' | 'vegan' | 'eggetarian' | 'nonveg' | 'jain' | 'halal' | 'kosher'
export type ImportSource = 'google_portability' | 'google_takeout_zip' | 'manual'
export type ImportStatus = 'idle' | 'initiating' | 'processing' | 'downloading' | 'parsing' | 'enriching' | 'done' | 'error'

export interface Place {
  id: string
  listId: string
  name: string
  address?: string
  city?: string
  country?: string
  countryCode?: string
  lat?: number
  lng?: number
  googleMapsUrl?: string
  mapFeatureId?: string
  googlePlaceId?: string
  userNote?: string
  visited: boolean
  visitedAt?: string
  userRating?: number
  // Enriched
  photoUrl?: string
  googleRating?: number
  googleReviewCount?: number
  yelpRating?: number
  priceLevel?: number
  hours?: Record<string, string>
  isOpenNow?: boolean
  phone?: string
  website?: string
  isVegFriendly?: boolean
  isVeganFriendly?: boolean
  cuisine?: string[]
  menuHighlights?: MenuItem[]
  verifiedSources?: VerifiedSource[]
  grazeScore?: number
  worldRankLabel?: string
  enriched: boolean
  sourceHash: string
  addedAt: string
  source: ImportSource
}

export interface MenuItem {
  id: string
  name: string
  price?: string
  isVeg: boolean
}

export interface VerifiedSource {
  id: string
  name: string
  rank: string
  emoji: string
}

export interface GrazeList {
  id: string
  name: string
  color: string
  places: Place[]
  sourceFile?: string
  source: ImportSource
  createdAt: string
  syncedAt?: string
  city?: string
  country?: string
}

export interface ImportJob {
  jobId?: string          // Data Portability API job ID
  status: ImportStatus
  progress: number        // 0–100
  phase: string
  totalPlaces: number
  doneCount: number
  newCount: number
  error?: string
}

export interface User {
  id: string
  email: string
  name?: string
  picture?: string
  diet: DietType[]
  createdAt: string
  lastSyncedAt?: string
}

// Data Portability API response shape (GeoJSON feature)
export interface DPFeature {
  type: 'Feature'
  geometry: {
    type: 'Point'
    coordinates: [number, number] // [lng, lat]
  }
  properties: {
    date?: string
    google_maps_url?: string
    location?: {
      address?: string
      country_code?: string
      name?: string
    }
    // For custom lists — the list name is in the filename
  }
}

export interface DPFeatureCollection {
  type: 'FeatureCollection'
  features: DPFeature[]
}
