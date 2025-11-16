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
          <el-button size="small" @click="undo" title="撤销 (Ctrl+Z)">
            <el-icon><Back /></el-icon>
          </el-button>
          <el-button size="small" @click="redo" title="重做 (Ctrl+Y)">
            <el-icon><Right /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-button-group style="margin-left: 8px;">
          <el-button size="small" @click="zoomIn" title="放大">
            <el-icon><ZoomIn /></el-icon>
          </el-button>
          <el-button size="small" @click="zoomOut" title="缩小">
            <el-icon><ZoomOut /></el-icon>
          </el-button>
          <el-button size="small" @click="resetZoom" title="重置缩放">
            <el-icon><FullScreen /></el-icon>
          </el-button>
        </el-button-group>
        
        <el-button type="primary" size="small" @click="saveMindmap" style="margin-left: 8px;">
          <el-icon><Upload /></el-icon>
          保存
        </el-button>
        <el-button size="small" @click="downloadMindmap">
          <el-icon><Download /></el-icon>
          下载
        </el-button>
        <el-button size="small" @click="showShortcutHelp = true">
          <el-icon><Help /></el-icon>
          快捷键
        </el-button>
      </div>
    </div>

    <div class="editor-container">
      <!-- 左侧编辑区域 -->
      <div class="editor-main">
        <div ref="mindmapContainer" class="mindmap-container"></div>
      </div>

      <!-- 右侧工具面板 -->
      <div class="editor-sidebar">
        <el-tabs v-model="activeToolTab" class="tools-tabs">
          <el-tab-pane label="样式" name="style">
            <div class="tool-section">
              <div class="tool-group">
                <div class="tool-title">主题颜色</div>
                <div class="color-options">
                  <div 
                    v-for="color in themeColors" 
                    :key="color"
                    class="color-option"
                    :class="{ active: currentTheme === color }"
                    :style="{ backgroundColor: color }"
                    @click="changeTheme(color)"
                  ></div>
                </div>
              </div>

              <div class="tool-group">
                <div class="tool-title">背景颜色</div>
                <div class="color-options">
                  <div 
                    v-for="color in backgroundColors" 
                    :key="color"
                    class="color-option bg-color"
                    :class="{ active: currentBackground === color }"
                    :style="{ backgroundColor: color }"
                    @click="changeBackground(color)"
                  ></div>
                </div>
              </div>

              <div class="tool-group">
                <div class="tool-title">样式</div>
                <div class="style-options">
                  <el-select v-model="currentStyle" size="small" placeholder="选择样式">
                    <el-option label="逻辑结构图" value="logic"></el-option>
                    <el-option label="思维导图" value="mindmap"></el-option>
                    <el-option label="组织结构图" value="org"></el-option>
                    <el-option label="目录组织图" value="catalog"></el-option>
                  </el-select>
                </div>
              </div>
            </div>
          </el-tab-pane>

          <el-tab-pane label="节点" name="node">
            <div class="tool-section">
              <div class="tool-group">
                <el-button size="small" @click="addImageToNode" :disabled="!selectedNode">
                  <el-icon><Picture /></el-icon>
                  添加图片
                </el-button>
              </div>

              <div class="tool-group">
                <el-button size="small" @click="addNoteToNode" :disabled="!selectedNode">
                  <el-icon><Edit /></el-icon>
                  添加备注
                </el-button>
              </div>

              <div class="tool-group" v-if="selectedNode">
                <div class="tool-title">当前节点</div>
                <div class="node-info">
                  <div class="node-topic">{{ selectedNode.topic }}</div>
                  <div v-if="selectedNode.note" class="node-note-preview">
                    <strong>备注:</strong> {{ selectedNode.note.substring(0, 50) }}{{ selectedNode.note.length > 50 ? '...' : '' }}
                  </div>
                  <div v-if="selectedNode.images && selectedNode.images.length > 0" class="node-images-preview">
                    <strong>图片:</strong> {{ selectedNode.images.length }} 张
                    <div class="preview-images">
                      <img 
                        v-for="(img, idx) in selectedNode.images" 
                        :key="idx"
                        :src="img.url" 
                        alt=""
                        @click="viewImage(img.url)"
                        class="preview-img"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </el-tab-pane>
        </el-tabs>
      </div>
    </div>

    <!-- 图片上传对话框 -->
    <el-dialog
      v-model="showImageUpload"
      title="上传图片"
      width="500px"
    >
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
    <el-dialog
      v-model="showNoteEditor"
      title="编辑备注"
      width="600px"
    >
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
    <el-dialog
      v-model="showImageViewer"
      title="查看图片"
      width="800px"
    >
      <div class="image-viewer">
        <img :src="currentViewImage" alt="" style="max-width: 100%; max-height: 70vh; display: block; margin: 0 auto;" />
      </div>
      <template #footer>
        <el-button type="primary" @click="showImageViewer = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- 快捷键帮助对话框 -->
    <el-dialog
      v-model="showShortcutHelp"
      title="快捷键说明"
      width="600px"
    >
      <div class="shortcut-help">
        <h3>基本编辑</h3>
        <ul>
          <li><kbd>双击节点</kbd> - 编辑节点内容</li>
          <li><kbd>Enter</kbd> - 插入同级主题</li>
          <li><kbd>Tab</kbd> - 插入子主题</li>
          <li><kbd>Delete</kbd> - 删除选中主题</li>
        </ul>
        
        <h3>文件操作</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>S</kbd> - 保存思维导图</li>
          <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>S</kbd> - 下载思维导图</li>
        </ul>
        
        <h3>撤销/重做</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> - 撤销上一步操作</li>
          <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> 或 <kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>Z</kbd> - 重做</li>
        </ul>
        
        <h3>高级功能</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>H</kbd> - 插入概要</li>
          <li><kbd>Ctrl</kbd> + <kbd>Shift</kbd> + <kbd>B</kbd> - 插入外框</li>
          <li><kbd>Ctrl</kbd> + <kbd>V</kbd> - 粘贴图片到选中节点</li>
        </ul>
        
        <h3>视图操作</h3>
        <ul>
          <li><kbd>Ctrl</kbd> + <kbd>鼠标滚轮</kbd> - 放大或缩小</li>
          <li>点击工具栏的 <strong>+/-</strong> 按钮 - 放大/缩小</li>
          <li>点击工具栏的 <strong>⊡</strong> 按钮 - 重置视图并居中</li>
          <li><kbd>拖拽节点</kbd> - 移动节点位置</li>
          <li><kbd>拖拽画布</kbd> - 移动整个思维导图</li>
        </ul>
        
        <h3>节点操作</h3>
        <ul>
          <li>选中节点后点击右侧 <strong>添加图片</strong> - 为节点添加图片</li>
          <li>选中节点后点击右侧 <strong>添加备注</strong> - 为节点添加备注</li>
          <li>有图片的节点显示 <strong>📷</strong> 标记</li>
          <li>有备注的节点显示 <strong>📝</strong> 标记</li>
        </ul>
      </div>
      <template #footer>
        <el-button type="primary" @click="showShortcutHelp = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted, watch, nextTick } from 'vue'
