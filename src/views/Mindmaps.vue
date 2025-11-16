<template>
  <div class="mindmaps-categories">
    <div class="page-header">
      <!-- <h1>思维导图分类</h1> -->
      <!-- <div class="desc">按分类以书本样式平铺展示</div> -->
    </div>
    <KnowledgeCategories :filter-type="'mindmaps'" @category-selected="enterCategory" />
  </div>
</template>b

<script setup>
import { useRouter } from 'vue-router'
import KnowledgeCategories from '@/components/KnowledgeCategories.vue'
const router = useRouter()
function enterCategory(category){
  router.push(`/mindmaps/category/${category.id}`)
}
</script>
