<template>
  <div class="tiptap-editor">
    <!-- 工具栏 -->
    <div class="toolbar" v-if="editor">
      <!-- 撤销/重做 -->
      <button @click="editor.chain().focus().undo().run()" :disabled="!editor.can().undo()" title="撤销 (Ctrl+Z)">
        <el-icon><RefreshLeft /></el-icon>
      </button>
      <button @click="editor.chain().focus().redo().run()" :disabled="!editor.can().redo()" title="重做 (Ctrl+Y)">
        <el-icon><RefreshRight /></el-icon>
      </button>
      
      <div class="divider"></div>
      
      <!-- 标题 -->
      <button 
        @click="editor.chain().focus().toggleHeading({ level: 1 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 1 }) }"
        title="一级标题 (# + 空格)"
      >
        H1
      </button>
      <button 
        @click="editor.chain().focus().toggleHeading({ level: 2 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 2 }) }"
        title="二级标题 (## + 空格)"
      >
        H2
      </button>
      <button 
        @click="editor.chain().focus().toggleHeading({ level: 3 }).run()"
        :class="{ 'is-active': editor.isActive('heading', { level: 3 }) }"
        title="三级标题 (### + 空格)"
      >
        H3
      </button>
      
      <div class="divider"></div>
      
      <!-- 文本样式 -->
      <button 
        @click="editor.chain().focus().toggleBold().run()"
        :class="{ 'is-active': editor.isActive('bold') }"
        title="粗体 (**文本** 或 Ctrl+B)"
      >
        <strong>B</strong>
      </button>
      <button 
        @click="editor.chain().focus().toggleItalic().run()"
        :class="{ 'is-active': editor.isActive('italic') }"
        title="斜体 (*文本* 或 Ctrl+I)"
      >
        <em>I</em>
      </button>
      <button 
        @click="editor.chain().focus().toggleUnderline().run()"
        :class="{ 'is-active': editor.isActive('underline') }"
        title="下划线 (Ctrl+U)"
      >
        <u>U</u>
      </button>
      <button 
        @click="editor.chain().focus().toggleStrike().run()"
        :class="{ 'is-active': editor.isActive('strike') }"
        title="删除线 (~~文本~~)"
      >
        <s>S</s>
      </button>
      <button 
        @click="editor.chain().focus().toggleCode().run()"
        :class="{ 'is-active': editor.isActive('code') }"
        title="行内代码 (`代码`)"
      >
        <code>&lt;/&gt;</code>
      </button>
      
      <div class="divider"></div>
      
      <!-- 列表 -->
      <button 
        @click="editor.chain().focus().toggleBulletList().run()"
        :class="{ 'is-active': editor.isActive('bulletList') }"
        title="无序列表 (- + 空格)"
      >
        • 列表
      </button>
      <button 
        @click="editor.chain().focus().toggleOrderedList().run()"
        :class="{ 'is-active': editor.isActive('orderedList') }"
        title="有序列表 (1. + 空格)"
      >
        1. 列表
      </button>
      <button 
        @click="editor.chain().focus().toggleCodeBlock().run()"
        :class="{ 'is-active': editor.isActive('codeBlock') }"
        title="代码块 (``` + 空格)"
      >
        代码块
      </button>
      <button 
        @click="editor.chain().focus().toggleBlockquote().run()"
        :class="{ 'is-active': editor.isActive('blockquote') }"
        title="引用 (> + 空格)"
      >
        " 引用
      </button>
      
      <div class="divider"></div>
      
      <!-- 对齐 -->
      <button 
        @click="editor.chain().focus().setTextAlign('left').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'left' }) }"
        title="左对齐"
      >
        ⬅
      </button>
      <button 
        @click="editor.chain().focus().setTextAlign('center').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'center' }) }"
        title="居中"
      >
        ↔
      </button>
      <button 
        @click="editor.chain().focus().setTextAlign('right').run()"
        :class="{ 'is-active': editor.isActive({ textAlign: 'right' }) }"
        title="右对齐"
      >
        ➡
      </button>
      
      <div class="divider"></div>
      
      <!-- 链接和图片 -->
      <button @click="addLink" title="插入链接">
        🔗 链接
      </button>
      <button @click="triggerImageUpload" title="上传图片">
         图片
      </button>
      <input 
        ref="imageInput" 
        type="file" 
        accept="image/*" 
        @change="handleImageUpload" 
        style="display: none"
      />
      
      <div class="divider"></div>
      
      <!-- 其他 -->
      <button @click="editor.chain().focus().setHorizontalRule().run()" title="分隔线 (---)">
        ─ 分隔线
      </button>
      <button @click="editor.chain().focus().setHardBreak().run()" title="换行 (Shift+Enter)">
        ↵ 换行
      </button>
      
      <div class="divider"></div>
      
      <!-- 快捷键帮助 -->
      <button @click="showHelp = !showHelp" title="快捷键说明" class="help-btn">
        <el-icon><QuestionFilled /></el-icon>
        帮助
      </button>
      
      <!-- 保存和取消按钮（如果提供了） -->
      <template v-if="showActions">
        <div class="divider"></div>
        
        <button @click="handleSave" class="save-btn" title="保存 (Ctrl+S)">
          <el-icon><Check /></el-icon>
          保存
        </button>
        <button @click="handleCancel" class="cancel-btn" title="取消 (Esc)">
          <el-icon><Close /></el-icon>
          取消
        </button>
      </template>
    </div>
    
    <!-- 快捷键帮助面板 -->
    <div v-if="showHelp" class="help-panel">
      <div class="help-header">
        <h3>快捷键说明</h3>
        <button @click="showHelp = false" class="close-btn">✕</button>
      </div>
      <div class="help-content">
        <div class="help-section">
          <h4> Markdown 快捷语法</h4>
          <ul>
            <li><code># + 空格</code> → 一级标题</li>
            <li><code>## + 空格</code> → 二级标题</li>
            <li><code>### + 空格</code> → 三级标题</li>
            <li><code>**文本**</code> → 粗体</li>
            <li><code>*文本*</code> → 斜体</li>
            <li><code>~~文本~~</code> → 删除线</li>
            <li><code>`代码`</code> → 行内代码</li>
            <li><code>- + 空格</code> → 无序列表</li>
            <li><code>1. + 空格</code> → 有序列表</li>
            <li><code>``` + 空格</code> → 代码块</li>
            <li><code>> + 空格</code> → 引用块</li>
            <li><code>---</code> → 分隔线</li>
          </ul>
        </div>
        <div class="help-section">
          <h4>键盘快捷键</h4>
          <ul>
            <li><kbd>Ctrl</kbd> + <kbd>Z</kbd> → 撤销</li>
            <li><kbd>Ctrl</kbd> + <kbd>Y</kbd> → 重做</li>
            <li><kbd>Ctrl</kbd> + <kbd>B</kbd> → 粗体</li>
            <li><kbd>Ctrl</kbd> + <kbd>I</kbd> → 斜体</li>
            <li><kbd>Ctrl</kbd> + <kbd>U</kbd> → 下划线</li>
            <li><kbd>Shift</kbd> + <kbd>Enter</kbd> → 换行</li>
          </ul>
        </div>
      </div>
    </div>
    
    <!-- 编辑器内容区 -->
    <editor-content :editor="editor" class="editor-content" />
  </div>
</template>

<script setup>
import { ref, watch, onMounted, onBeforeUnmount } from 'vue'
import { useEditor, EditorContent } from '@tiptap/vue-3'
import StarterKit from '@tiptap/starter-kit'
import Image from '@tiptap/extension-image'
import Link from '@tiptap/extension-link'
import Placeholder from '@tiptap/extension-placeholder'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import { ElMessage } from 'element-plus'
import { RefreshLeft, RefreshRight, QuestionFilled, Check, Close } from '@element-plus/icons-vue'
import http from '@/api/http'

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  placeholder: {
    type: String,
    default: '开始输入... 支持 Markdown 快捷语法'
  },
  showActions: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['update:modelValue', 'save', 'cancel'])

const imageInput = ref(null)
const showHelp = ref(false)

// 初始化编辑器
const editor = useEditor({
  content: props.modelValue,
  extensions: [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3, 4, 5, 6]
      }
    }),
    Image.configure({
      inline: true,
      allowBase64: true
    }),
    Link.configure({
      openOnClick: false,
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer'
      }
    }),
    Placeholder.configure({
      placeholder: props.placeholder
    }),
    Underline,
    TextAlign.configure({
      types: ['heading', 'paragraph']
    })
  ],
  editorProps: {
    attributes: {
      class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-2xl mx-auto focus:outline-none'
    }
  },
  onUpdate: ({ editor }) => {
    // 获取 HTML 内容
    const html = editor.getHTML()
    emit('update:modelValue', html)
  },
  // 添加 Markdown 输出支持
  parseOptions: {
    preserveWhitespace: 'full'
  }
})

// 监听外部内容变化
watch(() => props.modelValue, (newValue) => {
  if (editor.value && newValue !== editor.value.getHTML()) {
    editor.value.commands.setContent(newValue, false)
  }
})

// HTML 转 Markdown（简化版）
const htmlToMarkdown = (html) => {
  let markdown = html
  
  // 处理图片（必须在其他转换之前）
  // 1. 先处理正常的 HTTP/HTTPS 图片（保留 URL）
  markdown = markdown.replace(/<img[^>]+src="(https?:\/\/[^"]+)"[^>]*alt="([^"]*)"[^>]*>/g, '![$2]($1)')
  markdown = markdown.replace(/<img[^>]+src="(https?:\/\/[^"]+)"[^>]*>/g, '![image]($1)')
  
  // 2. 移除 Base64 图片（太大），替换为占位符
  markdown = markdown.replace(/<img[^>]+src="data:image\/[^;]+;base64,[^"]*"[^>]*>/g, '![图片](图片已移除，请重新上传)')
  
  // 标题
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/g, '# $1\n')
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/g, '## $1\n')
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/g, '### $1\n')
  
  // 粗体和斜体
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/g, '**$1**')
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/g, '*$1*')
  markdown = markdown.replace(/<u[^>]*>(.*?)<\/u>/g, '$1')
  markdown = markdown.replace(/<s[^>]*>(.*?)<\/s>/g, '~~$1~~')
  
  // 代码
  markdown = markdown.replace(/<code[^>]*>(.*?)<\/code>/g, '`$1`')
  markdown = markdown.replace(/<pre[^>]*><code[^>]*>(.*?)<\/code><\/pre>/gs, '```\n$1\n```\n')
  
  // 列表
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/g, '- $1\n')
  markdown = markdown.replace(/<ul[^>]*>(.*?)<\/ul>/gs, '$1')
  markdown = markdown.replace(/<ol[^>]*>(.*?)<\/ol>/gs, '$1')
  
  // 引用
  markdown = markdown.replace(/<blockquote[^>]*>(.*?)<\/blockquote>/gs, '> $1\n')
  
  // 段落
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/g, '$1\n\n')
  
  // 分隔线
  markdown = markdown.replace(/<hr[^>]*>/g, '\n---\n')
  
  // 链接
  markdown = markdown.replace(/<a[^>]+href="([^"]*)"[^>]*>(.*?)<\/a>/g, '[$2]($1)')
  
  // 移除其他 HTML 标签
  markdown = markdown.replace(/<[^>]+>/g, '')
  
  // 清理多余空行
  markdown = markdown.replace(/\n{3,}/g, '\n\n')
  
  return markdown.trim()
}

// 暴露方法给父组件
defineExpose({
  getMarkdown: () => {
    const html = editor.value?.getHTML() || ''
    return htmlToMarkdown(html)
  },
  getHTML: () => {
    return editor.value?.getHTML() || ''
  }
})

// 保存和取消处理
const handleSave = () => {
  emit('save')
}

const handleCancel = () => {
  emit('cancel')
}

// 添加链接
const addLink = () => {
  const url = window.prompt('输入链接地址:')
  if (url) {
    editor.value.chain().focus().setLink({ href: url }).run()
  }
}

// 触发图片上传
const triggerImageUpload = () => {
  imageInput.value?.click()
}

// 处理图片上传
const handleImageUpload = async (event) => {
  const file = event.target.files?.[0]
  if (!file) return
  
  // 检查文件类型
  if (!file.type.startsWith('image/')) {
    ElMessage.error('请选择图片文件')
    return
  }
  
  // 检查文件大小 (5MB)
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('图片大小不能超过 5MB')
    return
  }
  
  try {
    // 显示上传中提示
    const loadingMsg = ElMessage({
      message: '正在上传图片到阿里云...',
      type: 'info',
      duration: 0
    })
    
    // 创建 FormData
    const formData = new FormData()
    formData.append('file', file)
    
    // 上传到阿里云（使用 http 工具）
    const response = await http.post('/files/upload', formData, {
      params: { dir: 'images' },
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
    
    // 获取阿里云对象键（objectKey）
    let objectKey = response.data
    
    // 调试：查看返回的数据
    console.log('上传响应:', response)
    console.log('对象键 (objectKey):', objectKey)
    
    // 如果返回的是对象，尝试提取
    if (typeof objectKey === 'object') {
      objectKey = objectKey.url || objectKey.data || objectKey
    }
    
    // 确保是字符串
    if (typeof objectKey !== 'string') {
      throw new Error('返回的对象键格式不正确')
    }
    
    // 拼接完整的阿里云 URL
    // 格式: https://{bucket-name}.{endpoint}/{objectKey}
    const imageUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${objectKey}`
    
    console.log('完整图片 URL:', imageUrl)
    
    // 关闭加载提示
    loadingMsg.close()
    
    // 插入图片到编辑器
    editor.value.chain().focus().setImage({ src: imageUrl }).run()
    ElMessage.success('图片上传成功')
    
  } catch (error) {
    console.error('图片上传失败:', error)
    ElMessage.error('图片上传失败: ' + (error.message || '未知错误'))
  }
  
  // 清空 input
  event.target.value = ''
}

