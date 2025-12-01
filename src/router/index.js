import { createRouter, createWebHistory } from 'vue-router'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
import MainLayout from '../layouts/MainLayout.vue'
import Notes from '../views/Notes.vue'
import Mindmaps from '../views/Mindmaps.vue'
import Links from '../views/Links.vue'
import Profile from '../views/Profile.vue'
import AIChat from '../views/AIChat.vue'
import NotesDetail from '../views/NotesDetail.vue'
import MindmapDetail from '../views/MindmapDetail.vue'
import Categories from '../views/Categories.vue'
import KnowledgePage from '../views/KnowledgePage.vue'
import EnhancedLinks from '../views/EnhancedLinks.vue'
import KnowledgeBase from '../views/KnowledgeBase.vue'
import KnowledgeContent from '../views/KnowledgeContent.vue'

const routes = [
  { path: '/login', component: Login },
  { path: '/register', component: Register },
  {
    path: '/admin',
    component: () => import('../views/admin/AdminLayout.vue'),
    meta: { requiresAdmin: true },
    redirect: '/admin/dashboard',
    children: [
      {
        path: 'dashboard',
        component: () => import('../views/admin/AdminDashboard.vue'),
        meta: { title: '数据统计', requiresAdmin: true }
      },
      {
        path: 'users',
        component: () => import('../views/admin/UserManagement.vue'),
        meta: { title: '用户管理', requiresAdmin: true }
      },
      {
        path: 'notes',
        component: () => import('../views/admin/NoteManagement.vue'),
        meta: { title: '笔记管理', requiresAdmin: true }
      },
      {
        path: 'mindmaps',
        component: () => import('../views/admin/MindmapManagement.vue'),
        meta: { title: '思维导图管理', requiresAdmin: true }
      },
      {
        path: 'links',
        component: () => import('../views/admin/LinkManagement.vue'),
        meta: { title: '链接管理', requiresAdmin: true }
      }
    ]
  },
  {
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/ai' },
      {
        path: '/notes',
        name: 'Notes',
        component: () => import('@/views/Notes.vue')
      },
      {
        path: '/notes/category/:categoryId',
        name: 'NotesCategory',
        component: () => import('@/views/KnowledgeContent.vue'),
        props: route => ({
          contentType: 'notes',
          categoryId: route.params.categoryId
        })
      },
      {
        path: '/notes/:id',
        name: 'NotesDetail',
        component: () => import('@/views/NotesDetail.vue'),
        props: true
      },
      { path: '/mindmaps', component: Mindmaps, meta: { requiresAuth: true } },
      { path: '/mindmaps/category/:categoryId', component: KnowledgeContent, props: route => ({ contentType: 'mindmaps', categoryId: route.params.categoryId }), meta: { requiresAuth: true } },
      { path: '/ai', component: AIChat, meta: { requiresAuth: true } },
      { path: '/notes/:id', component: NotesDetail, meta: { requiresAuth: true } },
      { path: '/mindmaps/:id', component: MindmapDetail, meta: { requiresAuth: true } },
      { path: '/links', component: EnhancedLinks, meta: { requiresAuth: true } },
      { path: '/links-old', component: Links, meta: { requiresAuth: true } },
      { path: '/profile', component: Profile, meta: { requiresAuth: true } }
    ]
  }
]

const router = createRouter({ history: createWebHistory(), routes })

router.beforeEach((to, from, next) => {
  console.log('路由导航:', from.path, '->', to.path)
  
  // 避免无限循环：如果已经在登录页，不要再重定向到登录页
  if (to.path === '/login' && from.path === '/login') {
    console.log('已在登录页，跳过重定向')
    return next()
  }
  
  // 管理后台路由检查
  if (to.meta.requiresAdmin) {
    const adminToken = localStorage.getItem('admin_token')
    console.log('管理后台路由检查，token:', adminToken ? '存在' : '不存在')
    if (!adminToken) {
      console.log('未登录，跳转到登录页')
      return next('/login')
    }
  }
  
  // 普通用户路由检查
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) {
      console.log('用户未登录，跳转到登录页')
      return next('/login')
    }
  }
  
  console.log('路由检查通过，允许导航')
  next()
})

export default router
