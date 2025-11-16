<template>
  <div class="knowledge-page">
    <!-- Page Header -->
    <div class="page-header">
      <h1>我的知识库</h1>
      <p>管理您的笔记和思维导图</p>
    </div>

    <!-- Filter Tabs -->
    <div class="filter-tabs">
      <el-tabs v-model="activeTab" @tab-change="handleTabChange">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="笔记" name="notes" />
        <el-tab-pane label="思维导图" name="mindmaps" />
      </el-tabs>
    </div>

    <!-- Knowledge Categories Component -->
    <KnowledgeCategories 
      :filter-type="activeTab" 
      @category-selected="handleCategorySelect"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import KnowledgeCategories from '@/components/KnowledgeCategories.vue'

const router = useRouter()

// State
const activeTab = ref('all')

// Methods
const handleTabChange = (tab) => {
  // Tab change handled by component prop
}

const handleCategorySelect = (category) => {
  // Navigate to the knowledge content page
  const route = category.type === 'note' 
    ? `/knowledge/notes/${category.id}` 
    : `/knowledge/mindmaps/${category.id}`
  router.push(route)
}
</script>

<style scoped>
.knowledge-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  text-align: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 32px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 8px;
}

.page-header p {
  font-size: 16px;
  color: #909399;
  margin: 0;
}

.filter-tabs {
  margin-bottom: 20px;
}

:deep(.el-tabs__item) {
  font-size: 16px;
  padding: 0 24px;
}

:deep(.el-tabs__item.is-active) {
  color: #409eff;
}

:deep(.el-tabs__active-bar) {
  background-color: #409eff;
}
</style>