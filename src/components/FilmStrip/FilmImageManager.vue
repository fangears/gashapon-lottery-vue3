<script setup lang="ts">
import FilmStripImagePicker from "./FilmStripImagePicker.vue";
import ScreensaverImagePicker from "./ScreensaverImagePicker.vue";
</script>

<template>
  <div class="film-image-managers">
    <FilmStripImagePicker />
    <ScreensaverImagePicker />
  </div>
</template>

<style scoped>
.film-image-managers {
  display: grid;
  gap: var(--space-xl);
}
</style>
