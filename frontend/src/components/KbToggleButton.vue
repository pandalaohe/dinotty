<template>
  <button

    id="kb-toggle-btn"
    :class="{ active: visible }"
    title="Toggle Keyboard"
    @click="$emit('toggle')"
  >⌨</button>
</template>

<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

defineEmits<{
  toggle: []
}>()
</script>
