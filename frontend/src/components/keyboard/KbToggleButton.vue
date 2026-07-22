<template>
  <button
    id="kb-toggle-btn"
    :class="{ active: visible }"
    :title="t('mobileKb.toggleKeyboard')"
    @click="$emit('toggle')"
    @touchend.prevent="$emit('toggle')"
  >
    <Keyboard :size="18" />
  </button>
</template>

<script setup lang="ts">
import { Keyboard } from 'lucide-vue-next'
import { useI18n } from '../../composables/useI18n'

const { t } = useI18n()

defineProps<{
  visible: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
