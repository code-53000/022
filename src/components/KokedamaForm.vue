<template>
  <div class="modal-overlay" @click.self="$emit('close')">
    <div class="modal-content">
      <div class="modal-header">
        <h2>{{ isEdit ? '编辑苔玉档案' : '新增苔玉' }}</h2>
        <button class="btn-close" @click="$emit('close')">×</button>
      </div>

      <form @submit.prevent="handleSubmit" class="modal-body">
        <div class="form-group">
          <label for="name">名称 <span class="required">*</span></label>
          <input
            id="name"
            v-model="form.name"
            type="text"
            placeholder="给这颗苔玉起个名字"
            required
          />
        </div>

        <div class="form-group">
          <label for="mossSpecies">苔种</label>
          <input
            id="mossSpecies"
            v-model="form.mossSpecies"
            type="text"
            placeholder="例如：大灰藓、白发藓、仙鹤藓"
            list="moss-suggestions"
          />
          <datalist id="moss-suggestions">
            <option v-for="species in store.allMossSpecies" :key="species" :value="species"></option>
          </datalist>
        </div>

        <div class="form-group">
          <label for="substrateRatio">基质配比</label>
          <input
            id="substrateRatio"
            v-model="form.substrateRatio"
            type="text"
            placeholder="例如：赤玉土5:鹿沼土3:泥炭2"
          />
        </div>

        <div class="form-group">
          <label for="location">摆放位置</label>
          <input
            id="location"
            v-model="form.location"
            type="text"
            placeholder="例如：书房窗台（散光）、客厅北角（阴位）"
            list="location-suggestions"
          />
          <datalist id="location-suggestions">
            <option v-for="loc in store.allLocations" :key="loc" :value="loc"></option>
          </datalist>
        </div>

        <div class="form-group">
          <label for="notes">备注</label>
          <textarea
            id="notes"
            v-model="form.notes"
            rows="3"
            placeholder="记录一些特别的注意事项，比如这颗容易发黄..."
          ></textarea>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" @click="$emit('close')">
            取消
          </button>
          <button type="submit" class="btn btn-primary">
            {{ isEdit ? '保存修改' : '创建档案' }}
          </button>
        </div>
      </form>
    </div>
  </div>
</template>

<script setup>
import { reactive, computed, onMounted } from 'vue'
import { useKokedamaStore } from '../stores/kokedama'

const props = defineProps({
  kokedamaId: {
    type: String,
    default: null
  }
})

const emit = defineEmits(['close', 'saved'])

const store = useKokedamaStore()

const isEdit = computed(() => !!props.kokedamaId)

const form = reactive({
  name: '',
  mossSpecies: '',
  substrateRatio: '',
  location: '',
  notes: ''
})

onMounted(() => {
  if (isEdit.value) {
    const kokedama = store.kokedamas.find(k => k.id === props.kokedamaId)
    if (kokedama) {
      form.name = kokedama.name
      form.mossSpecies = kokedama.mossSpecies
      form.substrateRatio = kokedama.substrateRatio
      form.location = kokedama.location
      form.notes = kokedama.notes
    }
  }
})

function handleSubmit() {
  if (!form.name.trim()) return

  if (isEdit.value) {
    store.updateKokedama(props.kokedamaId, { ...form })
  } else {
    const newKokedama = store.addKokedama({ ...form })
    store.selectKokedama(newKokedama.id)
  }
  emit('saved')
  emit('close')
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

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  color: #374151;
}

.required {
  color: #ef4444;
}

.form-group input,
.form-group textarea {
  width: 100%;
  padding: 10px 12px;
  border: 1px solid #d1d5db;
  border-radius: 8px;
  font-size: 0.95rem;
  transition: border-color 0.2s;
  box-sizing: border-box;
}

.form-group input:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #10b981;
  box-shadow: 0 0 0 3px rgba(16, 185, 129, 0.1);
}

.form-group textarea {
  resize: vertical;
  min-height: 80px;
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding-top: 20px;
  border-top: 1px solid #e5e7eb;
}
</style>
