<template>
  <div class="knowledge-content-layout">
    <!-- Sidebar -->
    <div class="sidebar" :class="{ collapsed: sidebarCollapsed }">
      <div class="sidebar-header">
        <div class="header-left">
          <el-button 
            link 
            @click="goBack"
            class="back-btn"
            title="返回上一页"
          >
            <el-icon><ArrowLeft /></el-icon>
          </el-button>
          <h3>{{ currentCategory?.name || '知识库' }}</h3>
        </div>
        <el-button 
          link 
          @click="sidebarCollapsed = !sidebarCollapsed"
          class="collapse-btn"
        >
          <el-icon>
            <ArrowLeft v-if="!sidebarCollapsed" />
            <ArrowRight v-else />
          </el-icon>
        </el-button>
      </div>

      <div class="sidebar-content">
        <!-- Search -->
        <div class="search-box">
          <el-input
            v-model="searchKeyword"
            placeholder="搜索内容..."
            size="small"
            clearable
          >
            <template #prefix>
              <el-icon><Search /></el-icon>
            </template>
          </el-input>
        </div>
        
        <!-- 大纲切换按钮 -->
        <div class="outline-toggle" v-if="props.contentType==='notes' && items.length > 0">
          <div 
            class="outline-toggle-btn"
            @click="sidebarMode = sidebarMode==='list' ? 'outline' : 'list'" 
            :title="sidebarMode==='list' ? '查看大纲' : '返回列表'"
          >
            <span class="toggle-symbol">{{ sidebarMode==='list' ? '≡' : '≡' }}</span>
            <span class="toggle-text">{{ sidebarMode==='list' ? '' : '' }}</span>
          </div>
        </div>

        <!-- Content List -->
        <div class="content-list">
          <div 
            v-for="(item, index) in filteredItems" 
            :key="item.id"
            :class="[
              sidebarMode === 'outline' ? 'outline-item' : 'content-item',
              { active: sidebarMode === 'outline' ? activeOutlineId === item.id : selectedItem?.id === item.id }
            ]"
          >
            <div class="item-main" @click="selectItem(item)">
              <!-- 大纲模式：显示折叠图标和缩进 -->
              <template v-if="sidebarMode === 'outline'">
                <div class="outline-indent" :style="{ width: (item.level-1)*12 + 'px' }"></div>
                <div class="outline-toggle-icon" @click="toggleOutlineCollapse(item, $event)">
                  <el-icon v-if="hasChildren(item)" size="14" class="collapse-icon">
                    <ArrowRight v-if="collapsedOutlineIds.has(item.id)" />
                    <ArrowDown v-else />
                  </el-icon>
                  <span v-else class="no-children-spacer"></span>
                </div>
              </template>
              
              <!-- 列表模式：显示图标 -->
              <div v-else class="item-icon">
                <el-icon size="16">
                  <Document v-if="item.type === 'note'" />
                  <Connection v-else />
                </el-icon>
              </div>
              
              <div class="item-info">
                <div class="item-title">{{ item.title || item.text }}</div>
                <div v-if="sidebarMode !== 'outline'" class="item-meta">
                  <span>{{ formatDate(item.createdAt) }}</span>
                  <span v-if="item.views">{{ item.views }} 浏览</span>
                </div>
              </div>
            </div>
            
            <!-- 大纲模式不显示操作菜单 -->
            <el-dropdown v-if="sidebarMode !== 'outline'" trigger="click" @click.stop>
              <span class="item-more">
                <el-icon><MoreFilled /></el-icon>
              </span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item @click="editItemFromDropdown(item)">
                    <el-icon><Edit /></el-icon>
                    编辑
                  </el-dropdown-item>
                  <el-dropdown-item @click="downloadItemFromDropdown(item)">
                    <el-icon><Download /></el-icon>
                    下载
                  </el-dropdown-item>
                  <el-dropdown-item @click="deleteItemFromDropdown(item)" divided>
                    <el-icon><Delete /></el-icon>
                    <span style="color: #f56c6c;">删除</span>
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
        </div>

        <!-- Empty State -->
        <div v-if="filteredItems.length === 0 && sidebarMode === 'list'" class="empty-state">
          <el-empty description="暂无内容" :image-size="60" />
        </div>
        <div v-if="sidebarMode === 'outline' && outline.length === 0" class="empty-state">
          <el-empty description="暂无大纲" :image-size="60" />
        </div>
      </div>

      <!-- Add New Button -->
      <div class="sidebar-footer">
        <el-button 
          type="primary" 
          size="small" 
          @click="props.contentType === 'notes' ? createNewNote() : createNewMindmap()"
          class="add-btn"
        >
          <el-icon><Plus /></el-icon>
          新建{{ props.contentType === 'notes' ? '笔记' : '思维导图' }}
        </el-button>
        <!-- 导入按钮 -->
        <el-upload
          v-if="props.contentType==='notes' && !isCreating"
          :auto-upload="false"
          :on-change="handleImportFile"
          :show-file-list="false"
          accept=".md,.pdf,text/markdown,application/pdf"
          class="import-upload"
        >
          <el-button size="small" class="import-btn">
            <el-icon><Upload /></el-icon>
            导入
          </el-button>
        </el-upload>
        <el-upload
          v-else-if="props.contentType==='mindmaps' && !isCreating"
          :auto-upload="true"
          :http-request="handleMindmapImport"
          :show-file-list="false"
          accept=".xmind,.mmap"
          class="import-upload"
        >
          <el-button size="small" class="import-btn">
            <el-icon><Upload /></el-icon>
            导入XMind
          </el-button>
        </el-upload>
      </div>
    </div>

    <!-- Main Content -->
    <div class="main-content" :class="{ expanded: sidebarCollapsed }">
      <div v-if="(selectedItem || isCreating || (items && items.length > 0)) && !loading" class="content-display">
        <!-- Content Title Bar (Simplified) -->
        <div class="content-title-bar" v-if="!isCreating && selectedItem">
          <!-- <h1>{{ selectedItem?.title || '未知标题' }}</h1> -->
        </div>
        <div class="content-title-bar" v-else-if="isCreating">
          <h1>新建{{ props.contentType === 'notes' ? '笔记' : '思维导图' }}</h1>
          <div class="create-actions">
            <el-button type="success" @click="props.contentType === 'notes' ? saveNewNote() : saveNewMindmap()" size="small">保存</el-button>
            <el-button @click="cancelCreate" size="small">取消</el-button>
          </div>
        </div>

        <!-- Content Body -->
        <div class="content-body">
          <!-- 显示已存在笔记的内容 -->
          <div v-if="!isCreating && selectedItem && props.contentType === 'notes'" class="note-content" :class="{ 'pdf-note': isPdfNote }">
            <!-- PDF 笔记：不显示工具栏和标题 -->
            <template v-if="isPdfNote && !isEditing">
              <div v-if="noteContent" class="pdf-content-display">
                <div class="pdf-readonly-content" v-html="noteContent"></div>
              </div>
            </template>
            
            <!-- Markdown 笔记：保持原样 -->
            <template v-else-if="!isPdfNote && !isEditing">
              <div class="readonly-toolbar">
                <el-button type="primary" size="small" @click="startEditing">
                  <el-icon><Edit /></el-icon>
                  编辑
                </el-button>
              </div>
              
              <!-- 内容显示区域 -->
              <div v-if="noteContent" class="content-display-area">
                <div class="readonly-content" v-html="noteContent"></div>
              </div>
            </template>
            
            <!-- 编辑模式 -->
            <template v-else-if="isEditing">
              <div class="edit-mode">
                <TiptapEditor 
                  ref="editEditorRef"
                  v-model="editingContent"
                  placeholder="开始编写笔记... 支持 Markdown 快捷语法"
                  :show-actions="true"
                  @save="saveContent"
                  @cancel="cancelEdit"
                  style="height: 100%;"
                />
              </div>
            </template>
          </div>
          
          <!-- 显示思维导图内容 -->
          <div v-else-if="!isCreating && selectedItem && props.contentType === 'mindmaps'" class="mindmap-content">
            <MindMapEditor 
              :mindmap="selectedItem" 
              @save="saveMindmap"
              @download="downloadItem"
              style="height: 100%;"
            />
          </div>
          
          <!-- 创建新笔记的编辑器 -->
          <div v-else-if="isCreating && props.contentType === 'notes'" class="note-editor-container">
            <div class="create-note-header">
              <el-form :model="newNoteForm" label-width="80px">
                <el-form-item label="标题" required>
                  <el-input v-model="newNoteForm.title" placeholder="请输入笔记标题" />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input v-model="newNoteForm.description" type="textarea" :rows="2" placeholder="请输入笔记描述" />
                </el-form-item>
                <el-form-item label="可见性">
                  <el-radio-group v-model="newNoteForm.visibility">
                    <el-radio label="private">私有</el-radio>
                    <el-radio label="public">公开</el-radio>
                  </el-radio-group>
                </el-form-item>
              </el-form>
            </div>
            
            <TiptapEditor 
              ref="createEditorRef"
              v-model="newNoteForm.content"
              placeholder="开始编写笔记... 支持 Markdown 快捷语法"
              :show-actions="true"
              @save="saveNewNote"
              @cancel="cancelCreate"
              style="height: calc(100vh - 350px);"
            />
          </div>
          
          <!-- 创建新思维导图的表单 -->
          <div v-else-if="isCreating && props.contentType === 'mindmaps'" class="mindmap-create-form">
            <div class="create-form-container">
              <h2 class="form-title">创建新思维导图</h2>
              <el-form :model="newMindmapForm" label-width="100px" class="mindmap-form">
                <el-form-item label="标题" required>
                  <el-input 
                    v-model="newMindmapForm.title" 
                    placeholder="请输入思维导图标题（将作为根节点）" 
                    maxlength="50"
                    show-word-limit
                  />
                </el-form-item>
                <el-form-item label="描述">
                  <el-input 
                    v-model="newMindmapForm.description" 
                    type="textarea" 
                    :rows="4" 
                    placeholder="请输入思维导图描述（可选）"
                    maxlength="200"
                    show-word-limit
                  />
                </el-form-item>
                <el-form-item label="可见性">
                  <el-radio-group v-model="newMindmapForm.visibility">
                    <el-radio label="private">私有</el-radio>
                    <el-radio label="public">公开</el-radio>
                  </el-radio-group>
                </el-form-item>
                <el-form-item>
                  <div class="form-actions">
                    <el-button type="primary" @click="saveNewMindmap" :loading="saving">
                      创建思维导图
                    </el-button>
                    <el-button @click="cancelCreate">取消</el-button>
                  </div>
                </el-form-item>
              </el-form>
              <div class="form-tip">
                <el-icon><InfoFilled /></el-icon>
                <span>创建后将自动生成一个以标题命名的根节点和两个默认子节点，您可以在编辑页面中继续完善思维导图内容。</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <!-- Empty State -->
      <div v-else class="empty-content">
        <el-empty description="请选择要查看的内容" />
      </div>
    </div>

    <!-- Add/Edit Dialog -->
    <el-dialog
      v-model="showAddDialog"
      :title="editingItem ? '编辑内容' : '新建内容'"
      width="600px"
      @close="resetForm"
    >
      <el-form :model="itemForm" label-width="80px">
        <el-form-item label="标题" prop="title" required>
          <el-input v-model="itemForm.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <el-input 
            v-model="itemForm.description" 
            type="textarea" 
            placeholder="添加描述"
            :rows="3"
          />
        </el-form-item>
        <el-form-item label="标签" prop="tags">
          <el-input v-model="itemForm.tags" placeholder="用逗号分隔标签" />
        </el-form-item>
        <el-form-item label="可见性" prop="visibility">
          <el-radio-group v-model="itemForm.visibility">
            <el-radio label="private">私有</el-radio>
            <el-radio label="public">公开</el-radio>
          </el-radio-group>
        </el-form-item>
        <!-- 隐藏字段用于传递 categoryId -->
        <input type="hidden" v-model="itemForm.categoryId" />
      </el-form>
      <template #footer>
        <el-button @click="showAddDialog = false">取消</el-button>
        <el-button type="primary" @click="saveItem">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage, ElMessageBox } from 'element-plus'
