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
    path: '/',
    component: MainLayout,
    children: [
      { path: '', redirect: '/notes' },
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
  if (to.meta.requiresAuth) {
    const token = localStorage.getItem('token')
    if (!token) return next('/login')
  }
  next()
})

export default router
