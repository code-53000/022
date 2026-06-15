<template>
  <div class="kokedama-list">
    <div class="list-header">
      <h2>我的苔玉</h2>
      <button class="btn btn-primary" @click="$emit('add')">+ 新增苔玉</button>
    </div>

    <div class="filter-bar">
      <div class="filter-group">
        <label>苔种筛选</label>
        <select v-model="localFilters.mossSpecies" @change="applyFilters">
          <option value="">全部苔种</option>
          <option v-for="species in store.allMossSpecies" :key="species" :value="species">
            {{ species }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>摆放位置</label>
        <select v-model="localFilters.location" @change="applyFilters">
          <option value="">全部位置</option>
          <option v-for="loc in store.allLocations" :key="loc" :value="loc">
            {{ loc }}
          </option>
        </select>
      </div>

      <div class="filter-group">
        <label>距上次浇水 ≥</label>
        <input
          type="number"
          v-model.number="localFilters.minDaysSinceWater"
          @change="applyFilters"
          placeholder="天"
          min="0"
        />
      </div>

      <div class="filter-group">
        <label>距上次浇水 ≤</label>
        <input
          type="number"
          v-model.number="localFilters.maxDaysSinceWater"
          @change="applyFilters"
          placeholder="天"
          min="0"
        />
      </div>

      <div class="filter-group">
        <label>排序</label>
        <select v-model="localSort.by" @change="applySort">
          <option value="daysSinceWater">距上次浇水</option>
          <option value="name">名称</option>
          <option value="createdAt">创建时间</option>
        </select>
        <button class="btn-sort" @click="toggleSortOrder">
          {{ localSort.order === 'asc' ? '↑' : '↓' }}
        </button>
      </div>

      <button class="btn btn-secondary" @click="resetAllFilters">重置筛选</button>
    </div>

    <div v-if="store.filteredKokedamas.length === 0" class="empty-state">
      <p>还没有苔玉档案，点击右上角"新增苔玉"开始记录吧</p>
    </div>

    <div v-else class="list-content">
      <div
        v-for="item in store.filteredKokedamas"
        :key="item.id"
        class="kokedama-card"
        :class="{ active: store.selectedId === item.id }"
        @click="store.selectKokedama(item.id)"
      >
        <div class="card-header">
          <h3>{{ item.name }}</h3>
          <span
            class="water-badge"
            :class="getWaterBadgeClass(item.daysSinceWater)"
          >
            {{ item.daysSinceWater === null ? '未记录' : item.daysSinceWater + '天' }}
          </span>
        </div>

        <div class="card-info">
          <div v-if="item.mossSpecies" class="info-row">
            <span class="label">苔种:</span>
            <span class="value">{{ item.mossSpecies }}</span>
          </div>
          <div v-if="item.location" class="info-row">
            <span class="label">位置:</span>
            <span class="value">{{ item.location }}</span>
          </div>
          <div v-if="item.substrateRatio" class="info-row">
            <span class="label">基质:</span>
            <span class="value">{{ item.substrateRatio }}</span>
          </div>
        </div>

        <div class="card-footer">
          <span class="record-count">
            养护记录: {{ item.careRecords.length }} 条
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { reactive, watch } from 'vue'
import { useKokedamaStore } from '../stores/kokedama'

const emit = defineEmits(['add'])

const store = useKokedamaStore()

const localFilters = reactive({
  mossSpecies: store.filters.mossSpecies,
  location: store.filters.location,
  minDaysSinceWater: store.filters.minDaysSinceWater,
  maxDaysSinceWater: store.filters.maxDaysSinceWater
})

const localSort = reactive({
  by: store.sortBy,
  order: store.sortOrder
})

watch(
  () => [store.filters, store.sortBy, store.sortOrder],
  () => {
    localFilters.mossSpecies = store.filters.mossSpecies
    localFilters.location = store.filters.location
    localFilters.minDaysSinceWater = store.filters.minDaysSinceWater
    localFilters.maxDaysSinceWater = store.filters.maxDaysSinceWater
    localSort.by = store.sortBy
    localSort.order = store.sortOrder
  },
  { deep: true }
)

function applyFilters() {
  store.setFilters({
    mossSpecies: localFilters.mossSpecies,
    location: localFilters.location,
    minDaysSinceWater: localFilters.minDaysSinceWater === '' ? null : localFilters.minDaysSinceWater,
    maxDaysSinceWater: localFilters.maxDaysSinceWater === '' ? null : localFilters.maxDaysSinceWater
  })
}

function applySort() {
  store.setSorting(localSort.by, localSort.order)
}

function toggleSortOrder() {
  localSort.order = localSort.order === 'asc' ? 'desc' : 'asc'
  applySort()
}

function resetAllFilters() {
  store.resetFilters()
  store.setSorting('daysSinceWater', 'asc')
}

function getWaterBadgeClass(days) {
  if (days === null) return 'badge-unknown'
  if (days >= 7) return 'badge-danger'
  if (days >= 4) return 'badge-warning'
  return 'badge-success'
}
</script>

<style scoped>
.kokedama-list {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e5e7eb;
}

.list-header h2 {
  margin: 0;
  font-size: 1.25rem;
  color: #1f2937;
}

.filter-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  padding: 12px 20px;
  background: #f9fafb;
  border-bottom: 1px solid #e5e7eb;
}

.filter-group {
  display: flex;
  align-items: center;
  gap: 6px;
}

.filter-group label {
  font-size: 0.85rem;
  color: #4b5563;
  white-space: nowrap;
}

.filter-group select,
.filter-group input {
  padding: 6px 10px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  font-size: 0.85rem;
  background: white;
}

.filter-group input {
  width: 60px;
}

.btn-sort {
  width: 32px;
  height: 32px;
  border: 1px solid #d1d5db;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  font-size: 1rem;
}

.btn-sort:hover {
  background: #f3f4f6;
}

.empty-state {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #6b7280;
}

.list-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px 20px;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  align-content: start;
}

.kokedama-card {
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 10px;
  padding: 16px;
  cursor: pointer;
  transition: all 0.2s;
}

.kokedama-card:hover {
  border-color: #10b981;
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.kokedama-card.active {
  border-color: #10b981;
  background: #ecfdf5;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 12px;
}

.card-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #1f2937;
}

.water-badge {
  padding: 4px 10px;
  border-radius: 12px;
  font-size: 0.8rem;
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

.card-info {
  margin-bottom: 12px;
}

.info-row {
  display: flex;
  gap: 8px;
  margin-bottom: 4px;
  font-size: 0.9rem;
}

.info-row .label {
  color: #6b7280;
  min-width: 40px;
}

.info-row .value {
  color: #374151;
}

.card-footer {
  padding-top: 12px;
  border-top: 1px solid #f3f4f6;
}

.record-count {
  font-size: 0.85rem;
  color: #6b7280;
}
</style>
