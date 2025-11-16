<template>
  <div class="mindmap-editor">
    <div class="editor-header">
      <div class="editor-title">
        <el-input 
          v-model="localMindmap.title" 
          placeholder="请输入思维导图标题"
          size="small"
        />
      </div>
      <div class="editor-actions">
        <el-button-group>
          <el-button size="small" @click="zoomIn" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
          <el-button size="small" @click="zoomOut" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-button type="primary" size="small" @click="saveMindmap" style="margin-left: 8px;">
          <el-icon><Upload /></el-icon>
          保存
        </el-button>
        <el-button size="small" @click="showShortcutHelp = true">
          <el-icon><Help /></el-icon>
          帮助
        </el-button>
      </div>
    </div>

    <div class="editor-container">
      <div class="editor-main">
        <div ref="mindmapContainer" class="mindmap-container"></div>
      </div>
    </div>

    <!-- 图片上传对话框 -->
    <el-dialog v-model="showImageUpload" title="上传图片" width="500px">
      <el-upload
        :auto-upload="false"
        :on-change="handleImageUpload"
        :show-file-list="true"
        accept="image/*"
        drag
      >
        <el-icon class="el-icon--upload"><Upload /></el-icon>
        <div class="el-upload__text">
          将文件拖到此处，或<em>点击上传</em>
        </div>
      </el-upload>
      <template #footer>
        <el-button @click="showImageUpload = false">取消</el-button>
        <el-button type="primary" @click="confirmImageUpload">确定</el-button>
      </template>
    </el-dialog>

    <!-- 备注编辑对话框 -->
    <el-dialog v-model="showNoteEditor" title="编辑备注" width="600px">
      <el-input
        v-model="nodeNote"
        type="textarea"
        :rows="6"
        placeholder="请输入备注内容"
      />
      <template #footer>
        <el-button @click="showNoteEditor = false">取消</el-button>
        <el-button type="primary" @click="confirmNoteEdit">确定</el-button>
      </template>
    </el-dialog>

    <!-- 图片查看对话框 -->
    <el-dialog v-model="showImageViewer" title="查看图片" width="800px">
      <div class="image-viewer">
        <img :src="currentViewImage" alt="" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto;" />
      </div>
      <template #footer>
        <el-button type="primary" @click="showImageViewer = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 快捷键帮助对话框 -->
    <el-dialog v-model="showShortcutHelp" title="快捷键说明" width="600px">
      <div class="shortcut-help">
        <h3>基本操作</h3>
        <ul>
          <li><kbd>双击节点</kbd> - 编辑节点内容</li>
          <li><kbd>Tab</kbd> - 插入子主题</li>
          <li><kbd>Enter</kbd> - 插入同级主题</li>
          <li><kbd>Backspace</kbd> - 删除选中主题</li>
          <li><kbd>Ctrl + S</kbd> - 保存当前文件</li>
          <li><kbd>Ctrl + D</kbd> - 插入备注</li>
          <li><kbd>Ctrl + 鼠标滚轮</kbd> - 放大或缩小</li>
          <li><kbd>Escape</kbd> - 退出编辑模式</li>
        </ul>
      </div>
      <template #footer>
        <el-button type="primary" @click="showShortcutHelp = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/api/http'
import { Upload, Picture, Edit, Help, ZoomIn, ZoomOut } from '@element-plus/icons-vue'
import jsMind from 'jsmind'
import 'jsmind/style/jsmind.css'

