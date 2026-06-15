<template>
  <div class="kokedama-detail" v-if="kokedama">
    <div class="detail-header">
      <button class="btn-back" @click="$emit('back')">
        ← 返回列表
      </button>
      <div class="header-actions">
        <button class="btn btn-secondary" @click="$emit('edit', kokedama.id)">
          编辑档案
        </button>
        <button class="btn btn-danger" @click="confirmDelete">
          删除
        </button>
      </div>
    </div>

    <div class="detail-content">
      <div class="profile-section">
        <h2>{{ kokedama.name }}</h2>
        <div class="water-status">
          <span class="water-badge" :class="getWaterBadgeClass(kokedama.daysSinceWater)">
            距上次浇水: {{ kokedama.daysSinceWater === null ? '未记录' : kokedama.daysSinceWater + ' 天' }}
          </span>
        </div>

        <div class="info-grid">
          <div v-if="kokedama.mossSpecies" class="info-item">
            <span class="label">苔种</span>
            <span class="value">{{ kokedama.mossSpecies }}</span>
          </div>
          <div v-if="kokedama.substrateRatio" class="info-item">
            <span class="label">基质配比</span>
            <span class="value">{{ kokedama.substrateRatio }}</span>
          </div>
          <div v-if="kokedama.location" class="info-item">
            <span class="label">摆放位置</span>
            <span class="value">{{ kokedama.location }}</span>
          </div>
          <div class="info-item">
            <span class="label">创建时间</span>
            <span class="value">{{ formatDate(kokedama.createdAt) }}</span>
          </div>
        </div>

        <div v-if="kokedama.notes" class="notes-section">
          <h4>备注</h4>
          <p>{{ kokedama.notes }}</p>
        </div>
      </div>

      <div class="care-section">
        <div class="section-header">
          <h3>养护记录</h3>
          <button class="btn btn-primary" @click="showAddForm = true">
            + 记录养护
          </button>
        </div>

        <div v-if="showAddForm" class="add-record-form">
          <div class="form-card">
            <div class="form-row">
              <label>养护类型</label>
              <div class="action-buttons">
                <button
                  v-for="action in careActions"
                  :key="action.value"
                  class="action-btn"
                  :class="{ active: newRecord.action === action.value }"
                  @click="newRecord.action = action.value"
                >
                  {{ action.icon }} {{ action.label }}
                </button>
              </div>
            </div>

            <div class="form-row">
              <label for="record-time">时间</label>
              <input
                id="record-time"
                v-model="newRecord.timestamp"
                type="datetime-local"
              />
            </div>

            <div class="form-row">
              <label for="record-notes">记录备注</label>
              <textarea
                id="record-notes"
                v-model="newRecord.notes"
                rows="2"
                placeholder="比如：苔藓边缘有点发黄，浸盆5分钟后沥干..."
              ></textarea>
            </div>

            <div class="form-row">
              <label>状态照片</label>
              <div class="photo-upload">
                <input
                  ref="photoInput"
                  type="file"
                  accept="image/*"
                  @change="handlePhotoSelect"
                  style="display: none"
                />
                <button type="button" class="btn btn-secondary" @click="$refs.photoInput.click()">
                  选择照片
                </button>
                <div v-if="newRecord.photoThumbnail" class="photo-preview">
                  <img :src="newRecord.photoThumbnail" alt="预览" />
                  <button type="button" class="remove-photo" @click="newRecord.photoThumbnail = null">
                    ×
                  </button>
                </div>
                <span class="photo-hint">照片会压缩存储在本地</span>
              </div>
            </div>

            <div class="form-actions">
              <button type="button" class="btn btn-secondary" @click="cancelAddRecord">
                取消
              </button>
              <button type="button" class="btn btn-primary" @click="submitRecord">
                保存记录
              </button>
            </div>
          </div>
        </div>

        <div v-if="kokedama.careRecords.length === 0" class="empty-records">
          <p>还没有养护记录，点击"记录养护"开始追踪这颗苔玉的状态吧</p>
        </div>

        <div v-else class="records-timeline">
          <div
            v-for="record in kokedama.careRecords"
            :key="record.id"
            class="record-item"
          >
            <div class="record-icon" :class="'action-' + record.action">
              {{ getActionIcon(record.action) }}
            </div>
            <div class="record-content">
              <div class="record-header">
                <span class="action-label">{{ getActionLabel(record.action) }}</span>
                <span class="record-time">{{ formatDateTime(record.timestamp) }}</span>
                <button class="delete-record" @click="confirmDeleteRecord(record.id)" title="删除记录">
                  ×
                </button>
              </div>
              <div v-if="record.notes" class="record-notes">
                {{ record.notes }}
              </div>
              <div v-if="record.photoThumbnail" class="record-photo">
                <img :src="record.photoThumbnail" alt="养护照片" @click="showPhotoModal(record.photoThumbnail)" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div v-if="photoModalUrl" class="photo-modal" @click="photoModalUrl = null">
      <img :src="photoModalUrl" alt="大图预览" />
    </div>
  </div>

  <div v-else class="no-selection">
    <div class="empty-illustration">
      <div class="moss-icon">🌿</div>
      <p>从左侧选择一颗苔玉查看详情</p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useKokedamaStore } from '../stores/kokedama'
