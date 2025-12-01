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
          <el-button size="small" @click="resetZoom" title="重置">
            <el-icon><Refresh /></el-icon>
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
        <!-- 加载动画 -->
        <div v-if="isLoading" class="mindmap-loading">
          <div class="loading-spinner">
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
            <div class="spinner-dot"></div>
          </div>
          <p class="loading-text">思维导图加载中...</p>
          <p v-if="nodeCount > 0" class="loading-hint">节点数量: {{ nodeCount }}</p>
          <p v-if="nodeCount > 1000" class="loading-hint" style="color: #f56c6c;">
            ⚡ 超大型思维导图，正在优化加载...
          </p>
          <p v-if="nodeCount > 1000" class="loading-hint" style="font-size: 12px; color: #909399;">
            提示：将显示前3层节点，深层节点可点击展开
          </p>
          <p v-if="nodeCount > 500 && nodeCount <= 1000" class="loading-hint" style="color: #e6a23c;">
            ⚠️ 大型思维导图，加载可能需要3-5秒
          </p>
        </div>
        
        <!-- 思维导图容器 -->
        <div 
          ref="mindmapContainer" 
          class="mindmap-container"
          :class="{ 'mindmap-hidden': isLoading }"
        ></div>
      </div>
    </div>

    <!-- 快捷键帮助对话框 -->
    <el-dialog v-model="showShortcutHelp" title="快捷键说明" width="600px">
      <div class="shortcut-help">
        <h3>基本操作</h3>
        <ul>
          <li><kbd>Tab</kbd> - 插入子节点</li>
          <li><kbd>Enter</kbd> - 插入同级节点</li>
          <li><kbd>Backspace / Delete</kbd> - 删除节点</li>
          <li><kbd>Ctrl + S</kbd> - 保存</li>
          <li><kbd>Ctrl + Z</kbd> - 撤销</li>
          <li><kbd>Ctrl + Y</kbd> - 重做</li>
          <li><kbd>双击节点</kbd> - 编辑节点</li>
        </ul>
      </div>
      <template #footer>
        <el-button type="primary" @click="showShortcutHelp = false">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import MindMap from 'simple-mind-map'
import { ElMessage } from 'element-plus'
import { ZoomIn, ZoomOut, Refresh, Upload, Help } from '@element-plus/icons-vue'

// 移除前端缓存，确保每次都重新加载，避免竞态条件
console.log('🔄 使用无缓存模式，确保数据正确性')

const props = defineProps({
  mindmap: {
    type: Object,
    required: true
  }
})

const emit = defineEmits(['update:mindmap', 'save'])

const mindmapContainer = ref(null)
const localMindmap = ref({ ...props.mindmap })
const showShortcutHelp = ref(false)
const isLoading = ref(true)
const nodeCount = ref(0)
let mindMapInstance = null
let currentLoadingId = null // 当前正在加载的思维导图ID，用于防止竞态条件

// 将 jsMind 格式转换为 simple-mind-map 格式
const convertJsMindToSimpleMindMap = (jsMindNode) => {
  if (!jsMindNode) return null
  
  const converted = {
    data: {
      text: jsMindNode.topic || jsMindNode.text || '节点'
    }
  }
  
  // 转换子节点
  if (jsMindNode.children && jsMindNode.children.length > 0) {
    converted.children = jsMindNode.children.map(child => convertJsMindToSimpleMindMap(child))
  }
  
  return converted
}

