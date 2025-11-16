<template>
  <div class="links-page">
    <div class="page-header">
      <!-- <h2>常用推荐</h2> -->
      <el-button type="primary" @click="openAddCategory" class="add-btn">
        <el-icon><Plus /></el-icon>
        新增分类
      </el-button>
    </div>

    <div class="category-sections">
      <div v-for="category in categories" :key="category.id" class="category-section">
        <div class="section-header">
          <h2 class="section-title">{{ category.name }}</h2>
          <div class="section-actions">
            <el-button size="small" @click="openAddFor(category)">
              <el-icon><Plus /></el-icon>
              新增链接
            </el-button>
          </div>
        </div>
        <div class="links-grid">
          <div 
            v-for="link in linksByCategory(category.id)" 
            :key="link.id"
            class="link-card"
            @mouseenter="hoveredLink = link.id"
            @mouseleave="hoveredLink = null"
          >
            <div class="link-icon" :style="getIconStyle(link)">
              <span v-if="link.icon">{{ link.icon }}</span>
              <el-icon v-else :size="24"><Link /></el-icon>
            </div>
            <div class="link-info" @click="openLink(link.url)">
              <h3 class="link-title">{{ link.title }}</h3>
              <p class="link-url">{{ formatUrl(link.url) }}</p>
              <p class="link-remark" v-if="link.remark">{{ link.remark }}</p>
            </div>
            <div class="link-actions">
              <el-dropdown trigger="click" @command="handleAction($event, link)">
                <el-button 
                  link
                  class="action-btn"
                  :style="{ opacity: hoveredLink === link.id ? 1 : 0.6 }"
                >
                  <el-icon><MoreFilled /></el-icon>
                </el-button>
                <template #dropdown>
                  <el-dropdown-menu>
                    <el-dropdown-item command="edit">
                      <el-icon><Edit /></el-icon>
                      编辑
                    </el-dropdown-item>
                    <el-dropdown-item command="delete" divided>
                      <el-icon><Delete /></el-icon>
                      删除
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
        </div>
        <div v-if="linksByCategory(category.id).length === 0" class="empty-state">
          <el-empty description="该分类暂无链接" />
        </div>
      </div>
    </div>

    <!-- Add/Edit Link Dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingLink ? '编辑链接' : '新增链接'"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="linkForm" label-width="80px" ref="linkFormRef">
        <el-form-item label="标题" prop="title" required>
          <el-input v-model="linkForm.title" placeholder="请输入链接标题" />
        </el-form-item>
        <el-form-item label="网址" prop="url" required>
          <el-input v-model="linkForm.url" placeholder="https://example.com" />
        </el-form-item>
        <el-form-item label="图标" prop="icon">
          <div class="icon-selection">
            <el-popover
              placement="bottom"
              trigger="click"
              width="487"
            >
              <template #reference>
                <el-input 
                  v-model="linkForm.icon" 
                  placeholder="点击选择图标或输入自定义图标" 
                  readonly
                >
                  <template #suffix>
                    <span v-if="linkForm.icon">{{ linkForm.icon }}</span>
                    <el-icon v-else><Link /></el-icon>
                  </template>
                </el-input>
              </template>
              
              <div class="icon-picker">
                <div class="icon-grid">
                  <div 
                    v-for="icon in availableIcons" 
                    :key="icon" 
                    class="icon-item"
                    :class="{ selected: linkForm.icon === icon }"
                    @click="selectIcon(icon)"
                  >
                    {{ icon }}
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </el-form-item>
        <el-form-item label="备注" prop="remark">
          <el-input v-model="linkForm.remark" type="textarea" placeholder="添加备注说明" />
        </el-form-item>
        <el-form-item label="排序" prop="orderIndex">
          <el-input-number v-model="linkForm.orderIndex" :min="0" :max="999" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveLink">保存</el-button>
      </template>
    </el-dialog>
    
    <!-- Add Category Dialog -->
    <el-dialog
      v-model="showAddCategoryDialog"
      title="新增分类"
      width="500px"
    >
      <el-form :model="categoryForm" label-width="80px">
        <el-form-item label="分类名称" prop="name" required>
          <el-input v-model="categoryForm.name" placeholder="请输入分类名称" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddCategoryDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/api/http'
import {
  Plus,
  Link,
  MoreFilled,
  Edit,
  Delete,
  Monitor,
  VideoPlay,
  Search
} from '@element-plus/icons-vue'

// State
const categories = ref([])
const links = ref([])
const hoveredLink = ref(null)
const showAddDialog = ref(false)
const showAddCategoryDialog = ref(false)
const editingLink = ref(null)
const currentCategory = ref(null)

// Predefined icons
const availableIcons = ref([
  '🫧', '💧', '🤍', '❕', '❔', '💬', '🎧', '🧻', '💭', '🐇', 
  '🦴', '🦢', '🕊️', '🐁', '☁️', '🦴', '🥛', '🏐', '🖱️', '⌨️', '📄', '🗒️', '⚪️', '🕐'
])

// Form
const linkForm = ref({
  title: '',
  url: '',
  categoryId: null,
  icon: '',
  remark: '',
  orderIndex: 0
})

const categoryForm = ref({
  name: ''
})

function linksByCategory(categoryId){
  return links.value
    .filter(l => l.categoryId === categoryId)
    .sort((a,b)=> (a.orderIndex||0) - (b.orderIndex||0))
}

// Methods
const loadCategories = async () => {
  try {
    const { data } = await http.get('/categories/links')
    categories.value = data
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

const loadLinks = async () => {
  try {
    const { data } = await http.get('/links/list')
    links.value = data.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0))
  } catch (error) {
    ElMessage.error('加载链接失败')
  }
}

