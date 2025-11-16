<template>
  <div class="login-root bg-secondary">
    <div class="login-hero">
      <div class="brand">注册账户</div>
      <div class="subtitle">创建你的知识库账号</div>
    </div>
    <el-card class="login-card">
      <div class="title">注册</div>
      <el-form :model="form" :rules="rules" ref="formRef" label-position="top">
        <el-form-item label="用户名" prop="username">
          <el-input v-model="form.username" placeholder="请输入用户名" />
        </el-form-item>
        <el-form-item label="昵称" prop="nickname">
          <el-input v-model="form.nickname" placeholder="请输入昵称" />
        </el-form-item>
        <el-form-item label="密码" prop="password">
          <el-input v-model="form.password" type="password" placeholder="至少6位，需包含英文和数字" />
        </el-form-item>
        <el-form-item label="确认密码" prop="confirm">
          <el-input v-model="form.confirm" type="password" placeholder="请再次输入密码" />
        </el-form-item>
        <el-button class="btn-white" style="width:100%" @click="submit">注册</el-button>
        <div class="actions">
          <a @click="toLogin">已有账户？去登录</a>
        </div>
      </el-form>
    </el-card>
  </div>
  </template>

<script setup>
import http from '../api/http'
import { ref } from 'vue'
import { useRouter } from 'vue-router'
const router = useRouter()
const formRef = ref()
const form = ref({ username: '', nickname: '', password: '', confirm: '' })
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
    await http.post('/auth/register', { username: form.value.username, password: form.value.password, nickname: form.value.nickname })
    router.push('/login')
  })
}
function toLogin(){ router.push('/login') }
</script>

<style scoped>
.login-root{min-height:100vh;display:flex;align-items:center;justify-content:center}
.login-hero{position:absolute;top:10%;left:50%;transform:translateX(-50%);text-align:center}
.brand{font-size:28px;font-weight:700;color:#3b6cb7}
.subtitle{margin-top:6px;color:#666}
.login-card{width:420px;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.08)}
.title{font-size:20px;font-weight:600;margin-bottom:8px}
.actions{margin-top:10px;text-align:right}
.actions a{color:#333;cursor:pointer}
</style>
