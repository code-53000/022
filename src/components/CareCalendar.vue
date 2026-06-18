<template>
  <div class="care-calendar">
    <div class="calendar-header">
      <button class="btn btn-secondary nav-btn" @click="prevMonth">◀</button>
      <h3>{{ currentYear }}年{{ currentMonth + 1 }}月</h3>
      <button class="btn btn-secondary nav-btn" @click="nextMonth">▶</button>
      <button class="btn btn-secondary today-btn" @click="goToday">今天</button>
    </div>

    <div class="calendar-grid">
      <div class="weekday-label" v-for="d in weekdays" :key="d">{{ d }}</div>
      <div
        v-for="(cell, idx) in calendarCells"
        :key="idx"
        class="day-cell"
        :class="{
          'other-month': !cell.currentMonth,
          'is-today': cell.currentMonth && isToday(currentYear, currentMonth, cell.date),
          'is-selected': cell.currentMonth && selectedDay === cell.date,
          'has-records': cell.currentMonth && getDayCount(cell.date) > 0
        }"
        :style="cell.currentMonth ? heatmapStyle(cell.date) : {}"
        @click="cell.currentMonth && selectDay(cell.date)"
      >
        <span class="day-number">{{ cell.date }}</span>
        <span v-if="cell.currentMonth && getDayCount(cell.date) > 0" class="day-count">
          {{ getDayCount(cell.date) }}
        </span>
      </div>
    </div>

    <div v-if="selectedDay !== null" class="day-detail">
      <div class="detail-header">
        <h4>{{ currentYear }}-{{ pad(currentMonth + 1) }}-{{ pad(selectedDay) }} 养护明细</h4>
        <button class="btn-close-detail" @click="selectedDay = null">×</button>
      </div>
      <div v-if="dayRecords.length === 0" class="empty-day">
        这天没有养护记录
      </div>
      <div v-else class="day-records">
        <div
          v-for="rec in dayRecords"
          :key="rec.id"
          class="day-record-item"
        >
          <span class="record-action-icon" :class="'action-' + rec.action">
            {{ getActionIcon(rec.action) }}
          </span>
          <div class="record-main">
            <div class="record-top">
              <span class="kokedama-name">{{ rec.kokedamaName }}</span>
              <span class="action-type">{{ getActionLabel(rec.action) }}</span>
            </div>
            <div v-if="rec.notes" class="record-note">{{ rec.notes }}</div>
            <div class="record-time">{{ formatDateTime(rec.timestamp) }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue'
import { useKokedamaStore } from '../stores/kokedama'
import { getCalendarDays, isToday, toDateKey, formatDateTime } from '../utils/date'

const store = useKokedamaStore()

const now = new Date()
const currentYear = ref(now.getFullYear())
const currentMonth = ref(now.getMonth())
const selectedDay = ref(null)

const weekdays = ['日', '一', '二', '三', '四', '五', '六']

const calendarCells = computed(() => {
  return getCalendarDays(currentYear.value, currentMonth.value)
})

function prevMonth() {
  selectedDay.value = null
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  } else {
    currentMonth.value--
  }
}

function nextMonth() {
  selectedDay.value = null
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  } else {
    currentMonth.value++
  }
}

