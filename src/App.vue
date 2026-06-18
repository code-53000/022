<template>
  <div class="app-container">
    <div v-if="store.lastError" class="error-toast">
      <div class="error-content">
        <span class="error-icon">⚠️</span>
        <span class="error-message">{{ store.lastError }}</span>
      </div>
      <button class="error-close" @click="store.clearError()">×</button>
    </div>

    <div v-if="batchToast.show" class="batch-toast">
      <div class="batch-toast-content">
        <span class="batch-toast-icon">✅</span>
        <span class="batch-toast-msg">已为 {{ batchToast.count }} 颗苔玉记录{{ batchToast.actionLabel }}</span>
        <button class="batch-toast-undo" @click="undoBatch">撤销</button>
      </div>
      <button class="batch-toast-close" @click="dismissToast">×</button>
    </div>

    <header class="app-header">
      <div class="header-content">
        <h1>🌿 苔玉养护日记</h1>
        <p class="subtitle">记录每一颗苔玉的生长节奏</p>
      </div>
      <div class="header-actions">
        <button
          class="btn btn-secondary header-tab"
          :class="{ active: activeView === 'detail' }"
          @click="activeView = 'detail'"
        >
          📋 详情
        </button>
        <button
          class="btn btn-secondary header-tab"
          :class="{ active: activeView === 'calendar' }"
          @click="activeView = 'calendar'"
        >
          📅 日历
        </button>
        <button class="btn btn-secondary" @click="handleExport">
          📤 导出数据
        </button>
        <button class="btn btn-secondary" @click="triggerImport">
          📥 导入数据
        </button>
        <input
          ref="importInput"
          type="file"
          accept=".json"
          @change="handleImport"
          style="display: none"
        />
      </div>
    </header>

    <main class="app-main">
      <aside class="sidebar">
        <KokedamaList
          ref="listRef"
          @add="showAddForm = true"
          @batch-care="openBatchCare"
        />
      </aside>

      <section class="content">
        <KokedamaDetail
          v-if="activeView === 'detail'"
          :kokedama-id="store.selectedId"
          @back="store.clearSelection()"
          @edit="handleEdit"
          @deleted="store.clearSelection()"
        />
        <CareCalendar
          v-else-if="activeView === 'calendar'"
        />
      </section>
    </main>

    <KokedamaForm
      v-if="showAddForm"
      @close="showAddForm = false"
      @saved="showAddForm = false"
    />

    <KokedamaForm
      v-if="showEditForm && editingId"
      :kokedama-id="editingId"
      @close="showEditForm = false; editingId = null"
      @saved="showEditForm = false; editingId = null"
    />

    <BatchCarePanel
      v-if="showBatchCare"
      :kokedama-ids="batchCareIds"
      @close="showBatchCare = false"
      @done="handleBatchDone"
    />
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { useKokedamaStore } from './stores/kokedama'
import KokedamaList from './components/KokedamaList.vue'
import KokedamaDetail from './components/KokedamaDetail.vue'
import KokedamaForm from './components/KokedamaForm.vue'
import CareCalendar from './components/CareCalendar.vue'
import BatchCarePanel from './components/BatchCarePanel.vue'
import { exportToJson, importFromJson, downloadJsonFile } from './utils/storage'

const store = useKokedamaStore()

const showAddForm = ref(false)
const showEditForm = ref(false)
const editingId = ref(null)
const importInput = ref(null)
const activeView = ref('detail')
const listRef = ref(null)

const showBatchCare = ref(false)
const batchCareIds = ref([])

const batchToast = reactive({
  show: false,
  count: 0,
  actionLabel: '',
  recordRefs: []
})

let toastTimer = null

const careActionLabels = {
  water: '浸水',
  mist: '喷雾',
  trim: '修剪',
  move: '移动',
  check: '观察',
  other: '其他'
}

onMounted(() => {
  store.init()
})

function handleEdit(id) {
  editingId.value = id
  showEditForm.value = true
}

function openBatchCare(ids) {
  batchCareIds.value = [...ids]
  showBatchCare.value = true
}

function handleBatchDone(result) {
  showBatchCare.value = false
  if (listRef.value) {
    listRef.value.clearSelection()
  }
  batchToast.show = true
  batchToast.count = result.count
  batchToast.actionLabel = careActionLabels[result.action] || result.action
  batchToast.recordRefs = result.recordRefs

  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    batchToast.show = false
    batchToast.recordRefs = []
  }, 8000)
}

function undoBatch() {
  if (batchToast.recordRefs.length > 0) {
    store.batchDeleteCareRecords(batchToast.recordRefs)
  }
  batchToast.show = false
  batchToast.recordRefs = []
  if (toastTimer) clearTimeout(toastTimer)
}

function dismissToast() {
  batchToast.show = false
  batchToast.recordRefs = []
  if (toastTimer) clearTimeout(toastTimer)
}