// 初始化思维导图
const initMindMap = () => {
  if (!mindmapContainer.value) return

  // 设置当前加载ID，防止竞态条件
  const loadingId = localMindmap.value.id
  currentLoadingId = loadingId
  console.log(`🎯 设置加载ID: ${loadingId}`)

  // 性能监控：开始计时
  const startTime = performance.now()
  console.log('🚀 开始初始化思维导图...')
  console.log(`📍 当前思维导图ID: ${localMindmap.value.id}`)
  console.log(`📍 当前思维导图标题: ${localMindmap.value.title}`)

  try {
    // 销毁旧实例
    if (mindMapInstance) {
      console.log('🗑️ 销毁旧实例...')
      mindMapInstance.destroy()
      mindMapInstance = null
    }
    
    // 清空容器
    if (mindmapContainer.value) {
      console.log('🗑️ 清空容器...')
      mindmapContainer.value.innerHTML = ''
    }
    
    // 解析现有数据
    let mindData = {
      data: {
        text: localMindmap.value.title || '新建思维导图'
      },
      children: []
    }

    if (localMindmap.value.content) {
      try {
        const parsed = JSON.parse(localMindmap.value.content)
        
        // 检查是否是 simple-mind-map 格式
        if (parsed && parsed.data && parsed.data.text) {
          mindData = parsed
        }
        // 检查是否是 jsMind 格式 (从 XMind 导入)
        else if (parsed && parsed.nodeData) {
          console.log('检测到 jsMind 格式，正在转换...')
          mindData = convertJsMindToSimpleMindMap(parsed.nodeData)
        }
        // 检查是否是旧的 jsMind 格式
        else if (parsed && (parsed.topic || parsed.id)) {
          console.log('检测到旧的 jsMind 格式，正在转换...')
          mindData = convertJsMindToSimpleMindMap(parsed)
        }
      } catch (e) {
        console.warn('解析思维导图数据失败，使用默认数据', e)
      }
    }

    // 统计节点数量
    const countNodes = (node) => {
      let count = 1
      if (node.children && Array.isArray(node.children)) {
        node.children.forEach(child => {
          count += countNodes(child)
        })
      }
      return count
    }
    nodeCount.value = countNodes(mindData)
    console.log(`思维导图节点数量: ${nodeCount.value}`)

    // 根据节点数量调整性能配置
    const isUltraLargeMap = nodeCount.value > 1000  // 1000节点以上启用折叠优化
    
    // 超大型思维导图：标记需要折叠的节点
    if (isUltraLargeMap) {
      console.log('⚡ 检测到巨型思维导图，启用折叠模式加速加载...')
      // 标记第3层及以下节点为折叠状态
      const markCollapseNodes = (node, depth = 0) => {
        if (depth >= 3) {
          // 标记为折叠状态（保留子节点，让simple-mind-map处理）
          if (!node.data) node.data = {}
          node.data.expand = false  // false表示折叠
        } else {
          // 标记为展开状态
          if (!node.data) node.data = {}
          node.data.expand = true  // true表示展开
        }
        
        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          node.children.forEach(child => markCollapseNodes(child, depth + 1))
        }
      }
      markCollapseNodes(mindData)
      console.log('⚡ 标记完成，将显示前3层节点，第3层以下折叠')
    }
    
    // 创建思维导图实例（无缓存，每次重新创建）
    createMindMapInstance(mindData, startTime, loadingId)
    
  } catch (error) {
    console.error('初始化思维导图失败:', error)
    ElMessage.error('初始化思维导图失败')
    isLoading.value = false
  }
}

