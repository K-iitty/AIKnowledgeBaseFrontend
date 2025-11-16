<template>
  <div class="links-container">
    <el-card>
      <div style="display:flex;gap:12px;margin-bottom:12px">
        <el-select v-model="selectedCategory" placeholder="选择分类" style="width:240px" @change="load">
          <el-option :key="''" label="全部" :value="''" />
          <el-option v-for="c in categories" :key="c.id" :label="c.name" :value="c.id" />
        </el-select>
      </div>
      <el-form inline>
        <el-form-item label="标题"><el-input v-model="form.title" /></el-form-item>
        <el-form-item label="地址"><el-input v-model="form.url" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.remark" /></el-form-item>
        <el-form-item label="图标"><el-input v-model="form.icon" placeholder="例如 🔗 或图标类名" /></el-form-item>
        <el-form-item label="排序"><el-input v-model.number="form.orderIndex" type="number" /></el-form-item>
        <el-button class="btn-white" @click="create">新增链接</el-button>
      </el-form>
      <el-table :data="list">
        <el-table-column prop="title" label="标题" />
        <el-table-column label="图标" width="80">
          <template #default="{ row }">
            <span>{{ row.icon }}</span>
          </template>
        </el-table-column>
        <el-table-column label="链接">
          <template #default="{ row }">
            <a :href="row.url" target="_blank">{{ row.url }}</a>
          </template>
        </el-table-column>
        <el-table-column prop="remark" label="备注" />
        <el-table-column prop="orderIndex" label="排序" width="80" />
        <el-table-column prop="createdAt" label="创建时间" />
        <el-table-column label="操作">
          <template #default="{ row }">
            <el-button size="small" type="danger" @click="remove(row.id)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>
      <el-empty v-if="list.length===0" description="暂无数据" />
    </el-card>
  </div>
</template>

<script setup>
import http from '../api/http'
import { ref, onMounted } from 'vue'
const list = ref([])
const form = ref({ title: '', url: '', remark: '', icon: '', orderIndex: 0, categoryId: null })
const categories = ref([])
const selectedCategory = ref('')
async function load() {
  const { data } = await http.get('/links/list', { params: { categoryId: categoryIdParam() } })
  list.value = data
}
load()
async function create() {
  await http.post('/links', { ...form.value, categoryId: categoryIdParam()||null })
  form.value = { title: '', url: '', remark: '', icon: '', orderIndex: 0, categoryId: null }
  load()
}
async function remove(id) {
  await http.delete(`/links/${id}`)
  load()
}
onMounted(async ()=>{
  const { data } = await http.get('/categories/links')
  categories.value = data
})
function categoryIdParam(){
  if (!selectedCategory.value) return undefined
  const v = selectedCategory.value
  return typeof v === 'object' ? v.id : v
}
</script>

<style scoped>
.links-container {
  padding: 16px;
}
</style>
