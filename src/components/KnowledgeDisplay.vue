<template>
  <div class="knowledge-display">
    <!-- Layout Toggle -->
    <div class="layout-toggle">
      <el-button-group>
        <el-button 
          :type="layout === 'card' ? 'primary' : 'default'" 
          @click="layout = 'card'"
          size="small"
        >
          <el-icon><Grid /></el-icon>
          卡片视图
        </el-button>
        <el-button 
          :type="layout === 'list' ? 'primary' : 'default'" 
          @click="layout = 'list'"
          size="small"
        >
          <el-icon><List /></el-icon>
          列表视图
        </el-button>
      </el-button-group>
    </div>

    <!-- Card Layout -->
    <div v-if="layout === 'card'" class="card-layout">
      <el-row :gutter="24">
        <el-col 
          v-for="(item, idx) in pagedItems" 
          :key="item.id" 
          :xs="24" 
          :sm="12" 
          :md="8" 
          :lg="8" 
          :xl="6"
        >
          <el-card shadow="hover" class="knowledge-card" @click="handleItemClick(item)">
            <template #header>
              <div class="card-header">
                <span class="card-title">{{ item.title }}</span>
                <el-tag 
                  :type="item.type === 'note' ? 'primary' : 'success'" 
                  size="small"
                >
                  {{ item.type === 'note' ? '笔记' : '思维导图' }}
                </el-tag>
              </div>
            </template>
            
            <div class="card-cover">
              <div class="cover-placeholder" :style="getCoverStyle(item)">
                <el-icon size="32">
                  <Document v-if="item.type === 'note'" />
                  <Connection v-else />
                </el-icon>
              </div>
            </div>
            
            <div class="card-description">{{ item.description || '暂无描述' }}</div>
            
            <div class="card-meta">
              <span class="meta-item">
                <el-icon><Star /></el-icon>
                <span>{{ item.likes || 0 }} 赞</span>
              </span>
              <span class="meta-item">
                <el-icon><View /></el-icon>
                <span>{{ item.views || 0 }} 浏览</span>
              </span>
              <span class="meta-item">
                <el-icon><Calendar /></el-icon>
                <span>{{ formatDate(item.createdAt) }}</span>
              </span>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </div>

    <!-- List Layout -->
    <div v-else class="list-layout">
      <el-card class="list-card">
        <el-table :data="pagedItems" style="width: 100%" @row-click="handleItemClick">
          <el-table-column prop="title" label="标题" min-width="200">
            <template #default="{ row }">
              <div class="list-title">
                <el-icon class="type-icon">
                  <Document v-if="row.type === 'note'" />
                  <Connection v-else />
                </el-icon>
                <span>{{ row.title }}</span>
                <el-tag 
                  :type="row.type === 'note' ? 'primary' : 'success'" 
                  size="small"
                  style="margin-left: 8px;"
                >
                  {{ row.type === 'note' ? '笔记' : '思维导图' }}
                </el-tag>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="description" label="描述" min-width="300">
            <template #default="{ row }">
              <div class="list-description">{{ row.description || '暂无描述' }}</div>
            </template>
          </el-table-column>
          
          <el-table-column label="统计" width="200" align="center">
            <template #default="{ row }">
              <div class="list-stats">
                <span class="stat-item">
                  <el-icon><Star /></el-icon>
                  {{ row.likes || 0 }}
                </span>
                <span class="stat-item">
                  <el-icon><View /></el-icon>
                  {{ row.views || 0 }}
                </span>
              </div>
            </template>
          </el-table-column>
          
          <el-table-column prop="createdAt" label="创建时间" width="180" align="center">
            <template #default="{ row }">
              {{ formatDate(row.createdAt) }}
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </div>

    <!-- Pagination -->
    <div class="pagination-wrap">
      <el-pagination
        v-model:current-page="currentPage"
        :page-size="pageSize"
        :total="totalItems"
        layout="total, prev, pager, next, jumper"
        background
        @current-change="handlePageChange"
      />
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import http from '@/api/http'
import { ElMessage } from 'element-plus'
import {
  Grid,
  List,
  Document,
  Connection,
  Star,
  View,
  Calendar
} from '@element-plus/icons-vue'

const props = defineProps({
  type: {
    type: String,
    default: 'all', // 'all', 'notes', 'mindmaps'
  },
  categoryId: {
    type: [String, Number],
    default: null
  }
})

const router = useRouter()