import { marked } from 'marked'
import http from '@/api/http'
import MindMapEditor from '@/components/MindMapEditorSimple.vue'
import TiptapEditor from '@/components/TiptapEditor.vue'
// import MindMapEditor from '@/components/MindMapEditorNew.vue'
// import MindMapEditor from '@/components/MindMapEditor.vue'
import {
  ArrowLeft,
  ArrowRight,
  ArrowDown,
  Search,
  Document,
  Connection,
  Calendar,
  View,
  Star,
  Plus,
  Edit,
  Download,
  Delete,
  Upload,
  List,
  InfoFilled,
  MoreFilled
} from '@element-plus/icons-vue'

const route = useRoute()
const router = useRouter()

// Props
const props = defineProps({
  contentType: {
    type: String,
    required: true, // 'notes' or 'mindmaps'
  },
  categoryId: {
    type: [String, Number],
    required: true
  }
})

// State
const sidebarCollapsed = ref(false)
const searchKeyword = ref('')
const items = ref([])
const selectedItem = ref(null)
const currentCategory = ref(null)
const showAddDialog = ref(false)
const editingItem = ref(null)
const noteContent = ref('')
const mindmapData = ref(null)
const noteRaw = ref('')
const sidebarMode = ref('list')
const outline = ref([])
const activeOutlineId = ref(null)
const collapsedOutlineIds = ref(new Set())
const isEditing = ref(false)
const editingContent = ref('')
const activeTab = ref('edit')
const isCreating = ref(false) // 新增状态，标识是否在创建笔记
const loading = ref(false) // 添加加载状态

// Refs for textareas
const editTextarea = ref(null)
const newNoteTextarea = ref(null)

// Refs for Tiptap editors
const editEditorRef = ref(null)
const createEditorRef = ref(null)

// Form
const itemForm = ref({
  title: '',
  description: '',
  content: '',
  tags: '',
  visibility: 'private',
  categoryId: props.categoryId // 默认设置为当前分类ID
})

// 新增笔记表单
const newNoteForm = ref({
  title: '',
  description: '',
  content: '',
  tags: '',
  visibility: 'private',
  coverKey: '',
  categoryId: props.categoryId
})

// 新增思维导图表单
const newMindmapForm = ref({
  title: '',
  description: '',
  visibility: 'private',
  categoryId: props.categoryId
})

// 新增思维导图数据
const newMindmapData = ref({
  title: '',
  description: '',
  content: null
})

// 临时思维导图对象，用于新建思维导图
const tempMindmap = ref({
  id: null,
  title: '',
  description: '',
  content: null
})

const editorTab = ref('edit')

// Computed
const filteredItems = computed(() => {
  if (sidebarMode.value === 'outline') {
    const items = searchKeyword.value 
      ? outline.value.filter(h => h.text.toLowerCase().includes(searchKeyword.value.toLowerCase()))
      : outline.value
    
    // Filter out collapsed children
    return filterCollapsedOutline(items)
  }
  const base = [...items.value].sort((a,b)=> (a.title||'').localeCompare(b.title||''))
  if (!searchKeyword.value) return base
  return base.filter(item => 
    (item.title||'').toLowerCase().includes(searchKeyword.value.toLowerCase()) ||
    (item.description && item.description.toLowerCase().includes(searchKeyword.value.toLowerCase()))
  )
})

// Filter outline to hide collapsed children
const filterCollapsedOutline = (items) => {
  const result = []
  let skipUntilLevel = null
  
  for (const item of items) {
    // If we're skipping, check if we've reached a level <= the collapsed level
    if (skipUntilLevel !== null) {
      if (item.level <= skipUntilLevel) {
        skipUntilLevel = null
      } else {
        continue
      }
    }
    
    result.push(item)
    
    // If this item is collapsed, skip its children
    if (collapsedOutlineIds.value.has(item.id)) {
      skipUntilLevel = item.level
    }
  }
  
  return result
}

const previewContent = computed(() => {
  return marked(newNoteForm.value.content || '')
})

// 判断当前笔记是否是 PDF 类型
const isPdfNote = computed(() => {
  if (!selectedItem.value) return false
  // 检查标签中是否包含 "PDF导入"
  const tags = selectedItem.value.tags || ''
  return tags.includes('PDF导入')
})

// Methods
const loadItems = async () => {
  try {
    loading.value = true
    const endpoint = props.contentType === 'notes' ? '/notes/list' : '/mindmaps/list'
    const { data } = await http.get(endpoint, {
      params: { categoryId: props.categoryId }
    })
    const typed = Array.isArray(data) ? data.map(d => ({ ...d, type: props.contentType === 'notes' ? 'note' : 'mindmap' })) : []
    items.value = typed.sort((a,b)=> (a.title||'').localeCompare(b.title||''))
    // 只有在没有选中项且不是创建模式时才自动选择第一项
    if (items.value.length > 0 && !selectedItem.value && !isCreating.value) {
      selectItem(items.value[0])
    }
    
    // 如果当前没有选中项且不是创建模式，但列表不为空，选择第一项
    if (items.value.length > 0 && !selectedItem.value && !isCreating.value) {
      selectItem(items.value[0])
    }
  } catch (error) {
    ElMessage.error('加载内容失败')
  } finally {
    loading.value = false
  }
}

const loadCategory = async () => {
  try {
    const endpoint = props.contentType === 'notes' 
      ? `/categories/notes/${props.categoryId}` 
      : `/categories/mindmaps/${props.categoryId}`
    const { data } = await http.get(endpoint)
    currentCategory.value = data
  } catch (error) {
    ElMessage.error('加载分类失败')
  }
}

