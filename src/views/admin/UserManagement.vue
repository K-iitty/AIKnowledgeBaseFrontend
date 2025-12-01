<template>
  <div class="user-management">
    <!-- 搜索栏 -->
    <el-card class="search-card">
      <el-form :inline="true" :model="searchForm">
        <el-form-item label="用户名">
          <el-input v-model="searchForm.username" placeholder="请输入用户名" clearable />
        </el-form-item>
        <el-form-item label="邮箱">
          <el-input v-model="searchForm.email" placeholder="请输入邮箱" clearable />
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="searchForm.status" placeholder="请选择状态" clearable>
            <el-option label="正常" :value="1" />
            <el-option label="禁用" :value="0" />
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
        <el-table-column prop="id" label="ID" width="80" align="center" />
        <el-table-column prop="username" label="用户名" min-width="150" show-overflow-tooltip />
        <el-table-column prop="email" label="邮箱" min-width="220" show-overflow-tooltip />
        <el-table-column prop="phone" label="手机号" width="150" align="center" />
        <el-table-column label="状态" width="100" align="center">
          <template #default="{ row }">
            <el-tag 
              :type="row.status === 1 ? 'success' : 'danger'" 
              size="small"
              effect="plain"
            >
              {{ row.status === 1 ? '正常' : '禁用' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="createdAt" label="注册时间" min-width="180" align="center">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.createdAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column prop="lastLoginAt" label="最后登录" min-width="180" align="center">
          <template #default="{ row }">
            <span class="date-text">{{ formatDate(row.lastLoginAt) }}</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="260" align="center" fixed="right">
          <template #default="{ row }">
            <div class="action-buttons">
              <el-button type="primary" size="small" @click="handleView(row)" :icon="View" plain>查看</el-button>
              <el-button 
                :type="row.status === 1 ? 'warning' : 'success'" 
                size="small"
                @click="handleToggleStatus(row)"
                plain
              >
                {{ row.status === 1 ? '禁用' : '启用' }}
              </el-button>
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

    <!-- 用户详情对话框 -->
    <el-dialog v-model="dialogVisible" title="用户详情" width="600px">
      <el-descriptions :column="2" border v-if="currentUser">
        <el-descriptions-item label="用户ID">{{ currentUser.id }}</el-descriptions-item>
        <el-descriptions-item label="用户名">{{ currentUser.username }}</el-descriptions-item>
        <el-descriptions-item label="邮箱">{{ currentUser.email }}</el-descriptions-item>
        <el-descriptions-item label="手机号">{{ currentUser.phone || '未设置' }}</el-descriptions-item>
        <el-descriptions-item label="状态">
          <el-tag :type="currentUser.status === 1 ? 'success' : 'danger'">
            {{ currentUser.status === 1 ? '正常' : '禁用' }}
          </el-tag>
        </el-descriptions-item>
        <el-descriptions-item label="注册时间">
          {{ formatDate(currentUser.createdAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后登录">
          {{ formatDate(currentUser.lastLoginAt) }}
        </el-descriptions-item>
        <el-descriptions-item label="最后登录IP">
          {{ currentUser.lastLoginIp || '未知' }}
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
const dialogVisible = ref(false)
const currentUser = ref(null)

const searchForm = ref({
  username: '',
  email: '',
  status: null
})

const pagination = ref({
  page: 1,
  size: 10,
  total: 0
})

onMounted(() => {
  loadData()
  
  // 连接 WebSocket 并订阅用户更新（用于管理员操作）
  websocketService.connect().then(() => {
    websocketService.subscribe('note', (data) => {
      // 当有新用户注册或数据变化时刷新
      loadData()
    })
  }).catch(err => {
    console.error('WebSocket 连接失败:', err)
  })
})

onUnmounted(() => {
  websocketService.unsubscribe('note')
})

// 加载数据
const loadData = async () => {
  loading.value = true
  try {
    const { data } = await http.get('/admin/users', {
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
    console.error('加载用户数据失败:', error)
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
    username: '',
    email: '',
    status: null
  }
  pagination.value.page = 1
  loadData()
}

// 查看详情
const handleView = (row) => {
  currentUser.value = row
  dialogVisible.value = true
}

// 切换状态
const handleToggleStatus = async (row) => {
  const action = row.status === 1 ? '禁用' : '启用'
  try {
    await ElMessageBox.confirm(`确定要${action}用户 "${row.username}" 吗？`, '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    
    await http.put(`/admin/users/${row.id}/status`, {
      status: row.status === 1 ? 0 : 1
    })
    
    ElMessage.success(`${action}成功`)
    loadData()
  } catch (error) {
    if (error !== 'cancel') {
      console.error(`${action}失败:`, error)
    }
  }
}

// 删除用户
const handleDelete = async (row) => {
  try {
    await ElMessageBox.confirm(`确定要删除用户 "${row.username}" 吗？此操作不可恢复！`, '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'error'
    })
    
    await http.delete(`/admin/users/${row.id}`)
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
</script>

<style scoped>
  .user-management {
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

.date-text {
  color: #666;
  font-size: 13px;
}

.action-buttons {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.action-buttons .el-button {
  margin: 0;
  padding: 4px 8px;
}

.pagination {
  margin-top: 20px;
  display: flex;
  justify-content: flex-end;
}

.action-buttons .el-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
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
