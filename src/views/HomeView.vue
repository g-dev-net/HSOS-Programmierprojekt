<script setup lang="ts">
  import { type Ref, ref } from 'vue';

  const algorithms = [
    { name: 'Gaussian-Bandit', key: 'gaussian' },
    { name: 'Bernoulli-Bandit', key: 'bernoulli' },
  ];

  const activeAlgorithm: Ref<string> = ref(algorithms[0].key);

</script>

<template>
  <div class="home-view">
    <div class="main-home-view">
      <div class="main-headbar">
        <div class="text-nav-button-group">
          <div 
            v-for="algo in algorithms" 
            class="text-nav-button"
            :key="algo.key"
            :class="{ active: activeAlgorithm === algo.key }"
            @click="activeAlgorithm = algo.key"
          >
            {{ algo.name }}
          </div>
        </div>
        <div class="starting-capital">
          Startkapital: 10.000€
        </div>
      </div>
      <div>

      </div>
    </div>
    <div class="sidebar-home-view">
      <div class="sidebar-headbar">
        <button>Neue Aktie hinzufügen</button>
      </div>
      <div class="sidebar-portfolio">
        <h3>Aktien im Portfolio</h3>
        <div class="sidebar-portfolio-item">
          <div class="sidebar-portfolio-item-title">
            Apple (AAPL)
          </div>
          <div class="sidebar-portfolio-item-info">
            <div class="sidebar-portfolio-item-price">
              <div>H</div>
              <div>40€</div>
            </div>
            <button class="sidebar-portfolio-item-button">
              Invest
            </button>
          </div>
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
  flex-direction: row;
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

/* Main */
.main-headbar {
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  align-items: end;
}

.main-headbar h3 {
  margin: 0;
}

.starting-capital {
  color: var(--text-primary);
  font-weight: bold;
  font-size: xx-large;
}

/* Sidebar */
.sidebar-headbar {
  display: flex;
  justify-content: flex-end;
  align-items: end;
}

.sidebar-portfolio {
  width: 100%;
}

.sidebar-portfolio-item {
  background-color: var(--text-secondary);
  padding: 0.5rem;
  border-radius: 10px;
}

.sidebar-portfolio-item-title {
}

.sidebar-portfolio-item-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.sidebar-portfolio-item-price {
  display: flex;
}

.sidebar-portfolio-item-button {
  
}
</style>