const selectItem = async (item) => {
  if (sidebarMode.value === 'outline') {
    // 尝试通过 ID 查找元素
    let el = document.getElementById(item.id)
    
    // 如果通过 ID 找不到（编辑模式），尝试通过文本内容查找
    if (!el) {
      // 在编辑模式下，查找 Tiptap 编辑器内的标题
      const editorContent = document.querySelector('.ProseMirror')
      if (editorContent) {
        // 查找所有标题元素
        const headings = editorContent.querySelectorAll('h1, h2, h3, h4, h5, h6')
        // 找到匹配文本的标题
        el = Array.from(headings).find(h => h.textContent.trim() === item.text.trim())
      }
      
      // 如果还是找不到，尝试在只读内容中查找
      if (!el) {
        const readonlyContent = document.querySelector('.readonly-content')
        if (readonlyContent) {
          const headings = readonlyContent.querySelectorAll('h1, h2, h3, h4, h5, h6')
          el = Array.from(headings).find(h => h.textContent.trim() === item.text.trim())
        }
      }
    }
    
    if (el) {
      // 查找滚动容器（按优先级查找）
      // 预览模式：.readonly-content 是真正的滚动容器
      let scrollableParent = el.closest('.readonly-content')
      if (!scrollableParent) {
        // 编辑模式：.editor-content 或 .edit-mode
        scrollableParent = el.closest('.editor-content, .edit-mode')
      }
      if (!scrollableParent) {
        // 其他容器
        scrollableParent = el.closest('.content-body, .main-content, .content-display-area')
      }
      
      if (scrollableParent) {
        // 计算元素相对于滚动容器的位置
        const containerRect = scrollableParent.getBoundingClientRect()
        const elementRect = el.getBoundingClientRect()
        const relativeTop = elementRect.top - containerRect.top + scrollableParent.scrollTop
        const targetScrollTop = relativeTop - 100
        
        console.log('大纲跳转:', {
          container: scrollableParent.className,
          elementText: item.text,
          relativeTop,
          targetScrollTop,
          scrollTop: scrollableParent.scrollTop
        })
        
        // 使用平滑滚动
        scrollableParent.scrollTo({
          top: targetScrollTop,
          behavior: 'smooth'
        })
      } else {
        // 如果找不到滚动容器，使用默认滚动
        console.log('未找到滚动容器，使用默认滚动')
        el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      
      // 高亮显示选中的标题
      activeOutlineId.value = item.id
    } else {
      console.warn('未找到标题元素:', item.text)
    }
    return
  }
  // 退出编辑模式
  isEditing.value = false
  isCreating.value = false // 退出创建模式
  try {
    selectedItem.value = item
    console.log('选中项目:', item)
    if (props.contentType === 'notes') {
      console.log('开始加载笔记内容')
      await loadNoteContent(item)
      console.log('笔记内容加载完成')
    } else {
      await loadMindmapData(item)
    }
  } catch (error) {
    console.error('选择项目时出错:', error)
  }
}

const loadNoteContent = async (note) => {
  try {
    noteContent.value = ''
    noteRaw.value = ''
    console.log('🔍 开始加载笔记内容，笔记ID:', note.id)
    
    // 首先尝试从详情接口获取笔记信息
    try {
      console.log('📡 调用详情接口:', `/notes/${note.id}`)
      const detailResponse = await http.get(`/notes/${note.id}`)
      console.log('📋 笔记详情完整响应:', JSON.stringify(detailResponse, null, 2))
      console.log('📊 详情数据对象:', detailResponse.data)
      
      // 检查content字段是否存在
      console.log('🔍 content字段存在性检查:')
      console.log('- detailResponse.data存在:', !!detailResponse.data)
      console.log('- detailResponse.data.content存在:', !!detailResponse.data?.content)
      console.log('- content字段值:', detailResponse.data?.content)
      console.log('- content字段类型:', typeof detailResponse.data?.content)
      console.log('- content字段长度:', detailResponse.data?.content?.length)
      
      // 如果详情接口有content字段，直接使用
      if (detailResponse.data && detailResponse.data.content !== undefined && detailResponse.data.content !== null) {
        const text = detailResponse.data.content
        console.log('✅ 使用详情接口content字段，内容长度:', text.length)
        console.log('✅ 内容前100字符:', text.substring(0, 100))
        noteRaw.value = text
        
        // 测试marked转换
        try {
          const html = marked(text)
          console.log('📝 marked转换成功，HTML长度:', html.length)
          console.log('📝 HTML前200字符:', html.substring(0, 200))
          noteContent.value = html
        } catch (markError) {
          console.error('❌ marked转换失败:', markError)
          noteContent.value = `<pre style="white-space: pre-wrap;">${text}</pre>`
        }
        
        buildOutline(text)
        note.views = (note.views || 0) + 1
        console.log('✅ 详情接口加载完成')
        return
      } else {
        console.log('⚠️ 详情接口无content字段，准备调用内容接口')
      }
    } catch (detailError) {
      console.error('❌ 详情接口调用失败:', detailError)
      console.error('错误详情:', detailError.response?.data || detailError.message)
    }
    
    // 如果详情接口没有内容，再尝试内容接口
    console.log('📡 准备调用内容接口...')
    const contentStream = await http.get(`/notes/${note.id}/content`)
    const text = contentStream.data || ''
    console.log('📋 内容接口返回，内容长度:', text.length)
    noteRaw.value = text
    
    // 测试marked是否正常工作
    try {
      const testHtml = marked('# 测试标题\n\n这是一段测试内容')
      console.log('🧪 marked测试输出:', testHtml)
      
      if (text && text.trim()) {
        noteContent.value = marked(text)
        console.log('📝 使用内容接口，转换后HTML长度:', noteContent.value.length)
      } else {
        console.log('⚠️ 内容为空，显示默认提示')
        noteContent.value = '<p style="color: #999; text-align: center; padding: 40px;">📝 这是一个空笔记，点击编辑按钮开始编写内容。</p>'
      }
    } catch (markError) {
      console.error('❌ marked转换失败:', markError)
      // 如果marked失败，使用简单的文本显示
      noteContent.value = `<pre style="white-space: pre-wrap;">${text}</pre>`
    }
    
    buildOutline(text)
    note.views = (note.views || 0) + 1
  } catch (error) {
    console.error('❌ 加载笔记内容失败:', error)
    console.error('错误详情:', error.response?.data || error.message)
    ElMessage.error('加载笔记内容失败')
    // 出错时显示错误信息
    noteContent.value = '<p style="color: red;">❌ 内容加载失败，请稍后重试</p>'
  }
  
  console.log('🏁 loadNoteContent函数执行完成')
  console.log('最终noteContent值:', noteContent.value)
  console.log('最终noteContent长度:', noteContent.value?.length || 0)
}

function buildOutline(text){
  outline.value = []
  
  setTimeout(()=>{
    const container = document.querySelector('.readonly-content')
    if (!container) return
    
    const headings = container.querySelectorAll('h1,h2,h3,h4,h5,h6')
    const result = []
    let i = 0
    
    headings.forEach(h => {
      const id = `md-h-${i}`
      h.id = id
      
      // 获取标题级别
      const tagName = h.tagName.toLowerCase()
      const level = parseInt(tagName.substring(1))
      
      // 获取标题文本
      const text = h.textContent.trim()
      
      result.push({ id, level, text })
      i++
    })
    
    outline.value = result
    
    // Setup scroll listener for outline highlighting
    setupOutlineScrollListener()
  }, 100)
}

// Setup scroll listener to highlight active outline item
const setupOutlineScrollListener = () => {
  const container = document.querySelector('.content-body') || 
                   document.querySelector('.main-content')
  if (!container) return
  
  // Remove existing listener if any
  container.removeEventListener('scroll', handleOutlineScroll)
  container.addEventListener('scroll', handleOutlineScroll)
}

// Handle scroll to update active outline item
const handleOutlineScroll = () => {
  if (sidebarMode.value !== 'outline' || outline.value.length === 0) return
  
  const container = document.querySelector('.content-body') || 
                   document.querySelector('.main-content')
  if (!container) return
  
  const scrollTop = container.scrollTop
  const containerTop = container.getBoundingClientRect().top
  
  // Find the currently visible heading
  let activeId = null
  let minDistance = Infinity
  
  for (const item of outline.value) {
    const element = document.getElementById(item.id)
    if (!element) continue
    
    const rect = element.getBoundingClientRect()
    const distance = Math.abs(rect.top - containerTop - 100) // 100px offset from top
    
    if (rect.top <= containerTop + 150 && distance < minDistance) {
      minDistance = distance
      activeId = item.id
    }
  }
  
  activeOutlineId.value = activeId
}

// Check if outline item has children
const hasChildren = (item) => {
  // Find the item's index in the original outline array
  const itemIndex = outline.value.findIndex(i => i.id === item.id)
  if (itemIndex === -1 || itemIndex >= outline.value.length - 1) return false
  
  const nextItem = outline.value[itemIndex + 1]
  return nextItem && nextItem.level > item.level
}

// Toggle outline item collapse
const toggleOutlineCollapse = (item, event) => {
  event.stopPropagation()
  const newSet = new Set(collapsedOutlineIds.value)
  if (newSet.has(item.id)) {
    newSet.delete(item.id)
  } else {
    newSet.add(item.id)
  }
  collapsedOutlineIds.value = newSet
}

const loadMindmapData = async (mindmap) => {
  try {
    mindmapData.value = null
    
    // 调用详情接口，会自动增加浏览量并保存到数据库
    const { data } = await http.get(`/mindmaps/${mindmap.id}`)
    
    // 更新选中项的数据（包含最新的浏览量）
    Object.assign(mindmap, data)
    
    // For mindmaps, we might want to show a preview or just metadata
    // The actual file would be downloaded
    mindmapData.value = {
      title: data.title,
      description: data.description,
      format: data.format,
      nodeCount: data.nodeCount,
      views: data.views
    }
  } catch (error) {
    ElMessage.error('加载思维导图数据失败')
  }
}

const formatDate = (dateString) => {
  if (!dateString) return ''
  const date = new Date(dateString)
  return date.toLocaleDateString('zh-CN')
}

const editItem = () => {
  if (!selectedItem.value) return
  
  editingItem.value = selectedItem.value
  itemForm.value = {
    title: selectedItem.value.title,
    description: selectedItem.value.description || '',
    content: noteRaw.value || '',
    tags: selectedItem.value.tags || '',
    visibility: selectedItem.value.visibility || 'private',
    categoryId: props.categoryId // 确保分类ID正确
  }
  editorTab.value = 'edit'
  showAddDialog.value = true
}

const startEditing = () => {
  isEditing.value = true
  activeTab.value = 'edit'
  
  // 将 Markdown 转换为 HTML 供 Tiptap 使用
  const rawContent = noteRaw.value || ''
  
  // 如果内容看起来像 Markdown（包含 #、**、- 等），转换为 HTML
  if (rawContent.includes('#') || rawContent.includes('**') || rawContent.includes('- ')) {
    editingContent.value = marked(rawContent)
  } else {
    // 否则直接使用（可能已经是 HTML）
    editingContent.value = rawContent
  }
}

const refreshContent = () => {
  console.log('🔄 手动刷新内容...')
  if (selectedItem.value) {
    loadNoteContent(selectedItem.value)
  } else {
    console.log('⚠️ 没有选中的项目')
  }
}

const saveContent = async () => {
  try {
    // 显示加载状态
    const loadingMsg = ElMessage({
      message: '正在保存...',
      type: 'info',
      duration: 0
    })
    
    // 从 Tiptap 编辑器获取 Markdown 格式内容
    let contentToSave = editingContent.value
    if (editEditorRef.value && editEditorRef.value.getMarkdown) {
      // 使用 Markdown 格式保存，保持兼容性
      contentToSave = editEditorRef.value.getMarkdown()
    }
    
    const data = {
      title: selectedItem.value.title,
      description: selectedItem.value.description,
      content: contentToSave,
      tags: selectedItem.value.tags,
      coverKey: selectedItem.value.coverKey,
      visibility: selectedItem.value.visibility
    }
    
    await http.put(`/notes/${selectedItem.value.id}`, data)
    
    // 关闭加载提示
    loadingMsg.close()
    ElMessage.success('保存成功')
    
    // 静态更新显示内容（不重新加载）
    noteRaw.value = contentToSave
    noteContent.value = marked(contentToSave)
    selectedItem.value.content = contentToSave
    
    // 更新列表中的对应项（静态更新，不重新加载）
    const itemInList = items.value.find(item => item.id === selectedItem.value.id)
    if (itemInList) {
      itemInList.content = contentToSave
      itemInList.title = selectedItem.value.title
    }
    
    // 退出编辑模式
    isEditing.value = false
    
    // ❌ 不要重新加载列表，会导致卡顿
    // await loadItems()
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

const cancelEdit = () => {
  isEditing.value = false
  editingContent.value = ''
}

const downloadItem = async () => {
  if (!selectedItem.value) return
  
  try {
    if (props.contentType === 'notes') {
      // 先从详情接口获取完整的笔记信息（包含 format 字段）
      let noteFormat = selectedItem.value.format
      
      // 如果列表数据中没有 format 字段，从详情接口获取
      if (!noteFormat) {
        try {
          const detailResponse = await http.get(`/notes/${selectedItem.value.id}`)
          noteFormat = detailResponse.data.format || 'md'
          console.log('从详情接口获取 format:', noteFormat)
        } catch (error) {
          console.error('获取笔记详情失败:', error)
          noteFormat = 'md'
        }
      }
      
      console.log('笔记格式:', noteFormat, '笔记标题:', selectedItem.value.title)
      
      // 如果是 PDF 或其他非 Markdown 格式，直接从后端下载
      if (noteFormat !== 'md' && noteFormat !== 'markdown') {
        console.log('检测到非 Markdown 格式，直接下载原始文件')
        const endpoint = `/notes/${selectedItem.value.id}/download`
        const response = await http.get(endpoint, { responseType: 'blob' })
        
        const url = window.URL.createObjectURL(new Blob([response.data]))
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${selectedItem.value.title}.${noteFormat}`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        ElMessage.success('下载成功')
        return
      }
      
      console.log('检测到 Markdown 格式，转换并打包')
      
      // Markdown 笔记：转换为 Markdown 格式并打包图片
      let content = selectedItem.value.content || ''
      const images = []
      
      // 如果内容是 HTML 格式（包含 HTML 标签），转换为 Markdown
      if (content.includes('<') && content.includes('>')) {
        // 提取图片 URL
        const imgRegex = /<img[^>]+src="([^"]+)"[^>]*>/g
        let match
        while ((match = imgRegex.exec(content)) !== null) {
          const src = match[1]
          // 只处理 http/https 图片
          if (src.startsWith('http://') || src.startsWith('https://')) {
            images.push(src)
          }
        }
        
        // 转换为 Markdown，并替换图片路径
        content = htmlToMarkdownWithImages(content, images)
      }
      
      // 如果有图片，创建 ZIP 包
      if (images.length > 0) {
        await downloadWithImages(selectedItem.value.title, content, images)
      } else {
        // 没有图片，直接下载 Markdown
        const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' })
        const url = window.URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${selectedItem.value.title}.md`)
        document.body.appendChild(link)
        link.click()
        link.remove()
        window.URL.revokeObjectURL(url)
        
        ElMessage.success('下载成功')
      }
    } else {
      // 思维导图下载：使用原有逻辑
      const endpoint = `/mindmaps/${selectedItem.value.id}/download`
      const response = await http.get(endpoint, { responseType: 'blob' })
      
      const url = window.URL.createObjectURL(new Blob([response.data]))
      const link = document.createElement('a')
      const fileExtension = selectedItem.value.format || 'xmind'
      link.href = url
      link.setAttribute('download', `${selectedItem.value.title}.${fileExtension}`)
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      
      ElMessage.success('下载成功')
    }
  } catch (error) {
    console.error('下载失败:', error)
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  }
}

// HTML 转 Markdown 函数（带图片路径替换）
const htmlToMarkdownWithImages = (html, images) => {
  let markdown = html
  let imageIndex = 0
  
  // 处理图片
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, (match, src, alt) => {
    // 如果是 Base64 图片，移除
    if (src.startsWith('data:image')) {
      return '![图片](图片已移除，请重新上传)'
    }
    // 如果是 URL 图片，替换为相对路径
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const ext = src.split('.').pop().split('?')[0] || 'png'
      const filename = `image_${imageIndex++}.${ext}`
      return `![${alt || '图片'}](img/${filename})`
    }
    return `![${alt || '图片'}](${src})`
  })
  
  // 处理没有 alt 属性的图片
  markdown = markdown.replace(/<img[^>]+src="([^"]+)"[^>]*>/g, (match, src) => {
    // 如果是 Base64 图片，移除
    if (src.startsWith('data:image')) {
      return '![图片](图片已移除，请重新上传)'
    }
    // 如果是 URL 图片，替换为相对路径
    if (src.startsWith('http://') || src.startsWith('https://')) {
      const ext = src.split('.').pop().split('?')[0] || 'png'
      const filename = `image_${imageIndex++}.${ext}`
      return `![图片](img/${filename})`
    }
    return `![图片](${src})`
  })
  
  // 继续处理其他 HTML 标签...
  
  // 标题
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n\n')
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/g, '#### $1\n\n')
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/g, '##### $1\n\n')
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/g, '###### $1\n\n')
  
  // 粗体和斜体
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/g, '**$1**')
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/g, '*$1*')
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/g, '$1')
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~')
  
  // 代码
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '\n```\n$1\n```\n\n')
  
  // 列表
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gs, '\n$1\n')
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gs, '\n$1\n')
  
  // 引用
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, '\n> $1\n\n')
  
  // 段落
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
  
  // 分隔线
  markdown = markdown.replace(/<hr[^>]*>/g, '\n---\n\n')
  
  // 链接
  markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
  
  // 换行
  markdown = markdown.replace(/<br\s*\/?>/g, '\n')
  
  // 移除其他 HTML 标签
  markdown = markdown.replace(/<[^>]+>/g, '')
  
  // 解码 HTML 实体
  markdown = markdown.replace(/&nbsp;/g, ' ')
  markdown = markdown.replace(/&lt;/g, '<')
  markdown = markdown.replace(/&gt;/g, '>')
  markdown = markdown.replace(/&amp;/g, '&')
  markdown = markdown.replace(/&quot;/g, '"')
  
  // 清理多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  
  return markdown.trim()
}

