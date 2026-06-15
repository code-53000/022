<template>
  <div class="app-container">
    <header class="app-header">
      <div class="header-content">
        <h1>🌿 苔玉养护日记</h1>
        <p class="subtitle">记录每一颗苔玉的生长节奏</p>
      </div>
      <div class="header-actions">
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
          @add="showAddForm = true"
        />
      </aside>

      <section class="content">
        <KokedamaDetail
          :kokedama-id="store.selectedId"
          @back="store.clearSelection()"
          @edit="handleEdit"
          @deleted="store.clearSelection()"
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
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useKokedamaStore } from './stores/kokedama'
import KokedamaList from './components/KokedamaList.vue'
import KokedamaDetail from './components/KokedamaDetail.vue'
import KokedamaForm from './components/KokedamaForm.vue'
import { exportToJson, importFromJson, downloadJsonFile } from './utils/storage'

const store = useKokedamaStore()

const showAddForm = ref(false)
const showEditForm = ref(false)
const editingId = ref(null)
const importInput = ref(null)

onMounted(() => {
  store.init()
})

function handleEdit(id) {
  editingId.value = id
  showEditForm.value = true
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

      const confirmMsg = data.kokedamas.length > 0
        ? `即将导入 ${data.kokedamas.length} 颗苔玉的数据。\n\n选择"确定"将覆盖现有所有数据，选择"取消"则保留现有数据并追加导入。`
        : '文件中没有可导入的数据。'

      if (data.kokedamas.length === 0) {
        alert(confirmMsg)
        return
      }

      if (confirm(confirmMsg)) {
        store.replaceAllData(data)
        alert('导入成功！已覆盖现有数据。')
      } else {
        const existingIds = new Set(store.kokedamas.map(k => k.id))
        data.kokedamas.forEach(k => {
          if (!existingIds.has(k.id)) {
            store.kokedamas.push(k)
          }
        })
        store.persist()
        alert('导入成功！已追加新数据。')
      }
    } catch (err) {
      alert('导入失败：' + err.message)
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
