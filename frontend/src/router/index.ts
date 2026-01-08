import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '../stores/auth';
import LoginView from '../views/LoginView.vue';
import LoginCallback from '../views/LoginCallbackView.vue';
import DashBoardView from '../views/DashBoardView.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/login',
      name: 'login',
      component: LoginView,
    },
    {
      path: '/login/callback',
      name: 'login-callback',
      component: LoginCallback,
    },
    {
      path: '/',
      name: 'dashboard',
      component: DashBoardView,
      meta: { requiresAuth: true },
    },
  ],
});

//(Navigation Guard)
router.beforeEach((to, from, next) => {
  const authStore = useAuthStore();

  if (to.meta.requiresAuth && !authStore.isAuthenticated) {
    next('/login');
  } else {
    next();
  }
});

export default router;