import { ElMessage } from 'element-plus'
import http from '@/api/http'
import { Upload, Download, Picture, Edit, Help, Back, Right, ZoomIn, ZoomOut, FullScreen } from '@element-plus/icons-vue'
// 动态导入 MindElixir 以避免初始化问题
let MindElixir

// Props
const props = defineProps({
  mindmap: {
    type: Object,
    required: true
  }
})

// Emits
const emit = defineEmits(['save', 'update', 'download'])

// Reactive data
const localMindmap = ref({ ...props.mindmap })
const activeToolTab = ref('style')
const currentTheme = ref('#42b983')
const currentBackground = ref('#ffffff')
const currentStyle = ref('mindmap')
const showImageUpload = ref(false)
const showNoteEditor = ref(false)
const showShortcutHelp = ref(false)
const showImageViewer = ref(false)
const currentViewImage = ref('')
const selectedNode = ref(null)
const nodeNote = ref('')
const mindmapContainer = ref(null)
const mindElixirInstance = ref(null)
const uploadedImageFile = ref(null)
let autoSaveTimer = null

// Theme and background colors
const themeColors = ref([
  '#42b983', '#409eff', '#f56c6c', '#e6a23c', '#909399', '#67c23a'
])

const backgroundColors = ref([
  '#ffffff', '#f5f5f5', '#f0f8ff', '#fff8dc', '#f0fff0', '#fff0f5'
])