import { formatDate, formatDateTime } from '../utils/date'

const props = defineProps({
  kokedamaId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['back', 'edit', 'deleted'])

const store = useKokedamaStore()

const kokedama = computed(() => {
  if (!props.kokedamaId) return null
  return store.selectedKokedama
})

const showAddForm = ref(false)
const photoModalUrl = ref(null)

const careActions = [
  { value: 'water', label: '浸水', icon: '💧' },
  { value: 'mist', label: '喷雾', icon: '🌫️' },
  { value: 'trim', label: '修剪', icon: '✂️' },
  { value: 'move', label: '移动', icon: '📦' },
  { value: 'check', label: '观察', icon: '🔍' },
  { value: 'other', label: '其他', icon: '📝' }
]

const newRecord = reactive({
  action: 'water',
  timestamp: '',
  notes: '',
  photoThumbnail: null
})

function resetNewRecord() {
  newRecord.action = 'water'
  newRecord.timestamp = getCurrentDateTimeLocal()
  newRecord.notes = ''
  newRecord.photoThumbnail = null
}

function getCurrentDateTimeLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function handlePhotoSelect(event) {
  const file = event.target.files[0]
  if (!file) return

  const reader = new FileReader()
  reader.onload = (e) => {
    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const maxSize = 300
      let width = img.width
      let height = img.height

      if (width > height && width > maxSize) {
        height = (height * maxSize) / width
        width = maxSize
      } else if (height > maxSize) {
        width = (width * maxSize) / height
        height = maxSize
      }

      canvas.width = width
      canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.drawImage(img, 0, 0, width, height)
      newRecord.photoThumbnail = canvas.toDataURL('image/jpeg', 0.8)
    }
    img.src = e.target.result
  }
  reader.readAsDataURL(file)
  event.target.value = ''
}

function submitRecord() {
  if (!newRecord.action) return

  const timestamp = newRecord.timestamp
    ? new Date(newRecord.timestamp).toISOString()
    : new Date().toISOString()

  store.addCareRecord(props.kokedamaId, {
    action: newRecord.action,
    timestamp,
    notes: newRecord.notes,
    photoThumbnail: newRecord.photoThumbnail
  })

  cancelAddRecord()
}

function cancelAddRecord() {
  showAddForm.value = false
  resetNewRecord()
}

function confirmDelete() {
  if (confirm(`确定要删除「${kokedama.value.name}」吗？所有养护记录也会被删除。`)) {
    store.deleteKokedama(props.kokedamaId)
    emit('deleted')
  }
}

function confirmDeleteRecord(recordId) {
  if (confirm('确定要删除这条养护记录吗？')) {
    store.deleteCareRecord(props.kokedamaId, recordId)
  }
}

function getWaterBadgeClass(days) {
  if (days === null) return 'badge-unknown'
  if (days >= 7) return 'badge-danger'
  if (days >= 4) return 'badge-warning'
  return 'badge-success'
}

function getActionIcon(action) {
  const found = careActions.find(a => a.value === action)
  return found ? found.icon : '📝'
}

function getActionLabel(action) {
  const found = careActions.find(a => a.value === action)
  return found ? found.label : action
}

function showPhotoModal(url) {
  photoModalUrl.value = url
}
</script>

<style scoped>
.kokedama-detail {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: white;
}

.detail-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.btn-back {
  border: none;
  background: transparent;
  color: #4b5563;
  cursor: pointer;
  font-size: 0.95rem;
  padding: 8px 12px;
  border-radius: 6px;
}

.btn-back:hover {
  background: #e5e7eb;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.detail-content {
  flex: 1;
  overflow-y: auto;
  padding: 24px;
}

