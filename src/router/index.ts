import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import DefaultLayout from '@/layouts/DefaultLayout.vue';
import HomeView from '@/views/HomeView.vue';
import AboutView from '@/views/AboutView.vue';

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    component: DefaultLayout,
    children: [
      { path: '', name: 'home', component: () => import('@/views/HomeView.vue') },
      { path: 'about', name: 'about', component: () => import('@/views/AboutView.vue') },
    ],
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