// Watch for mindmap changes
watch(() => props.mindmap, (newVal) => {
  localMindmap.value = { ...newVal }
  if (mindElixirInstance.value) {
    loadMindmapData()
  }
}, { deep: true })

// Watch for title changes and update root node
watch(() => localMindmap.value.title, (newTitle) => {
  if (mindElixirInstance.value && newTitle) {
    try {
      const data = mindElixirInstance.value.getData()
      if (data && data.nodeData && data.nodeData.root) {
        // 更新根节点的主题
        data.nodeData.topic = newTitle
        mindElixirInstance.value.init(data)
        console.log('根节点主题已更新为:', newTitle)
      }
    } catch (error) {
      console.error('更新根节点主题失败:', error)
    }
  }
})

// Initialize MindElixir
const initMindElixir = async () => {
  if (!mindmapContainer.value) {
    console.error('Mind map container not found')
    return
  }

  try {
    // 动态导入 MindElixir
    if (!MindElixir) {
      const module = await import('mind-elixir')
      MindElixir = module.default
    }

    // 确保 DOM 已更新
    await nextTick()
    
    // 检查容器尺寸
    if (mindmapContainer.value.offsetWidth === 0 || mindmapContainer.value.offsetHeight === 0) {
      console.warn('Mind map container has zero dimensions')
      // 等待容器尺寸确定
      await new Promise(resolve => {
        const checkSize = () => {
          if (mindmapContainer.value.offsetWidth > 0 && mindmapContainer.value.offsetHeight > 0) {
            resolve();
          } else {
            setTimeout(checkSize, 100);
          }
        };
        checkSize();
      });
    }

    // 初始化MindElixir实例
    mindElixirInstance.value = new MindElixir({
      el: mindmapContainer.value,
      direction: MindElixir.RIGHT,
      draggable: true,
      editable: true,
      contextMenu: true,
      toolBar: true,
      keypress: true,
      locale: 'zh_CN'
    })

    // 绑定事件监听器
    mindElixirInstance.value.bus.addListener('selectNode', (node) => {
      selectedNode.value = node
      console.log('选中节点:', node)
    })
    
    // 监听节点创建事件，为新节点初始化图片和备注属性
    mindElixirInstance.value.bus.addListener('addNode', (node) => {
      if (!node.images) node.images = []
      if (!node.note) node.note = ''
    })

    mindElixirInstance.value.bus.addListener('updateNode', () => {
      // 节点更新时的操作
      // 设置自动保存定时器（延迟保存以避免频繁请求）
      if (autoSaveTimer) {
        clearTimeout(autoSaveTimer);
      }
      
      autoSaveTimer = setTimeout(() => {
        // 自动保存更新后的数据到数据库
        if (localMindmap.value.id) {
          const mindmapData = mindElixirInstance.value.getData()
          const data = {
            content: JSON.stringify(mindmapData),
            nodeCount: countNodes(mindmapData)
          }
          
          http.put(`/mindmaps/${localMindmap.value.id}/data`, data)
            .then(() => {
              console.log('自动保存成功');
            })
            .catch(error => {
              console.error('自动保存失败:', error);
            });
        }
      }, 5000);
    })

    // 添加键盘事件监听
    document.addEventListener('keydown', handleKeyDown, true)
    
    // 添加粘贴事件监听
    window.addEventListener('paste', handlePaste)
    
    // 添加鼠标滚轮事件监听（用于缩放）
    mindmapContainer.value.addEventListener('wheel', handleWheel, { passive: false })

    // 加载思维导图数据
    loadMindmapData()
    
    console.log('MindElixir initialized successfully')
  } catch (error) {
    console.error('初始化思维导图失败:', error)
    ElMessage.error('初始化思维导图失败: ' + (error.message || '未知错误'))
  }
}

