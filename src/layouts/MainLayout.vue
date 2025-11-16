<template>
  <div class="layout-root">
    <el-container style="height:100vh">
      <el-header class="layout-header">
        <div class="header-content">
          <div class="brand">AI 知识库</div>
          <el-tabs class="navigation-tabs" v-model="activeTab" @tab-change="onTabChange">
            <el-tab-pane label="AI 问答" name="ai" />
            <el-tab-pane label="笔记管理" name="notes" />
            <el-tab-pane label="思维导图管理" name="mindmaps" />
            <el-tab-pane label="链接管理" name="links" />
            <!-- <el-tab-pane label="个人信息" name="profile" /> -->
          </el-tabs>
        </div>
        <div class="actions">
          <el-button class="btn-white" @click="logout">退出登录</el-button>
        </div>
      </el-header>
      <el-main class="layout-main">            
        <div class="tab-content">
          <router-view />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { useRouter, useRoute } from 'vue-router'
import { computed } from 'vue'
const router = useRouter()
const route = useRoute()
const pathToTab = (path) => {
  if (path.startsWith('/ai')) return 'ai'
  if (path.startsWith('/profile')) return 'profile'
  if (path.startsWith('/links')) return 'links'
  if (path.startsWith('/mindmaps')) return 'mindmaps'
  return 'notes'
}
const activeTab = computed({
  get() { return pathToTab(route.path) },
  set(name) {
    const map = { notes: '/notes', ai: '/ai', profile: '/profile', links: '/links', mindmaps: '/mindmaps' }
    router.push(map[name] || '/notes')
  }
})
function logout() {
  localStorage.removeItem('token')
  router.push('/login')
}
function onTabChange() {}
</script>

<style scoped>
.layout-header {
  display: flex;
  align-items: center;
  padding: 0 16px;
  border-bottom: 1px solid #eaecef;
  background: #ffffff;
  justify-content: space-between;
}

.header-content {
  display: flex;
  align-items: center;
  gap: 30px;
}

.brand {
  font-weight: 600;
  font-size: 18px;
  color: #333;
  white-space: nowrap;
}

.navigation-tabs {
  flex: 1;
}

.navigation-tabs :deep(.el-tabs__header) {
  margin-bottom: 0;
}

.navigation-tabs :deep(.el-tabs__nav-wrap)::after {
  display: none;
}

.navigation-tabs :deep(.el-tabs__item) {
  font-size: 14px;
  padding: 0 15px;
}

/* 选中标签的文字颜色和底部边框 */
.navigation-tabs :deep(.el-tabs__item.is-active) {
  color: #b0d9fe;
}

.navigation-tabs :deep(.el-tabs__active-bar) {
  background-color: #b0d9fe;
}

.spacer {
  flex: 1;
}

.layout-main {
  background: #ffffff;
  padding: 0px;
  height: 100%;
  overflow: auto;
}

.tab-content {
  margin-top: 0px;
  height: 100%;
}
</style>
