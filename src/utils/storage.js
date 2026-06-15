const STORAGE_KEY = 'kokedama-care-data'

export function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { kokedamas: [] }
    const data = JSON.parse(raw)
    return {
      kokedamas: Array.isArray(data.kokedamas) ? data.kokedamas : []
    }
  } catch (e) {
    console.error('读取本地存储失败:', e)
    return { kokedamas: [] }
  }
}

export function saveToStorage(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    return true
  } catch (e) {
    console.error('写入本地存储失败:', e)
    return false
  }
}

export function exportToJson(data) {
  const exportData = {
    ...data,
    exportedAt: new Date().toISOString(),
    version: '1.0'
  }
  return JSON.stringify(exportData, null, 2)
}

export function importFromJson(jsonString) {
  try {
    const data = JSON.parse(jsonString)
    if (!data.kokedamas || !Array.isArray(data.kokedamas)) {
      throw new Error('数据格式不正确，缺少 kokedamas 数组')
    }
    return data
  } catch (e) {
    console.error('导入 JSON 失败:', e)
    throw e
  }
}

export function downloadJsonFile(content, filename) {
  const blob = new Blob([content], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}