// State
const layout = ref('card') // 'card' or 'list'
const items = ref([])
const loading = ref(false)
const currentPage = ref(1)
const pageSize = ref(12)

// Computed
const totalItems = computed(() => items.value.length)

const pagedItems = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  const end = start + pageSize.value
  return items.value.slice(start, end)
})

// Methods
const fetchData = async () => {
  loading.value = true
  try {
    const promises = []
    
    if (props.type === 'all' || props.type === 'notes') {
      promises.push(fetchNotes())
    }
    if (props.type === 'all' || props.type === 'mindmaps') {
      promises.push(fetchMindmaps())
    }
    
    const results = await Promise.all(promises)
    const allItems = results.flat()
    
    // Sort by creation time (newest first)
    allItems.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    
    items.value = allItems
  } catch (error) {
    ElMessage.error('获取数据失败')
    console.error('Fetch data error:', error)
  } finally {
    loading.value = false
  }
}

const fetchNotes = async () => {
  try {
    const response = await http.get('/notes', {
      params: {
        categoryId: props.categoryId,
        keyword: ''
      }
    })
    return response.data.map(note => ({
      ...note,
      type: 'note'
    }))
  } catch (error) {
    console.error('Fetch notes error:', error)
    return []
  }
}

const fetchMindmaps = async () => {
  try {
    const response = await http.get('/mindmaps', {
      params: {
        categoryId: props.categoryId,
        keyword: ''
      }
    })
    return response.data.map(mindmap => ({
      ...mindmap,
      type: 'mindmap'
    }))
  } catch (error) {
    console.error('Fetch mindmaps error:', error)
    return []
  }
}

const getCoverStyle = (item) => {
  const colors = [
    'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
    'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
    'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)',
    'linear-gradient(135deg, #fa709a 0%, #fee140 100%)',
    'linear-gradient(135deg, #a8edea 0%, #fed6e3 100%)'
  ]
  const colorIndex = item.id % colors.length
  return {
    background: colors[colorIndex]
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const handleItemClick = (item) => {
  const route = item.type === 'note' ? '/notes/' : '/mindmaps/'
  router.push(route + item.id)
}

const handlePageChange = (page) => {
  currentPage.value = page
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

// Lifecycle
onMounted(() => {
  fetchData()
})
</script>

<style scoped>
.knowledge-display {
  padding: 20px;
}

.layout-toggle {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

/* Card Layout Styles */
.card-layout {
  margin-bottom: 20px;
}

.knowledge-card {
  margin-bottom: 24px;
  border-radius: 12px;
  transition: all 0.3s ease;
  cursor: pointer;
  overflow: hidden;
}

.knowledge-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
}

.card-title {
  font-weight: 600;
  font-size: 16px;
  color: #303133;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  flex: 1;
  margin-right: 10px;
}

.card-cover {
  margin: 0 20px;
}

.cover-placeholder {
  width: 100%;
  height: 120px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 32px;
  margin-bottom: 16px;
}

.card-description {
  margin: 0 20px 16px;
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
  min-height: 40px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.card-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-top: 1px solid #EBEEF5;
  background-color: #fafafa;
}

.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  color: #909399;
  font-size: 13px;
}

/* List Layout Styles */
.list-layout {
  margin-bottom: 20px;
}

.list-card {
  border-radius: 12px;
  overflow: hidden;
}

.list-title {
  display: flex;
  align-items: center;
  gap: 8px;
}

.type-icon {
  color: #409eff;
}

.list-description {
  color: #606266;
  font-size: 14px;
  line-height: 1.5;
}

.list-stats {
  display: flex;
  justify-content: center;
  gap: 16px;
}

.stat-item {
  display: inline-flex;
  align-items: center;
  gap: 4px;
  color: #909399;
  font-size: 13px;
}

/* Pagination Styles */
.pagination-wrap {
  display: flex;
  justify-content: center;
  margin-top: 30px;
}

:deep(.el-pagination.is-background .el-pager li:not(.disabled).is-active) {
  background-color: #409eff;
}

:deep(.el-pagination.is-background .el-pager li:not(.disabled):hover) {
  color: #409eff;
}

/* Responsive Design */
@media (max-width: 768px) {
  .knowledge-display {
    padding: 10px;
  }
  
  .layout-toggle {
    justify-content: center;
  }
  
  .card-meta {
    flex-direction: column;
    gap: 8px;
    align-items: flex-start;
  }
}
</style>