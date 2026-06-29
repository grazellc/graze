'use client'
import { useState, useEffect } from 'react'
import { useStore } from '@/store'
import { Sidebar } from '@/components/sidebar/Sidebar'
import { ListsView } from '@/components/lists/ListsView'
import { ImportModal } from '@/components/import/ImportModal'
import { AddPlaceModal } from '@/components/import/AddPlaceModal'
import { PlaceDetail } from '@/components/place/PlaceDetail'
import { DiscoverView } from '@/components/discover/DiscoverView'
import { ProfileView } from '@/components/ProfileView'
import type { Place, GrazeList } from '@/types'

export default function AppPage() {
  const { lists, activeListId, activeView, setActiveView } = useStore()
  const [showImport, setShowImport] = useState(false)
  const [showAddPlace, setShowAddPlace] = useState(false)
  const [selectedPlace, setSelectedPlace] = useState<{ place: Place; list: GrazeList } | null>(null)

  useEffect(() => {
    if (lists.length === 0) setShowImport(true)
  }, [])

  const activeList = activeListId ? lists.find(l => l.id === activeListId) : undefined

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '252px 1fr', height: '100vh', overflow: 'hidden' }}>
      <Sidebar onImport={() => setShowImport(true)} />

      <main style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', background: 'var(--paper)' }}>
        {activeView === 'discover' && (
          <DiscoverView onPlaceClick={(p, l) => setSelectedPlace({ place: p, list: l })} />
        )}
        {activeView === 'profile' && (
          <ProfileView onImport={() => setShowImport(true)} />
        )}
        {(activeView === 'lists' || activeView === 'map') && (
          <ListsView
            list={activeList}
            onImport={() => setShowImport(true)}
            onAddPlace={() => setShowAddPlace(true)}
            onPlaceClick={(p, l) => setSelectedPlace({ place: p, list: l })}
          />
        )}
      </main>

      {showImport && <ImportModal onClose={() => setShowImport(false)} />}
      {showAddPlace && <AddPlaceModal onClose={() => setShowAddPlace(false)} />}
      {selectedPlace && (
        <PlaceDetail
          place={selectedPlace.place}
          list={selectedPlace.list}
          onClose={() => setSelectedPlace(null)}
        />
      )}
    </div>
  )
}
