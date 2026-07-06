import type { RouteRecordRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
  }
}

const routes: RouteRecordRaw[] = [
  {
    path: '/login',
    component: () => import('@/pages/auth/LoginPage.vue'),
  },
  {
    path: '/register',
    component: () => import('@/pages/auth/RegisterPage.vue'),
  },

  {
    path: '/',
    component: () => import('@/layouts/MainLayout.vue'),
    children: [
      { path: '', component: () => import('@/pages/IndexPage.vue'), meta: { requiresAuth: true } },
      { path: 'profile', component: () => import('@/pages/ProfilePage.vue'), meta: { requiresAuth: true } },
    ],
  },

  // Always leave this as last one,
  // but you can also remove it
  {
    path: '/:catchAll(.*)*',
    component: () => import('@/pages/ErrorNotFound.vue'),
  },
];

export default routes;