const props = defineProps({
  mindmap: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['save', 'download'])

// Reactive data
const localMindmap = ref({ ...props.mindmap })
const showImageUpload = ref(false)
const showNoteEditor = ref(false)
const showShortcutHelp = ref(false)
const showImageViewer = ref(false)
const currentViewImage = ref('')
const selectedNode = ref(null)
const nodeNote = ref('')
const mindmapContainer = ref(null)
const jsMindInstance = ref(null)
const uploadedImageFile = ref(null)

// Watch for mindmap changes
watch(() => props.mindmap, (newVal) => {
  localMindmap.value = { ...newVal }
  if (jsMindInstance.value) {
    loadMindmapData()
  }
}, { deep: true })

// Initialize jsMind
const initJsMind = () => {
  try {
    if (!mindmapContainer.value) {
      console.error('Mind map container not found')
      return
    }

    const options = {
      container: mindmapContainer.value,
      editable: true,
      theme: 'primary',
      mode: 'side',
      support_html: true,
      view: {
        hmargin: 100,
        vmargin: 50,
        line_width: 1.5,
        line_color: '#d0d0d0',
        line_style: 'curved'
      },
      layout: {
        hspace: 40,
        vspace: 25,
        pspace: 13
      },
      shortcut: {
        enable: false
      },
      default_event_handle: {
        enable_mousedown_handle: true,
        enable_click_handle: true,
        enable_dblclick_handle: true
      }
    }

    jsMindInstance.value = new jsMind(options)
    
    const mind = jsMindInstance.value
    
    mind.add_event_listener((type, data) => {
      // 只在加载数据时阻止选择事件，不阻止添加/编辑/删除事件
      if (isRefreshing && type === 1) {
        return
      }
      
      if (type === 1) {
        const node = mind.get_node(data.evt)
        selectedNode.value = node
      } else if (type === 2) {
        if (!isRefreshing) {
          autoSave()
        }
      } else if (type === 3) { // add_node
        // 节点添加时，自动选中并进入编辑模式
        const newNodeId = data.data
        if (newNodeId) {
          setTimeout(() => {
            const newNode = mind.get_node(newNodeId)
            if (newNode) {
              mind.select_node(newNodeId)
              // 更新响应式状态
              selectedNode.value = newNode
              mind.begin_edit(newNode)
              // 选中输入框中的文本
              setTimeout(() => {
                const input = document.querySelector('input.jmnode')
                if (input) {
                  input.select()
                }
              }, 50)
            }
          }, 50)
        }
        if (!isRefreshing) {
          autoSave()
        }
      } else if (type === 4) {
        if (!isRefreshing) {
          autoSave()
        }
      }
    })
    
    setupCustomShortcuts(mind)
    
    loadMindmapData()
    
    console.log('jsMind initialized successfully')
  } catch (error) {
    console.error('初始化思维导图失败:', error)
    ElMessage.error('初始化思维导图失败: ' + (error.message || '未知错误'))
  }
}

// Load mindmap data
const loadMindmapData = async (forceRefresh = false) => {
  try {
    if (!jsMindInstance.value) {
      console.error('jsMind instance not initialized')
      return
    }

    // 设置刷新标记，防止在加载过程中触发选择事件
    isRefreshing = true

    let mindData = null
    
    // 如果需要强制刷新，从服务器重新获取最新数据
    if (forceRefresh && localMindmap.value.id) {
      try {
        const response = await http.get(`/mindmaps/${localMindmap.value.id}`)
        if (response.data && response.data.content) {
          localMindmap.value.content = response.data.content
        }
      } catch (e) {
        console.error('获取最新数据失败:', e)
        // 如果获取失败，重置标记并返回
        isRefreshing = false
        return
      }
    }
    
    // Parse content
    if (localMindmap.value.content) {
      if (typeof localMindmap.value.content === 'string') {
        try {
          const parsed = JSON.parse(localMindmap.value.content)
          mindData = convertToJsMindFormat(parsed)
        } catch (e) {
          console.error('解析content失败:', e)
        }
      } else {
        mindData = convertToJsMindFormat(localMindmap.value.content)
      }
    }
    
    // Use default data if no valid data
    if (!mindData) {
      mindData = createDefaultJsMindData()
    }
    
    // Show mind map
    jsMindInstance.value.show(mindData)
    
    // 缩短延迟时间，只需要确保 show() 的同步操作完成即可
    setTimeout(() => {
      isRefreshing = false
    }, 100)
  } catch (error) {
    console.error('加载思维导图数据失败:', error)
    ElMessage.error('加载思维导图数据失败: ' + (error.message || '未知错误'))
    isRefreshing = false
  }
}

// Convert data to jsMind format
const convertToJsMindFormat = (data) => {
  if (!data || !data.nodeData) return null
  
  const convertNode = (node) => {
    const jsmindNode = {
      id: node.id,
      topic: node.topic,
      isroot: node.root || false
    }
    
    if (node.note) {
      jsmindNode.data = jsmindNode.data || {}
      jsmindNode.data.note = node.note
    }
    if (node.images) {
      jsmindNode.data = jsmindNode.data || {}
      jsmindNode.data.images = node.images
    }
    
    if (node.children && node.children.length > 0) {
      jsmindNode.children = node.children.map(convertNode)
    }
    
    return jsmindNode
  }
  
  return {
    meta: {
      name: localMindmap.value.title || '思维导图',
      version: '1.0'
    },
    format: 'node_tree',
    data: convertNode(data.nodeData)
  }
}

// Create default jsMind data
const createDefaultJsMindData = () => {
  return {
    meta: {
      name: localMindmap.value.title || '思维导图',
      version: '1.0'
    },
    format: 'node_tree',
    data: {
      id: 'root',
      topic: localMindmap.value.title || '中心主题',
      isroot: true,
      children: [
        {
          id: jsMind.util.uuid.newid(),
          topic: '子主题1',
          direction: 'right'
        },
        {
          id: jsMind.util.uuid.newid(),
          topic: '子主题2',
          direction: 'right'
        }
      ]
    }
  }
}

const emptyNodes = new Set()

const setupCustomShortcuts = (mind) => {
  document.addEventListener('keydown', (e) => {
    const selectedNode = mind.get_selected_node()
    if (!selectedNode) return
    
    const isEditing = document.querySelector('input.jmnode') !== null
    
    // Tab - 插入子主题
    if (e.key === 'Tab' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      
      if (isEditing) {
        // 编辑状态：先保存当前节点引用，结束编辑，再创建子节点
        const currentNode = selectedNode
        mind.end_edit()
        setTimeout(() => {
          const nodeid = jsMind.util.uuid.newid()
          const topic = '子主题'
          mind.add_node(currentNode, nodeid, topic)
        }, 50)
      } else {
        // 非编辑状态：直接创建子节点
        const nodeid = jsMind.util.uuid.newid()
        const topic = '子主题'
        mind.add_node(selectedNode, nodeid, topic)
      }
    }
    // Enter - 插入同级主题
    else if (e.key === 'Enter' && !e.ctrlKey && !e.shiftKey) {
      e.preventDefault()
      e.stopPropagation()
      
      if (isEditing) {
        // 编辑状态：先保存当前节点引用，结束编辑，再创建同级节点
        const currentNode = selectedNode
        const parentNode = currentNode.parent
        mind.end_edit()
        setTimeout(() => {
          const nodeid = jsMind.util.uuid.newid()
          const topic = '子主题'
          if (parentNode) {
            mind.add_node(parentNode, nodeid, topic, currentNode.id)
          }
        }, 50)
      } else {
        // 非编辑状态：直接创建同级节点
        const nodeid = jsMind.util.uuid.newid()
        const topic = '子主题'
        if (selectedNode.parent) {
          mind.add_node(selectedNode.parent, nodeid, topic, selectedNode.id)
        }
      }
    }
    // Backspace - 删除选中主题
    else if (e.key === 'Backspace' && !e.ctrlKey) {
      if (!isEditing && selectedNode.id !== mind.get_root().id) {
        e.preventDefault()
        e.stopPropagation()
        
        // 在删除前找到下一个应该选中的节点
        let nextNodeToSelect = null
        
        // 1. 优先选择下一个兄弟节点
        if (selectedNode.parent && selectedNode.parent.children) {
          const siblings = selectedNode.parent.children
          const currentIndex = siblings.findIndex(child => child.id === selectedNode.id)
          
          if (currentIndex !== -1) {
            // 尝试选择下一个兄弟
            if (currentIndex < siblings.length - 1) {
              nextNodeToSelect = siblings[currentIndex + 1]
            }
            // 如果没有下一个兄弟，尝试选择上一个兄弟
            else if (currentIndex > 0) {
              nextNodeToSelect = siblings[currentIndex - 1]
            }
          }
        }
        
        // 2. 如果没有兄弟节点，选择父节点
        if (!nextNodeToSelect && selectedNode.parent) {
          nextNodeToSelect = selectedNode.parent
        }
        
        // 删除节点
        mind.remove_node(selectedNode)
        
        // 选中下一个节点并更新响应式状态
        if (nextNodeToSelect) {
          setTimeout(() => {
            mind.select_node(nextNodeToSelect.id)
            // 更新响应式状态，确保侧边栏显示正确的节点信息
            const node = mind.get_node(nextNodeToSelect.id)
            if (node) {
              selectedNode.value = node
            }
          }, 50)
        }
      }
    }
    // Ctrl+D - 插入备注
    else if (e.ctrlKey && e.key === 'd') {
      e.preventDefault()
      e.stopPropagation()
      if (!isEditing) {
        addNoteToNode()
      }
    }
    // Ctrl+S - 保存
    else if (e.ctrlKey && e.key === 's') {
      e.preventDefault()
      e.stopPropagation()
      saveMindmap(false)
    }
    // Escape - 退出编辑
    else if (e.key === 'Escape') {
      if (isEditing) {
        e.preventDefault()
        e.stopPropagation()
        mind.end_edit()
      }
    }
  }, true)  // 使用捕获阶段，确保在输入框之前处理
}

let autoSaveTimer = null
let isRefreshing = false

const autoSave = () => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
  
  autoSaveTimer = setTimeout(async () => {
    await saveMindmap(true)
    console.log('自动保存完成')
  }, 1000)
}

