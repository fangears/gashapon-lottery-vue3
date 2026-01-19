<script setup lang="ts">
defineProps<{ active?: boolean }>();
</script>

<template>
  <div class="overlay-mask" :class="{ active }"></div>
</template>

<style scoped>
.overlay-mask {
  position: fixed;
  top: 0; 
  left: 0; 
  width: 100%; 
  height: 100%;
  background: rgba(0,0,0,0.6);
  backdrop-filter: blur(2px);
  z-index: 99;
  opacity: 0;
  pointer-events: none;
  transition: opacity 0.5s;
}

.overlay-mask.active {
  opacity: 1;
  pointer-events: auto;
}
</style>
