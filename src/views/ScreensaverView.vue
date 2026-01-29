<template>
  <main class="page-container screensaver-page">
    <span class="screensaver-hint">按 ESC 退出</span>
  </main>
</template>

<style scoped>
.screensaver-page {
  width: 100%;
  height: 100vh;
  background: transparent;
  position: relative;
}

.screensaver-hint {
  position: absolute;
  bottom: 24px;
  left: 50%;
  transform: translateX(-50%);
  font-size: 0.85rem;
  color: rgba(255, 255, 255, 0.5);
}
</style>
