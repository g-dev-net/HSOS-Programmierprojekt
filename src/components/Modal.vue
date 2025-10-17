<template>
  <teleport to="body">
    <transition name="modal-fade" appear>
      <div
        v-if="modelValue"
        class="modal-backdrop"
        :aria-hidden="!modelValue"
        @click="onBackdropClick"
      >
        <div
          class="modal"
          role="dialog"
          aria-modal="true"
          ref="dialogRef"
          @click.stop
        >
          <header class="modal__header">
            <slot name="header">
              <h2 class="modal__title">Modal Title</h2>
            </slot>
            <button
              class="modal__close"
              type="button"
              aria-label="Close"
              @click="close()"
            >
              ×
            </button>
          </header>

          <section class="modal__content">
            <slot></slot>
          </section>

          <footer class="modal__footer">
            <slot name="footer">
              <button class="white-button" type="button" @click="close()">Zurück</button>
            </slot>
          </footer>
        </div>
      </div>
    </transition>
  </teleport>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, watch } from 'vue'

const props = defineProps({
  /** v-model binding to control visibility */
  modelValue: { type: Boolean, default: false },
  /** Close when clicking the shaded backdrop */
  closeOnBackdrop: { type: Boolean, default: true },
  /** Close when pressing Escape */
  closeOnEsc: { type: Boolean, default: true },
})

const emit = defineEmits(['update:modelValue', 'open', 'close'])

const dialogRef = ref(null)
let lastActive = null

function open () {
  emit('open')
  lockScroll(true)
}

function close () {
  emit('update:modelValue', false)
  emit('close')
  lockScroll(false)
}

function onBackdropClick () {
  if (props.closeOnBackdrop) close()
}

function onKeydown (e: KeyboardEvent) {
  if (props.closeOnEsc && e.key === 'Escape') {
    e.preventDefault()
    close()
  }
}

function lockScroll (lock: boolean) {
  const body = document.body
  if (lock) {
    body.dataset.modalScrollLock = 'true'
    body.style.overflow = 'hidden'
  } else {
    delete body.dataset.modalScrollLock
    body.style.overflow = ''
  }
}

watch(() => props.modelValue, (show) => {
  if (show) {
    document.addEventListener('keydown', onKeydown)
    open()
  } else {
    document.removeEventListener('keydown', onKeydown)
  }
})

onMounted(() => {
  if (props.modelValue) {
    document.addEventListener('keydown', onKeydown)
    open()
  }
})

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onKeydown)
  lockScroll(false)
})
</script>

<style scoped>
.modal-backdrop {
  position: fixed;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
}
.modal {
  background: black;
  width: 70vw;
  max-height: 86vh;
  display: grid;
  grid-template-rows: auto 1fr auto;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0,0,0,.2);
  overflow: hidden;
  border: 2px solid gray;

}

@media (max-width: 640px) {
  .modal {
    width: 90vw;
  }
}

.modal__header, .modal__footer {
  padding: 1rem 1.25rem;
  background: black;
}
.modal__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid gray;
}
.modal__title {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 600;
}
.modal__close {
  border: none;
  background: transparent;
  font-size: 1.5rem;
  line-height: 1;
  cursor: pointer;
}
.modal__content {
  padding: 1.25rem;
  overflow: auto;
}

.modal-fade-enter-active,
.modal-fade-leave-active { transition: opacity .15s ease; }
.modal-fade-enter-from,
.modal-fade-leave-to { opacity: 0; }
</style>
