<template>
  <el-card>
    <el-form label-width="90px">
      <el-form-item label="标题"><el-input v-model="map.title" /></el-form-item>
      <el-form-item label="描述"><el-input v-model="map.description" /></el-form-item>
      <el-form-item label="可见性">
        <el-select v-model="map.visibility" style="width:200px">
          <el-option label="私有" value="private" />
          <el-option label="公开" value="public" />
        </el-select>
      </el-form-item>
      <el-form-item label="封面">
        <el-upload :auto-upload="false" :on-change="onCoverChange">
          <el-button class="btn-white">上传封面</el-button>
        </el-upload>
        <div v-if="map.coverKey" style="margin-top:8px">
          <img :src="coverUrl(map.coverKey)" style="width:160px;height:96px;object-fit:cover" />
        </div>
      </el-form-item>
      <el-form-item>
        <el-button class="btn-white" @click="save">保存</el-button>
      </el-form-item>
    </el-form>
  </el-card>
</template>

<script setup>
import http from '../api/http'
import { ref } from 'vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const id = route.params.id
const map = ref({})
async function load(){
  // 直接获取思维导图详情，会自动增加浏览量
  const { data } = await http.get(`/mindmaps/${id}`)
  map.value = data
}
load()
async function save(){
  await http.put(`/mindmaps/${id}`, { title: map.value.title, description: map.value.description, coverKey: map.value.coverKey, visibility: map.value.visibility })
}
async function onCoverChange(file){
  const fd = new FormData(); fd.append('file', file.raw); fd.append('dir', 'images')
  const { data } = await http.post('/files/upload', fd)
  map.value.coverKey = data
}
function coverUrl(key){ return `https://aiknowledgebase.oss-cn-beijing.aliyuncs.com/${key}` }
</script>
