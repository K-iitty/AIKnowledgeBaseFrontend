<template>
  <div v-if="visible" class="captcha-overlay" @click="handleClose">
    <div class="captcha-container" @click.stop>
      <div class="captcha-header">
        <span>请完成安全验证</span>
        <span class="close-btn" @click="handleClose">×</span>
      </div>
      <div class="captcha-body">
        <div v-if="loading" class="loading">加载中...</div>
        <div v-else-if="captchaData">
          <div class="captcha-image-container">
            <img :src="'data:image/png;base64,' + captchaData.originalImageBase64" class="captcha-bg" />
            <img 
              :src="'data:image/png;base64,' + captchaData.jigsawImageBase64" 
              class="captcha-slider-img"
              :style="{ left: sliderPosition + 'px' }"
            />
          </div>
          <div class="slider-container">
            <div class="slider-track">
              <div class="slider-progress" :style="{ width: sliderPosition + 'px' }"></div>
            </div>
            <div 
              class="slider-btn"
              :style="{ left: sliderPosition + 'px' }"
              @mousedown="handleMouseDown"
              @touchstart="handleTouchStart"
            >
              <span v-if="!isDragging && sliderPosition === 0">→</span>
              <span v-else>⇄</span>
            </div>
          </div>
          <div v-if="errorMsg" class="error-msg">{{ errorMsg }}</div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import http from '../api/http'

const props = defineProps({
  visible: {
    type: Boolean,
    default: false
  }
})

const emit = defineEmits(['success', 'close'])

const loading = ref(false)
const captchaData = ref(null)
const sliderPosition = ref(0)
const isDragging = ref(false)
const startX = ref(0)
const errorMsg = ref('')
const token = ref('')

// 获取验证码
const getCaptcha = async () => {
  loading.value = true
  errorMsg.value = ''
  try {
    const { data } = await http.post('/auth/captcha/get', {
      captchaType: 'blockPuzzle'
    })
    if (data.repCode === '0000') {
      captchaData.value = data.repData
      token.value = data.repData.token
    } else {
      errorMsg.value = '获取验证码失败'
    }
  } catch (error) {
    errorMsg.value = '获取验证码失败'
  } finally {
    loading.value = false
  }
}

// 验证验证码
const verifyCaptcha = async (moveLength) => {
  try {
    // AJ-Captcha 需要的坐标格式
    const point = {
      x: Math.round(moveLength),
      y: 5.0
    }
    
    // 构造验证参数
    const captchaVO = {
      captchaType: 'blockPuzzle',
      pointJson: JSON.stringify(point),
      token: token.value
    }
    
    console.log('验证参数:', captchaVO)
    
    const { data } = await http.post('/auth/captcha/check', captchaVO)
    
    console.log('验证结果:', data)
    
    if (data.repCode === '0000') {
      // 使用后端返回的 captchaVerification
      const verification = data.repData?.captchaVerification || (token.value + '---' + JSON.stringify(point))
      emit('success', {
        captchaVerification: verification
      })
      handleClose()
    } else {
      errorMsg.value = data.repMsg || '验证失败，请重试'
      resetSlider()
      // 重新获取验证码
      setTimeout(() => {
        getCaptcha()
      }, 1000)
    }
  } catch (error) {
    console.error('验证错误:', error)
    errorMsg.value = '验证失败，请重试'
    resetSlider()
    setTimeout(() => {
      getCaptcha()
    }, 1000)
  }
}

// 重置滑块
const resetSlider = () => {
  sliderPosition.value = 0
  isDragging.value = false
}

// 鼠标按下
const handleMouseDown = (e) => {
  isDragging.value = true
  startX.value = e.clientX - sliderPosition.value
  errorMsg.value = ''
  
  document.addEventListener('mousemove', handleMouseMove)
  document.addEventListener('mouseup', handleMouseUp)
}

// 鼠标移动
const handleMouseMove = (e) => {
  if (!isDragging.value) return
  
  const maxMove = 310 - 40 // 容器宽度 - 滑块宽度
  let newPosition = e.clientX - startX.value
  
  if (newPosition < 0) newPosition = 0
  if (newPosition > maxMove) newPosition = maxMove
  
  sliderPosition.value = newPosition
}

// 鼠标松开
const handleMouseUp = () => {
  if (isDragging.value) {
    isDragging.value = false
    document.removeEventListener('mousemove', handleMouseMove)
    document.removeEventListener('mouseup', handleMouseUp)
    
    // 验证
    verifyCaptcha(sliderPosition.value)
  }
}

// 触摸开始
const handleTouchStart = (e) => {
  isDragging.value = true
  startX.value = e.touches[0].clientX - sliderPosition.value
  errorMsg.value = ''
  
  document.addEventListener('touchmove', handleTouchMove)
  document.addEventListener('touchend', handleTouchEnd)
}

// 触摸移动
const handleTouchMove = (e) => {
  if (!isDragging.value) return
  
  const maxMove = 310 - 40
  let newPosition = e.touches[0].clientX - startX.value
  
  if (newPosition < 0) newPosition = 0
  if (newPosition > maxMove) newPosition = maxMove
  
  sliderPosition.value = newPosition
}

// 触摸结束
const handleTouchEnd = () => {
  if (isDragging.value) {
    isDragging.value = false
    document.removeEventListener('touchmove', handleTouchMove)
    document.removeEventListener('touchend', handleTouchEnd)
    
    verifyCaptcha(sliderPosition.value)
  }
}

// 关闭
const handleClose = () => {
  resetSlider()
  emit('close')
}

// 监听visible变化
watch(() => props.visible, (newVal) => {
  if (newVal) {
    getCaptcha()
  } else {
    resetSlider()
    captchaData.value = null
  }
})
</script>

<style scoped>
.captcha-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.captcha-container {
  background: white;
  border-radius: 8px;
  width: 360px;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.captcha-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 20px;
  border-bottom: 1px solid #e8e8e8;
  font-weight: 500;
}

.close-btn {
  font-size: 24px;
  cursor: pointer;
  color: #999;
  line-height: 1;
}

.close-btn:hover {
  color: #333;
}

.captcha-body {
  padding: 20px;
}

.loading {
  text-align: center;
  padding: 40px 0;
  color: #999;
}

.captcha-image-container {
  position: relative;
  width: 310px;
  height: 155px;
  margin-bottom: 20px;
  border-radius: 4px;
  overflow: hidden;
}

.captcha-bg {
  width: 100%;
  height: 100%;
  display: block;
}

.captcha-slider-img {
  position: absolute;
  top: 0;
  left: 0;
  height: 100%;
  transition: left 0.1s;
}

.slider-container {
  position: relative;
  width: 310px;
  height: 40px;
}

.slider-track {
  position: absolute;
  width: 100%;
  height: 40px;
  background: #f7f9fa;
  border-radius: 4px;
  overflow: hidden;
}

.slider-progress {
  height: 100%;
  background: #d1e9ff;
  transition: width 0.1s;
}

.slider-btn {
  position: absolute;
  top: 0;
  width: 40px;
  height: 40px;
  background: white;
  border: 1px solid #ccc;
  border-radius: 4px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: #666;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  user-select: none;
  transition: left 0.1s;
}

.slider-btn:hover {
  background: #f7f9fa;
}

.slider-btn:active {
  background: #e8e8e8;
}

.error-msg {
  margin-top: 10px;
  color: #ff4d4f;
  font-size: 14px;
  text-align: center;
}
</style>