// 图片点击放大
const handleImageClick = (e) => {
  if (e.target.tagName === 'IMG') {
    const src = e.target.src
    // 创建遮罩层
    const overlay = document.createElement('div')
    overlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      bottom: 0;
      background: rgba(0, 0, 0, 0.8);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      cursor: zoom-out;
    `
    
    // 创建大图
    const img = document.createElement('img')
    img.src = src
    img.style.cssText = `
      max-width: 90%;
      max-height: 90%;
      object-fit: contain;
      border-radius: 8px;
    `
    
    overlay.appendChild(img)
    document.body.appendChild(overlay)
    
    // 点击关闭
    overlay.addEventListener('click', () => {
      document.body.removeChild(overlay)
    })
  }
}

// 键盘快捷键处理
const handleKeydown = (e) => {
  // Ctrl+S 保存
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault()
    if (props.showActions) {
      handleSave()
    }
  }
  // Esc 取消
  if (e.key === 'Escape') {
    if (props.showActions) {
      handleCancel()
    }
  }
}

// 添加图片点击事件和键盘事件
onMounted(() => {
  const editorElement = document.querySelector('.editor-content')
  if (editorElement) {
    editorElement.addEventListener('click', handleImageClick)
  }
  
  // 添加键盘事件监听
  document.addEventListener('keydown', handleKeydown)
})

// 清理
onBeforeUnmount(() => {
  const editorElement = document.querySelector('.editor-content')
  if (editorElement) {
    editorElement.removeEventListener('click', handleImageClick)
  }
  
  // 移除键盘事件监听
  document.removeEventListener('keydown', handleKeydown)
  
  editor.value?.destroy()
})
</script>

<style scoped>
.tiptap-editor {
  display: flex;
  flex-direction: column;
  height: 100%;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  background: #ffffff;
}

/* 工具栏 */
.toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid #e4e7ed;
  background: #f5f7fa;
  position: sticky;
  top: 0;
  z-index: 10;
}

.toolbar button {
  padding: 6px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #ffffff;
  cursor: pointer;
  font-size: 14px;
  transition: all 0.2s;
  white-space: nowrap;
}

.toolbar button:hover {
  background: #ecf5ff;
  border-color: #409eff;
  color: #409eff;
}

.toolbar button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.toolbar button.is-active {
  background: #409eff;
  color: #ffffff;
  border-color: #409eff;
}

.divider {
  width: 1px;
  height: 24px;
  background: #dcdfe6;
  margin: 0 4px;
}

/* 编辑器内容区 */
.editor-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

/* Tiptap 编辑器样式 */
:deep(.ProseMirror) {
  min-height: 200px;
  outline: none;
}

:deep(.ProseMirror p.is-editor-empty:first-child::before) {
  content: attr(data-placeholder);
  float: left;
  color: #adb5bd;
  pointer-events: none;
  height: 0;
}

/* 标题样式 */
:deep(.ProseMirror h1) {
  font-size: 2em;
  font-weight: bold;
  margin: 1em 0 0.5em;
  line-height: 1.2;
}

:deep(.ProseMirror h2) {
  font-size: 1.5em;
  font-weight: bold;
  margin: 0.8em 0 0.4em;
  line-height: 1.3;
}

:deep(.ProseMirror h3) {
  font-size: 1.25em;
  font-weight: bold;
  margin: 0.6em 0 0.3em;
  line-height: 1.4;
}

/* 列表样式 */
:deep(.ProseMirror ul),
:deep(.ProseMirror ol) {
  padding-left: 2em;
  margin: 1em 0;
}

:deep(.ProseMirror li) {
  margin: 0.5em 0;
}

/* 代码块样式 */
:deep(.ProseMirror code) {
  background: #f5f7fa;
  padding: 2px 6px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 0.9em;
}

:deep(.ProseMirror pre) {
  background: #282c34;
  color: #abb2bf;
  padding: 1em;
  border-radius: 6px;
  overflow-x: auto;
  margin: 1em 0;
}

:deep(.ProseMirror pre code) {
  background: none;
  padding: 0;
  color: inherit;
}

/* 引用样式 */
:deep(.ProseMirror blockquote) {
  border-left: 4px solid #c0c0c0;
  padding-left: 1em;
  margin: 1em 0;
  color: #606266;
  font-style: italic;
}

/* 分隔线样式 */
:deep(.ProseMirror hr) {
  border: none;
  border-top: 2px solid #e4e7ed;
  margin: 2em 0;
}

/* 图片样式 */
:deep(.ProseMirror img) {
  max-width: 100%;
  height: auto;
  border-radius: 6px;
  margin: 1em 0;
  display: inline-block;
  /* 使用原始尺寸，但不超过容器宽度 */
  width: auto;
  cursor: pointer;
}

/* 图片可点击放大提示 */
:deep(.ProseMirror img:hover) {
  opacity: 0.9;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
}

/* 链接样式 */
:deep(.ProseMirror a) {
  color: #409eff;
  text-decoration: underline;
  cursor: pointer;
}

:deep(.ProseMirror a:hover) {
  color: #66b1ff;
}

/* 选中样式 */
:deep(.ProseMirror ::selection) {
  background: #b3d8ff;
}

/* 帮助按钮 */
.help-btn {
  background: #67c23a !important;
  color: white !important;
  border-color: #67c23a !important;
}

.help-btn:hover {
  background: #85ce61 !important;
  border-color: #85ce61 !important;
}

/* 保存按钮 */
.save-btn {
  background: #67c23a !important;
  color: white !important;
  border-color: #67c23a !important;
  font-weight: 600;
}

.save-btn:hover {
  background: #85ce61 !important;
  border-color: #85ce61 !important;
}

/* 取消按钮 */
.cancel-btn {
  background: #909399 !important;
  color: white !important;
  border-color: #909399 !important;
}

.cancel-btn:hover {
  background: #a6a9ad !important;
  border-color: #a6a9ad !important;
}

/* 帮助面板 */
.help-panel {
  position: absolute;
  top: 60px;
  right: 20px;
  width: 400px;
  max-height: 500px;
  background: white;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  overflow: hidden;
}

.help-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  background: #f5f7fa;
  border-bottom: 1px solid #e4e7ed;
}

.help-header h3 {
  margin: 0;
  font-size: 16px;
  color: #303133;
}

.close-btn {
  background: none;
  border: none;
  font-size: 20px;
  color: #909399;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
}

.close-btn:hover {
  background: #e4e7ed;
  color: #606266;
}

.help-content {
  padding: 20px;
  max-height: 400px;
  overflow-y: auto;
}

.help-section {
  margin-bottom: 24px;
}

.help-section:last-child {
  margin-bottom: 0;
}

.help-section h4 {
  margin: 0 0 12px 0;
  font-size: 14px;
  color: #409eff;
  font-weight: 600;
}

.help-section ul {
  list-style: none;
  padding: 0;
  margin: 0;
}

.help-section li {
  padding: 6px 0;
  font-size: 13px;
  color: #606266;
  display: flex;
  align-items: center;
}

.help-section code {
  background: #f5f7fa;
  padding: 2px 8px;
  border-radius: 3px;
  font-family: 'Courier New', monospace;
  font-size: 12px;
  color: #e6a23c;
  margin-right: 8px;
}

.help-section kbd {
  background: linear-gradient(to bottom, #f9f9f9, #e8e8e8);
  border: 1px solid #c0c0c0;
  border-radius: 3px;
  box-shadow: 0 1px 0 rgba(0, 0, 0, 0.2);
  padding: 2px 6px;
  font-family: 'Courier New', monospace;
  font-size: 11px;
  color: #333;
  margin: 0 2px;
}
</style>