// 下载带图片的 Markdown（创建 ZIP 包）
const downloadWithImages = async (title, markdownContent, imageUrls) => {
  try {
    // 动态导入 JSZip
    const JSZip = (await import('jszip')).default
    const zip = new JSZip()
    
    // 添加 Markdown 文件
    zip.file(`${title}.md`, markdownContent)
    
    // 创建 img 文件夹
    const imgFolder = zip.folder('img')
    
    // 下载并添加图片
    const loadingMsg = ElMessage({
      message: `正在下载图片... (0/${imageUrls.length})`,
      type: 'info',
      duration: 0
    })
    
    for (let i = 0; i < imageUrls.length; i++) {
      try {
        const imageUrl = imageUrls[i]
        const ext = imageUrl.split('.').pop().split('?')[0] || 'png'
        const filename = `image_${i}.${ext}`
        
        // 更新进度
        loadingMsg.message = `正在下载图片... (${i + 1}/${imageUrls.length})`
        
        // 下载图片
        const response = await fetch(imageUrl)
        const blob = await response.blob()
        
        // 添加到 ZIP
        imgFolder.file(filename, blob)
      } catch (error) {
        console.error(`下载图片失败: ${imageUrls[i]}`, error)
        // 继续下载其他图片
      }
    }
    
    loadingMsg.close()
    
    // 生成 ZIP 文件
    const loadingZipMsg = ElMessage({
      message: '正在生成压缩包...',
      type: 'info',
      duration: 0
    })
    
    const zipBlob = await zip.generateAsync({ type: 'blob' })
    
    loadingZipMsg.close()
    
    // 下载 ZIP 文件
    const url = window.URL.createObjectURL(zipBlob)
    const link = document.createElement('a')
    link.href = url
    link.setAttribute('download', `${title}.zip`)
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.URL.revokeObjectURL(url)
    
    ElMessage.success('下载成功')
  } catch (error) {
    console.error('创建 ZIP 失败:', error)
    ElMessage.error('下载失败: ' + (error.message || '未知错误'))
  }
}