// 创建思维导图实例
const createMindMapInstance = (mindData, startTime, loadingId) => {
  try {
    // 验证是否还是当前要加载的思维导图
    if (loadingId !== currentLoadingId) {
      console.warn(`⚠️ 加载ID不匹配，放弃渲染: 期望=${currentLoadingId}, 实际=${loadingId}`)
      return
    }
    
    const isLargeMap = nodeCount.value > 100
    const isVeryLargeMap = nodeCount.value > 200
    const isUltraLargeMap = nodeCount.value > 1000  // 与折叠阈值保持一致
    
    console.log(`性能配置: 节点数=${nodeCount.value}, 大型=${isLargeMap}, 超大型=${isVeryLargeMap}, 巨型=${isUltraLargeMap}`)
    
    mindMapInstance = new MindMap({
      el: mindmapContainer.value,
      data: mindData,
      // 布局配置
      layout: 'logicalStructure', // 逻辑结构图布局
      // 性能优化配置
      ...(isLargeMap && {
        // 大型思维导图优化
        customHandleMousewheel: null, // 使用默认滚轮处理
        isUseCustomNodeContent: false, // 不使用自定义节点内容
      }),
      // 超大型思维导图额外优化
      ...(isVeryLargeMap && {
        // 禁用动画，提升渲染速度
        enableNodeAnimation: false,
        // 简化渲染
        isUseLeftKeySelectionRightKeyDrag: false,
      }),
      // 巨型思维导图极限优化
      ...(isUltraLargeMap && {
        // 禁用所有动画和过渡效果
        enableNodeAnimation: false,
        enableNodeTransitionMove: false,
        // 简化渲染
        isUseCustomNodeContent: false,
        // 禁用实时布局
        enableFreeDrag: false,
      }),
      // 主题配置
      themeConfig: {
        // 节点内边距
        paddingX: 16,
        paddingY: 8,
        // 节点外边距
        marginX: 60,
        marginY: 20,
        // 连线样式 - 增加宽度和阴影实现3D效果
        lineWidth: 2,
        lineColor: '#3370ff',
        lineDasharray: 'none',
        lineRadius: 5,
        // 根节点样式 - 3D按钮效果
        root: {
          fillColor: '#3370ff',
          color: '#ffffff',
          borderColor: '#2a5fc9',
          borderWidth: 0,
          fontSize: 16,
          fontWeight: 'bold',
          borderRadius: 8
        },
        // 二级节点样式 - 去掉边框，添加背景色
        second: {
          fillColor: '#eff0f1',
          color: '#333333',
          borderColor: 'transparent',
          borderWidth: 0,
          fontSize: 14,
          borderRadius: 6
        },
        // 三级及以下节点样式 - 无边框，无背景
        node: {
          fillColor: 'transparent',
          color: '#333333',
          borderColor: 'transparent',
          borderWidth: 0,
          fontSize: 14,
          borderRadius: 0
        },
        // 概要节点样式
        generalization: {
          fillColor: '#f5f5f5',
          borderColor: '#3370ff',
          borderWidth: 1,
          color: '#333333'
        }
      },
      // 其他配置
      readonly: false,
      enableFreeDrag: false,
      watermarkConfig: {
        show: false
      },
      // 快捷键配置
      enableShortcutOnlyWhenMouseInSvg: false,
      // 导出配置
      exportPaddingX: 10,
      exportPaddingY: 10,
      // 节点编辑配置 - 启用内联编辑
      customInnerElsAppendTo: null, // 不使用自定义容器
      enableNodeRichText: false, // 禁用富文本，使用简单文本编辑
      nodeTextEditZIndex: 3000, // 编辑框层级
      // 使用原生编辑模式（直接在节点上编辑）
      isUseCustomNodeContent: false,
      // 编辑时直接修改节点文本
      beforeTextEdit: null,
      afterTextEdit: null
    })

    // 监听数据变化
    mindMapInstance.on('data_change', (data) => {
      localMindmap.value.content = JSON.stringify(data)
      emit('update:mindmap', localMindmap.value)
    })

    // 监听节点激活
    mindMapInstance.on('node_active', (node, activeNodeList) => {
      console.log('激活节点:', activeNodeList)
    })

    // 监听渲染完成事件
    let renderCompleted = false
    mindMapInstance.on('node_tree_render_end', () => {
      if (!renderCompleted) {
        renderCompleted = true
        
        // 再次验证ID，确保渲染的是当前思维导图
        if (loadingId !== currentLoadingId) {
          console.warn(`⚠️ 渲染完成但ID已变化，不显示: 期望=${currentLoadingId}, 实际=${loadingId}`)
          return
        }
        
        const endTime = performance.now()
        const totalTime = (endTime - startTime).toFixed(2)
        console.log(`✅ 思维导图渲染完成！总耗时: ${totalTime}ms`)
        console.log(`   - 节点数: ${nodeCount.value}`)
        console.log(`   - 平均每节点: ${(totalTime / nodeCount.value).toFixed(2)}ms`)
        console.log(`   - 验证ID匹配: ${loadingId} === ${currentLoadingId} ✅`)
        
        // 渲染完成后隐藏加载动画
        setTimeout(() => {
          isLoading.value = false
        }, 100)
      }
    })

    // 强制超时显示（防止事件未触发）
    setTimeout(() => {
      if (isLoading.value) {
        const endTime = performance.now()
        const totalTime = (endTime - startTime).toFixed(2)
        console.log(`⚠️ 超时强制显示，耗时: ${totalTime}ms`)
        isLoading.value = false
      }
    }, 800)

  } catch (error) {
    console.error('初始化思维导图失败:', error)
    ElMessage.error('初始化思维导图失败')
    isLoading.value = false
  }
}

