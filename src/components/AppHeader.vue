<template>
  <header class="app-header">
    <nav>
      <RouterLink to="/" class="link" exact-active-class="active">Home</RouterLink>
      <RouterLink to="/about" class="link" exact-active-class="active">About</RouterLink>
    </nav>
  </header>
</template>

<script setup lang="ts"></script>

<style scoped>
.app-header {
  border-bottom: 1px solid var(--border);
  padding: .75rem 1rem;
}
.link { margin-right: 1rem; text-decoration: none; }
.active { font-weight: 700; }
</style>
