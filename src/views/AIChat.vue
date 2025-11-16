<template>
  <div class="ai-root">
    <div class="ai-sidebar">
      <div class="sidebar-header">
        <div>会话历史</div>
        <div class="sidebar-actions">
          <el-button class="btn-white" size="small" @click="newSession">新建</el-button>
        </div>
      </div>
      <div class="session-list">
        <div v-for="(s, index) in sessions" :key="s.id" 
             :class="['session-item',{active:s.id===currentSessionId}]"
             @click="switchSession(s.id)"
             @contextmenu.prevent="showSessionMenu(s, $event)">
          <div class="session-title">{{ s.title }}</div>
          <div class="session-meta">
            <span class="session-mode">{{ s.mode === 'local' ? '本地' : '默认' }}</span>
            <span class="session-time">{{ formatTime(s.updatedAt) }}</span>
          </div>
        </div>
        <div v-if="sessions.length===0" class="session-empty">暂无会话</div>
      </div>
    </div>
    
    <div class="ai-main">
      <div class="ai-header">
        <div class="brand">智能问答</div>
        <div class="spacer" />
        <div class="actions">
          <el-select v-model="mode" size="small" style="width:180px" @change="onModeChange">
            <el-option label="默认模式（AI回答）" value="default" />
            <el-option label="本地笔记优先（RAG）" value="local" />
          </el-select>
          <el-button class="btn-white" @click="clear">清空当前</el-button>
          <el-button class="btn-white" @click="removeSession" :disabled="!currentSessionId">删除会话</el-button>
          <el-button class="btn-white" @click="rebuildIndex" :loading="rebuildingIndex">重建索引</el-button>
        </div>
      </div>

      <div class="ai-suggestions">
        <el-tag v-for="s in suggestions" :key="s" class="suggest" @click="useSuggestion(s)">{{ s }}</el-tag>
      </div>

      <div class="ai-chat" ref="chatRef">
        <div v-for="(m,i) in messages" :key="i" class="msg" :class="m.role==='user'?'msg-user':'msg-assistant'">
          <div class="msg-content" :style="m.role==='user' ? {backgroundColor: getMessageColor(i)} : {}">
            <div class="msg-text" v-html="formatMessage(m.content)"></div>
            <div class="msg-tools" v-if="m.role==='assistant'">
              <el-button class="btn-white" size="small" @click="copy(m.content)">复制</el-button>
              <el-button class="btn-white" size="small" @click="regenerate(i)">重试</el-button>
            </div>
          </div>
        </div>
        <div v-if="loading" class="typing">
          <el-icon class="is-loading"><Loading /></el-icon>
          正在生成...
        </div>
      </div>

      <div class="ai-input">
        <el-input 
          v-model="input" 
          type="textarea" 
          :rows="3" 
          placeholder="输入你的问题，Enter 发送，Shift+Enter 换行" 
          @keyup.enter="onEnter"
          :disabled="streaming" />
        <div class="input-actions">
          <el-button class="btn-white" :disabled="streaming" @click="send" type="primary">发送</el-button>
          <el-button class="btn-white" :disabled="!streaming" @click="pause">停止</el-button>
        </div>
      </div>
    </div>
    
    <!-- Session context menu -->
    <div v-if="contextMenuVisible" 
         class="context-menu" 
         :style="{left: contextMenuX + 'px', top: contextMenuY + 'px'}"
         @mouseleave="hideContextMenu">
      <div class="context-menu-item" @click="renameSession">重命名</div>
      <div class="context-menu-item" @click="duplicateSession">复制会话</div>
    </div>
  </div>
</template>

