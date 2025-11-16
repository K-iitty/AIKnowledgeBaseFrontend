<template>
  <div class="knowledge-categories">
    <!-- Header -->
    <div class="page-header">
      <h1>全部知识库</h1>
      <el-button link @click="openSettings">
        <el-icon><Setting /></el-icon>
      </el-button>
    </div>

    <!-- Category Cards Grid -->
    <div class="categories-grid">
      <div 
        v-for="category in filteredCategories" 
        :key="category.id"
        class="category-card"
        :class="{ 'has-badge': category.badgeText }"
        @click="enterCategory(category)"
        @mouseenter="hoveredCard = category.id"
        @mouseleave="hoveredCard = null"
      >
        <!-- Badge -->
        <div v-if="category.badgeText" class="category-badge">
          {{ category.badgeText }}
        </div>

        <!-- Card Background -->
        <div 
          class="card-background" 
          :style="getCardBackground(category)"
        >
          <!-- Cover Image or Icon -->
          <div class="card-cover">
            <div v-if="category.coverKey" class="cover-image">
              <img :src="getCoverUrl(category.coverKey)" :alt="category.name" />
            </div>
            <div v-else class="cover-placeholder" :style="getPlaceholderStyle(category)">
              <el-icon :size="48" v-if="!category.icon">
                <Folder v-if="category.type === 'note'" />
                <Connection v-else />
              </el-icon>
              <span v-else class="category-icon">{{ category.icon }}</span>
            </div>
          </div>

          <!-- Hover Overlay -->
          <div class="hover-overlay" :class="{ active: hoveredCard === category.id }">
            <div class="overlay-content">
              <el-button type="primary" size="small" @click.stop="enterCategory(category)">
                进入知识库
              </el-button>
              <div class="item-count">
                {{ category.itemCount || 0 }} 个项目
              </div>
              <!-- 单个分类操作按钮 -->
              <div class="category-actions">
                <el-button 
                  type="warning" 
                  size="small" 
                  @click.stop="editCategory(category)"
                  class="action-btn"
                >
                  <el-icon><Edit /></el-icon>修改
                </el-button>
                <el-button 
                  type="danger" 
                  size="small" 
                  @click.stop="deleteCategory(category)"
                  class="action-btn"
                >
                  <el-icon><Delete /></el-icon>删除
                </el-button>
              </div>
            </div>
          </div>
        </div>

        <!-- Card Content -->
        <div class="card-content">
          <h3 class="category-title">{{ category.name }}</h3>
          <p v-if="category.description" class="category-description">
            {{ category.description }}
          </p>
          <div class="category-meta">
            <span class="meta-item">
              <el-icon><Document /></el-icon>
              {{ category.type === 'note' ? '笔记' : '思维导图' }}
            </span>
            <span class="meta-item">
              <el-icon><View /></el-icon>
              {{ category.itemCount || 0 }}
            </span>
          </div>
        </div>
      </div>

      <!-- Add New Category Card -->
      <div class="add-category-card" @click="showAddDialog = true">
        <div class="add-content">
          <el-icon :size="32"><Plus /></el-icon>
          <span>新建知识库</span>
        </div>
      </div>
    </div>

    <!-- Settings Dialog -->
    <el-dialog
      v-model="showSettings"
      :title="filterType === 'notes' ? '批量删除笔记文件夹' : '批量删除思维导图文件夹'"
      width="600px"
    >
      <el-alert 
        :title="`将删除选中的${filterType === 'notes' ? '笔记' : '思维导图'}文件夹及其内部所有内容，请谨慎操作！`" 
        type="warning" 
        show-icon
        style="margin-bottom: 20px;"
      />
      <el-checkbox-group v-model="selectedCategoriesForDeletion">
        <div class="category-checkbox-group">
          <el-checkbox 
            v-for="category in filteredCategories" 
            :key="category.id" 
            :label="category.id"
            class="category-checkbox"
          >
            {{ category.name }}
          </el-checkbox>
        </div>
      </el-checkbox-group>
      <template #footer>
        <el-button @click="showSettings = false">取消</el-button>
        <el-button 
          type="danger" 
          @click="confirmBatchDelete" 
          :disabled="selectedCategoriesForDeletion.length === 0"
        >
          批量删除 ({{ selectedCategoriesForDeletion.length }})
        </el-button>
      </template>
    </el-dialog>

    <!-- Add/Edit Category Dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingCategory ? '编辑知识库' : '新建知识库'"
      width="500px"
      @close="resetForm"
    >
      <el-form :model="categoryForm" label-width="80px" ref="categoryFormRef">
        <el-form-item label="名称" prop="name" required>
          <el-input v-model="categoryForm.name" placeholder="请输入知识库名称" />
        </el-form-item>
        <div style="display: none;">
          <input type="hidden" v-model="categoryForm.type" />
        </div>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="categoryForm.description" 
            type="textarea" 
            placeholder="添加描述信息"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="可见性" prop="visibility">
          <el-select v-model="categoryForm.visibility">
            <el-option label="私有" value="private" />
            <el-option label="公开" value="public" />
            <el-option label="企业" value="enterprise" />
          </el-select>
        </el-form-item>
        <el-form-item label="徽章文字" prop="badgeText">
          <el-input v-model="categoryForm.badgeText" placeholder="如：企业公开" />
        </el-form-item>
        <el-form-item label="背景样式" prop="backgroundStyle">
          <el-select v-model="categoryForm.backgroundStyle" placeholder="选择背景样式">
            <el-option label="默认渐变" value="gradient1" />
            <el-option label="蓝色渐变" value="gradient2" />
            <el-option label="紫色渐变" value="gradient3" />
            <el-option label="黄色纯色" value="yellow" />
            <el-option label="黑色纯色" value="black" />
          </el-select>
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
                  v-model="categoryForm.icon" 
                  placeholder="点击选择图标或输入自定义图标" 
                  readonly
                >
                  <template #suffix>
                    <span v-if="categoryForm.icon">{{ categoryForm.icon }}</span>
                    <el-icon v-else><Folder /></el-icon>
                  </template>
                </el-input>
              </template>
              
              <div class="icon-picker">
                <div class="icon-grid">
                  <div 
                    v-for="icon in availableIcons" 
                    :key="icon" 
                    class="icon-item"
                    :class="{ selected: categoryForm.icon === icon }"
                    @click="selectCategoryIcon(icon)"
                  >
                    {{ icon }}
                  </div>
                </div>
              </div>
            </el-popover>
          </div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveCategory">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import http from '@/api/http'