// Save mindmap
const saveMindmap = async (isAutoSave = false) => {
  try {
    if (!jsMindInstance.value) {
      if (!isAutoSave) {
        ElMessage.error('思维导图实例未初始化')
      }
      return
    }

    const mindData = jsMindInstance.value.get_data('node_tree')
    const convertedData = convertFromJsMindFormat(mindData)
    
    const data = {
      content: JSON.stringify(convertedData),
      nodeCount: countNodes(convertedData)
    }

    if (localMindmap.value.id) {
      await http.put(`/mindmaps/${localMindmap.value.id}/data`, data)
      if (!isAutoSave) {
        ElMessage.success('保存成功')
        // 不自动刷新，避免内容消失
      }
    } else {
      const response = await http.post('/mindmaps', {
        ...data,
        title: localMindmap.value.title,
        description: localMindmap.value.description
      })
      if (!isAutoSave) {
        ElMessage.success('创建成功')
      }
      localMindmap.value = { ...localMindmap.value, ...response.data }
    }

    emit('save', data)
  } catch (error) {
    console.error('保存失败:', error)
    if (!isAutoSave) {
      ElMessage.error('保存失败: ' + (error.message || '未知错误'))
    }
  }
}

// Convert from jsMind format
const convertFromJsMindFormat = (jsmindData) => {
  const convertNode = (node) => {
    const standardNode = {
      id: node.id,
      topic: node.topic,
      root: node.id === 'root'
    }
    
    if (node.data) {
      if (node.data.note) standardNode.note = node.data.note
      if (node.data.images) standardNode.images = node.data.images
    }
    
    if (node.children && node.children.length > 0) {
      standardNode.children = node.children.map(convertNode)
    } else {
      standardNode.children = []
    }
    
    return standardNode
  }
  
  return {
    nodeData: convertNode(jsmindData.data),
    linkData: {}
  }
}

