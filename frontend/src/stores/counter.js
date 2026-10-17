// Store ตัวอย่างจาก Vue template เดิม ปัจจุบันไม่ได้ใช้กับ flow ร้านค้า
import { ref, computed } from 'vue'
import { defineStore } from 'pinia'

export const useCounterStore = defineStore('counter', () => {
  const count = ref(0)
  const doubleCount = computed(() => count.value * 2)
  function increment() {
    count.value++
  }

  return { count, doubleCount, increment }
})