const deleteItem = async () => {
  if (!selectedItem.value) return
  
  try {
    await ElMessageBox.confirm(
      `确定要删除"${selectedItem.value.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const endpoint = props.contentType === 'notes' 
      ? `/notes/${selectedItem.value.id}` 
      : `/mindmaps/${selectedItem.value.id}`
    
    await http.delete(endpoint)
    ElMessage.success('删除成功')
    
    // Reload items and select next available
    await loadItems()
    if (items.value.length > 0) {
      selectItem(items.value[0])
    } else {
      selectedItem.value = null
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

// 从下拉菜单编辑项目
const editItemFromDropdown = (item) => {
  selectItem(item)
  setTimeout(() => {
    editItem()
  }, 100)
}

// 从下拉菜单下载项目
const downloadItemFromDropdown = async (item) => {
  const previousItem = selectedItem.value
  selectedItem.value = item
  await downloadItem()
  selectedItem.value = previousItem
}

// 从下拉菜单删除项目
const deleteItemFromDropdown = async (item) => {
  try {
    await ElMessageBox.confirm(
      `确定要删除"${item.title}"吗？`,
      '确认删除',
      {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }
    )
    
    const endpoint = props.contentType === 'notes' 
      ? `/notes/${item.id}` 
      : `/mindmaps/${item.id}`
    
    await http.delete(endpoint)
    ElMessage.success('删除成功')
    
    // 如果删除的是当前选中项，清除选中
    if (selectedItem.value?.id === item.id) {
      selectedItem.value = null
    }
    
    // Reload items and select next available
    await loadItems()
    if (items.value.length > 0 && !selectedItem.value) {
      selectItem(items.value[0])
    }
  } catch (error) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const saveItem = async () => {
  try {
    const endpoint = props.contentType === 'notes' ? '/notes' : '/mindmaps'
    // 确保 categoryId 被正确设置
    const data = {
      ...itemForm.value,
      categoryId: itemForm.value.categoryId || props.categoryId
    }
    
    if (editingItem.value) {
      await http.put(`${endpoint}/${editingItem.value.id}`, data)
      ElMessage.success('更新成功')
      showAddDialog.value = false
      resetForm()
      loadItems()
    } else {
      // 创建新项目
      const response = await http.post(endpoint, data)
      ElMessage.success('创建成功')
      showAddDialog.value = false
      resetForm()
      
      // 重新加载列表
      await loadItems()
      
      // 对于笔记，创建后直接在当前页面显示
      if (props.contentType === 'notes') {
        // 选中新创建的笔记
        const createdItem = items.value.find(item => item.id === response.data.id)
        if (createdItem) {
          selectItem(createdItem)
        }
      }
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + error.message)
  }
}

const resetForm = () => {
  editingItem.value = null
  itemForm.value = {
    title: '',
    description: '',
    content: '',
    tags: '',
    visibility: 'private',
    categoryId: props.categoryId // 重置为当前分类ID
  }
}

// 返回上一页
const goBack = () => {
  router.back()
}

// 新增方法用于显示添加对话框
const showAddItem = () => {
  // 使用弹窗方式创建新笔记
  resetForm()
  itemForm.value.categoryId = props.categoryId
  showAddDialog.value = true
}

// 直接创建新笔记的方法
const createNewNote = () => {
  // 进入创建模式
  isCreating.value = true
  isEditing.value = false // 确保退出编辑模式
  
  // 使用 nextTick 确保 DOM 更新后再设置 selectedItem
  nextTick(() => {
    try {
      selectedItem.value = null // 清除选中项
    } catch (e) {
      console.error('设置selectedItem时出错:', e)
      selectedItem.value = null
    }
  })
  
  activeTab.value = 'edit'
  newNoteForm.value = {
    title: '',
    description: '',
    content: '',
    tags: '',
    visibility: 'private',
    coverKey: '',
    categoryId: props.categoryId
  }
}

// 直接创建新思维导图的方法
const createNewMindmap = () => {
  // 进入创建模式
  isCreating.value = true
  isEditing.value = false // 确保退出编辑模式
  
  // 使用 nextTick 确保 DOM 更新后再设置 selectedItem
  nextTick(() => {
    try {
      selectedItem.value = null // 清除选中项
    } catch (e) {
      console.error('设置selectedItem时出错:', e)
      selectedItem.value = null
    }
  })
  
  newMindmapForm.value = {
    title: '',
    description: '',
    visibility: 'private',
    categoryId: props.categoryId
  }
  
  // 初始化临时思维导图对象
  tempMindmap.value = {
    id: null,
    title: '',
    description: '',
    content: null
  }
}

// 保存新建笔记的方法
const saveNewNote = async () => {
  if (!newNoteForm.value.title || !newNoteForm.value.title.trim()) {
    ElMessage.warning('请输入笔记标题')
    return
  }
  
  try {
    // 显示加载状态
    const loadingMsg = ElMessage({
      message: '正在创建笔记...',
      type: 'info',
      duration: 0
    })
    
    // 从 Tiptap 编辑器获取 Markdown 格式内容
    let contentToSave = newNoteForm.value.content
    if (createEditorRef.value && createEditorRef.value.getMarkdown) {
      // 使用 Markdown 格式保存，保持兼容性
      contentToSave = createEditorRef.value.getMarkdown()
    }
    
    // 创建新笔记
    const data = {
      title: newNoteForm.value.title,
      description: newNoteForm.value.description,
      content: contentToSave,
      visibility: newNoteForm.value.visibility,
      categoryId: props.categoryId,
      coverKey: newNoteForm.value.coverKey
    }
    
    const response = await http.post('/notes', data)
    
    // 关闭加载提示
    loadingMsg.close()
    ElMessage.success('笔记创建成功')
    
    // 退出创建模式
    isCreating.value = false
    
    // 静态添加到列表（不重新加载）
    const newItem = {
      ...response.data,
      type: 'note'
    }
    items.value.unshift(newItem)
    
    // 选中新创建的笔记
    selectItem(newItem)
    
    // ❌ 不要重新加载列表，会导致卡顿
    // await loadItems()
  } catch (error) {
    console.error('创建笔记失败:', error)
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  }
}

// 保存新建的思维导图
const saveNewMindmap = async () => {
  if (!newMindmapForm.value.title || !newMindmapForm.value.title.trim()) {
    ElMessage.warning('请输入思维导图标题')
    return
  }
  
  try {
    // 创建新思维导图
    const data = {
      title: newMindmapForm.value.title,
      description: newMindmapForm.value.description,
      visibility: newMindmapForm.value.visibility,
      categoryId: props.categoryId,
      content: tempMindmap.value.content
    }
    console.log('创建思维导图请求数据:', data)
    
    const response = await http.post('/mindmaps', data)
    console.log('思维导图创建成功，响应数据:', response.data)
    ElMessage.success('思维导图创建成功')
    
    // 退出创建模式
    isCreating.value = false
    
    // 重新加载列表
    await loadItems()
    console.log('列表重新加载完成，当前项目数:', items.value.length)
    
    // 选中新创建的思维导图
    const createdItem = items.value.find(item => item.id === response.data.id)
    console.log('找到新创建的思维导图:', createdItem)
    if (createdItem) {
      selectItem(createdItem)
    } else {
      console.log('未找到新创建的思维导图，尝试选择第一个')
      if (items.value.length > 0) {
        selectItem(items.value[0])
      }
    }
  } catch (error) {
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  }
}

const cancelCreate = () => {
  isCreating.value = false
  // 如果有笔记项目，选择第一个
  if (items.value.length > 0) {
    selectItem(items.value[0])
  } else {
    // 如果没有笔记项目，清除选中项
    selectedItem.value = null
  }
}

// 删除不再需要的函数
const startCreateNote = () => {
  // 此函数已被移除，使用弹窗方式替代
}

// 上传封面
async function onCoverChange(file) {
  try {
    const formData = new FormData()
    formData.append('file', file.raw)
    formData.append('dir', 'images')
    
    const { data } = await http.post('/files/upload', formData)
    newNoteForm.value.coverKey = data
    ElMessage.success('封面上传成功')
  } catch (error) {
    ElMessage.error('封面上传失败')
  }
}

// 删除封面
function removeCover() {
  newNoteForm.value.coverKey = ''
}

// 上传图片并插入到新建笔记内容中（光标位置）
async function onImageChange(file) {
  try {
    const formData = new FormData()
    formData.append('file', file.raw)
    formData.append('dir', 'images')
    
    const { data } = await http.post('/files/upload', formData)
    
    // 将图片链接插入到内容中
    const imageUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${data}`
    const imageMarkdown = `\n![image](${imageUrl})\n`
    
    // 获取光标位置并插入
    if (newNoteTextarea.value) {
      const textarea = newNoteTextarea.value.textarea || newNoteTextarea.value.$el?.querySelector('textarea')
      if (textarea) {
        const cursorPos = textarea.selectionStart
        const content = newNoteForm.value.content
        newNoteForm.value.content = 
          content.substring(0, cursorPos) + 
          imageMarkdown + 
          content.substring(cursorPos)
        
        // 设置新的光标位置
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length
          textarea.focus()
        }, 0)
      } else {
        // 如果无法获取光标位置，追加到末尾
        newNoteForm.value.content += imageMarkdown
      }
    } else {
      newNoteForm.value.content += imageMarkdown
    }
    
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('图片上传失败')
  }
}

