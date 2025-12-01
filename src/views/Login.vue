<template>
  <div class="login-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <!-- 主要内容 -->
    <div class="login-content">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-icon"></div>
          <h1 class="brand-title">AI 智能知识库</h1>
        </div>
        <p class="brand-subtitle">整合问答、笔记与思维导图的智能知识平台</p>
        <div class="brand-features">
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">智能AI问答</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">笔记管理</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">思维导图</span>
          </div>
        </div>
      </div>

      <!-- 右侧登录区域 -->
      <div class="login-section">
        <!-- 角色切换卡片 -->
        <div class="role-switch">
          <div 
            class="role-option" 
            :class="{ active: !isAdmin }"
            @click="switchRole(false)"
          >
            <span class="role-icon"></span>
            <span class="role-name">用户登录</span>
          </div>
          <div 
            class="role-option" 
            :class="{ active: isAdmin }"
            @click="switchRole(true)"
          >
            <span class="role-icon"></span>
            <span class="role-name">管理员</span>
          </div>
        </div>

        <!-- 登录表单 -->
        <div class="login-box">
          <div class="login-header">
            <h2>{{ isAdmin ? '管理员登录' : '欢迎回来' }}</h2>
            <p>{{ isAdmin ? '' : '登录以继续使用' }}</p>
          </div>

          <el-form :model="form" :rules="rules" ref="formRef" class="login-form">
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                :placeholder="isAdmin ? '请输入管理员账号' : '请输入用户名'"
                prefix-icon="User"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="请输入密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="submit"
              />
            </el-form-item>

            <el-form-item prop="captchaVerification">
              <el-button
                size="large"
                style="width: 100%"
                @click="showCaptcha"
                :disabled="!form.username || !form.password"
              >
                {{ form.captchaVerification ? '✓ 验证码已完成' : '点击进行滑动验证' }}
              </el-button>
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="submit"
              class="login-button"
            >
              {{ loading ? '登录中...' : '登录' }}
            </el-button>
          </el-form>

          <div class="login-footer" v-if="!isAdmin">
            <el-link type="primary" @click="toRegister">没有账户？立即注册</el-link>
          </div>
        </div>
      </div>
    </div>

    <!-- 验证码弹窗 -->
    <Captcha 
      :visible="captchaVisible"
      @success="onCaptchaSuccess"
      @close="captchaVisible = false"
    />
  </div>
</template>

<script setup>
import http from '../api/http'
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import Captcha from '../components/Captcha.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const form = ref({ username: '', password: '', captchaVerification: '' })
const captchaVisible = ref(false)
const loading = ref(false)
const isAdmin = ref(false)
const isLoggingIn = ref(false) // 标记是否正在登录过程中

// 页面加载时检查是否已登录（仅在直接访问登录页时检查）
onMounted(() => {
  console.log('===== Login.vue onMounted 执行 =====')
  console.log('isLoggingIn:', isLoggingIn.value)
  
  // 延迟检查，确保不会干扰登录流程
  setTimeout(() => {
    console.log('===== onMounted 延迟检查开始 =====')
    console.log('isLoggingIn:', isLoggingIn.value)
    
    // 如果正在登录过程中，不执行跳转检查
    if (isLoggingIn.value) {
      console.log('正在登录中，跳过自动跳转检查')
      return
    }
    
    const adminToken = localStorage.getItem('admin_token')
    const userToken = localStorage.getItem('token')
    
    console.log('检查 token - admin:', adminToken ? '存在' : '不存在', ', user:', userToken ? '存在' : '不存在')
    
    if (adminToken) {
      console.log('检测到管理员 token，跳转到管理后台')
      router.replace('/admin/dashboard')
    } else if (userToken) {
      console.log('检测到用户 token，跳转到 AI 问答页面')
      router.replace('/ai')
    } else {
      console.log('未检测到任何 token，保持在登录页')
    }
  }, 200)
})

const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  password: [{ required: true, message: '请输入密码' }],
  captchaVerification: [{ required: true, message: '请完成验证码验证' }]
}

function showCaptcha() {
  formRef.value.validateField(['username', 'password'], (valid) => {
    if (valid) {
      captchaVisible.value = true
    }
  })
}

function onCaptchaSuccess(params) {
  form.value.captchaVerification = params.captchaVerification
  captchaVisible.value = false
  ElMessage.success('验证码验证成功')
}

// 切换角色
function switchRole(admin) {
  isAdmin.value = admin
  // 清空表单
  form.value = { username: '', password: '', captchaVerification: '' }
  formRef.value?.clearValidate()
}

