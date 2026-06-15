import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { loadFromStorage, saveToStorage, estimateStorageSize, checkStorageAvailable, getCurrentStorageSize, STORAGE_LIMIT_MB } from '../utils/storage'
import { generateId, daysSince } from '../utils/date'

export const useKokedamaStore = defineStore('kokedama', () => {
  const kokedamas = ref([])
  const selectedId = ref(null)
  const lastError = ref(null)
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

  function clearError() {
    lastError.value = null
  }

  function persist() {
    const data = { kokedamas: kokedamas.value }
    const totalSize = estimateStorageSize(data)
    const previousSize = getCurrentStorageSize()
    const sizeDiff = totalSize - previousSize

    if (totalSize > 0 && !checkStorageAvailable(totalSize)) {
      const totalMB = (totalSize / 1024 / 1024).toFixed(2)
      const limitMB = STORAGE_LIMIT_MB
      const overMB = ((totalSize - STORAGE_LIMIT_MB * 1024 * 1024) / 1024 / 1024).toFixed(2)
      const addedMB = sizeDiff > 0 ? (sizeDiff / 1024).toFixed(0) : '0'

      if (sizeDiff > 0) {
        lastError.value = `⚠️ 浏览器本地存储空间不足！本次操作新增约 ${addedMB} KB 数据后，总数据大小已达 ${totalMB} MB（浏览器上限约 ${limitMB} MB，超出 ${overMB} MB）。建议导出数据备份后，删除一些含照片的旧养护记录以释放空间。`
      } else {
        lastError.value = `⚠️ 浏览器本地存储空间不足！当前总数据大小 ${totalMB} MB 已接近或超出浏览器上限（约 ${limitMB} MB）。建议导出数据备份后，删除一些含照片的旧养护记录以释放空间。`
      }
      return false
    }

    const success = saveToStorage(data)
    if (!success) {
      const totalMB = (totalSize / 1024 / 1024).toFixed(2)
      lastError.value = `保存失败！写入浏览器本地存储时出错（当前总数据约 ${totalMB} MB）。建议先导出数据备份，或清理浏览器缓存后重试。`
      return false
    }

    lastError.value = null
    return true
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
    const success = persist()
    if (!success) {
      kokedamas.value.pop()
      return null
    }
    return newKokedama
  }

  function updateKokedama(id, data) {
    const index = kokedamas.value.findIndex(k => k.id === id)
    if (index !== -1) {
      const original = { ...kokedamas.value[index] }
      kokedamas.value[index] = {
        ...kokedamas.value[index],
        name: data.name,
        mossSpecies: data.mossSpecies || '',
        substrateRatio: data.substrateRatio || '',
        location: data.location || '',
        notes: data.notes || ''
      }
      const success = persist()
      if (!success) {
        kokedamas.value[index] = original
        return false
      }
      return true
    }
    return false
  }

  function deleteKokedama(id) {
    const index = kokedamas.value.findIndex(k => k.id === id)
    if (index !== -1) {
      const removed = kokedamas.value.splice(index, 1)[0]
      const wasSelected = selectedId.value === id
      if (wasSelected) {
        selectedId.value = null
      }
      const success = persist()
      if (!success) {
        kokedamas.value.splice(index, 0, removed)
        if (wasSelected) {
          selectedId.value = id
        }
        return false
      }
      return true
    }
    return false
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
      const success = persist()
      if (!success) {
        const recordIndex = kokedama.careRecords.findIndex(r => r.id === newRecord.id)
        if (recordIndex !== -1) {
          kokedama.careRecords.splice(recordIndex, 1)
        }
        return null
      }
      return newRecord
    }
    return null
  }

  function deleteCareRecord(kokedamaId, recordId) {
    const kokedama = kokedamas.value.find(k => k.id === kokedamaId)
    if (kokedama) {
      const index = kokedama.careRecords.findIndex(r => r.id === recordId)
      if (index !== -1) {
        const removed = kokedama.careRecords.splice(index, 1)[0]
        const success = persist()
        if (!success) {
          kokedama.careRecords.splice(index, 0, removed)
          kokedama.careRecords.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          return false
        }
        return true
      }
    }
    return false
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
    const original = [...kokedamas.value]
    kokedamas.value = data.kokedamas || []
    const success = persist()
    if (!success) {
      kokedamas.value = original
      return false
    }
    return true
  }

  function appendData(data) {
    const original = [...kokedamas.value]
    const existingIds = new Set(kokedamas.value.map(k => k.id))
    const toAdd = (data.kokedamas || []).filter(k => !existingIds.has(k.id))

    toAdd.forEach(k => {
      kokedamas.value.push(k)
    })

    const success = persist()
    if (!success) {
      kokedamas.value = original
      return { success: false, added: 0 }
    }
    return { success: true, added: toAdd.length }
  }

  function exportData() {
    return {
      kokedamas: kokedamas.value
    }
  }

  return {
    kokedamas,
    selectedId,
    lastError,
    filters,
    sortBy,
    sortOrder,
    allMossSpecies,
    allLocations,
    enrichedKokedamas,
    filteredKokedamas,
    selectedKokedama,
    init,
    clearError,
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
    appendData,
    exportData
  }
})