// 上传图片并插入到编辑内容中（光标位置）
async function onEditImageChange(file) {
  try {
    const formData = new FormData()
    formData.append('file', file.raw)
    formData.append('dir', 'images')
    
    const { data } = await http.post('/files/upload', formData)
    
    // 将图片链接插入到内容中
    const imageUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${data}`
    const imageMarkdown = `\n![image](${imageUrl})\n`
    
    // 获取光标位置并插入
    if (editTextarea.value) {
      const textarea = editTextarea.value.textarea || editTextarea.value.$el?.querySelector('textarea')
      if (textarea) {
        const cursorPos = textarea.selectionStart
        const content = editingContent.value
        editingContent.value = 
          content.substring(0, cursorPos) + 
          imageMarkdown + 
          content.substring(cursorPos)
        
        // 设置新的光标位置
        setTimeout(() => {
          textarea.selectionStart = textarea.selectionEnd = cursorPos + imageMarkdown.length
          textarea.focus()
        }, 0)
      } else {
        // 如果无法获取光标位置，追加到末尾
        editingContent.value += imageMarkdown
      }
    } else {
      editingContent.value += imageMarkdown
    }
    
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('图片上传失败')
  }
}

// 生成封面URL
function coverUrl(key) {
  return `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${key}`
}

// 处理思维导图导入
async function handleMindmapImport(options) {
  const { file } = options
  
  try {
    ElMessage.info('正在解析XMind文件...')
    
    // 动态导入解析器
    const { parseXMindFile, convertToProjectFormat } = await import('@/utils/xmindParser.js')
    
    // 前端解析XMind文件
    const xmindData = await parseXMindFile(file)
    
    // 转换为项目格式 { nodeData: {...}, linkData: {} }
    const projectData = convertToProjectFormat(xmindData)
    
    // 统计节点数
    const nodeCount = countNodesInData(projectData.nodeData)
    
    // 提取标题
    const title = file.name.replace('.xmind', '').replace('.mmap', '') || '思维导图'
    
    console.log('解析完成，准备上传:', { title, nodeCount, data: projectData })
    
    ElMessage.info('正在保存思维导图...')
    
    // 发送JSON数据到后端
    const { data } = await http.post('/mindmaps/import-json', {
      categoryId: props.categoryId,
      title: title,
      content: JSON.stringify(projectData),
      nodeCount: nodeCount,
      visibility: 'private'
    })
    
    ElMessage.success('导入成功！')
    await loadItems()
    
    // 选中新导入的思维导图
    if (data && data.id) {
      const importedItem = items.value.find(item => item.id === data.id)
      if (importedItem) {
        selectItem(importedItem)
      }
    }
  } catch (error) {
    console.error('导入失败:', error)
    ElMessage.error('导入失败: ' + (error.message || '未知错误'))
  }
}

// 保存思维导图
const saveMindmap = async (mindmapData) => {
  try {
    if (!selectedItem.value || !selectedItem.value.id) {
      ElMessage.error('未选中思维导图')
      return
    }
    
    const data = {
      title: mindmapData.title,
      content: mindmapData.content,
      categoryId: selectedItem.value.categoryId || props.categoryId
    }
    
    await http.put(`/mindmaps/${selectedItem.value.id}`, data)
    ElMessage.success('保存成功')
    
    // 更新本地数据（静态更新，不触发重新渲染）
    selectedItem.value.title = mindmapData.title
    selectedItem.value.content = mindmapData.content
    
    // 只更新列表中的对应项，不重新加载整个列表
    const itemInList = items.value.find(item => item.id === selectedItem.value.id)
    if (itemInList) {
      itemInList.title = mindmapData.title
      itemInList.content = mindmapData.content
    }
    
    // ❌ 不要刷新列表，会导致思维导图重新渲染
    // await loadItems()
  } catch (error) {
    console.error('保存思维导图失败:', error)
    ElMessage.error('保存失败')
  }
}

// 统计节点数量
function countNodesInData(node) {
  if (!node) return 0
  
  let total = 1
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      total += countNodesInData(child)
    })
  }
  return total
}

// 处理文件导入
async function handleImportFile(file) {
  const fileName = file.name
  const fileType = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  
  try {
    if (fileType === '.pdf') {
      // 处理 PDF 文件
      await handlePdfImport(file)
    } else if (fileType === '.md') {
      // 处理 Markdown 文件
      await handleMarkdownImport(file)
    } else {
      ElMessage.error('不支持的文件格式，请上传 .md 或 .pdf 文件')
    }
  } catch (error) {
    console.error('文件导入失败:', error)
    ElMessage.error('文件导入失败')
  }
}

// 处理 PDF 文件导入
async function handlePdfImport(file) {
  try {
    ElMessage.info('正在上传 PDF 文件...')
    
    // 上传 PDF 文件到 OSS
    const formData = new FormData()
    formData.append('file', file.raw)
    formData.append('dir', 'pdfs')
    
    const { data: pdfKey } = await http.post('/files/upload', formData)
    const pdfUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${pdfKey}`
    
    // 创建笔记，内容为 PDF 嵌入显示（直接使用后端代理）
    const title = file.name.replace('.pdf', '')
    // 使用后端代理 URL（使用后端端口 8081）
    const backendUrl = window.location.hostname === 'localhost' 
      ? 'http://localhost:8081' 
      : window.location.origin
    const proxyUrl = `${backendUrl}/api/files/proxy-pdf?key=${encodeURIComponent(pdfKey)}`
    
    const content = `# ${title}

<div class="pdf-viewer-wrapper">
  <iframe src="${proxyUrl}" class="pdf-viewer-iframe" type="application/pdf"></iframe>
</div>`
    
    const noteData = {
      title: title,
      content: content,
      categoryId: props.categoryId,
      visibility: 'private',
      tags: 'PDF导入'
    }
    
    await http.post('/notes', noteData)
    ElMessage.success('PDF 文件导入成功')
    loadItems()
  } catch (error) {
    console.error('PDF 导入失败:', error)
    throw error
  }
}