function openAddCategory(){
  categoryForm.value = { name: '' }
  showAddCategoryDialog.value = true
}

function openAddFor(category){
  editingLink.value = null
  currentCategory.value = category
  linkForm.value = {
    title: '',
    url: '',
    categoryId: category.id,
    icon: '',
    remark: '',
    orderIndex: 0
  }
  showAddDialog.value = true
}

const openLink = (url) => {
  window.open(url, '_blank')
}

const formatUrl = (url) => {
  try {
    const urlObj = new URL(url)
    return urlObj.hostname
  } catch {
    return url
  }
}

const isEmoji = (str) => {
  return /[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/u.test(str)
}

const getIconStyle = (link) => {
  const colors = [
    '#409eff', '#67c23a', '#e6a23c', '#f56c6c', '#909399',
    '#00c0ef', '#dd4b39', '#3c8dbc', '#f39c12', '#d81b60'
  ]
  const colorIndex = (link.id || 0) % colors.length
  
  return {
    backgroundColor: colors[colorIndex] + '20',
    color: colors[colorIndex]
  }
}

const handleAction = (command, link) => {
  switch (command) {
    case 'edit':
      editLink(link)
      break
    case 'delete':
      deleteLink(link)
      break
  }
}

const editLink = (link) => {
  editingLink.value = link
  currentCategory.value = categories.value.find(c => c.id === link.categoryId)
  linkForm.value = {
    title: link.title,
    url: link.url,
    categoryId: link.categoryId,
    icon: link.icon || '',
    remark: link.remark || '',
    orderIndex: link.orderIndex || 0
  }
  showAddDialog.value = true
}

const deleteLink = async (link) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除链接 "${link.title}" 吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    await http.delete(`/links/${link.id}`)
    ElMessage.success('删除成功')
    loadLinks()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const saveLink = async () => {
  try {
    if (editingLink.value) {
      await http.put(`/links/${editingLink.value.id}`, linkForm.value)
      ElMessage.success('更新成功')
    } else {
      await http.post('/links', linkForm.value)
      ElMessage.success('添加成功')
    }
    
    showAddDialog.value = false
    resetForm()
    loadLinks()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

const saveCategory = async () => {
  try {
    await http.post('/categories/links', { name: categoryForm.value.name })
    ElMessage.success('分类创建成功')
    showAddCategoryDialog.value = false
    loadCategories()
  } catch (error) {
    ElMessage.error('分类创建失败')
  }
}

const selectIcon = (icon) => {
  linkForm.value.icon = icon
}

const resetForm = () => {
  editingLink.value = null
  currentCategory.value = null
  linkForm.value = {
    title: '',
    url: '',
    categoryId: null,
    icon: '',
    remark: '',
    orderIndex: 0
  }
}

// Lifecycle
onMounted(() => {
  loadCategories()
  loadLinks()
})
</script>

<style scoped>
.links-page {
  padding: 20px;
  max-width: 1400px;
  margin: 0 auto;
}

.page-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30px;
}

.page-header h1 {
  font-size: 28px;
  font-weight: 600;
  color: #303133;
  margin: 0;
}

.add-btn {
  display: flex;
  align-items: center;
  gap: 8px;
}

.category-sections{display:flex;flex-direction:column;gap:24px}
.category-section{background:#fff;border-radius:12px;padding:16px;border:1px solid #ebeef5}
.section-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:12px}
.section-title{margin:0;font-size:18px;font-weight:600;color:#303133}

.links-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 16px;
  margin-bottom: 30px;
}

.link-card {
  display: flex;
  align-items: center;
  padding: 16px;
  background: #ffffff;
  border-radius: 12px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.link-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.12);
}

.link-icon {
  width: 48px;
  height: 48px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  margin-right: 12px;
  flex-shrink: 0;
}

.link-info {
  flex: 1;
  min-width: 0;
}

.link-title {
  font-size: 16px;
  font-weight: 500;
  color: #303133;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-url {
  font-size: 13px;
  color: #909399;
  margin: 0 0 4px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-remark {
  font-size: 12px;
  color: #c0c4cc;
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.link-actions {
  flex-shrink: 0;
  margin-left: 8px;
}

.action-btn {
  padding: 8px;
  border-radius: 50%;
  transition: all 0.3s ease;
}

.action-btn:hover {
  background-color: #f5f7fa;
}

.empty-state {
  text-align: center;
  padding: 60px 20px;
}

/* Icon selection styles */
.icon-selection {
  width: 100%;
}

.icon-picker {
  padding: 10px;
}

.icon-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 10px;
}

.icon-item {
  font-size: 20px;
  text-align: center;
  padding: 15px 5px;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background-color: #f5f7fa;
}

.icon-item:hover {
  background-color: #ecf5ff;
  transform: scale(1.1);
}

.icon-item.selected {
  background-color: #409eff;
  color: white;
  transform: scale(1.1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .links-page {
    padding: 16px;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .category-tabs {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .tab-list {
    width: 100%;
    justify-content: flex-start;
  }
  
  .links-grid {
    grid-template-columns: 1fr;
  }
  
  .link-card {
    padding: 12px;
  }
  
  .link-icon {
    width: 40px;
    height: 40px;
    font-size: 20px;
  }
  
  .icon-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

@media (max-width: 480px) {
  .links-grid {
    gap: 12px;
  }
  
  .link-card {
    flex-direction: column;
    text-align: center;
  }
  
  .link-icon {
    margin-right: 0;
    margin-bottom: 8px;
  }
  
  .link-actions {
    position: absolute;
    top: 8px;
    right: 8px;
    margin: 0;
  }
  
  .icon-grid {
    grid-template-columns: repeat(4, 1fr);
  }
  
  .icon-item {
    padding: 10px;
  }
}
</style>