// Load mindmap data
const loadMindmapData = () => {
  try {
    if (!mindElixirInstance.value) {
      console.error('MindElixir instance not initialized')
      return
    }

    console.log('加载思维导图数据，localMindmap.value:', localMindmap.value);

    let mindmapData = null
    
    // 如果有 content 数据，则加载
    if (localMindmap.value.content) {
      console.log('存在content数据:', localMindmap.value.content);
      
      // 如果content是字符串，解析为JSON
      if (typeof localMindmap.value.content === 'string') {
        try {
          mindmapData = JSON.parse(localMindmap.value.content)
        } catch (e) {
          console.error('解析content失败:', e)
          mindmapData = null
        }
      } else {
        mindmapData = localMindmap.value.content
      }
    }
    
    // 如果没有有效数据，使用默认数据
    if (!mindmapData || !mindmapData.nodeData) {
      console.log('使用默认数据');
      mindmapData = createDefaultMindmapData()
    }
    
    // 确保数据结构完整
    if (!mindmapData.linkData) mindmapData.linkData = {}
    
    // 验证数据结构
    console.log('=== 数据验证 ===');
    console.log('nodeData存在:', !!mindmapData.nodeData);
    console.log('根节点ID:', mindmapData.nodeData?.id);
    console.log('根节点topic:', mindmapData.nodeData?.topic);
    console.log('根节点root:', mindmapData.nodeData?.root);
    console.log('子节点数量:', mindmapData.nodeData?.children?.length);
    console.log('完整数据:', JSON.stringify(mindmapData, null, 2));
    
    // 初始化MindElixir
    mindElixirInstance.value.init(mindmapData)
    console.log('MindElixir initialized with data')
    
    // 等待渲染完成后居中
    setTimeout(() => {
      if (mindElixirInstance.value) {
        console.log('尝试居中显示...')
        if (mindElixirInstance.value.toCenter) {
          mindElixirInstance.value.toCenter()
          console.log('已居中')
        }
      }
    }, 500)
  } catch (error) {
    console.error('加载思维导图数据失败:', error)
    console.error('错误堆栈:', error.stack)
    ElMessage.error('加载思维导图数据失败: ' + (error.message || '未知错误'))
  }
}


// 创建默认思维导图数据结构
const createDefaultMindmapData = () => {
  // 使用思维导图的标题作为根节点主题
  const rootTopic = localMindmap.value.title || '中心主题'
  
  // 符合MindElixir数据结构要求的数据
  return {
    nodeData: {
      id: 'root',
      topic: rootTopic,
      root: true,
      children: [
        {
          id: 'child1',
          topic: '子主题1',
          children: []
        },
        {
          id: 'child2',
          topic: '子主题2',
          children: []
        }
      ]
    },
    linkData: {}
  };
}

// Save mindmap
const saveMindmap = async () => {
  try {
    if (!mindElixirInstance.value) {
      ElMessage.error('思维导图实例未初始化')
      return
    }

    // 获取MindElixir的当前数据
    const mindmapData = mindElixirInstance.value.getData()
    console.log('获取到的思维导图数据:', mindmapData);
    
    const data = {
      content: JSON.stringify(mindmapData),
      nodeCount: countNodes(mindmapData)
    }

    // 如果是更新现有思维导图
    if (localMindmap.value.id) {
      await http.put(`/mindmaps/${localMindmap.value.id}/data`, data)
      ElMessage.success('保存成功')
      // 更新本地数据
      localMindmap.value.content = JSON.stringify(mindmapData)
    } else {
      // 如果是新建思维导图
      const response = await http.post('/mindmaps', {
        ...data,
        title: localMindmap.value.title,
        description: localMindmap.value.description
      })
      ElMessage.success('创建成功')
      // 更新本地数据
      localMindmap.value = { ...localMindmap.value, ...response.data }
    }

    // 发出保存事件
    emit('save', data)
  } catch (error) {
    console.error('保存失败:', error)
    console.error('错误详情:', error.response || error);
    ElMessage.error('保存失败: ' + (error.message || '未知错误'))
  }
}

// Count nodes in mindmap
const countNodes = (data) => {
  console.log('计数节点，传入数据:', data);
  if (!data || !data.nodeData) {
    console.log('数据为空或没有nodeData');
    return 0;
  }
  
  let count = 0
  const traverse = (node) => {
    // 首先验证节点是否存在
    if (!node) {
      console.log('节点为空');
      return;
    }
    
    // 计数当前节点
    count++
    console.log(`计数节点: ${node.topic}, 当前总数: ${count}`);
    
    // 检查并遍历子节点
    if (node.children && Array.isArray(node.children)) {
      console.log(`遍历子节点，子节点数量: ${node.children.length}`);
      node.children.forEach(child => {
        console.log(`子节点: ${child ? child.topic : 'undefined'}`);
        traverse(child);
      });
    } else {
      console.log('没有子节点或子节点不是数组');
    }
  }
  
  traverse(data.nodeData)
  console.log(`总计节点数: ${count}`);
  return count
}

