<template>
  <footer class="app-footer">
    {{ new Date().getFullYear() }} • Programmierprojekt HS Osnabrück
  </footer>
</template>

<script setup lang="ts"></script>

<style scoped>
.app-footer {
  border-top: 1px solid var(--border);
  padding: .75rem 1rem;
  font-size: .9rem;
  opacity: .8;
}
</style>
