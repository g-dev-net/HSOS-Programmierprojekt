<!-- src/components/MathTex.vue -->
<script setup lang="ts">
import { onMounted, ref, watch, computed } from 'vue';
import katex from 'katex';

const props = withDefaults(defineProps<{
  expr: string
  display?: boolean
}>(), { display: false });

const root = ref<HTMLElement | null>(null);
const isBlock = computed(() => !!props.display);

function render() {
  if (!root.value) return;
  try {
    katex.render(props.expr, root.value, {
      displayMode: props.display,
      throwOnError: false,
      strict: 'warn'
    });
  } catch (e) {
    console.warn('KaTeX render error:', e, props.expr);
  }
}

onMounted(render);
watch(() => props.expr, render);
watch(() => props.display, render);
</script>

<template>
  <component :is="isBlock ? 'div' : 'span'" ref="root" />
</template>
