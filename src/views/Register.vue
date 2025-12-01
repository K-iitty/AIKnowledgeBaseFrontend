<template>
  <div class="register-container">
    <!-- 背景装饰 -->
    <div class="bg-decoration">
      <div class="circle circle-1"></div>
      <div class="circle circle-2"></div>
      <div class="circle circle-3"></div>
    </div>

    <!-- 主要内容 -->
    <div class="register-content">
      <!-- 左侧品牌区域 -->
      <div class="brand-section">
        <div class="brand-logo">
          <div class="logo-icon"></div>
          <h1 class="brand-title">加入我们</h1>
        </div>
        <p class="brand-subtitle">创建你的AI知识库账号，开启智能学习之旅</p>
        <div class="brand-features">
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">免费注册，即刻使用</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">安全可靠，隐私保护</span>
          </div>
          <div class="feature-item">
            <span class="feature-icon"></span>
            <span class="feature-text">多端同步，随时访问</span>
          </div>
        </div>
      </div>

      <!-- 右侧注册区域 -->
      <div class="register-section">
        <div class="register-box">
          <div class="register-header">
            <h2>创建账户</h2>
            <p>填写信息开始使用</p>
          </div>

          <el-form :model="form" :rules="rules" ref="formRef" class="register-form">
            <el-form-item prop="username">
              <el-input
                v-model="form.username"
                placeholder="请输入用户名"
                prefix-icon="User"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="nickname">
              <el-input
                v-model="form.nickname"
                placeholder="请输入昵称"
                prefix-icon="Avatar"
                size="large"
              />
            </el-form-item>

            <el-form-item prop="password">
              <el-input
                v-model="form.password"
                type="password"
                placeholder="至少6位，需包含英文和数字"
                prefix-icon="Lock"
                size="large"
                show-password
              />
            </el-form-item>

            <el-form-item prop="confirm">
              <el-input
                v-model="form.confirm"
                type="password"
                placeholder="请再次输入密码"
                prefix-icon="Lock"
                size="large"
                show-password
                @keyup.enter="submit"
              />
            </el-form-item>

            <el-button
              type="primary"
              size="large"
              :loading="loading"
              @click="submit"
              class="register-button"
            >
              {{ loading ? '注册中...' : '注册' }}
            </el-button>
          </el-form>

          <div class="register-footer">
            <el-link type="primary" @click="toLogin">已有账户？立即登录</el-link>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import http from '../api/http'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const form = ref({ username: '', nickname: '', password: '', confirm: '' })
const loading = ref(false)
const rules = {
  username: [{ required: true, message: '请输入用户名' }],
  nickname: [{ required: true, message: '请输入昵称' }],
  password: [{ required: true, message: '请输入密码' }, { validator: validatePwd }],
  confirm: [{ required: true, message: '请确认密码' }, { validator: validateConfirm }]
}
function validatePwd(rule, value, callback){
  if (!/^(?=.*[A-Za-z])(?=.*\d)[A-Za-z\d]{6,}$/.test(value)) callback(new Error('至少6位且包含英文和数字'))
  else callback()
}
function validateConfirm(rule, value, callback){
  if (value !== form.value.password) callback(new Error('两次输入不一致'))
  else callback()
}
function submit(){
  formRef.value.validate(async valid => {
    if (!valid) return
    
    loading.value = true
    
    try {
      await http.post('/auth/register', { 
        username: form.value.username, 
        password: form.value.password, 
        nickname: form.value.nickname 
      })
      ElMessage.success('注册成功，请登录')
      setTimeout(() => {
        router.push('/login')
      }, 1000)
    } catch (error) {
      // 错误已由 http 拦截器处理
    } finally {
      loading.value = false
    }
  })
}
function toLogin(){ router.push('/login') }
</script>

<style scoped>
.register-container {
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
.register-content {
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

/* 右侧注册区域 */
.register-section {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  max-width: 480px;
}

/* 注册框 */
.register-box {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20px;
  padding: 48px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.15);
  backdrop-filter: blur(10px);
}

.register-header {
  text-align: center;
  margin-bottom: 40px;
}

.register-header h2 {
  font-size: 32px;
  font-weight: 700;
  background: linear-gradient(135deg, #9dc2fe 0%, #7ba5f5 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  margin: 0 0 12px 0;
}

.register-header p {
  font-size: 14px;
  color: #999;
  margin: 0;
}

.register-form :deep(.el-input__wrapper) {
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);
  transition: all 0.3s;
  padding: 8px 15px;
}

.register-form :deep(.el-input__wrapper:hover) {
  box-shadow: 0 2px 12px rgba(157, 194, 254, 0.15);
}

.register-form :deep(.el-input__wrapper.is-focus) {
  box-shadow: 0 0 0 2px rgba(157, 194, 254, 0.2);
}

.register-button {
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

.register-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 20px rgba(157, 194, 254, 0.4);
}

.register-footer {
  text-align: center;
  margin-top: 24px;
}

.register-footer :deep(.el-link) {
  color: #9dc2fe;
  font-weight: 500;
}

/* 响应式设计 */
@media (max-width: 968px) {
  .register-content {
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

  .register-section {
    max-width: 100%;
  }
}

@media (max-width: 576px) {
  .register-box {
    padding: 32px 24px;
  }

  .brand-title {
    font-size: 28px;
  }
}
</style>