<script setup>
import http from '../api/http'
import { ref, nextTick, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { Loading } from '@element-plus/icons-vue'

const input = ref('')
const messages = ref([])
const suggestions = ref([
  '解释这段代码',
  '帮我润色这段文字', 
  '生成一份学习计划',
  '总结这篇笔记',
  '基于我的笔记回答',
  '查找相关笔记内容'
])
const chatRef = ref(null)
let es
let abortController
const loading = ref(false)
const streaming = ref(false)
const sessions = ref([])
const currentSessionId = ref(null)
const mode = ref('default')
const rebuildingIndex = ref(false)

// Context menu for sessions
const contextMenuVisible = ref(false)
const contextMenuX = ref(0)
const contextMenuY = ref(0)
const selectedSession = ref(null)

// Color palette for messages and sessions
const colors = ['#ecf7e6', '#e7f1f7', '#fdf3e1', '#fbe8e6', '#dcf3f9']
const messageColors = ref({})

function getMessageColor(index) {
  if (!messageColors.value[index]) {
    messageColors.value[index] = colors[Math.floor(Math.random() * colors.length)]
  }
  return messageColors.value[index]
}

function getSessionColor(index) {
  return colors[index % colors.length]
}

function scrollToBottom(){
  nextTick(()=>{ const el = chatRef.value; if (el) el.scrollTop = el.scrollHeight })
}

function onEnter(e){ if (!e.shiftKey) { e.preventDefault(); send() } }

function useSuggestion(s){ input.value = s }

function formatTime(timeStr) {
  if (!timeStr) return ''
  const date = new Date(timeStr)
  const now = new Date()
  const diff = now - date
  
  if (diff < 60000) return '刚刚'
  if (diff < 3600000) return Math.floor(diff / 60000) + '分钟前'
  if (diff < 86400000) return Math.floor(diff / 3600000) + '小时前'
  return date.toLocaleDateString()
}

function formatMessage(content) {
  if (!content) return ''
  
  // Enhanced markdown-like formatting
  let html = content
    // Escape HTML first (but preserve emoji and special chars)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
  
  // Process line by line for better control
  const lines = html.split('\n')
  const result = []
  let inList = false
  
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i]
    let addBreak = true  // Whether to add <br> after this line
    
    // Headers
    if (line.match(/^### /)) {
      if (inList) { result.push('</ul>'); inList = false }
      line = line.replace(/^### (.*)$/, '<h3>$1</h3>')
      addBreak = false
    } else if (line.match(/^## /)) {
      if (inList) { result.push('</ul>'); inList = false }
      line = line.replace(/^## (.*)$/, '<h2>$1</h2>')
      addBreak = false
    } else if (line.match(/^# /)) {
      if (inList) { result.push('</ul>'); inList = false }
      line = line.replace(/^# (.*)$/, '<h1>$1</h1>')
      addBreak = false
    }
    // Horizontal rule
    else if (line.match(/^---$/)) {
      if (inList) { result.push('</ul>'); inList = false }
      line = '<hr>'
      addBreak = false
    }
    // List items
    else if (line.match(/^- /)) {
      if (!inList) { result.push('<ul>'); inList = true }
      line = line.replace(/^- (.*)$/, '<li>$1</li>')
      addBreak = false  // Don't add <br> inside lists
    }
    // Regular line
    else {
      if (inList && line.trim() === '') {
        result.push('</ul>')
        inList = false
        addBreak = false
      }
      if (line.trim() !== '') {
        // Bold and italic
        line = line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
        line = line.replace(/\*(.*?)\*/g, '<em>$1</em>')
      } else if (!inList) {
        // Empty line outside list becomes a break
        addBreak = true
      }
    }
    
    result.push(line)
    if (addBreak && i < lines.length - 1) {
      result.push('<br>')
    }
  }
  
  if (inList) result.push('</ul>')
  
  return result.join('')
}

async function loadSessions() { 
  try {
    const { data } = await http.get('/ai/sessions')
    sessions.value = data
    if (!currentSessionId.value && sessions.value.length > 0) {
      currentSessionId.value = sessions.value[0].id
      await loadMessages()
    }
  } catch (error) {
    ElMessage.error('加载会话失败: ' + error.message)
  }
}

async function newSession() {
  try {
    const { data } = await http.post('/ai/sessions', { 
      title: '新的会话', 
      mode: mode.value 
    })
    sessions.value.unshift(data)
    currentSessionId.value = data.id
    messages.value = []
  } catch (error) {
    ElMessage.error('创建会话失败: ' + error.message)
  }
}

async function removeSession() {
  if (!currentSessionId.value) return
  try {
    await http.delete(`/ai/sessions/${currentSessionId.value}`)
    sessions.value = sessions.value.filter(s => s.id !== currentSessionId.value)
    currentSessionId.value = sessions.value[0]?.id || null
    messages.value = []
    if (currentSessionId.value) await loadMessages()
  } catch (error) {
    ElMessage.error('删除会话失败: ' + error.message)
  }
}

async function switchSession(id) {
  currentSessionId.value = id
  await loadMessages()
}

async function loadMessages() {
  if (!currentSessionId.value) return
  try {
    const { data } = await http.get(`/ai/sessions/${currentSessionId.value}/messages`)
    messages.value = data
  } catch (error) {
    ElMessage.error('加载消息失败: ' + error.message)
  }
}

function showSessionMenu(session, event) {
  selectedSession.value = session
  contextMenuX.value = event.clientX
  contextMenuY.value = event.clientY
  contextMenuVisible.value = true
}

function hideContextMenu() {
  contextMenuVisible.value = false
  selectedSession.value = null
}

async function renameSession() {
  if (!selectedSession.value) return
  
  try {
    const newTitle = prompt('请输入新的会话名称:', selectedSession.value.title)
    if (newTitle && newTitle.trim()) {
      await http.put(`/ai/sessions/${selectedSession.value.id}`, { 
        title: newTitle.trim() 
      })
      await loadSessions()
      ElMessage.success('重命名成功')
    }
  } catch (error) {
    ElMessage.error('重命名失败: ' + error.message)
  }
  hideContextMenu()
}

async function duplicateSession() {
  if (!selectedSession.value) return
  
  try {
    const { data } = await http.post('/ai/sessions', {
      title: selectedSession.value.title + ' (副本)',
      mode: selectedSession.value.mode
    })
    sessions.value.unshift(data)
    ElMessage.success('复制会话成功')
  } catch (error) {
    ElMessage.error('复制会话失败: ' + error.message)
  }
  hideContextMenu()
}

async function rebuildIndex() {
  rebuildingIndex.value = true
  try {
    // Call backend to rebuild RAG index
    await http.post('/ai/rebuild-index')
    ElMessage.success('索引重建成功，本地笔记搜索已优化')
  } catch (error) {
    ElMessage.error('索引重建失败: ' + error.message)
  } finally {
    rebuildingIndex.value = false
  }
}

function onModeChange() {
  // Update current session mode if exists
  if (currentSessionId.value) {
    const session = sessions.value.find(s => s.id === currentSessionId.value)
    if (session && session.mode !== mode.value) {
      // Update session mode on backend
      http.put(`/ai/sessions/${currentSessionId.value}`, { mode: mode.value })
        .then(() => {
          session.mode = mode.value
          ElMessage.info(`已切换到${mode.value === 'local' ? '本地笔记优先' : '默认AI'}模式`)
        })
        .catch(error => {
          ElMessage.error('更新会话模式失败: ' + error.message)
        })
    }
  }
}

async function send(){
  if (!input.value || streaming.value || loading.value) return
  
  // Create new session if none exists
  if (!currentSessionId.value) {
    await newSession()
    if (!currentSessionId.value) return
  }
  
  streaming.value = true
  loading.value = true
  
  // Add user message
  messages.value.push({ role:'user', content: input.value })
  
  // Update session title with first 8 characters of first question
  if (messages.value.length === 1) {
    const title = input.value.substring(0, 8)
    try {
      await http.put(`/ai/sessions/${currentSessionId.value}`, { title })
      const session = sessions.value.find(s => s.id === currentSessionId.value)
      if (session) session.title = title
    } catch (error) {
      console.error('更新会话标题失败:', error)
    }
  }
  
  // Add placeholder for assistant message
  messages.value.push({ role:'assistant', content: '' })
  const assistantIndex = messages.value.length - 1
  
  const question = input.value
  input.value = ''
  scrollToBottom()
  
  // Prepare streaming request
  const url = `/api/ai/chat/stream/session?sessionId=${currentSessionId.value}&q=${encodeURIComponent(question)}&mode=${mode.value}`
  abortController = new AbortController()
  let appended = false
  
  // Fallback timer for non-streaming response (increased timeout to give streaming more time)
  const fallbackTimer = setTimeout(async () => {
    if (!appended) {
      console.log('流式响应超时，使用fallback非流式接口')
      try {
        const { data } = await http.post('/ai/chat/session', { 
          sessionId: currentSessionId.value, 
          question: question, 
          mode: mode.value 
        })
        if (data && data.answer) {
          messages.value[assistantIndex].content = data.answer
          appended = true  // Mark as appended to prevent duplicate
        } else if (data && data.error) {
          messages.value[assistantIndex].content = '抱歉，AI服务暂时不可用'
          ElMessage.error('AI服务错误: ' + data.error)
        } else {
          messages.value[assistantIndex].content = '抱歉，未获取到AI回复，请稍后重试。'
        }
      } catch (error) {
        messages.value[assistantIndex].content = '抱歉，AI服务暂不可用'
        ElMessage.error('AI服务错误: ' + (error.message || '未知错误'))
      } finally {
        pause()
        scrollToBottom()
      }
    }
  }, 10000)
  
  try {
    const response = await fetch(url, { 
      headers: { 
        'Authorization': 'Bearer ' + (localStorage.getItem('token')||''),
        'Accept': 'text/event-stream' 
      }, 
      signal: abortController.signal 
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    const reader = response.body.getReader()
    const decoder = new TextDecoder('utf-8')
    let buffer = ''
    let firstChunkReceived = false
    
    const pump = () => reader.read().then(({done, value}) => {
      // Clear fallback timer on first chunk received
      if (!firstChunkReceived && value) {
        console.log('流式响应首个数据块已接收，清除fallback定时器')
        clearTimeout(fallbackTimer)
        firstChunkReceived = true
        appended = true  // Mark as appended to prevent fallback
      }
      
      if (done) { 
        pause()
        clearTimeout(fallbackTimer)
        return 
      }
      
      buffer += decoder.decode(value, {stream: true})
      const lines = buffer.split(/\r?\n/)
      buffer = lines.pop() || ''
      
      for (const line of lines) {
        if (line.startsWith('data:')) {
          const data = line.slice(5).trim()
          if (data === '[DONE]') {
            pause()
            clearTimeout(fallbackTimer)
            return
          }
          
          try {
            const obj = JSON.parse(data)
            if (obj && obj.error) {
              ElMessage.error(obj.error)
              pause()
              clearTimeout(fallbackTimer)
              return
            }
            
            const chunk = obj?.delta?.content || obj?.message?.content || ''
            if (chunk) {
              messages.value[assistantIndex].content += chunk
            }
          } catch {
            // Handle plain text chunks - this is likely what's happening with our streaming
            messages.value[assistantIndex].content += data
          }
          scrollToBottom()
        }
      }
      return pump()
    })
    
    return pump()
    
  } catch (error) {
    console.error('Stream error:', error)
    // If no data received yet, let fallback handle it
    if (!appended) {
      console.log('流式接口失败且未接收数据，等待fallback接管')
      // Don't clear fallback timer, let it trigger
    } else {
      // If we already got some data, don't use fallback
      clearTimeout(fallbackTimer)
      messages.value[assistantIndex].content += '\n\n[流式传输中断]'
      ElMessage.warning('流式传输中断，但已接收部分内容')
    }
    pause()
  }
}

function pause() {
  if (es) {
    es.close()
    es = null
  }
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  streaming.value = false
  loading.value = false
}

function clear() {
  messages.value = []
  ElMessage.info('当前会话已清空')
}

function copy(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      ElMessage.success('内容已复制到剪贴板')
    }).catch(() => {
      ElMessage.error('复制失败')
    })
  } else {
    // Fallback for older browsers
    const textarea = document.createElement('textarea')
    textarea.value = text
    document.body.appendChild(textarea)
    textarea.select()
    document.execCommand('copy')
    document.body.removeChild(textarea)
    ElMessage.success('内容已复制到剪贴板')
  }
}

function regenerate(index) {
  // Find the last user message before the current assistant message
  let lastUserMessage = null
  for (let i = index - 1; i >= 0; i--) {
    if (messages.value[i].role === 'user') {
      lastUserMessage = messages.value[i]
      break
    }
  }
  
  if (lastUserMessage) {
    // Remove the current assistant message and any messages after it
    messages.value = messages.value.slice(0, index)
    input.value = lastUserMessage.content
    send()
  } else {
    ElMessage.warning('没有找到可以重试的用户消息')
  }
}

// Close context menu when clicking outside
window.addEventListener('click', hideContextMenu)

onMounted(() => {
  loadSessions()
})
</script>

<style scoped>
.ai-root{display:flex;height:100%;position:relative;overflow:hidden}
.ai-sidebar{width:280px;border-right:1px solid #eaecef;background:#fff;display:flex;flex-direction:column}
.ai-main{flex:1;display:flex;flex-direction:column}
.sidebar-header{display:flex;align-items:center;justify-content:space-between;padding:12px;border-bottom:1px solid #f0f0f0;background:#f8f9fa}
.sidebar-actions{display:flex;gap:8px}
.session-list{flex:1;overflow:auto;padding:8px 0}
.session-item{padding:12px 16px;cursor:pointer;border-bottom:1px solid #f6f6f6;border-left:3px solid transparent;background:#fff;transition:all 0.2s}
.session-item:hover{background:#f8f9fa}
.session-item.active{background:#e7f1f7;border-left-color:#e7f1f7;font-weight:500}
.session-title{font-weight:500;margin-bottom:4px;color:#333}
.session-meta{display:flex;justify-content:space-between;align-items:center;font-size:12px;color:#666}
.session-mode{background:#e7f1f7;color:#333;padding:2px 6px;border-radius:3px;font-size:10px}
.session-time{font-size:11px}
.session-empty{padding:16px;color:#999;text-align:center}
.ai-header{display:flex;align-items:center;padding:12px 16px;border-bottom:1px solid #eaecef;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,0.1)}
.brand{font-weight:600;font-size:18px;color:#333}
.spacer{flex:1}
.actions{display:flex;align-items:center;gap:8px}
.ai-suggestions{padding:12px 16px;border-bottom:1px solid #f0f0f0;background:#f8f9fa;display:flex;flex-wrap:wrap;gap:8px}
.suggest{background:#fdf3e1;color:#333;border:1px solid #f5e5c5;cursor:pointer;transition:all 0.2s}
.suggest:hover{background:#fbe8e6;color:#333}
.ai-chat{flex:1;overflow:auto;padding:16px;background:#fafafa}
.msg{display:flex;margin-bottom:16px;animation:fadeIn 0.3s}
.msg-user{justify-content:flex-end}
.msg-assistant{justify-content:flex-start}
.msg-content{max-width:75%;padding:12px 16px;border-radius:12px;background:#fff;box-shadow:0 2px 4px rgba(0,0,0,0.1);border:1px solid #e0e0e0}
.msg-user .msg-content{color:#333;border:none}
.msg-text{line-height:1.6;word-wrap:break-word}
.msg-text h1{font-size:1.5em;font-weight:600;margin:0.8em 0 0.4em 0;color:#333}
.msg-text h2{font-size:1.3em;font-weight:600;margin:0.8em 0 0.4em 0;color:#333}
.msg-text h3{font-size:1.1em;font-weight:600;margin:0.8em 0 0.3em 0;color:#333}
.msg-text ul{margin:0.3em 0;padding-left:1.8em;list-style-type:disc}
.msg-text li{margin:0.15em 0;line-height:1.5}
.msg-text hr{border:none;border-top:1px solid #e0e0e0;margin:0.8em 0}
.msg-text strong{font-weight:600;color:#333}
.msg-text em{font-style:italic}
.msg-text p{margin:0.3em 0}
.msg-tools{margin-top:8px;display:flex;gap:6px;opacity:0;transition:opacity 0.2s}
.msg-content:hover .msg-tools{opacity:1}
.btn-white{background:#fff;border:1px solid #ddd;color:#333}
.btn-white:hover{background:#f5f5f5}
.msg-user .btn-white{background:rgba(255,255,255,0.5);border:1px solid rgba(0,0,0,0.1);color:#333}
.msg-user .btn-white:hover{background:rgba(255,255,255,0.7)}
.typing{display:flex;align-items:center;gap:8px;padding:12px 16px;color:#666;font-style:italic}
.ai-input{display:flex;align-items:flex-start;gap:12px;padding:16px;border-top:1px solid #eaecef;background:#fff}
.ai-input .el-textarea{flex:1}
.input-actions{display:flex;flex-direction:column;gap:8px}
.context-menu{position:fixed;background:#fff;border:1px solid #ddd;border-radius:4px;box-shadow:0 2px 8px rgba(0,0,0,0.15);z-index:1000;min-width:120px}
.context-menu-item{padding:8px 12px;cursor:pointer;font-size:14px;color:#333;transition:background-color 0.2s}
.context-menu-item:hover{background:#f5f5f5}
@keyframes fadeIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
</style>
