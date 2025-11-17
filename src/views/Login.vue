<template>
  <div class="login-root bg-secondary">
    <div class="login-hero">
      <div class="brand">AI 知识库</div>
      <div class="subtitle">整合问答、笔记与思维导图的知识平台</div>
    </div>
    <el-card class="login-card">
      <div class="title">登录</div>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="请输入密码" @keyup.enter="submit" />
        </el-form-item>
        <el-form-item label="验证码" prop="captchaVerification">
          <div style="width: 100%;">
            <el-button type="primary" @click="showCaptcha" style="width: 100%;">
              点击进行滑动验证
            </el-button>
          </div>
        </el-form-item>
        <el-button class="btn-white" style="width:100%" @click="submit">登录</el-button>
        <div class="actions">
          <a @click="toRegister">没有账户？去注册</a>
        </div>
      </el-form>
    </el-card>
    
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
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import Captcha from '../components/Captcha.vue'
import { ElMessage } from 'element-plus'

const router = useRouter()
const formRef = ref()
const form = ref({ username: '', password: '', captchaVerification: '' })
const captchaVisible = ref(false)

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

function submit() {
  formRef.value.validate(async valid => {
    if (!valid) return
    
    if (!form.value.captchaVerification) {
      ElMessage.warning('请先完成验证码验证')
      return
    }
    
    try {
      const { data } = await http.post('/auth/login', form.value)
      localStorage.setItem('token', data.token)
      router.push('/notes')
    } catch (error) {
      // 登录失败后清除验证码，需要重新验证
      form.value.captchaVerification = ''
    }
  })
}

function toRegister(){ router.push('/register') }
</script>

<style scoped>
.login-root{min-height:100vh;display:flex;align-items:center;justify-content:center}
.login-hero{position:absolute;top:10%;left:50%;transform:translateX(-50%);text-align:center}
.brand{font-size:28px;font-weight:700;color:#7cb0ff}
.subtitle{margin-top:6px;color:#666}
.login-card{width:380px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.title{font-size:20px;font-weight:600;margin-bottom:8px}
.actions{margin-top:10px;text-align:right}
.actions a{color:#333;cursor:pointer}
</style>
