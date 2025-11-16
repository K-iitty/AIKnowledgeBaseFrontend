<template>
  <div class="knowledge-base">
    <!-- Knowledge Categories View -->
    <KnowledgeCategories v-if="!selectedCategory" @category-selected="handleCategorySelect" />
    
    <!-- Knowledge Content View -->
    <KnowledgeContent 
      v-else
      :content-type="contentType"
      :category-id="selectedCategory"
      @back="handleBack"
    />
  </div>
</template>

<script setup>
import { ref } from 'vue'
import KnowledgeCategories from '@/components/KnowledgeCategories.vue'
import KnowledgeContent from '@/views/KnowledgeContent.vue'

// State
const selectedCategory = ref(null)
const contentType = ref(null)

// Methods
const handleCategorySelect = (category) => {
  selectedCategory.value = category.id
  contentType.value = category.type // 'note' or 'mindmap'
}

const handleBack = () => {
  selectedCategory.value = null
  contentType.value = null
}
</script>

<style scoped>
.knowledge-base {
  height: 100%;
  background: #f5f7fa;
}
</style>