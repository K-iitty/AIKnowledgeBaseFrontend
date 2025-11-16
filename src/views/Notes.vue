<template>
  <div class="notes-categories">
    <div class="page-header">
      <!-- <h1>笔记本</h1> -->
    </div>
    <KnowledgeCategories :filter-type="'notes'" @category-selected="enterCategory" />
  </div>
</template>

<script setup>
import { useRouter } from 'vue-router'
import KnowledgeCategories from '@/components/KnowledgeCategories.vue'
const router = useRouter()

function enterCategory(category){
  router.push(`/notes/category/${category.id}`)
}
</script>