.profile-section {
  margin-bottom: 32px;
  padding-bottom: 24px;
  border-bottom: 1px solid #e5e7eb;
}

.profile-section h2 {
  margin: 0 0 12px 0;
  font-size: 1.5rem;
  color: #1f2937;
}

.water-status {
  margin-bottom: 20px;
}

.water-badge {
  padding: 6px 14px;
  border-radius: 16px;
  font-size: 0.9rem;
  font-weight: 500;
}

.badge-success {
  background: #d1fae5;
  color: #065f46;
}

.badge-warning {
  background: #fef3c7;
  color: #92400e;
}

.badge-danger {
  background: #fee2e2;
  color: #991b1b;
}

.badge-unknown {
  background: #e5e7eb;
  color: #4b5563;
}

.info-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: 16px;
  margin-bottom: 20px;
}

.info-item {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.info-item .label {
  font-size: 0.85rem;
  color: #6b7280;
}

.info-item .value {
  font-size: 0.95rem;
  color: #1f2937;
  font-weight: 500;
}

.notes-section h4 {
  margin: 0 0 8px 0;
  font-size: 0.95rem;
  color: #374151;
}

.notes-section p {
  margin: 0;
  padding: 12px;
  background: #f9fafb;
  border-radius: 8px;
  color: #4b5563;
  line-height: 1.6;
}

.care-section {
  flex: 1;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.section-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.add-record-form {
  margin-bottom: 24px;
}

.form-card {
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 20px;
}

.form-row {
  margin-bottom: 16px;
}

.form-row label {
  display: block;
  margin-bottom: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

.action-buttons {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.action-btn {
  padding: 8px 14px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  background: white;
  cursor: pointer;
  font-size: 0.9rem;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: #10b981;
}

.action-btn.active {
  background: #d1fae5;
  border-color: #10b981;
  color: #065f46;
}

.form-row input[type="datetime-local"],
.form-row textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  box-sizing: border-box;
}

.form-row input:focus,
.form-row textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.photo-upload {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.photo-preview {
  position: relative;
  display: inline-block;
}

.photo-preview img {
  width: 80px;
  height: 80px;
  object-fit: cover;
  border-radius: 8px;
  border: 2px solid #10b981;
}

.remove-photo {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  border: none;
  background: #ef4444;
  color: white;
  cursor: pointer;
  font-size: 14px;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.photo-hint {
  font-size: 0.8rem;
  color: #6b7280;
}

.form-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}

.empty-records {
  text-align: center;
  padding: 40px;
  color: #6b7280;
}

.records-timeline {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.record-item {
  display: flex;
  gap: 16px;
  padding: 16px;
  background: #f9fafb;
  border-radius: 10px;
}

.record-icon {
  width: 40px;
  height: 40px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.2rem;
  flex-shrink: 0;
}

.record-icon.action-water {
  background: #dbeafe;
}

.record-icon.action-mist {
  background: #e0e7ff;
}

.record-icon.action-trim {
  background: #fef3c7;
}

.record-icon.action-move {
  background: #fce7f3;
}

.record-icon.action-check {
  background: #d1fae5;
}

.record-icon.action-other {
  background: #e5e7eb;
}

.record-content {
  flex: 1;
  min-width: 0;
}

.record-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

.action-label {
  font-weight: 600;
  color: #1f2937;
}

.record-time {
  font-size: 0.85rem;
  color: #6b7280;
}

.delete-record {
  margin-left: auto;
  width: 24px;
  height: 24px;
  border: none;
  background: transparent;
  color: #9ca3af;
  cursor: pointer;
  border-radius: 4px;
  font-size: 1rem;
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
}

.delete-record:hover {
  background: #fee2e2;
  color: #ef4444;
}

.record-notes {
  color: #4b5563;
  margin-bottom: 8px;
  line-height: 1.5;
}

.record-photo img {
  max-width: 200px;
  max-height: 200px;
  object-fit: cover;
  border-radius: 8px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: border-color 0.2s;
}

.record-photo img:hover {
  border-color: #10b981;
}

.photo-modal {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  cursor: zoom-out;
}

.photo-modal img {
  max-width: 90%;
  max-height: 90%;
  object-fit: contain;
  border-radius: 8px;
}

.no-selection {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f9fafb;
}

.empty-illustration {
  text-align: center;
  color: #6b7280;
}

.moss-icon {
  font-size: 4rem;
  margin-bottom: 16px;
  opacity: 0.5;
}

.empty-illustration p {
  margin: 0;
  font-size: 1rem;
}
</style>