// Download mindmap
const downloadMindmap = () => {
  emit('download')
}

// Zoom in
const zoomIn = () => {
  if (!mindElixirInstance.value) return
  
  const currentScale = mindElixirInstance.value.scaleVal || 1
  let newScale = currentScale + 0.1
  newScale = Math.min(2, newScale)
  
  if (mindElixirInstance.value.scale) {
    mindElixirInstance.value.scale(newScale)
  }
}

// Zoom out
const zoomOut = () => {
  if (!mindElixirInstance.value) return
  
  const currentScale = mindElixirInstance.value.scaleVal || 1
  let newScale = currentScale - 0.1
  newScale = Math.max(0.5, newScale)
  
  if (mindElixirInstance.value.scale) {
    mindElixirInstance.value.scale(newScale)
  }
}

// Reset zoom
const resetZoom = () => {
  if (!mindElixirInstance.value) return
  
  if (mindElixirInstance.value.scale) {
    mindElixirInstance.value.scale(1)
  }
  
  // 居中显示
  if (mindElixirInstance.value.toCenter) {
    mindElixirInstance.value.toCenter()
  }
}

// Change theme
const changeTheme = (color) => {
  currentTheme.value = color
  if (mindElixirInstance.value) {
    // 设置主题颜色
    mindElixirInstance.value.theme.template['main-color'] = color
    mindElixirInstance.value.theme.template['main-bgcolor'] = color
    mindElixirInstance.value.paint()
    
    // 同时更新所有节点的边框颜色以匹配主题
    const data = mindElixirInstance.value.getData()
    const updateNodeStyle = (node) => {
      if (!node.style) node.style = {}
      node.style.borderColor = color
      node.style.borderWidth = '1px'
      node.style.borderStyle = 'solid'
      if (node.children) {
        node.children.forEach(updateNodeStyle)
      }
    }
    updateNodeStyle(data.nodeData)
    mindElixirInstance.value.init(data)
  }
}

// Change background
const changeBackground = (color) => {
  currentBackground.value = color
  if (mindmapContainer.value) {
    mindmapContainer.value.style.backgroundColor = color
  }
}

// Add image to node
const addImageToNode = () => {
  if (!selectedNode.value) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  showImageUpload.value = true
}

// Handle image upload
const handleImageUpload = (file) => {
  uploadedImageFile.value = file
}

// Confirm image upload
const confirmImageUpload = async () => {
  if (!uploadedImageFile.value || !selectedNode.value) {
    ElMessage.warning('请选择图片文件并选中节点')
    return
  }

  try {
    await uploadImageToNode(uploadedImageFile.value.raw, selectedNode.value)
    showImageUpload.value = false
    uploadedImageFile.value = null
    ElMessage.success('图片添加成功')
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败: ' + (error.message || '未知错误'))
  }
}

// 通用的图片上传到节点的方法
const uploadImageToNode = async (file, node) => {
  if (!node || !mindElixirInstance.value) {
    throw new Error('节点或思维导图实例不存在')
  }

  // 上传图片到服务器
  const formData = new FormData()
  formData.append('file', file)
  formData.append('nodeId', node.id)
  
  const response = await http.post(`/mindmaps/${localMindmap.value.id}/images?nodeId=${node.id}`, formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  })
  
  // 构造图片信息
  const imageInfo = {
    url: response.data.url,
    oss_key: response.data.ossKey,
    width: 100,
    height: 100
  }
  
  // 将图片添加到选中的节点
  if (!node.images) {
    node.images = []
  }
  node.images.push(imageInfo)
  
  // 更新节点显示
  updateNodeDisplay(node)
  
  // 保存到数据库
  if (localMindmap.value.id) {
    const mindmapData = mindElixirInstance.value.getData()
    await http.put(`/mindmaps/${localMindmap.value.id}/data`, {
      content: JSON.stringify(mindmapData),
      nodeCount: countNodes(mindmapData)
    })
  }
}

// Add note to node
const addNoteToNode = () => {
  if (!selectedNode.value) {
    ElMessage.warning('请先选择一个节点')
    return
  }
  
  // 获取节点当前备注
  nodeNote.value = selectedNode.value.note || ''
  showNoteEditor.value = true
}