// 放大
const zoomIn = () => {
  if (mindMapInstance) {
    mindMapInstance.view.enlarge()
  }
}

// 缩小
const zoomOut = () => {
  if (mindMapInstance) {
    mindMapInstance.view.narrow()
  }
}

// 重置缩放
const resetZoom = () => {
  if (mindMapInstance) {
    mindMapInstance.view.reset()
  }
}

// 保存思维导图
const saveMindmap = async () => {
  try {
    if (!mindMapInstance) return

    const data = mindMapInstance.getData()
    localMindmap.value.content = JSON.stringify(data)
    
    emit('save', localMindmap.value)
    ElMessage.success('保存成功')
  } catch (error) {
    console.error('保存失败:', error)
    ElMessage.error('保存失败')
  }
}

// 监听标题变化
watch(() => localMindmap.value.title, (newTitle) => {
  if (mindMapInstance && newTitle) {
    const data = mindMapInstance.getData()
    if (data && data.data) {
      data.data.text = newTitle
      mindMapInstance.setData(data)
    }
  }
})

// 监听 props 变化（切换思维导图）
watch(() => props.mindmap.id, (newId, oldId) => {
  if (newId !== oldId) {
    console.log(`🔄 切换思维导图: ${oldId} -> ${newId}，重新加载...`)
    
    // 先显示加载状态（避免显示错误的内容）
    isLoading.value = true
    localMindmap.value = { ...props.mindmap }
    
    // 立即初始化
    initMindMap()
  } else {
    console.log(`📌 ID未变化 (${newId})，跳过重新加载`)
  }
})

// 监听内容变化（不重新加载，只更新数据）
watch(() => props.mindmap, (newVal, oldVal) => {
  if (newVal.id === localMindmap.value.id) {
    console.log('📝 同一思维导图，静态更新数据（不重建实例）')
    
    // 更新本地数据
    localMindmap.value = { ...newVal }
    
    // 如果实例存在且内容变化，静态更新数据
    if (mindMapInstance && newVal.content !== oldVal?.content) {
      try {
        console.log('🔄 静态更新思维导图数据...')
        const parsed = JSON.parse(newVal.content)
        
        let mindData = null
        // 检查格式并转换
        if (parsed && parsed.data && parsed.data.text) {
          mindData = parsed
        } else if (parsed && parsed.nodeData) {
          mindData = convertJsMindToSimpleMindMap(parsed.nodeData)
        } else if (parsed && (parsed.topic || parsed.id)) {
          mindData = convertJsMindToSimpleMindMap(parsed)
        }
        
        if (mindData) {
          // 使用 setData 静态更新，不触发重新渲染
          mindMapInstance.setData(mindData)
          console.log('✅ 数据更新完成（无闪烁）')
        }
      } catch (e) {
        console.warn('静态更新失败，数据可能无效:', e)
      }
    }
  }
}, { deep: true })

// 生命周期
onMounted(() => {
  setTimeout(() => {
    initMindMap()
  }, 100)
})