// 处理 Markdown 文件导入
async function handleMarkdownImport(file) {
  try {
    ElMessage.info('正在处理 Markdown 文件...')
    
    // 读取文件内容
    const text = await file.raw.text()
    
    // 提取标题（第一行 # 开头）
    const titleMatch = text.match(/^#\s+(.+)$/m)
    const title = titleMatch ? titleMatch[1] : file.name.replace('.md', '')
    
    // 处理图片：查找所有图片引用
    const imageRegex = /!\[([^\]]*)\]\(([^)]+)\)/g
    let processedContent = text
    const imageMatches = [...text.matchAll(imageRegex)]
    
    if (imageMatches.length > 0) {
      ElMessage.info(`发现 ${imageMatches.length} 张图片，正在上传...`)
      
      // 处理每个图片
      for (const match of imageMatches) {
        const fullMatch = match[0]
        const altText = match[1]
        const imagePath = match[2]
        
        // 如果是相对路径或本地路径，需要提示用户
        if (!imagePath.startsWith('http://') && !imagePath.startsWith('https://')) {
          console.warn('发现本地图片路径:', imagePath)
          // 保持原样，或者可以提示用户手动上传
          ElMessage.warning(`图片 "${imagePath}" 是本地路径，请手动上传后替换`)
        } else if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
          // 网络图片，尝试下载并上传到 OSS
          try {
            const imageUrl = await downloadAndUploadImage(imagePath)
            processedContent = processedContent.replace(fullMatch, `![${altText}](${imageUrl})`)
          } catch (error) {
            console.error('图片上传失败:', imagePath, error)
            ElMessage.warning(`图片 "${imagePath}" 上传失败，保持原链接`)
          }
        }
      }
    }
    
    // 创建笔记
    const noteData = {
      title: title,
      content: processedContent,
      categoryId: props.categoryId,
      visibility: 'private',
      tags: 'Markdown导入'
    }
    
    await http.post('/notes', noteData)
    ElMessage.success('Markdown 文件导入成功')
    loadItems()
  } catch (error) {
    console.error('Markdown 导入失败:', error)
    throw error
  }
}

// 下载网络图片并上传到 OSS
async function downloadAndUploadImage(imageUrl) {
  try {
    // 通过后端代理下载图片
    const response = await http.post('/files/download-and-upload', {
      url: imageUrl,
      dir: 'images'
    })
    
    return `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${response.data}`
  } catch (error) {
    console.error('图片下载上传失败:', error)
    throw error
  }
}

// 处理思维导图保存事件
const handleMindmapSave = (mindmapData) => {
  // 更新临时思维导图数据
  tempMindmap.value.content = mindmapData
  // 调用保存函数
  saveNewMindmap()
}

// 监控 noteContent 变化
watch(noteContent, (newValue, oldValue) => {
  console.log('noteContent发生变化:', {
    oldLength: oldValue?.length || 0,
    newLength: newValue?.length || 0,
    newContent: newValue?.substring(0, 100) + '...'
  })
})

// 监控 selectedItem 变化
watch(selectedItem, (newValue, oldValue) => {
  console.log('selectedItem发生变化:', {
    oldId: oldValue?.id,
    newId: newValue?.id,
    newTitle: newValue?.title
  })
})

// Lifecycle
onMounted(() => {
  console.log('🚀 KnowledgeContent组件挂载完成')
  console.log('📋 Props:', { contentType: props.contentType, categoryId: props.categoryId })
  loadCategory()
  loadItems()
})

onBeforeUnmount(() => {
  // Cleanup scroll listener
  const container = document.querySelector('.content-body') || 
                   document.querySelector('.main-content')
  if (container) {
    container.removeEventListener('scroll', handleOutlineScroll)
  }
})

// Watch for route changes
watch(() => [props.contentType, props.categoryId], () => {
  // 当 categoryId 改变时，更新表单中的 categoryId
  itemForm.value.categoryId = props.categoryId
  newNoteForm.value.categoryId = props.categoryId
  loadCategory()
  loadItems()
})
</script>

<style scoped>
.knowledge-content-layout {
  display: flex;
  height: 100%;
  background: #f5f7fa;
  overflow: hidden;
}

/* Sidebar Styles */
.sidebar {
  width: 280px;
  height: 100%;
  background: white;
  border-right: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  transition: width 0.3s ease;
}

.sidebar.collapsed {
  width: 60px;
}

.sidebar-header {
  padding: 16px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.back-btn {
  padding: 4px;
  color: #606266;
  font-size: 22px;
  flex-shrink: 0;
  font-weight: 1000;
}

.back-btn:hover {
  color: #409eff;
}

.sidebar-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar.collapsed .sidebar-header h3 {
  display: none;
}

.sidebar.collapsed .back-btn {
  display: none;
}

.collapse-btn {
  padding: 4px;
  flex-shrink: 0;
}

.sidebar-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
  min-height: 0;
}

.sidebar.collapsed .sidebar-content {
  padding: 8px;
}

.search-box {
  margin-bottom: 16px;
}

.sidebar.collapsed .search-box {
  display: none;
}

.content-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.content-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 8px 12px;
  border-radius: 8px;
  transition: all 0.3s ease;
  border: 1px solid transparent;
  position: relative;
}

.content-item:hover {
  background: #f5f7fa;
  border-color: #d1dbe5;
}

.content-item.active {
  background: #e6f7ff;
  border-color: #91d5ff;
  color: #1890ff;
}

/* 大纲项样式 */
.outline-item {
  display: flex;
  align-items: center;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s ease;
  cursor: pointer;
  margin-bottom: 2px;
}

.outline-item:hover {
  background: #f5f7fa;
}

.outline-item.active {
  background: #e7f1f7;
  /* border-left: 3px solid #1890ff; */
  padding-left: 5px;
}

.outline-indent {
  flex-shrink: 0;
}

.outline-toggle-icon {
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 4px;
  flex-shrink: 0;
  border-radius: 3px;
  transition: background 0.2s;
}

.outline-toggle-icon:hover {
  background: rgba(0, 0, 0, 0.06);
}

.collapse-icon {
  transition: transform 0.2s;
}

.no-children-spacer {
  display: inline-block;
  width: 14px;
}

.outline-item .item-title {
  font-size: 13px;
  font-weight: 400;
  margin-bottom: 0;
  line-height: 1.4;
}

/* 折叠状态下的大纲项 */
.sidebar.collapsed .outline-item {
  padding: 8px 4px;
  justify-content: center;
}

.sidebar.collapsed .outline-indent {
  display: none;
}

.sidebar.collapsed .outline-toggle-icon {
  margin-right: 0;
}

.sidebar.collapsed .outline-item .item-info {
  display: none;
}

.sidebar.collapsed .outline-item.active {
  border-left: none;
  padding-left: 4px;
}

.item-main {
  display: flex;
  align-items: center;
  flex: 1;
  cursor: pointer;
  min-width: 0;
}

.item-icon {
  margin-right: 12px;
  flex-shrink: 0;
}

.sidebar.collapsed .item-icon {
  margin-right: 0;
}

.item-info {
  flex: 1;
  min-width: 0;
}

.item-more {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 4px;
  cursor: pointer;
  opacity: 0;
  transition: all 0.2s;
  flex-shrink: 0;
  margin-left: 8px;
}

.content-item:hover .item-more {
  opacity: 1;
}

.item-more:hover {
  background: rgba(0, 0, 0, 0.06);
}

.content-item.active .item-more {
  opacity: 1;
}

.item-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 4px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sidebar.collapsed .item-title {
  display: none;
}

.item-meta {
  font-size: 12px;
  color: #909399;
  display: flex;
  gap: 8px;
}

.sidebar.collapsed .item-meta {
  display: none;
}

.empty-state {
  padding: 40px 20px;
  text-align: center;
}

.outline-toggle {
  margin-bottom: 12px;
  display: flex;
  justify-content: flex-end;
}

.outline-toggle-btn {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: background 0.2s;
  user-select: none;
}

.outline-toggle-btn:hover {
  background: rgba(0, 0, 0, 0.04);
}

.toggle-symbol {
  font-size: 18px;
  font-weight: bold;
  color: #606266;
  line-height: 1;
}

.toggle-text {
  font-size: 13px;
  color: #606266;
  font-weight: 500;
}

.sidebar-footer {
  padding: 16px;
  border-top: 1px solid #e4e7ed;
  display: flex;
  flex-direction: column;
  gap: 10px;
  flex-shrink: 0;
  background: white;
}

.import-btn {
  /* width: 100%; */
  width: 248px !important;
  
}

.sidebar.collapsed .sidebar-footer {
  padding: 8px;
}

.add-btn {
  width: 100%;
}

.sidebar.collapsed .add-btn span {
  display: none;
}

/* Main Content Styles */
.main-content {
  flex: 1;
  background: white;
  overflow-y: auto;
  transition: margin-left 0.3s ease;
  padding: 0;
}

.content-display {
  height: 100%;
  display: flex;
  flex-direction: column;
  max-width: 100%;
}

/* 新的简化标题栏 */
.content-title-bar {
  padding: 0px 24px;
  border-bottom: 1px solid #e4e7ed;
  background: #ffffff;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.content-title-bar h1 {
  margin: 0;
  font-size: 24px;
  font-weight: 600;
  color: #303133;
}

.create-actions {
  display: flex;
  gap: 8px;
}

/* 保留旧样式以防其他地方使用 */
.content-header {
  padding: 16px 24px;
  border-bottom: 1px solid #e4e7ed;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
}

.header-left h1 {
  margin: 0 0 8px 0;
  font-size: 20px;
  font-weight: 600;
  color: #303133;
}

