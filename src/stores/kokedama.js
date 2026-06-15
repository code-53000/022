import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadFromStorage, saveToStorage } from '../utils/storage'
import { generateId, daysSince } from '../utils/date'

export const useKokedamaStore = defineStore('kokedama', () => {
  const kokedamas = ref([])
  const selectedId = ref(null)
  const filters = ref({
    mossSpecies: '',
    location: '',
    minDaysSinceWater: null,
    maxDaysSinceWater: null
  })
  const sortBy = ref('daysSinceWater')
  const sortOrder = ref('asc')

  function init() {
    const data = loadFromStorage()
    kokedamas.value = data.kokedamas
  }

  function persist() {
    saveToStorage({ kokedamas: kokedamas.value })
  }

  const allMossSpecies = computed(() => {
    const species = new Set()
    kokedamas.value.forEach(k => {
      if (k.mossSpecies) species.add(k.mossSpecies)
    })
    return Array.from(species).sort()
  })

  const allLocations = computed(() => {
    const locations = new Set()
    kokedamas.value.forEach(k => {
      if (k.location) locations.add(k.location)
    })
    return Array.from(locations).sort()
  })

  const enrichedKokedamas = computed(() => {
    return kokedamas.value.map(k => {
      const lastWaterRecord = k.careRecords
        .filter(r => r.action === 'water')
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))[0]
      const lastWaterDate = lastWaterRecord ? lastWaterRecord.timestamp : k.createdAt
      return {
        ...k,
        lastWaterDate,
        daysSinceWater: daysSince(lastWaterDate)
      }
    })
  })

  const filteredKokedamas = computed(() => {
    let result = [...enrichedKokedamas.value]

    if (filters.value.mossSpecies) {
      result = result.filter(k => k.mossSpecies === filters.value.mossSpecies)
    }

    if (filters.value.location) {
      result = result.filter(k => k.location === filters.value.location)
    }

    if (filters.value.minDaysSinceWater !== null) {
      result = result.filter(k => k.daysSinceWater >= filters.value.minDaysSinceWater)
    }

    if (filters.value.maxDaysSinceWater !== null) {
      result = result.filter(k => k.daysSinceWater <= filters.value.maxDaysSinceWater)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortBy.value) {
        case 'daysSinceWater':
          comparison = (a.daysSinceWater ?? 9999) - (b.daysSinceWater ?? 9999)
          break
        case 'name':
          comparison = a.name.localeCompare(b.name, 'zh-CN')
          break
        case 'createdAt':
          comparison = new Date(a.createdAt) - new Date(b.createdAt)
          break
        default:
          comparison = 0
      }
      return sortOrder.value === 'asc' ? comparison : -comparison
    })

    return result
  })

  const selectedKokedama = computed(() => {
    if (!selectedId.value) return null
    return enrichedKokedamas.value.find(k => k.id === selectedId.value) || null
  })

  function addKokedama(data) {
    const newKokedama = {
      id: generateId(),
      name: data.name,
      mossSpecies: data.mossSpecies || '',
      substrateRatio: data.substrateRatio || '',
      location: data.location || '',
      notes: data.notes || '',
      createdAt: new Date().toISOString(),
      careRecords: []
    }
    kokedamas.value.push(newKokedama)
    persist()
    return newKokedama
  }

  function updateKokedama(id, data) {
    const index = kokedamas.value.findIndex(k => k.id === id)
    if (index !== -1) {
      kokedamas.value[index] = {
        ...kokedamas.value[index],
        name: data.name,
        mossSpecies: data.mossSpecies || '',
        substrateRatio: data.substrateRatio || '',
        location: data.location || '',
        notes: data.notes || ''
      }
      persist()
    }
  }

  function deleteKokedama(id) {
    const index = kokedamas.value.findIndex(k => k.id === id)
    if (index !== -1) {
      kokedamas.value.splice(index, 1)
      if (selectedId.value === id) {
        selectedId.value = null
      }
      persist()
    }
  }

  function addCareRecord(kokedamaId, record) {
    const kokedama = kokedamas.value.find(k => k.id === kokedamaId)
    if (kokedama) {
      const newRecord = {
        id: generateId(),
        action: record.action,
        timestamp: record.timestamp || new Date().toISOString(),
        notes: record.notes || '',
        photoThumbnail: record.photoThumbnail || null
      }
      kokedama.careRecords.push(newRecord)
      kokedama.careRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
      persist()
      return newRecord
    }
    return null
  }

  function deleteCareRecord(kokedamaId, recordId) {
    const kokedama = kokedamas.value.find(k => k.id === kokedamaId)
    if (kokedama) {
      const index = kokedama.careRecords.findIndex(r => r.id === recordId)
      if (index !== -1) {
        kokedama.careRecords.splice(index, 1)
        persist()
      }
    }
  }

  function selectKokedama(id) {
    selectedId.value = id
  }

  function clearSelection() {
    selectedId.value = null
  }

  function setFilters(newFilters) {
    filters.value = { ...filters.value, ...newFilters }
  }

  function resetFilters() {
    filters.value = {
      mossSpecies: '',
      location: '',
      minDaysSinceWater: null,
      maxDaysSinceWater: null
    }
  }

  function setSorting(by, order) {
    sortBy.value = by
    sortOrder.value = order
  }

  function replaceAllData(data) {
    kokedamas.value = data.kokedamas || []
    persist()
  }

  function exportData() {
    return {
      kokedamas: kokedamas.value
    }
  }

  return {
    kokedamas,
    selectedId,
    filters,
    sortBy,
    sortOrder,
    allMossSpecies,
    allLocations,
    enrichedKokedamas,
    filteredKokedamas,
    selectedKokedama,
    init,
    addKokedama,
    updateKokedama,
    deleteKokedama,
    addCareRecord,
    deleteCareRecord,
    selectKokedama,
    clearSelection,
    setFilters,
    resetFilters,
    setSorting,
    replaceAllData,
    exportData
  }
})