onUnmounted(() => {
  if (mindMapInstance) {
    mindMapInstance.destroy()
    mindMapInstance = null
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
  background-color: #ffffff;
  overflow: hidden;
  position: relative;
  transition: opacity 0.3s ease;
}

.mindmap-container.mindmap-hidden {
  opacity: 0;
  pointer-events: none;
}

/* 禁用思维导图的初始动画 */
.mindmap-container.mindmap-hidden {
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

/* 加载动画容器 */
.mindmap-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background-color: #ffffff;
  z-index: 1000;
}

/* 加载动画 - 三个点 */
.loading-spinner {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}

.spinner-dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #3370ff;
  animation: bounce 1.4s infinite ease-in-out both;
}

.spinner-dot:nth-child(1) {
  animation-delay: -0.32s;
}

.spinner-dot:nth-child(2) {
  animation-delay: -0.16s;
}

@keyframes bounce {
  0%, 80%, 100% {
    transform: scale(0.8);
    opacity: 0.5;
  }
  40% {
    transform: scale(1.2);
    opacity: 1;
  }
}

.loading-text {
  color: #606266;
  font-size: 14px;
  margin: 0;
}

.loading-hint {
  color: #909399;
  font-size: 12px;
  margin: 8px 0 0 0;
}

/* 3D 立体效果样式 */
.mindmap-container :deep(.smm-node) {
  transition: all 0.2s ease;
}

/* 根节点 3D 效果 */
.mindmap-container :deep(.smm-node[data-depth="0"]) {
  box-shadow: 0 4px 8px rgba(0, 0, 0, 0.15), 0 1px 2px rgba(0, 0, 0, 0.1) !important;
  border-bottom: 3px solid #2a5fc9 !important;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.2);
}

.mindmap-container :deep(.smm-node[data-depth="0"]:hover) {
  transform: translateY(-2px);
  box-shadow: 0 6px 12px rgba(0, 0, 0, 0.2), 0 2px 4px rgba(0, 0, 0, 0.15) !important;
}

/* 二级节点 3D 效果 */
.mindmap-container :deep(.smm-node[data-depth="1"]) {
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.08), 0 1px 2px rgba(0, 0, 0, 0.05) !important;
  border-bottom: 2px solid #d8d9da !important;
}

.mindmap-container :deep(.smm-node[data-depth="1"]:hover) {
  transform: translateY(-1px);
  box-shadow: 0 4px 10px rgba(0, 0, 0, 0.12), 0 2px 4px rgba(0, 0, 0, 0.08) !important;
}

/* 三级及以下节点 3D 文字效果 */
.mindmap-container :deep(.smm-node[data-depth="2"]),
.mindmap-container :deep(.smm-node[data-depth="3"]),
.mindmap-container :deep(.smm-node[data-depth="4"]) {
  text-shadow: 0 1px 1px rgba(0, 0, 0, 0.05);
}

.mindmap-container :deep(.smm-node[data-depth="2"]:hover),
.mindmap-container :deep(.smm-node[data-depth="3"]:hover),
.mindmap-container :deep(.smm-node[data-depth="4"]:hover) {
  color: #1890ff;
  transform: translateX(2px);
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
}

/* 连线 3D 效果 */
.mindmap-container :deep(.smm-line) {
  filter: drop-shadow(0 1px 2px rgba(0, 0, 0, 0.1));
  transition: all 0.2s ease;
}

.mindmap-container :deep(.smm-line:hover) {
  filter: drop-shadow(0 2px 4px rgba(0, 0, 0, 0.15));
  stroke-width: 2.5 !important;
}

/* 节点编辑样式 - 内联编辑 */
.mindmap-container :deep(.smm-node-text-edit) {
  background: transparent !important;
  border: 2px solid #3370ff !important;
  border-radius: 6px !important;
  padding: 8px 12px !important;
  font-size: inherit !important;
  color: inherit !important;
  outline: none !important;
  box-shadow: 0 2px 8px rgba(51, 112, 255, 0.2) !important;
  min-width: 60px !important;
}

.mindmap-container :deep(.smm-node-text-edit:focus) {
  border-color: #1e4fc2 !important;
  box-shadow: 0 3px 12px rgba(51, 112, 255, 0.3) !important;
}

