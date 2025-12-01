<template>
  <el-container class="admin-layout">
    <el-aside width="240px" class="admin-aside">
      <div class="logo">
        <h2>管理后台</h2>
      </div>
      
      <el-menu
        :default-active="activeMenu"
        class="admin-menu"
        router
      >
        <el-menu-item index="/admin/dashboard">
          <el-icon><DataAnalysis /></el-icon>
          <span>数据统计</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/users">
          <el-icon><User /></el-icon>
          <span>用户管理</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/notes">
          <el-icon><Document /></el-icon>
          <span>笔记管理</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/mindmaps">
          <el-icon><Share /></el-icon>
          <span>思维导图管理</span>
        </el-menu-item>
        
        <el-menu-item index="/admin/links">
          <el-icon><Link /></el-icon>
          <span>链接管理</span>
        </el-menu-item>
      </el-menu>
    </el-aside>
    
    <el-container>
      <el-header class="admin-header">
        <div class="header-left">
          <span class="page-title">{{ pageTitle }}</span>
        </div>
        
        <div class="header-right">
          <el-dropdown @command="handleCommand">
            <span class="admin-info">
              <el-avatar :size="32" :src="adminInfo.avatarUrl || '/default-avatar.png'" />
              <span class="admin-name">{{ adminInfo.nickname || adminInfo.username }}</span>
              <el-icon><ArrowDown /></el-icon>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <!-- <el-dropdown-item command="profile">个人信息</el-dropdown-item> -->
                <el-dropdown-item command="logout" divided>退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>
      
      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>
  </el-container>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { DataAnalysis, User, Document, Share, Link, ArrowDown } from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

const adminInfo = ref({})

const activeMenu = computed(() => route.path)

const pageTitle = computed(() => {
  const titles = {
    '/admin/dashboard': '数据统计',
    '/admin/users': '用户管理',
    '/admin/notes': '笔记管理',
    '/admin/mindmaps': '思维导图管理',
    '/admin/links': '链接管理'
  }
  return titles[route.path] || '管理后台'
})

onMounted(() => {
  // 从localStorage获取管理员信息
  const info = localStorage.getItem('admin_info')
  if (info) {
    adminInfo.value = JSON.parse(info)
  }
})

const handleCommand = (command) => {
  if (command === 'logout') {
    ElMessageBox.confirm('确定要退出登录吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }).then(() => {
      localStorage.removeItem('admin_token')
      localStorage.removeItem('admin_info')
      ElMessage.success('已退出登录')
      router.push('/login')
    })
  } else if (command === 'profile') {
    ElMessage.info('个人信息功能开发中...')
  }
}
</script>

<style scoped>
.admin-layout {
  height: 100vh;
}

.admin-aside {
  background: linear-gradient(180deg, #87b5ff 0%, #6a9fff 100%);
  color: white;
  box-shadow: 2px 0 8px rgba(135, 181, 255, 0.15);
}

.logo {
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid rgba(255, 255, 255, 0.2);
  background: rgba(255, 255, 255, 0.1);
}

.logo h2 {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: white;
  text-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
}

.admin-menu {
  border-right: none;
  background: transparent;
}

.admin-menu :deep(.el-menu-item) {
  color: rgba(255, 255, 255, 0.85);
  margin: 4px 8px;
  border-radius: 8px;
  transition: all 0.3s;
}

.admin-menu :deep(.el-menu-item:hover) {
  color: white;
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(4px);
}

.admin-menu :deep(.el-menu-item.is-active) {
  color: #87b5ff;
  background: white;
  font-weight: 600;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.admin-menu :deep(.el-menu-item .el-icon) {
  color: inherit;
}

.admin-header {
  background: white;
  border-bottom: 1px solid #e8f0ff;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 24px;
  box-shadow: 0 2px 8px rgba(135, 181, 255, 0.08);
}

.header-left .page-title {
  font-size: 18px;
  font-weight: 600;
  color: #333;
  background: linear-gradient(135deg, #87b5ff 0%, #6a9fff 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}

.header-right {
  display: flex;
  align-items: center;
}

.admin-info {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 8px 16px;
  border-radius: 8px;
  transition: all 0.3s;
  border: 1px solid transparent;
}

.admin-info:hover {
  background: #f0f7ff;
  border-color: #87b5ff;
}

.admin-name {
  font-size: 14px;
  color: #333;
  font-weight: 500;
}

.admin-main {
  background: #f5f8ff;
  padding: 24px;
}
</style>