function goToday() {
  const t = new Date()
  currentYear.value = t.getFullYear()
  currentMonth.value = t.getMonth()
  selectedDay.value = t.getDate()
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function dateKey(day) {
  return `${currentYear.value}-${pad(currentMonth.value + 1)}-${pad(day)}`
}

function getDayCount(day) {
  const key = dateKey(day)
  const data = store.calendarHeatmapData[key]
  return data ? data.count : 0
}

function heatmapStyle(day) {
  const count = getDayCount(day)
  if (count === 0) return {}
  const maxCount = 10
  const intensity = Math.min(count / maxCount, 1)
  const r = Math.round(16 + (16 - 16) * intensity)
  const g = Math.round(185 + (100 - 185) * intensity)
  const b = Math.round(129 + (70 - 129) * intensity)
  const alpha = 0.15 + intensity * 0.55
  return {
    backgroundColor: `rgba(${r}, ${g}, ${b}, ${alpha})`
  }
}

function selectDay(day) {
  selectedDay.value = selectedDay.value === day ? null : day
}

const dayRecords = computed(() => {
  if (selectedDay.value === null) return []
  const key = dateKey(selectedDay.value)
  const data = store.getRecordsByDate(key)
  return data.records.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
})

const careActions = [
  { value: 'water', label: '浸水', icon: '💧' },
  { value: 'mist', label: '喷雾', icon: '🌫️' },
  { value: 'trim', label: '修剪', icon: '✂️' },
  { value: 'move', label: '移动', icon: '📦' },
  { value: 'check', label: '观察', icon: '🔍' },
  { value: 'other', label: '其他', icon: '📝' }
]

function getActionIcon(action) {
  const found = careActions.find(a => a.value === action)
  return found ? found.icon : '📝'
}

function getActionLabel(action) {
  const found = careActions.find(a => a.value === action)
  return found ? found.label : action
}
</script>

<style scoped>
.care-calendar {
  display: flex;
  flex-direction: column;
  height: 100%;
  overflow: hidden;
  background: white;
}

.calendar-header {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 16px 24px;
  border-bottom: 1px solid #e5e7eb;
  background: #f9fafb;
}

.calendar-header h3 {
  margin: 0;
  font-size: 1.15rem;
  color: #1f2937;
  min-width: 140px;
  text-align: center;
}

.nav-btn {
  padding: 6px 12px;
  font-size: 0.9rem;
}

.today-btn {
  margin-left: auto;
  padding: 6px 14px;
  font-size: 0.85rem;
}

.calendar-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  padding: 12px 16px;
  gap: 4px;
}

.weekday-label {
  text-align: center;
  font-size: 0.8rem;
  font-weight: 600;
  color: #6b7280;
  padding: 8px 0;
}

.day-cell {
  position: relative;
  aspect-ratio: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.15s;
  min-height: 44px;
}

.day-cell.other-month {
  cursor: default;
  opacity: 0.3;
}

.day-cell:not(.other-month):hover {
  box-shadow: 0 0 0 2px #10b981;
}

.day-cell.is-today .day-number {
  font-weight: 700;
  color: #059669;
}

.day-cell.is-today {
  border: 2px solid #10b981;
}

.day-cell.is-selected {
  box-shadow: 0 0 0 2px #059669;
  background: #d1fae5 !important;
}

.day-number {
  font-size: 0.9rem;
  color: #374151;
  line-height: 1;
}

.day-count {
  font-size: 0.65rem;
  color: #059669;
  font-weight: 600;
  margin-top: 2px;
}

.day-detail {
  flex: 1;
  overflow-y: auto;
  border-top: 2px solid #e5e7eb;
  padding: 16px 24px;
  background: #fafbfc;
}

.detail-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 16px;
}

.detail-header h4 {
  margin: 0;
  font-size: 1rem;
  color: #1f2937;
}

.btn-close-detail {
  border: none;
  background: transparent;
  font-size: 1.2rem;
  color: #6b7280;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
}

.btn-close-detail:hover {
  background: #e5e7eb;
}

.empty-day {
  text-align: center;
  color: #9ca3af;
  padding: 32px;
}

.day-records {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.day-record-item {
  display: flex;
  gap: 12px;
  padding: 12px;
  background: white;
  border: 1px solid #e5e7eb;
  border-radius: 8px;
}

.record-action-icon {
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1rem;
  flex-shrink: 0;
}

.record-action-icon.action-water { background: #dbeafe; }
.record-action-icon.action-mist { background: #e0e7ff; }
.record-action-icon.action-trim { background: #fef3c7; }
.record-action-icon.action-move { background: #fce7f3; }
.record-action-icon.action-check { background: #d1fae5; }
.record-action-icon.action-other { background: #e5e7eb; }

.record-main {
  flex: 1;
  min-width: 0;
}

.record-top {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 4px;
}

.kokedama-name {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9rem;
}

.action-type {
  font-size: 0.8rem;
  color: #10b981;
  font-weight: 500;
}

.record-note {
  font-size: 0.85rem;
  color: #4b5563;
  margin-bottom: 4px;
  line-height: 1.4;
}

.record-time {
  font-size: 0.75rem;
  color: #9ca3af;
}
</style>
