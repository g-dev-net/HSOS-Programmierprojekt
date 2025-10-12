<template>
  <header class="app-header">
    <img class="logo" src="../assets/AlgoTradeLogo.png" alt="AlgoTrade Logo" />
    <h1>Algo Trade</h1>
  </header>
</template>

<script setup lang="ts"></script>

<style scoped>
.app-header {
  display: flex;
  align-items: center;
  border-bottom: 1px solid var(--border);
  padding: .75rem 1rem;
}

.logo {
  max-height: 4rem;
  display: block;
}

h1 { 
  margin: 0;
  font-size: 1.5rem;
}
</style>