// Count nodes
const countNodes = (data) => {
  let count = 0
  const traverse = (node) => {
    if (!node) return
    count++
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(traverse)
    }
  }
  traverse(data.nodeData)
  return count
}

// Zoom in
const zoomIn = () => {
  if (jsMindInstance.value) {
    jsMindInstance.value.view.zoom_in()
  }
}

// Zoom out
const zoomOut = () => {
  if (jsMindInstance.value) {
    jsMindInstance.value.view.zoom_out()
  }
}

// Add image to node
const addImageToNode = () => {
  const node = jsMindInstance.value.get_selected_node()
  if (!node) {
    ElMessage.warning('请先选中一个节点')
    return
  }
  selectedNode.value = node
  showImageUpload.value = true
}

// Handle image upload
const handleImageUpload = (file) => {
  uploadedImageFile.value = file
}

// Confirm image upload
const confirmImageUpload = async () => {
  if (!uploadedImageFile.value || !selectedNode.value) {
    ElMessage.warning('请选择图片文件')
    return
  }

  try {
    const formData = new FormData()
    formData.append('file', uploadedImageFile.value.raw)
    formData.append('nodeId', selectedNode.value.id)
    
    const response = await http.post(`/mindmaps/${localMindmap.value.id}/images?nodeId=${selectedNode.value.id}`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // Update node data
    if (!selectedNode.value.data) {
      selectedNode.value.data = {}
    }
    if (!selectedNode.value.data.images) {
      selectedNode.value.data.images = []
    }
    selectedNode.value.data.images.push({
      url: response.data.url,
      oss_key: response.data.ossKey
    })
    
    showImageUpload.value = false
    uploadedImageFile.value = null
    ElMessage.success('图片添加成功')
    
    // Save
    await saveMindmap()
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败')
  }
}

// Add note to node
const addNoteToNode = () => {
  const node = jsMindInstance.value.get_selected_node()
  if (!node) {
    ElMessage.warning('请先选中一个节点')
    return
  }
  selectedNode.value = node
  nodeNote.value = node.data?.note || ''
  showNoteEditor.value = true
}

// Confirm note edit
const confirmNoteEdit = async () => {
  try {
    if (selectedNode.value) {
      if (!selectedNode.value.data) {
        selectedNode.value.data = {}
      }
      selectedNode.value.data.note = nodeNote.value
      
      showNoteEditor.value = false
      ElMessage.success('备注添加成功')
      
      // Save
      await saveMindmap()
    }
  } catch (error) {
    console.error('备注保存失败:', error)
    ElMessage.error('备注保存失败')
  }
}

// View image
const viewImage = (url) => {
  currentViewImage.value = url
  showImageViewer.value = true
}

// Keyboard shortcuts (handled in setupCustomShortcuts)
const handleKeyDown = (event) => {
  // 已移至 setupCustomShortcuts 中处理
}

// Lifecycle
onMounted(() => {
  setTimeout(() => {
    initJsMind()
  }, 100)
  
  document.addEventListener('keydown', handleKeyDown)
})

onUnmounted(() => {
  document.removeEventListener('keydown', handleKeyDown)
  
  // 清除自动保存定时器
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer)
  }
})
</script>