// Confirm note edit
const confirmNoteEdit = async () => {
  try {
    if (selectedNode.value && mindElixirInstance.value) {
      // 更新节点备注
      selectedNode.value.note = nodeNote.value
      
      // 更新节点显示
      updateNodeDisplay(selectedNode.value)
      
      // 如果思维导图已存在，保存备注到数据库
      if (localMindmap.value.id) {
        const mindmapData = mindElixirInstance.value.getData()
        await http.put(`/mindmaps/${localMindmap.value.id}/data`, {
          content: JSON.stringify(mindmapData),
          nodeCount: countNodes(mindmapData)
        })
      }
      
      showNoteEditor.value = false
      ElMessage.success('备注添加成功')
    }
  } catch (error) {
    console.error('备注保存失败:', error)
    ElMessage.error('备注保存失败: ' + (error.message || '未知错误'))
  }
}

// 更新节点的视觉指示器
const updateNodeIndicators = (node) => {
  if (!mindElixirInstance.value) return;
  
  // 这里可以添加自定义的视觉指示器逻辑
  // 例如，在节点上添加图标来表示有备注或图片
}

// 更新节点显示（包括图片和备注）
const updateNodeDisplay = (node) => {
  if (!mindElixirInstance.value || !node) return
  
  try {
    // 使用MindElixir的updateNodeTags来添加自定义标签
    // 为有图片或备注的节点添加标记
    if (!node.tags) {
      node.tags = []
    }
    
    // 清除旧的自定义标签
    node.tags = node.tags.filter(tag => tag !== '📷' && tag !== '📝')
    
    // 添加图片标记
    if (node.images && node.images.length > 0) {
      node.tags.push('📷')
    }
    
    // 添加备注标记
    if (node.note && node.note.trim()) {
      node.tags.push('📝')
    }
    
    // 刷新显示
    if (mindElixirInstance.value.refresh) {
      mindElixirInstance.value.refresh()
    }
  } catch (error) {
    console.error('更新节点显示失败:', error)
  }
}

// 递归渲染所有节点的内容（图片和备注）
const renderAllNodesContent = (node) => {
  if (!node) return
  
  // 渲染当前节点
  updateNodeDisplay(node)
  
  // 递归渲染子节点
  if (node.children && Array.isArray(node.children)) {
    node.children.forEach(child => {
      renderAllNodesContent(child)
    })
  }
}

// 查看图片
const viewImage = (url) => {
  currentViewImage.value = url
  showImageViewer.value = true
}

// 处理粘贴事件
const handlePaste = async (event) => {
  const items = event.clipboardData?.items
  if (!items || !selectedNode.value) return
  
  for (let i = 0; i < items.length; i++) {
    const item = items[i]
    if (item.type.indexOf('image') !== -1) {
      event.preventDefault()
      const file = item.getAsFile()
      if (file) {
        try {
          await uploadImageToNode(file, selectedNode.value)
          ElMessage.success('图片粘贴成功')
        } catch (error) {
          console.error('图片粘贴失败:', error)
          ElMessage.error('图片粘贴失败')
        }
      }
      break
    }
  }
}

// 添加键盘事件处理
const handleKeyDown = (event) => {
  // Ctrl + S 保存
  if (event.ctrlKey && event.key === 's') {
    event.preventDefault()
    saveMindmap()
    return
  }
  
  // Ctrl + Shift + S 另存为
  if (event.ctrlKey && event.shiftKey && event.key === 'S') {
    event.preventDefault()
    downloadMindmap()
    return
  }
  
  // Ctrl + Shift + H 插入概要
  if (event.ctrlKey && event.shiftKey && event.key === 'H') {
    event.preventDefault()
    addSummary()
    return
  }
  
  // Ctrl + Shift + B 插入外框
  if (event.ctrlKey && event.shiftKey && event.key === 'B') {
    event.preventDefault()
    addBoundary()
    return
  }
  
  // Ctrl + Z 撤销
  if (event.ctrlKey && event.key === 'z' && !event.shiftKey) {
    event.preventDefault()
    undo()
    return
  }
  
  // Ctrl + Shift + Z 或 Ctrl + Y 重做
  if ((event.ctrlKey && event.shiftKey && event.key === 'Z') || (event.ctrlKey && event.key === 'y')) {
    event.preventDefault()
    redo()
    return
  }
}