function submit() {
  formRef.value.validate(async valid => {
    if (!valid) return
    
    if (!form.value.captchaVerification) {
      ElMessage.warning('请先完成验证码验证')
      return
    }
    
    loading.value = true
    isLoggingIn.value = true // 标记开始登录
    
    try {
      if (isAdmin.value) {
        // 管理员登录
        console.log('========== 开始管理员登录 ==========')
        const { data } = await http.post('/admin/login', form.value)
        console.log('管理员登录成功，返回数据:', data)
        
        // 先保存 token
        localStorage.setItem('admin_token', data.token)
        localStorage.setItem('admin_info', JSON.stringify(data.admin))
        console.log('Token 已保存到 localStorage')
        console.log('当前 admin_token:', localStorage.getItem('admin_token'))
        
        ElMessage.success('登录成功，正在跳转...')
        
        // 延迟一下，确保 token 完全保存
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // 使用 router.push 跳转
        console.log('========== 开始跳转到管理后台 ==========')
        console.log('跳转前 URL:', window.location.href)
        await router.push('/admin/dashboard')
        console.log('router.push 执行完成')
        console.log('跳转后 URL:', window.location.href)
        console.log('当前路由路径:', router.currentRoute.value.path)
        
        // 延迟重置 isLoggingIn，确保 onMounted 不会干扰
        setTimeout(() => {
          loading.value = false
          isLoggingIn.value = false
          console.log('========== 管理员登录流程结束 ==========')
        }, 500)
      } else {
        // 用户登录
        console.log('开始用户登录...')
        const { data } = await http.post('/auth/login', form.value)
        localStorage.setItem('token', data.token)
        ElMessage.success('登录成功')
        await router.push('/ai')
        loading.value = false
        isLoggingIn.value = false
      }
    } catch (error) {
      console.error('登录失败:', error)
      // 登录失败后清除验证码，需要重新验证
      form.value.captchaVerification = ''
      loading.value = false
      isLoggingIn.value = false
    }
  })
}

function toRegister(){ router.push('/register') }
</script>

<style scoped>
.login-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #9dc2fe 0%, #7ba5f5 100%);
  position: relative;
  overflow: hidden;
  padding: 20px;
}

/* 背景装饰 */
.bg-decoration {
  position: absolute;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.circle {
  position: absolute;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  animation: float 20s infinite ease-in-out;
}

.circle-1 {
  width: 300px;
  height: 300px;
  top: 10%;
  left: 10%;
  animation-delay: 0s;
}

.circle-2 {
  width: 200px;
  height: 200px;
  top: 60%;
  right: 10%;
  animation-delay: 5s;
}

.circle-3 {
  width: 150px;
  height: 150px;
  bottom: 10%;
  left: 50%;
  animation-delay: 10s;
}

@keyframes float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-30px) rotate(180deg);
  }
}

/* 主要内容 */
.login-content {
  display: flex;
  max-width: 1200px;
  width: 100%;
  gap: 60px;
  position: relative;
  z-index: 1;
}

/* 左侧品牌区域 */
.brand-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  color: white;
  padding: 40px;
}

.brand-logo {
  display: flex;
  align-items: center;
  gap: 20px;
  margin-bottom: 30px;
}

.logo-icon {
  font-size: 64px;
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.1);
  }
}

.brand-title {
  font-size: 48px;
  font-weight: 700;
  margin: 0;
  text-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
}

.brand-subtitle {
  font-size: 18px;
  opacity: 0.9;
  margin-bottom: 40px;
  line-height: 1.6;
}

.brand-features {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.feature-item {
  display: flex;
  align-items: center;
  gap: 15px;
  font-size: 16px;
  padding: 15px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  backdrop-filter: blur(10px);
  transition: all 0.3s;
}

.feature-item:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateX(10px);
}

.feature-icon {
  font-size: 24px;
}

/* 右侧登录区域 */
.login-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
  max-width: 480px;
}

/* 角色切换卡片 */
.role-switch {
  display: flex;
  gap: 15px;
  padding: 8px;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 16px;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.1);
  backdrop-filter: blur(10px);
}

.role-option {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  padding: 16px 24px;
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.3s;
  background: transparent;
  color: #666;
  font-weight: 500;
}

.role-option:hover {
  background: rgba(157, 194, 254, 0.1);
}

.role-option.active {
  background: linear-gradient(135deg, #9dc2fe 0%, #7ba5f5 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(157, 194, 254, 0.4);
}

.role-icon {
  font-size: 20px;
}

.role-name {
  font-size: 15px;
}

/* 登录框 */
.login-box {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.login-header {
  text-align: center;
  margin-bottom: 40px;
}

.login-header h2 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #9dc2fe 0%, #7ba5f5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px 0;
}

.login-header p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.login-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  padding: 8px 15px;
}

.login-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 12px rgba(157, 194, 254, 0.15);
}

.login-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(157, 194, 254, 0.2);
}

.login-button {
  width: 100%;
  height: 48px;
  font-size: 16px;
  font-weight: 600;
  border-radius: 12px;
  background: linear-gradient(135deg, #9dc2fe 0%, #7ba5f5 100%);
  border: none;
  transition: all 0.3s;
  margin-top: 10px;
}

.login-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(157, 194, 254, 0.4);
}

.login-footer {
  text-align: center;
  margin-top: 24px;
}

.login-footer :deep(.el-link) {
  color: #9dc2fe;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 968px) {
  .login-content {
    flex-direction: column;
    gap: 30px;
  }

  .brand-section {
    text-align: center;
    padding: 20px;
  }

  .brand-logo {
    justify-content: center;
  }

  .brand-title {
    font-size: 36px;
  }

  .brand-features {
    align-items: center;
  }

  .feature-item {
    max-width: 300px;
  }

  .login-section {
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  .login-box {
    padding: 32px 24px;
  }

  .role-switch {
    flex-direction: column;
    gap: 10px;
  }

  .brand-title {
    font-size: 28px;
  }
}
</style>
