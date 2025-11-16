<template>
  <div class="notes-detail-container">
    <el-card class="notes-detail-card">
      <el-form label-width="90px" class="notes-form">
        <el-form-item label="标题"><el-input v-model="note.title" /></el-form-item>
        <el-form-item label="描述"><el-input v-model="note.description" /></el-form-item>
        <el-form-item label="可见性">
          <el-select v-model="note.visibility" style="width:200px">
            <el-option label="私有" value="private" />
            <el-option label="公开" value="public" />
          </el-select>
        </el-form-item>
        <el-form-item label="封面">
          <el-upload :auto-upload="false" :on-change="onCoverChange">
            <el-button class="btn-white">上传封面</el-button>
          </el-upload>
          <div v-if="note.coverKey" style="margin-top:8px">
            <img :src="coverUrl(note.coverKey)" style="width:160px;height:96px;object-fit:cover" />
          </div>
        </el-form-item>
        <el-form-item label="内容" class="content-form-item">
          <div class="markdown-editor-container">
            <el-tabs v-model="activeTab">
              <el-tab-pane label="编辑" name="edit">
                <el-input 
                  type="textarea" 
                  v-model="content" 
                  class="content-textarea"
                  placeholder="在此输入 Markdown 内容，支持拖拽上传图片"
                  @drop.prevent="handleDrop"
                  @dragover.prevent
                />
                <div class="image-upload-section">
                  <el-upload
                    :auto-upload="false"
                    :on-change="onImageUpload"
                    :show-file-list="false"
                    accept="image/*"
                    class="image-upload"
                  >
                    <el-button size="small" type="primary">
                      <el-icon><Plus /></el-icon>
                      上传图片
                    </el-button>
                  </el-upload>
                  <div class="upload-tip">图片将自动上传至云端并插入到内容中</div>
                </div>
              </el-tab-pane>
              <el-tab-pane label="预览" name="preview">
                <div class="markdown-preview" v-html="previewHtml"></div>
              </el-tab-pane>
            </el-tabs>
          </div>
        </el-form-item>
      </el-form>
      <!-- 将按钮移到表单外部，使其位于底部 -->
      <div class="form-actions">
        <el-button class="btn-white" @click="save">保存</el-button>
        <el-button class="btn-white" @click="cancel">取消</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import http from '../api/http'
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import { Plus } from '@element-plus/icons-vue'
import { marked } from 'marked'

const route = useRoute()
const router = useRouter()

const id = route.params.id
const note = ref({})
const content = ref('')
const previewHtml = ref('')
const activeTab = ref('edit')

async function load(){
  if (id === 'new') {
    // 初始化新笔记
    note.value = {
      title: '',
      description: '',
      visibility: 'private',
      categoryId: route.query.categoryId
    }
    return
  }
  
  const { data } = await http.get(`/notes/${id}`)
  note.value = data
  const res = await http.get(`/notes/${id}/content`)
  content.value = res.data
  previewHtml.value = marked.parse(content.value)
}

// 监听内容变化，实时更新预览
watch(content, (newContent) => {
  previewHtml.value = marked.parse(newContent || '')
})

async function save(){
  if (!note.value.title) {
    ElMessage.warning('请输入笔记标题')
    return
  }
  
  try {
    if (id === 'new') {
      // 创建新笔记
      const newData = {
        categoryId: note.value.categoryId,
        title: note.value.title,
        description: note.value.description,
        content: content.value,
        visibility: note.value.visibility,
        coverKey: note.value.coverKey
      }
      
      const { data } = await http.post('/notes', newData)
      ElMessage.success('笔记创建成功')
      // 跳转到分类页面，触发刷新
      router.push(`/notes/category/${data.categoryId}`)
    } else {
      // 更新现有笔记
      await http.put(`/notes/${id}`, { 
        title: note.value.title, 
        description: note.value.description, 
        content: content.value, 
        tags: note.value.tags, 
        coverKey: note.value.coverKey, 
        visibility: note.value.visibility 
      })
      ElMessage.success('保存成功')
      router.push(`/notes/${id}`) // 保存后刷新当前页面
    }
  } catch (error) {
    ElMessage.error('操作失败: ' + (error.message || '未知错误'))
  }
}

function cancel() {
  if (id === 'new') {
    // 如果是新建笔记，返回到分类页面
    if (note.value.categoryId) {
      router.push(`/notes/category/${note.value.categoryId}`)
    } else {
      router.push('/notes')
    }
  } else {
    // 如果是编辑现有笔记，返回到笔记详情页
    router.push(`/notes/${id}`)
  }
}

async function onCoverChange(file){
  const fd = new FormData(); 
  fd.append('file', file.raw); 
  fd.append('dir', 'images')
  try {
    const { data } = await http.post('/files/upload', fd)
    note.value.coverKey = data
    ElMessage.success('封面上传成功')
  } catch (error) {
    ElMessage.error('封面上传失败')
  }
}

async function onImageUpload(file) {
  const fd = new FormData()
  fd.append('file', file.raw)
  fd.append('dir', 'images')
  
  try {
    const { data } = await http.post('/files/upload', fd)
    const imageUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${data}`
    insertAtCursor(`\n![image](${imageUrl})\n`)
    ElMessage.success('图片上传成功')
  } catch (error) {
    ElMessage.error('图片上传失败')
  }
}

function handleDrop(e) {
  const files = e.dataTransfer.files
  if (files.length > 0 && files[0].type.startsWith('image/')) {
    const file = files[0]
    const fd = new FormData()
    fd.append('file', file)
    fd.append('dir', 'images')
    
    http.post('/files/upload', fd).then(({ data }) => {
      const imageUrl = `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${data}`
      insertAtCursor(`\n![image](${imageUrl})\n`)
      ElMessage.success('图片上传成功')
    }).catch(() => {
      ElMessage.error('图片上传失败')
    })
  }
}

function insertAtCursor(text) {
  const textarea = document.querySelector('.content-textarea textarea')
  if (textarea) {
    const start = textarea.selectionStart
    const end = textarea.selectionEnd
    const before = content.value.substring(0, start)
    const after = content.value.substring(end)
    content.value = before + text + after
  } else {
    content.value += text
  }
}

function coverUrl(key){ 
  return `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${key}` 
}

load()
</script>

<style scoped>
.notes-detail-container {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.notes-detail-card {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.notes-form {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.content-form-item {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.markdown-editor-container {
  flex: 1;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.markdown-editor-container :deep(.el-tabs) {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.markdown-editor-container :deep(.el-tabs__content) {
  flex: 1;
  display: flex;
  flex-direction: column;
  height: 100%;
}

.markdown-editor-container :deep(.el-tab-pane) {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.content-textarea {
  flex: 1;
}

.content-textarea :deep(textarea) {
  height: 100%;
  min-height: 300px;
  resize: none;
  font-family: monospace;
}

.markdown-preview {
  padding: 10px;
  flex: 1;
  line-height: 1.8;
  overflow-y: auto;
  min-height: 300px;
}

.markdown-preview :deep(img) {
  max-width: 100%;
}

.image-upload-section {
  margin-top: 10px;
  padding-top: 10px;
  border-top: 1px solid #dcdfe6;
  display: flex;
  align-items: center;
}

.image-upload {
  margin-right: 15px;
}

.upload-tip {
  color: #909399;
  font-size: 12px;
}

.form-actions {
  margin-top: 20px;
  text-align: center;
}
</style>