// 处理鼠标滚轮事件（Ctrl + 滚轮缩放）
const handleWheel = (event) => {
  if (event.ctrlKey) {
    event.preventDefault()
    
    if (!mindElixirInstance.value) return
    
    // 获取当前缩放级别
    const currentScale = mindElixirInstance.value.scaleVal || 1
    
    // 计算新的缩放级别
    const delta = event.deltaY > 0 ? -0.1 : 0.1
    let newScale = currentScale + delta
    
    // 限制缩放范围
    newScale = Math.max(0.5, Math.min(2, newScale))
    
    // 应用缩放
    if (mindElixirInstance.value.scale) {
      mindElixirInstance.value.scale(newScale)
    }
  }
}

// 添加概要
const addSummary = () => {
  if (!selectedNode.value || !mindElixirInstance.value) {
    ElMessage.warning('请先选中一个节点')
    return
  }
  
  try {
    if (mindElixirInstance.value.addSummary) {
      mindElixirInstance.value.addSummary(selectedNode.value.id)
      ElMessage.success('概要添加成功')
    } else {
      ElMessage.info('当前版本不支持概要功能')
    }
  } catch (error) {
    console.error('添加概要失败:', error)
    ElMessage.error('添加概要失败')
  }
}

// 添加外框
const addBoundary = () => {
  if (!selectedNode.value || !mindElixirInstance.value) {
    ElMessage.warning('请先选中一个节点')
    return
  }
  
  try {
    if (mindElixirInstance.value.addBoundary) {
      mindElixirInstance.value.addBoundary(selectedNode.value.id)
      ElMessage.success('外框添加成功')
    } else {
      ElMessage.info('当前版本不支持外框功能')
    }
  } catch (error) {
    console.error('添加外框失败:', error)
    ElMessage.error('添加外框失败')
  }
}

// 撤销
const undo = () => {
  if (!mindElixirInstance.value) return
  
  try {
    if (mindElixirInstance.value.undo) {
      mindElixirInstance.value.undo()
      ElMessage.success('撤销成功')
    }
  } catch (error) {
    console.error('撤销失败:', error)
  }
}

// 重做
const redo = () => {
  if (!mindElixirInstance.value) return
  
  try {
    if (mindElixirInstance.value.redo) {
      mindElixirInstance.value.redo()
      ElMessage.success('重做成功')
    }
  } catch (error) {
    console.error('重做失败:', error)
  }
}

// 处理窗口大小变化
const handleResize = () => {
  if (mindElixirInstance.value && mindElixirInstance.value.refresh) {
    // 延迟重绘以确保容器尺寸已更新
    setTimeout(() => {
      mindElixirInstance.value.refresh()
    }, 100)
  }
}

// Lifecycle
onMounted(() => {
  // 延迟初始化以确保DOM完全加载
  setTimeout(() => {
    initMindElixir()
  }, 100)
  
  // 添加窗口大小变化监听
  window.addEventListener('resize', handleResize);
})

// 在组件卸载时清除定时器和事件监听
import { onUnmounted } from 'vue'
onUnmounted(() => {
  if (autoSaveTimer) {
    clearTimeout(autoSaveTimer);
  }
  
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyDown, true)
  
  // 移除粘贴事件监听
  window.removeEventListener('paste', handlePaste)
  
  // 移除鼠标滚轮事件监听
  if (mindmapContainer.value) {
    mindmapContainer.value.removeEventListener('wheel', handleWheel)
  }
  
  // 移除窗口大小变化监听
  window.removeEventListener('resize', handleResize)
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
  margin-right: 16px;
}

.editor-actions {
  display: flex;
  gap: 8px;
}

.editor-container {
  display: flex;
  flex: 1;
  overflow: hidden;
  min-height: 0; /* 允许容器收缩 */
}

.editor-main {
  flex: 1;
  overflow: hidden;
  position: relative;
}

.mindmap-container {
  width: 100%;
  height: 100%;
  background-color: v-bind(currentBackground);
  overflow: auto;
  min-height: 400px;
  position: relative;
}

.mindmap-container :deep(.mind-elixir-container) {
  width: 100%;
  height: 100%;
}

.mindmap-container :deep(.map-canvas) {
  width: 100%;
  height: 100%;
}

.mindmap-container :deep(svg) {
  /* 确保SVG连接线使用柔和的颜色 */
  stroke: #42b983 !important;
  stroke-width: 2px !important;
}