/* 隐藏可能出现的独立编辑框 */
.mindmap-container :deep(.smm-text-edit-wrap) {
  background: transparent !important;
  box-shadow: none !important;
}

/* 编辑时保持节点样式 */
.mindmap-container :deep(.smm-node.editing) {
  opacity: 1 !important;
}

.mindmap-container :deep(.smm-node.editing .smm-node-text) {
  opacity: 0 !important;
}

/* 折叠按钮样式 - 使用蓝色（高优先级） */
.mindmap-container :deep(svg .smm-expand-btn),
.mindmap-container :deep(svg circle.smm-expand-btn),
.mindmap-container :deep(.smm-expand-btn),
.mindmap-container :deep([class*="expand"]) {
  stroke: #3370ff !important;
  fill: #ffffff !important;
}

.mindmap-container :deep(svg .smm-expand-btn:hover),
.mindmap-container :deep(svg circle.smm-expand-btn:hover) {
  stroke: #1e4fc2 !important;
  fill: #e6eeff !important;
}

/* 折叠按钮中的数字和文本 */
.mindmap-container :deep(svg .smm-expand-btn + text),
.mindmap-container :deep(svg text[class*="expand"]),
.mindmap-container :deep(.smm-expand-btn-text),
.mindmap-container :deep([class*="expand"] text) {
  fill: #3370ff !important;
  color: #3370ff !important;
  font-weight: 500 !important;
}

/* 通用折叠控制元素 */
.mindmap-container :deep(g[class*="expand"] circle),
.mindmap-container :deep(g[class*="collapse"] circle) {
  stroke: #3370ff !important;
  fill: #ffffff !important;
  stroke-width: 2 !important;
}

.mindmap-container :deep(g[class*="expand"] text),
.mindmap-container :deep(g[class*="collapse"] text) {
  fill: #3370ff !important;
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
</style>

<style>
/* 全局样式 - 禁用初始动画（不使用 scoped，确保最高优先级） */

/* 禁用节点移动动画，但保留缩放和其他变换 */
.mindmap-container svg g {
  transition-property: none !important;
}

.mindmap-container svg foreignObject {
  transition-property: none !important;
}

/* 保留 SVG 容器的 transform，用于缩放和平移 */
.mindmap-container svg {
  transition: transform 0.3s ease !important;
}

/* 折叠按钮的圆圈 - 多种可能的类名 */
.mindmap-container svg g[class*="expand"] circle,
.mindmap-container svg g[class*="Expand"] circle,
.mindmap-container svg g[class*="collapse"] circle,
.mindmap-container svg g[class*="Collapse"] circle,
.mindmap-container svg g[data-node-expand] circle,
.mindmap-container svg g[data-expand] circle {
  stroke: #3370ff !important;
  fill: #ffffff !important;
  stroke-width: 2 !important;
}

/* 折叠按钮的数字文本 */
.mindmap-container svg g[class*="expand"] text,
.mindmap-container svg g[class*="Expand"] text,
.mindmap-container svg g[class*="collapse"] text,
.mindmap-container svg g[class*="Collapse"] text,
.mindmap-container svg g[data-node-expand] text,
.mindmap-container svg g[data-expand] text {
  fill: #3370ff !important;
  font-weight: 500 !important;
}

/* 悬停效果 */
.mindmap-container svg g[class*="expand"]:hover circle,
.mindmap-container svg g[class*="Expand"]:hover circle,
.mindmap-container svg g[class*="collapse"]:hover circle,
.mindmap-container svg g[class*="Collapse"]:hover circle {
  stroke: #1e4fc2 !important;
  fill: #e6eeff !important;
}

.mindmap-container svg g[class*="expand"]:hover text,
.mindmap-container svg g[class*="Expand"]:hover text,
.mindmap-container svg g[class*="collapse"]:hover text,
.mindmap-container svg g[class*="Collapse"]:hover text {
  fill: #1e4fc2 !important;
}
</style>
