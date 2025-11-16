<template>
  <el-card>
    <el-tabs v-model="tab">
      <el-tab-pane label="笔记分类" name="notes" />
      <el-tab-pane label="导图分类" name="mindmaps" />
      <el-tab-pane label="链接分类" name="links" />
    </el-tabs>
    <div style="display:flex;gap:16px">
      <div style="width:300px">
        <el-tree :data="tree" node-key="id" :props="{ label:'name', children:'children' }" @node-click="onClick"></el-tree>
      </div>
      <div style="flex:1">
        <el-form inline>
          <el-form-item label="名称"><el-input v-model="name" /></el-form-item>
          <el-form-item label="父级"><el-input v-model="parentId" placeholder="可空" /></el-form-item>
          <el-button class="btn-white" @click="add">新增</el-button>
          <el-button class="btn-white" @click="update" :disabled="!currentId">重命名</el-button>
          <el-button class="btn-white" @click="remove" :disabled="!currentId">删除</el-button>
        </el-form>
      </div>
    </div>
  </el-card>
</template>

<script setup>
import http from '../api/http'
import { ref, watch } from 'vue'
const tab = ref('notes')
const list = ref([])
const tree = ref([])
const name = ref('')
const parentId = ref('')
const currentId = ref('')
async function load(){
  const url = tab.value==='notes' ? '/categories/notes' : tab.value==='mindmaps' ? '/categories/mindmaps' : '/categories/links'
  const { data } = await http.get(url)
  list.value = data
  tree.value = buildTree(data)
}
function buildTree(items){
  const map = {}; items.forEach(i=>{ map[i.id] = { ...i, children: [] } })
  const roots = []; items.forEach(i=>{ if (i.parentId){ map[i.parentId]?.children.push(map[i.id]) } else { roots.push(map[i.id]) } })
  return roots
}
function onClick(node){ currentId.value = node.id; name.value = node.name; parentId.value = node.parentId||'' }
async function add(){
  const url = tab.value==='notes' ? '/categories/notes' : tab.value==='mindmaps' ? '/categories/mindmaps' : '/categories/links'
  await http.post(url, { name: name.value, parentId: parentId.value||null })
  name.value=''; parentId.value=''; currentId.value=''; load()
}
async function update(){
  const url = tab.value==='notes' ? `/categories/notes/${currentId.value}` : tab.value==='mindmaps' ? `/categories/mindmaps/${currentId.value}` : `/categories/links/${currentId.value}`
  await http.put(url, { name: name.value })
  load()
}
async function remove(){
  const url = tab.value==='notes' ? `/categories/notes/${currentId.value}` : tab.value==='mindmaps' ? `/categories/mindmaps/${currentId.value}` : `/categories/links/${currentId.value}`
  await http.delete(url)
  load()
}
watch(tab, load, { immediate: true })
</script>