.content-meta {
  display: flex;
  gap: 12px;
  font-size: 12px;
  color: #909399;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.content-body {
  flex: 1;
  padding: 0;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.note-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

/* PDF 笔记特殊样式：占满整个区域 */
.note-content.pdf-note {
  padding: 0;
  margin: 0;
}

.pdf-content-display {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

.pdf-readonly-content {
  flex: 1;
  height: 100%;
  width: 100%;
  padding: 0;
  margin: 0;
  overflow: hidden;
}

/* PDF 笔记中隐藏 Markdown 标题（不是 PDF 查看器的工具栏） */
.pdf-readonly-content :deep(h1:first-child) {
  display: none;
}

/* PDF 查看器容器占满空间 */
.pdf-readonly-content :deep(.pdf-viewer-wrapper) {
  height: 100%;
  width: 100%;
  margin: 0;
  display: flex;
  flex-direction: column;
}

/* PDF iframe 占满整个空间，保留查看器工具栏 */
.pdf-readonly-content :deep(.pdf-viewer-iframe) {
  flex: 1;
  width: 100%;
  height: 100%;
  min-height: unset;
  border: none;
  border-radius: 0;
}

.content-display-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #ffffff;
  padding: 24px;
  overflow-x: hidden;
}

.readonly-content {
  line-height: 1.8;
  font-size: 16px;
  color: #303133;
  padding: 20px;
  border-radius: 4px;
  background: white;
  width: 100%;
  flex: 1;
  overflow-y: auto;
}

.readonly-toolbar {
  padding: 12px 24px;
  background: #ffffff;
}

.edit-mode {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-container {
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 20px;
}

.editor-actions {
  display: flex;
  gap: 10px;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: calc(100% - 60px);
}

.md-editor {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.editor-textarea {
  flex: 1;
  height: 100%;
}

.editor-textarea :deep(.el-textarea__inner) {
  height: 100% !important;
  resize: none;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', 'Consolas', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.md-preview {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
}

.readonly-content {
  line-height: 1.8;
  font-size: 16px;
  color: #303133;
  padding: 20px;
  border-radius: 4px;
  background: white;
  max-width: 100%;
  margin: 0 auto;
  flex: 1;
  overflow-y: auto;
}

.readonly-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 10px auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  max-height: 500px;
  object-fit: contain;
}

.readonly-content :deep(h1),
.readonly-content :deep(h2),
.readonly-content :deep(h3),
.readonly-content :deep(h4),
.readonly-content :deep(h5),
.readonly-content :deep(h6) {
  margin-top: 24px;
  margin-bottom: 16px;
  font-weight: 600;
  line-height: 1.25;
}

.readonly-content :deep(p) {
  margin-bottom: 16px;
}

.readonly-content :deep(code) {
  background: #f6f8fa;
  padding: 2px 4px;
  border-radius: 3px;
  font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, monospace;
  font-size: 14px;
}

.readonly-content :deep(pre) {
  background: #f6f8fa;
  padding: 16px;
  border-radius: 6px;
  overflow-x: auto;
  margin-bottom: 16px;
}

.readonly-content :deep(blockquote) {
  border-left: 4px solid #dfe2e5;
  padding-left: 16px;
  margin: 16px 0;
  color: #6a737d;
}

/* PDF 查看器样式（用于 Markdown 笔记中嵌入的 PDF） */
.readonly-content :deep(.pdf-viewer-wrapper) {
  width: 100%;
  margin: 24px 0;
  background: #fff;
}

.readonly-content :deep(.pdf-viewer-iframe) {
  width: 100%;
  min-height: 800px;
  height: calc(100vh - 250px);
  border: 1px solid #e4e7ed;
  border-radius: 6px;
  display: block;
  background: #fff;
}

.md-editor{border:1px solid #e4e7ed;border-radius:8px}
.md-toolbar{padding:8px;border-bottom:1px solid #e4e7ed;background:#fafafa}
.md-body{padding:12px}

.readonly-content :deep(ul),
.readonly-content :deep(ol) {
  padding-left: 32px;
  margin-bottom: 16px;
}

.mindmap-content {
  flex: 1;
  height: 100%;
  display: flex;
  flex-direction: column;
}

.mindmap-info {
  width: 100%;
  max-width: 800px;
  background: white;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.1);
  padding: 24px;
}

.mindmap-header h2 {
  margin: 0 0 16px 0;
  color: #303133;
  font-size: 24px;
  font-weight: 600;
}

.mindmap-meta {
  display: flex;
  gap: 20px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}

.meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
  font-size: 14px;
  color: #909399;
}

.mindmap-description {
  color: #606266;
  font-size: 16px;
  line-height: 1.6;
  margin-bottom: 24px;
}

.mindmap-actions {
  display: flex;
  gap: 12px;
  flex-wrap: wrap;
}

.mindmap-placeholder {
  text-align: center;
  padding: 40px;
  background: #f8f9fa;
  border-radius: 12px;
  border: 2px dashed #dee2e6;
  width: 100%;
  max-width: 600px;
}

.mindmap-placeholder .el-icon {
  color: #6c757d;
  margin-bottom: 16px;
}

.mindmap-placeholder p {
  color: #6c757d;
  margin: 0 0 16px 0;
  font-size: 16px;
}

.loading-content {
  padding: 40px;
}

.empty-content {
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 400px;
}

/* 新增笔记编辑器样式 */
.note-editor-container {
  height: 100%;
}

.markdown-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}

.editor-toolbar {
  border-bottom: 1px solid #dcdfe6;
}

.editor-tabs {
  margin: 0 10px;
}

/* 编辑器标签选中状态的文字颜色和底部边框 */
.editor-tabs :deep(.el-tabs__item.is-active) {
  color: #b0d9fe;
}

.editor-tabs :deep(.el-tabs__active-bar) {
  background-color: #b0d9fe;
}

.editor-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.editor-pane,
.preview-pane {
  flex: 1;
  overflow-y: auto;
  padding: 10px;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.markdown-textarea {
  height: calc(100% - 80px);
}

.markdown-textarea :deep(.el-textarea__inner) {
  height: 100%;
  font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
}

.image-upload-area {
  display: flex;
  align-items: center;
  padding: 10px 0;
  border-top: 1px solid #dcdfe6;
  margin-top: 10px;
}

.image-upload {
  margin-right: 15px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
}

.preview-pane {
  background-color: #f5f7fa;
}

.readonly-content :deep(img) {
  max-width: 100%;
  height: auto;
  display: block;
  margin: 10px auto;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.readonly-content {
  line-height: 1.8;
  font-size: 16px;
  color: #303133;
  padding: 20px;
  border-radius: 4px;
  background: white;
  max-width: 100%;
}

.cover-preview {
  margin-top: 10px;
  position: relative;
  display: inline-block;
}

.cover-preview img {
  max-width: 100%;
  max-height: 150px;
  border-radius: 4px;
}

.remove-cover-btn {
  position: absolute;
  top: 5px;
  right: 5px;
  opacity: 0.8;
}

/* 创建笔记头部表单样式 */
.create-note-header {
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 5px;
}

.create-note-header :deep(.el-form-item) {
  margin-bottom: 16px;
}

.create-note-header :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

/* 创建思维导图头部表单样式 */
.create-mindmap-header {
  padding: 20px;
  background: white;
  border-bottom: 1px solid #e4e7ed;
  margin-bottom: 20px;
  flex-shrink: 0;
}

.create-mindmap-header :deep(.el-form-item) {
  margin-bottom: 16px;
}

.create-mindmap-header :deep(.el-form-item:last-child) {
  margin-bottom: 0;
}

.mindmap-editor-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 创建思维导图表单样式 */
.mindmap-create-form {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 40px 20px;
  height: 100%;
  overflow-y: auto;
}

.create-form-container {
  width: 100%;
  max-width: 600px;
  background: white;
  border-radius: 8px;
  padding: 32px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.1);
}

.form-title {
  font-size: 24px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 24px;
  text-align: center;
}

.mindmap-form {
  margin-top: 20px;
}

.form-actions {
  display: flex;
  gap: 12px;
  justify-content: center;
}

.form-tip {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  padding: 12px 16px;
  background: #f0f9ff;
  border: 1px solid #bfdbfe;
  border-radius: 6px;
  margin-top: 20px;
  font-size: 14px;
  color: #1e40af;
  line-height: 1.6;
}

.form-tip .el-icon {
  flex-shrink: 0;
  margin-top: 2px;
  font-size: 16px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .knowledge-content-layout {
    flex-direction: column;
    height: auto;
  }
  
  .sidebar {
    width: 100%;
    height: 300px;
    border-right: none;
    border-bottom: 1px solid #e4e7ed;
  }
  
  .sidebar.collapsed {
    width: 100%;
    height: 60px;
  }
  
  .main-content {
    height: calc(100vh - 360px);
  }
  
  .main-content.expanded {
    margin-left: 0;
  }
  
  .content-header {
    flex-direction: column;
    gap: 16px;
  }
  
  .header-actions {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>