<style scoped>
.mindmap-editor {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.editor-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  border-bottom: 1px solid #e4e7ed;
  background: #ffffff;
  flex-shrink: 0;
}

.editor-title {
  flex: 1;
  max-width: 400px;
}

.editor-actions {
  display: flex;
  gap: 8px;
  align-items: center;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0;
}

.editor-main {
  flex: 1;
  width: 100%;
  overflow: hidden;
  position: relative;
}

.mindmap-container {
  width: 100%;
  height: 100%;
  background-color: #f5f5f5;
  overflow: hidden;
  position: relative;
}

.shortcut-help h3 {
  margin: 16px 0 8px 0;
  color: #606266;
}

.shortcut-help ul {
  padding-left: 20px;
  margin: 8px 0;
}

.shortcut-help li {
  margin: 8px 0;
  line-height: 1.6;
}

.shortcut-help kbd {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

/* 自定义jsMind节点样式 - 简约风格 */
.mindmap-container :deep(jmnode) {
  background-color: transparent !important;
  background-image: none !important;
  border: 1.5px solid #e0e0e0 !important;
  border-radius: 6px !important;
  padding: 8px 16px !important;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08) !important;
  transition: all 0.2s ease !important;
}

.mindmap-container :deep(jmnode:hover) {
  border-color: #b0b0b0 !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.12) !important;
}

/* 根节点特殊样式 */
.mindmap-container :deep(jmnode.root) {
  border: 2px solid #42b983 !important;
  border-radius: 8px !important;
  padding: 10px 20px !important;
  font-weight: 600 !important;
  font-size: 16px !important;
  box-shadow: 0 2px 8px rgba(66, 185, 131, 0.15) !important;
}

/* 选中节点样式 */
.mindmap-container :deep(jmnode.selected) {
  border-color: #409eff !important;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.25) !important;
}

/* 连接线样式 - 柔和的圆弧 */
.mindmap-container :deep(canvas) {
  opacity: 0.6;
}

/* 节点文本样式 */
.mindmap-container :deep(jmnode) {
  color: #333333 !important;
  font-size: 14px !important;
  line-height: 1.5 !important;
}

.mindmap-container :deep(jmnode.root) {
  color: #42b983 !important;
}
</style>