.mindmap-container :deep(.root) {
  /* 确保根节点可见 */
  background: #42b983 !important;
  color: white !important;
  border: 2px solid #42b983 !important;
  padding: 8px 16px !important;
  border-radius: 8px !important;
  font-size: 16px !important;
  font-weight: bold !important;
  min-width: 100px !important;
  min-height: 40px !important;
}

.mindmap-container :deep(.main-node) {
  /* 确保主节点有清晰的边框 */
  background: white !important;
  border: 1px solid #409eff !important;
  padding: 6px 12px !important;
  border-radius: 4px !important;
  min-width: 80px !important;
  min-height: 30px !important;
  border: 1px solid #409eff !important;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.1) !important;
  transition: all 0.2s ease;
  position: relative;
}

.mindmap-container :deep(.root-node) {
  /* 确保根节点有特殊的样式 */
  border: 2px solid #42b983 !important;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15) !important;
  transition: all 0.2s ease;
  position: relative;
}

.mindmap-container :deep(.main-node:hover) {
  /* 悬停效果 */
  transform: scale(1.02);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
}

.mindmap-container :deep(.main-node.selected) {
  /* 选中效果 */
  border-color: #409eff !important;
  box-shadow: 0 0 0 2px rgba(64, 158, 255, 0.3) !important;
}

.mindmap-container :deep(.node-area) {
  /* 确保节点区域正确定位 */
  position: absolute;
}

.editor-sidebar {
  width: 280px;
  border-left: 1px solid #e4e7ed;
  background: #ffffff;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

.tools-tabs {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.tools-tabs :deep(.el-tabs__content) {
  flex: 1;
  overflow-y: auto;
  flex-shrink: 1;
  min-height: 0;
}

.tool-section {
  padding: 16px;
}

.tool-group {
  margin-bottom: 20px;
}

.tool-title {
  font-size: 14px;
  font-weight: 500;
  margin-bottom: 8px;
  color: #606266;
}

.color-options {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.color-option {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  cursor: pointer;
  border: 2px solid transparent;
  transition: all 0.2s;
}

.color-option.bg-color {
  border: 1px solid #dcdfe6;
}

.color-option:hover {
  transform: scale(1.1);
}

.color-option.active {
  border-color: #409eff;
  transform: scale(1.1);
}

.style-options {
  width: 100%;
}

.node-info {
  padding: 8px;
  background: #f5f7fa;
  border-radius: 4px;
}

.node-topic {
  font-size: 14px;
  color: #606266;
  word-break: break-all;
  margin-bottom: 4px;
}

.node-note-preview {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.node-images-preview {
  font-size: 12px;
  color: #909399;
  margin-top: 4px;
}

.preview-images {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 8px;
}

.preview-img {
  width: 60px;
  height: 60px;
  object-fit: cover;
  border-radius: 4px;
  cursor: pointer;
  border: 1px solid #dcdfe6;
  transition: all 0.2s;
}

.preview-img:hover {
  transform: scale(1.1);
  border-color: #409eff;
  box-shadow: 0 2px 8px rgba(64, 158, 255, 0.3);
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
  line-height: 1.5;
}

.shortcut-help kbd {
  background-color: #f5f7fa;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  padding: 2px 6px;
  font-family: monospace;
  box-shadow: 0 1px 1px rgba(0, 0, 0, 0.1);
}

/* 节点内容样式 */
.mindmap-container :deep(.node-content) {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}

.mindmap-container :deep(.node-topic) {
  text-align: center;
  word-break: break-word;
}

.mindmap-container :deep(.node-images) {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 4px;
  margin-top: 4px;
}

.mindmap-container :deep(.node-images img) {
  max-width: 100px;
  max-height: 100px;
  border-radius: 4px;
  object-fit: cover;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  cursor: pointer;
  transition: transform 0.2s;
}

.mindmap-container :deep(.node-images img:hover) {
  transform: scale(1.1);
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
}

.mindmap-container :deep(.node-note-indicator) {
  position: absolute;
  top: 2px;
  right: 2px;
  font-size: 14px;
  cursor: help;
  opacity: 0.7;
  transition: opacity 0.2s;
}

.mindmap-container :deep(.node-note-indicator:hover) {
  opacity: 1;
}
</style>
