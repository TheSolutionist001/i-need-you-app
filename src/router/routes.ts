import type { RouteRecordRaw } from 'vue-router';

declare module 'vue-router' {
  interface RouteMeta {
    requiresAuth?: boolean;
    requiresAdmin?: boolean;
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
      { path: 'groups', component: () => import('@/pages/groups/GroupsListPage.vue'), meta: { requiresAuth: true } },
      { path: 'groups/new', component: () => import('@/pages/groups/GroupCreatePage.vue'), meta: { requiresAuth: true } },
      { path: 'groups/join/:id', component: () => import('@/pages/groups/GroupJoinPage.vue'), meta: { requiresAuth: true } },
      { path: 'groups/:id', component: () => import('@/pages/groups/GroupDetailPage.vue'), meta: { requiresAuth: true } },
      { path: 'board', component: () => import('@/pages/board/BoardPage.vue'), meta: { requiresAuth: true } },
      { path: 'board/new', component: () => import('@/pages/board/BoardCreatePage.vue'), meta: { requiresAuth: true } },
      { path: 'admin', component: () => import('@/pages/admin/AdminPage.vue'), meta: { requiresAuth: true, requiresAdmin: true } },
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
