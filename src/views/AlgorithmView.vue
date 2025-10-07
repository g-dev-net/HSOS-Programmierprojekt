<script setup lang="ts">
import MainChart from '@/components/MainChart.vue';
import { computed, type Ref, ref, watch } from 'vue';
import { useBanditStore } from '@/stores/bandit';
import Modal from '@/components/Modal.vue';
import stocks from '@/data/aktien.json'
import { generateBernoulliParam, generateGaussianParam } from '@/assets/utils/banditHelpers';
import type { selectedStock, Stock } from '@/types/bandits';
import MainTable from '@/components/MainTable.vue';
import router from '@/router';

// ----------------------- general setup -----------------------
const banditStore = useBanditStore();

function onNavBack() {
  router.push('/')
}

</script>

<template>
  <div class="home-view">
    <!-- Headbar -->
    <div class="main-home-headbar">
      <button class="white-button navBackButton" @click="onNavBack">Zurück</button>
      <div>Vergleich mit Algorithmen</div>
    </div>
    <!-- Content -->
    <div class="home-view-content">
      <!-- Main Content -->
      <div class="main-home-view">
        
        <!-- Hier das Diagramm für den Bandit -->
        <div class="diagramm" ref="diagrammRef">
          <MainChart :data="banditStore.displayData" :activeBandit="banditStore.activeBandit"/>
        </div>
      </div>
      <!-- Sidebar -->
      <div class="sidebar-home-view">
        <div class="sidebar-portfolio">
          <h3>Einstellungen</h3>
        </div>
      </div>
    </div>
  </div>
</template>
<style scoped>
/* Base layout */
.home-view {
  display: flex;
  max-width: 1500px;
  width: 100%;
  flex-direction: column;
}

.main-home-view {
  flex: 3;
  padding: 1rem;
  /* background-color: aqua; */
}

.sidebar-home-view {
  /* background-color: lightpink; */
  flex: 1;
  padding: 1rem;
  border-left: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  align-items: end;
}

.home-view-content {
  display: flex;
  flex-direction: row;
  height: 100%;
  width: 100%;
}

/* Headbar */
.main-home-headbar {
  display: flex;
  flex-direction: row;
}

.navBackButton {
  height: fit-content;
}

.diagramm {
  width: 100%;
  aspect-ratio: 2/1;
  min-height: 200px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

/* Sidebar */
.sidebar-portfolio {
  width: 100%;
}


</style>