import {
  Setting,
  Folder,
  Connection,
  Document,
  View,
  Plus,
  Edit,
  Delete
} from '@element-plus/icons-vue'

const router = useRouter()
const route = useRoute()

// Props
const props = defineProps({
  filterType: { type: String, default: 'all' } // 'all', 'notes', 'mindmaps'
})

// State
const categories = ref([])
const hoveredCard = ref(null)
const showSettings = ref(false)
const showAddDialog = ref(false)
const editingCategory = ref(null)
const displayMode = ref('all')
const sortBy = ref('createdAt')
const selectedCategoriesForDeletion = ref([])

// Background colors for category cards
const backgroundColors = [
  '#ecf7e6', '#e7f1f7', '#fdf3e1', '#fbe8e6', '#dcf3f9'
]

// Predefined icons
const availableIcons = ref([
  '🫧', '💧', '🤍', '❕', '❔', '💬', '🎧', '🧻', '💭', '🐇', 
  '🦴', '🦢', '🕊️', '🐁', '☁️', '🦴', '🥛', '🏐', '🖱️', '⌨️', '📄', '🗒️', '⚪️', '🕐'
])

// Form
const categoryForm = ref({
  name: '',
  type: 'note',
  description: '',
  visibility: 'private',
  badgeText: '',
  backgroundStyle: '',
  icon: ''
})

// Background styles matching the design
const backgroundStyles = {
  gradient1: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
  gradient2: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)',
  gradient3: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
  yellow: '#f1c40f',
  black: '#2c3e50'
}

