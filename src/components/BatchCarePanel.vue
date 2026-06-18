<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>批量养护记录</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <div class="modal-body">
        <div class="selected-summary">
          <span class="summary-label">已选择</span>
          <span class="summary-count">{{ kokedamaIds.length }}</span>
          <span class="summary-label">颗苔玉</span>
        </div>

        <div class="selected-names">
          <span v-for="name in kokedamaNames" :key="name" class="name-tag">{{ name }}</span>
        </div>

        <div class="form-row">
          <label>养护类型 <span class="required">*</span></label>
          <div class="action-buttons">
            <button
              v-for="action in careActions"
              :key="action.value"
              class="action-btn"
              :class="{ active: form.action === action.value }"
              @click="form.action = action.value"
            >
              {{ action.icon }} {{ action.label }}
            </button>
          </div>
        </div>

        <div class="form-row">
          <label for="batch-time">时间</label>
          <input id="batch-time" v-model="form.timestamp" type="datetime-local" />
        </div>

        <div class="form-row">
          <label for="batch-notes">备注</label>
          <textarea
            id="batch-notes"
            v-model="form.notes"
            rows="2"
            placeholder="统一备注，比如：统一浸水5分钟..."
          ></textarea>
        </div>

        <div v-if="formError" class="form-error">
          ⚠️ {{ formError }}
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            取消
          </button>
          <button type="button" class="btn btn-primary" @click="submitBatch">
            确认记录
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref, computed } from 'vue'
import { useKokedamaStore } from '../stores/kokedama'

const props = defineProps({
  kokedamaIds: {
    type: Array,
    required: true
  }
})

const emit = defineEmits(['close', 'done'])

const store = useKokedamaStore()
const formError = ref('')

const careActions = [
  { value: 'water', label: '浸水', icon: '💧' },
  { value: 'mist', label: '喷雾', icon: '🌫️' },
  { value: 'trim', label: '修剪', icon: '✂️' },
  { value: 'move', label: '移动', icon: '📦' },
  { value: 'check', label: '观察', icon: '🔍' },
  { value: 'other', label: '其他', icon: '📝' }
]

const form = reactive({
  action: 'water',
  timestamp: getCurrentDateTimeLocal(),
  notes: ''
})

const kokedamaNames = computed(() => {
  return props.kokedamaIds.map(id => {
    const k = store.kokedamas.find(kk => kk.id === id)
    return k ? k.name : '未知'
  })
})

function getCurrentDateTimeLocal() {
  const now = new Date()
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset())
  return now.toISOString().slice(0, 16)
}

function submitBatch() {
  formError.value = ''
  if (!form.action) {
    formError.value = '请选择养护类型'
    return
  }
  const timestamp = form.timestamp
    ? new Date(form.timestamp).toISOString()
    : new Date().toISOString()

  const created = store.batchAddCareRecords(props.kokedamaIds, {
    action: form.action,
    timestamp,
    notes: form.notes
  })

  if (created) {
    emit('done', {
      action: form.action,
      count: created.length,
      recordRefs: created
    })
  } else {
    formError.value = '批量记录保存失败，请重试'
  }
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-content {
  background: white;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 50px rgba(0, 0, 0, 0.25);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20px 24px;
  border-bottom: 1px solid #e5e7eb;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.btn-close {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  font-size: 1.5rem;
  color: #6b7280;
  cursor: pointer;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-close:hover {
  background: #f3f4f6;
}

.modal-body {
  padding: 24px;
}

.selected-summary {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 12px;
}

.summary-label {
  font-size: 0.9rem;
  color: #6b7280;
}

.summary-count {
  font-size: 1.4rem;
  font-weight: 700;
  color: #10b981;
}

.selected-names {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-bottom: 20px;
}

.name-tag {
  padding: 4px 10px;
  background: #ecfdf5;
  color: #065f46;
  border-radius: 12px;
  font-size: 0.8rem;
  font-weight: 500;
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

.required {
  color: #ef4444;
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

.form-error {
  padding: 10px 12px;
  background: #fef2f2;
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: #991b1b;
  font-size: 0.9rem;
  margin-bottom: 16px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 16px;
  border-top: 1px solid #e5e7eb;
}
</style>
