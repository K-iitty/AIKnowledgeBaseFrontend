<template>
  <el-row :gutter="20">
    <el-col :span="10">
      <el-card>
        <el-form label-width="80px">
          <el-form-item label="姓名"><el-input v-model="profile.name" /></el-form-item>
          <el-form-item label="联系方式"><el-input v-model="profile.contact" /></el-form-item>
          <el-form-item label="简介"><el-input type="textarea" v-model="profile.bio" :rows="6" /></el-form-item>
          <el-form-item label="所在地"><el-input v-model="profile.location" /></el-form-item>
          <el-form-item label="职位"><el-input v-model="profile.jobTitle" /></el-form-item>
          <el-form-item label="网站"><el-input v-model="profile.website" /></el-form-item>
          <el-form-item label="头像">
            <el-upload :auto-upload="false" :on-change="onAvatarChange">
              <el-button>上传头像</el-button>
            </el-upload>
            <div v-if="profile.avatarKey" style="margin-top:8px">
              <img :src="coverUrl(profile.avatarKey)" style="width:80px;height:80px;border-radius:50%;object-fit:cover" />
            </div>
          </el-form-item>
          <el-button class="btn-white" @click="save">保存</el-button>
        </el-form>
      </el-card>
    </el-col>
    <el-col :span="14">
      <el-card>
        <el-form inline>
          <el-form-item label="类型"><el-input v-model="item.type" /></el-form-item>
          <el-form-item label="标题"><el-input v-model="item.title" /></el-form-item>
          <el-form-item label="内容"><el-input v-model="item.content" /></el-form-item>
          <el-button type="primary" @click="addItem">新增项目</el-button>
        </el-form>
        <el-table :data="items">
          <el-table-column prop="type" label="类型" />
          <el-table-column prop="title" label="标题" />
          <el-table-column prop="content" label="内容" />
          <el-table-column label="操作">
            <template #default="{ row }">
              <el-button size="small" type="danger" @click="delItem(row.id)">删除</el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-card>
    </el-col>
  </el-row>
</template>

<script setup>
import http from '../api/http'
import { ref } from 'vue'
const profile = ref({})
const item = ref({ type: '', title: '', content: '' })
const items = ref([])
async function load() {
  const { data } = await http.get('/profile')
  profile.value = data
  const res = await http.get('/profile/items', { params: { profileId: data.id } })
  items.value = res.data
}
load()
async function save() { await http.put('/profile', profile.value) }
async function addItem() {
  await http.post('/profile/items', { ...item.value, profileId: profile.value.id })
  item.value = { type: '', title: '', content: '' }
  load()
}
async function delItem(id) {
  await http.delete(`/profile/items/${id}`)
  load()
}
async function onAvatarChange(file) {
  const fd = new FormData()
  fd.append('file', file.raw)
  fd.append('dir', 'images')
  const { data } = await http.post('/files/upload', fd)
  profile.value.avatarKey = data
}
function coverUrl(key) {
  return `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${key}`
}
</script>