// Computed
const filteredCategories = computed(() => {
  let filtered = categories.value
  
  // Filter by displayMode or filterType prop
  const mode = displayMode.value !== 'all' ? displayMode.value : props.filterType;
  
  if (mode === 'notes') {
    filtered = filtered.filter(cat => cat.type === 'note')
  } else if (mode === 'mindmaps') {
    filtered = filtered.filter(cat => cat.type === 'mindmap')
  }
  
  // Sort categories
  filtered.sort((a, b) => {
    switch (sortBy.value) {
      case 'name':
        return a.name.localeCompare(b.name)
      case 'itemCount':
        return (b.itemCount || 0) - (a.itemCount || 0)
      case 'createdAt':
      default:
        return new Date(b.createdAt) - new Date(a.createdAt)
    }
  })
  
  // Add random background color to each category
  filtered.forEach(category => {
    category.randomBgColor = backgroundColors[Math.floor(Math.random() * backgroundColors.length)]
  })
  
  return filtered
})

// Methods
const loadCategories = async () => {
  try {
    // Load both note and mindmap categories
    const [noteCategories, mindmapCategories] = await Promise.all([
      http.get('/categories/notes'),
      http.get('/categories/mindmaps')
    ])
    
    // Combine and enrich categories
    const allCategories = [
      ...noteCategories.data.map(cat => ({ ...cat, type: 'note' })),
      ...mindmapCategories.data.map(cat => ({ ...cat, type: 'mindmap' }))
    ]
    
    // Load item counts for each category
    for (const category of allCategories) {
      try {
        const endpoint = category.type === 'note' ? '/notes/list' : '/mindmaps/list'
        const response = await http.get(endpoint, { 
          params: { categoryId: category.id } 
        })
        category.itemCount = Array.isArray(response.data) ? response.data.length : 0
      } catch (error) {
        category.itemCount = 0
      }
    }
    
    categories.value = allCategories
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

const enterCategory = (category) => {
  const routePath = category.type === 'note' ? '/notes/category' : '/mindmaps/category'
  router.push(`${routePath}/${category.id}`)
}

const getCardBackground = (category) => {
  // Use random background color if available
  if (category.randomBgColor) {
    return {
      background: category.randomBgColor
    }
  }
  
  if (category.backgroundStyle && backgroundStyles[category.backgroundStyle]) {
    return {
      background: backgroundStyles[category.backgroundStyle]
    }
  }
  
  // Default gradient based on category type
  const defaultGradients = {
    note: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    mindmap: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
  }
  
  return {
    background: defaultGradients[category.type] || defaultGradients.note
  }
}

const getCoverUrl = (coverKey) => {
  // This should be replaced with your actual OSS URL generation logic
  return `https://your-oss-domain.com/${coverKey}`
}

const getPlaceholderStyle = (category) => {
  const colors = {
    note: { bg: '#409eff20', color: '#409eff' },
    mindmap: { bg: '#67c23a20', color: '#67c23a' }
  }
  
  const colorScheme = colors[category.type] || colors.note
  return {
    backgroundColor: colorScheme.bg,
    color: colorScheme.color
  }
}

const selectCategoryIcon = (icon) => {
  categoryForm.value.icon = icon
}

const openSettings = () => {
  selectedCategoriesForDeletion.value = []
  showSettings.value = true
}

const confirmBatchDelete = async () => {
  try {
    await ElMessageBox.confirm(
      `确定要删除选中的 ${selectedCategoriesForDeletion.value.length} 个文件夹及其内部所有内容吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const endpoint = props.filterType === 'notes' 
      ? '/categories/notes/batch' 
      : '/categories/mindmaps/batch'
    
    await http.delete(endpoint, {
      data: { ids: selectedCategoriesForDeletion.value }
    })
    
    ElMessage.success('批量删除成功')
    showSettings.value = false
    selectedCategoriesForDeletion.value = []
    loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('批量删除失败')
    }
  }
}

const editCategory = (category) => {
  editingCategory.value = category
  categoryForm.value = {
    name: category.name,
    type: category.type,
    description: category.description || '',
    visibility: category.visibility || 'private',
    badgeText: category.badgeText || '',
    backgroundStyle: category.backgroundStyle || '',
    icon: category.icon || ''
  }
  showAddDialog.value = true
}

const deleteCategory = async (category) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除文件夹 "${category.name}" 及其内部所有内容吗？此操作不可恢复！`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const endpoint = category.type === 'note' 
      ? `/categories/notes/${category.id}` 
      : `/categories/mindmaps/${category.id}`
    
    await http.delete(endpoint)
    ElMessage.success('删除成功')
    loadCategories()
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const saveCategory = async () => {
  try {
    const endpoint = categoryForm.value.type === 'note' 
      ? '/categories/notes' 
      : '/categories/mindmaps'
    
    if (editingCategory.value) {
      await http.put(`${endpoint}/${editingCategory.value.id}`, categoryForm.value)
      ElMessage.success('更新成功')
    } else {
      await http.post(endpoint, categoryForm.value)
      ElMessage.success('创建成功')
    }
    
    showAddDialog.value = false
    resetForm()
    loadCategories()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const resetForm = () => {
  editingCategory.value = null
  // Set default type based on filterType prop
  categoryForm.value = {
    name: '',
    type: props.filterType === 'mindmaps' ? 'mindmap' : 'note',
    description: '',
    visibility: 'private',
    badgeText: '',
    backgroundStyle: '',
    icon: ''
  }
}

// Lifecycle
onMounted(() => {
  // Set default category type based on filterType prop
  categoryForm.value.type = props.filterType === 'mindmaps' ? 'mindmap' : 'note'
  loadCategories()
})
</script>

<style scoped>
.knowledge-categories {
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

.categories-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 20px;
  margin-bottom: 30px;
}

.category-card {
  border-radius: 12px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
  transition: all 0.3s ease;
  cursor: pointer;
  position: relative;
}

.category-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);
}

.category-card.has-badge {
  padding-top: 30px;
}

.category-badge {
  position: absolute;
  top: 8px;
  left: 8px;
  background: #409eff;
  color: white;
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 12px;
  font-weight: 500;
  z-index: 2;
}

.card-background {
  height: 130px;
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
}

.card-cover {
  position: relative;
  z-index: 1;
}

.cover-image img {
  max-width: 100%;
  max-height: 100px;
  object-fit: cover;
  border-radius: 6px;
}

.cover-placeholder {
  width: 60px;
  height: 60px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
}

.category-icon {
  font-size: 24px;
}

.hover-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.7);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
  z-index: 2;
  padding: 10px;
}

.hover-overlay.active {
  opacity: 1;
}

.overlay-content {
  text-align: center;
  color: white;
  width: 100%;
}

.overlay-content .item-count {
  margin: 10px 0;
  font-size: 14px;
  opacity: 0.9;
}

.category-actions {
  display: flex;
  gap: 10px;
  justify-content: center;
  margin-top: 10px;
}

.category-actions .action-btn {
  display: flex;
  align-items: center;
  gap: 5px;
}

.card-content {
  padding: 16px;
  background: white;
}

.category-title {
  font-size: 16px;
  font-weight: 600;
  color: #303133;
  margin: 0 0 6px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-description {
  font-size: 13px;
  color: #909399;
  margin: 0 0 12px 0;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  line-height: 1.5;
}

.category-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #c0c4cc;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.add-category-card {
  border: 2px dashed #dcdfe6;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 240px;
  cursor: pointer;
  transition: all 0.3s ease;
  background: #fafafa;
}

.add-category-card:hover {
  border-color: #409eff;
  background: #f0f9ff;
}

.add-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #909399;
  font-size: 14px;
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

/* Category selection styles */
.category-checkbox-group {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  max-height: 300px;
  overflow-y: auto;
}

.category-checkbox {
  margin-right: 10px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .knowledge-categories {
    padding: 16px;
  }
  
  .categories-grid {
    grid-template-columns: 1fr;
    gap: 16px;
  }
  
  .category-card {
    margin: 0;
  }
  
  .page-header {
    flex-direction: column;
    gap: 16px;
    align-items: flex-start;
  }
  
  .card-background {
    height: 120px;
  }
  
  .cover-placeholder {
    width: 50px;
    height: 50px;
    font-size: 20px;
  }
  
  .category-checkbox-group {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .categories-grid {
    grid-template-columns: 1fr;
  }
  
  .card-background {
    height: 110px;
  }
  
  .cover-placeholder {
    width: 45px;
    height: 45px;
    font-size: 18px;
  }
  
  .add-category-card {
    min-height: 200px;
  }
}
</style>
