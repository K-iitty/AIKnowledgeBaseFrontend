<template>
  <div class="note-management">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="标题">
          <el-input v-model="searchForm.title" placeholder="请输入标题" clearable />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="searchForm.author" placeholder="请输入作者" clearable />
        </el-form-item>
        <el-form-item label="分类">
          <el-select v-model="searchForm.categoryId" placeholder="请选择分类" clearable>
            <el-option 
              v-for="cat in categories" 
              :key="cat.id" 
              :label="cat.name" 
              :value="cat.id" 
            />
          </el-select>
        </el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="searchForm.visibility" placeholder="请选择可见性" clearable>
            <el-option label="公开" value="public" />
            <el-option label="私密" value="private" />
          </el-select>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" @click="handleSearch" :icon="Search">搜索</el-button>
          <el-button @click="handleReset" :icon="Refresh">重置</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 数据表格 -->
    <el-card class="table-card">
      <div class="table-wrapper">
        <el-table 
        :data="tableData" 
        v-loading="loading" 
        stripe
        :header-cell-style="{ background: '#fafcff', color: '#333', fontWeight: '600' }"
        :cell-style="{ padding: '16px 0' }"
      >
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="title" label="标题" min-width="140" show-overflow-tooltip />
        <el-table-column label="分类" min-width="130" align="center">
          <template #default="{ row }">
            <el-tag v-if="row.categoryName" size="small" class="category-tag">{{ row.categoryName }}</el-tag>
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="username" label="作者" min-width="110" align="center" />
        <el-table-column label="可见性" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.visibility === 'public' ? 'success' : 'info'" 
              size="small"
              effect="plain"
            >
              {{ row.visibility === 'public' ? '公开' : '私密' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column label="浏览量" width="110" align="center">
          <template #default="{ row }">
            <div class="view-count">
              <el-icon class="view-icon"><View /></el-icon>
              <span>{{ row.views || 0 }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="创建时间" min-width="180" align="center">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="handleView(row)" :icon="View" plain>查看</el-button>
              <el-button type="danger" size="small" @click="handleDelete(row)" :icon="Delete" plain>删除</el-button>
            </div>
          </template>
        </el-table-column>
      </el-table>
      </div>

      <!-- 分页 -->
      <div class="pagination">
        <el-pagination
          v-model:current-page="pagination.page"
          v-model:page-size="pagination.size"
          :page-sizes="[10, 20, 50, 100]"
          :total="pagination.total"
          layout="total, sizes, prev, pager, next, jumper"
          @size-change="loadData"
          @current-change="loadData"
        />
      </div>
    </el-card>

    <!-- 笔记详情对话框 -->
    <el-dialog v-model="dialogVisible" title="笔记详情" width="800px">
      <el-descriptions :column="2" border v-if="currentNote">
        <el-descriptions-item label="ID">{{ currentNote.id }}</el-descriptions-item>
        <el-descriptions-item label="标题">{{ currentNote.title }}</el-descriptions-item>
        <el-descriptions-item label="分类">{{ currentNote.categoryName || '-' }}</el-descriptions-item>
        <el-descriptions-item label="作者">{{ currentNote.username }}</el-descriptions-item>
        <el-descriptions-item label="可见性">
          <el-tag :type="currentNote.visibility === 'public' ? 'success' : 'info'">
            {{ currentNote.visibility === 'public' ? '公开' : '私密' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="浏览量">{{ currentNote.views || 0 }}</el-descriptions-item>
        <el-descriptions-item label="点赞数">{{ currentNote.likes || 0 }}</el-descriptions-item>
        <el-descriptions-item label="创建时间">
          {{ formatDate(currentNote.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="更新时间" :span="2">
          {{ formatDate(currentNote.updatedAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="内容预览" :span="2">
          <div class="content-preview">{{ getContentPreview(currentNote.content) }}</div>
        </el-descriptions-item>
      </el-descriptions>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Search, Refresh, View, Delete } from '@element-plus/icons-vue'
import http from '../../api/http'
import websocketService from '../../utils/websocket'

const loading = ref(false)
const tableData = ref([])
const categories = ref([])
const dialogVisible = ref(false)
const currentNote = ref(null)

const searchForm = ref({
  title: '',
  author: '',
  categoryId: null,
  visibility: null
})

const pagination = ref({
  page: 1,
  size: 10,
  total: 0
})

onMounted(() => {
  loadCategories()
  loadData()
  
  // 连接 WebSocket 并订阅笔记更新
  websocketService.connect().then(() => {
    websocketService.subscribe('note', (data) => {
      console.log('收到笔记更新通知:', data)
      // 自动刷新数据
      loadData()
    })
  }).catch(err => {
    console.error('WebSocket 连接失败:', err)
  })
})

onUnmounted(() => {
  // 取消订阅
  websocketService.unsubscribe('note')
})

// 加载分类
const loadCategories = async () => {
  try {
    const { data } = await http.get('/categories/notes')
    categories.value = data
  } catch (error) {
    console.error('加载分类失败:', error)
    categories.value = [] // 失败时设置为空数组
  }
}

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const { data } = await http.get('/admin/notes', {
      params: {
        page: pagination.value.page,
        size: pagination.value.size,
        ...searchForm.value
      }
    })
    // 处理MyBatis-Plus的IPage返回结构
    if (data.records) {
      tableData.value = data.records
      pagination.value.total = data.total
    } else {
      tableData.value = data
      pagination.value.total = data.length
    }
  } catch (error) {
    console.error('加载笔记数据失败:', error)
  } finally {
    loading.value = false
  }
}

// 搜索
const handleSearch = () => {
  pagination.value.page = 1
  loadData()
}

// 重置
const handleReset = () => {
  searchForm.value = {
    title: '',
    author: '',
    categoryId: null,
    visibility: null
  }
  pagination.value.page = 1
  loadData()
}

// 查看详情
const handleView = async (row) => {
  try {
    const { data } = await http.get(`/notes/${row.id}`)
    currentNote.value = data
    dialogVisible.value = true
  } catch (error) {
    console.error('加载笔记详情失败:', error)
  }
}

// 编辑
const handleEdit = (row) => {
  ElMessage.info('编辑功能开发中...')
  // 可以跳转到编辑页面
  // window.open(`/notes/${row.id}`, '_blank')
}

// 删除笔记
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除笔记 "${row.title}" 吗？此操作不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
    
    await http.delete(`/admin/notes/${row.id}`)
    ElMessage.success('删除成功')
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error('删除失败:', error)
    }
  }
}

// 格式化日期
const formatDate = (date) => {
  if (!date) return '-'
  return new Date(date).toLocaleString('zh-CN')
}

// 获取内容预览
const getContentPreview = (content) => {
  if (!content) return '无内容'
  const text = content.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
  return text.length > 200 ? text.substring(0, 200) + '...' : text
}
</script>

<style scoped>
.note-management {
  padding: 0;
}

.search-card {
  margin-bottom: 16px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(135, 181, 255, 0.08);
}

.table-card {
  min-height: calc(100vh - 250px);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(135, 181, 255, 0.08);
}

.table-card :deep(.el-table) {
  font-size: 14px;
}

.table-card :deep(.el-table th) {
  font-size: 14px;
  letter-spacing: 0.5px;
}

.table-card :deep(.el-table td) {
  font-size: 13px;
}

.table-card :deep(.el-table__row) {
  transition: all 0.3s;
}

.table-card :deep(.el-table__row:hover) {
  background-color: #f5f8ff !important;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.view-count {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: #666;
  font-size: 14px;
}

.view-icon {
  color: #87b5ff;
  font-size: 16px;
}

.date-text {
  color: #666;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.action-buttons .el-button {
  margin: 0;
  border-radius: 6px;
  font-weight: 500;
  transition: all 0.3s;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.content-preview {
  max-height: 200px;
  overflow-y: auto;
  line-height: 1.6;
  color: #666;
}

.category-tag {
  color: #333 !important;
  font-weight: 500;
}

.table-wrapper {
  overflow-x: auto;
  width: 100%;
}

.table-wrapper::-webkit-scrollbar {
  height: 8px;
}

.table-wrapper::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb {
  background: #87b5ff;
  border-radius: 4px;
}

.table-wrapper::-webkit-scrollbar-thumb:hover {
  background: #6a9ff0;
}
</style>