function handleExport() {
  const data = store.exportData()
  const jsonContent = exportToJson(data)
  const date = new Date().toISOString().slice(0, 10)
  const filename = `kokedama-backup-${date}.json`
  downloadJsonFile(jsonContent, filename)
}

function triggerImport() {
  importInput.value.click()
}

function handleImport(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const jsonString = e.target.result
      const data = importFromJson(jsonString)

      if (!data.kokedamas || data.kokedamas.length === 0) {
        alert('文件中没有可导入的数据。')
        return
      }

      const existingCount = store.kokedamas.length
      const importCount = data.kokedamas.length

      let choice
      if (existingCount === 0) {
        choice = 'overwrite'
      } else {
        choice = confirm(
          `即将导入 ${importCount} 颗苔玉的数据（当前已有 ${existingCount} 颗）。\n\n` +
          `点击"确定"：覆盖现有所有数据（替换为导入内容）\n` +
          `点击"取消"：追加导入（跳过 ID 重复的条目，保留现有数据）`
        ) ? 'overwrite' : 'append'
      }

      if (choice === 'overwrite') {
        const success = store.replaceAllData(data)
        if (success) {
          store.clearSelection()
          alert(`导入成功！已用 ${importCount} 条数据覆盖原有内容。`)
        }
      } else {
        const result = store.appendData(data)
        if (result.success) {
          const skipped = importCount - result.added
          if (skipped === 0) {
            alert(`导入成功！已追加 ${result.added} 条新数据。`)
          } else {
            alert(`导入成功！已追加 ${result.added} 条新数据，跳过 ${skipped} 条重复数据。`)
          }
        }
      }
    } catch (err) {
      alert('导入失败：文件格式不正确或内容损坏。\n\n详细错误：' + err.message)
    }
  }
  reader.readAsText(file)
  event.target.value = ''
}
</script>

<style scoped>
.app-container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: #f3f4f6;
  position: relative;
}

.error-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-left: 4px solid #ef4444;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9999;
  max-width: 90%;
  animation: slideDown 0.3s ease;
}

.batch-toast {
  position: fixed;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  background: #ecfdf5;
  border: 1px solid #a7f3d0;
  border-left: 4px solid #10b981;
  border-radius: 8px;
  padding: 12px 16px;
  display: flex;
  align-items: center;
  gap: 12px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 9998;
  max-width: 90%;
  animation: slideDown 0.3s ease;
}

.batch-toast-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.batch-toast-icon {
  font-size: 1.1rem;
  flex-shrink: 0;
}

.batch-toast-msg {
  color: #065f46;
  font-size: 0.9rem;
  font-weight: 500;
}

.batch-toast-undo {
  padding: 4px 12px;
  border: 1px solid #10b981;
  border-radius: 6px;
  background: white;
  color: #059669;
  cursor: pointer;
  font-size: 0.8rem;
  font-weight: 600;
  white-space: nowrap;
  transition: all 0.2s;
}

.batch-toast-undo:hover {
  background: #d1fae5;
}

.batch-toast-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #065f46;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.batch-toast-close:hover {
  background: #d1fae5;
}

@keyframes slideDown {
  from {
    opacity: 0;
    transform: translate(-50%, -20px);
  }
  to {
    opacity: 1;
    transform: translate(-50%, 0);
  }
}

.error-content {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
}

.error-icon {
  font-size: 1.2rem;
  flex-shrink: 0;
}

.error-message {
  color: #991b1b;
  font-size: 0.9rem;
  line-height: 1.4;
}

.error-close {
  width: 28px;
  height: 28px;
  border: none;
  background: transparent;
  color: #991b1b;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1.2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.error-close:hover {
  background: #fee2e2;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: linear-gradient(135deg, #065f46 0%, #10b981 100%);
  color: white;
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
}

.header-content h1 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
}

.subtitle {
  margin: 4px 0 0 0;
  font-size: 0.9rem;
  opacity: 0.9;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.header-actions .btn {
  background: rgba(255, 255, 255, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.3);
  color: white;
}

.header-actions .btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

.header-tab.active {
  background: rgba(255, 255, 255, 0.4) !important;
  border-color: rgba(255, 255, 255, 0.6) !important;
  font-weight: 600;
}

.app-main {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.sidebar {
  width: 100%;
  max-width: 500px;
  min-width: 320px;
  border-right: 1px solid #e5e7eb;
  background: white;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.content {
  flex: 1;
  overflow: hidden;
}

@media (max-width: 768px) {
  .app-header {
    flex-direction: column;
    gap: 12px;
    align-items: flex-start;
  }

  .app-main {
    flex-direction: column;
  }

  .sidebar {
    max-width: 100%;
    min-width: 0;
    width: 100%;
    height: 50%;
    border-right: none;
    border-bottom: 1px solid #e5e7eb;
  }

  .content {
    height: 50%;
  }
}
</style>
