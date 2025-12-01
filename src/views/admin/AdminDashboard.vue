<template>
  <div class="dashboard-container">
  
    
    <!-- 总览卡片 -->
    <el-row :gutter="16" class="overview-row">
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <div class="stat-card user-card">
          <div class="card-icon">
            <el-icon><User /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-title">用户总数</div>
            <div class="card-value">{{ stats.overview?.totalUsers || 0 }}</div>
            <div class="card-footer">
              <span>今日新增 {{ stats.overview?.newUsersToday || 0 }}</span>
              <span :class="getGrowthClass(stats.overview?.userGrowthRate)">
                {{ formatGrowthRate(stats.overview?.userGrowthRate) }}
              </span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <div class="stat-card note-card">
          <div class="card-icon">
            <el-icon><Document /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-title">笔记总数</div>
            <div class="card-value">{{ stats.overview?.totalNotes || 0 }}</div>
            <div class="card-footer">
              <span>今日新增 {{ stats.overview?.newNotesToday || 0 }}</span>
              <span :class="getGrowthClass(stats.overview?.noteGrowthRate)">
                {{ formatGrowthRate(stats.overview?.noteGrowthRate) }}
              </span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <div class="stat-card mindmap-card">
          <div class="card-icon">
            <el-icon><Share /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-title">思维导图</div>
            <div class="card-value">{{ stats.overview?.totalMindmaps || 0 }}</div>
            <div class="card-footer">
              <span>今日新增 {{ stats.overview?.newMindmapsToday || 0 }}</span>
              <span :class="getGrowthClass(stats.overview?.mindmapGrowthRate)">
                {{ formatGrowthRate(stats.overview?.mindmapGrowthRate) }}
              </span>
            </div>
          </div>
        </div>
      </el-col>
      
      <el-col :xs="24" :sm="12" :md="8" :lg="6">
        <div class="stat-card ai-card">
          <div class="card-icon">
            <el-icon><ChatDotRound /></el-icon>
          </div>
          <div class="card-content">
            <div class="card-title">AI提问</div>
            <div class="card-value">{{ stats.overview?.totalAiQuestions || 0 }}</div>
            <div class="card-footer">
              <span>今日提问 {{ stats.overview?.newAiQuestionsToday || 0 }}</span>
              <span :class="getGrowthClass(stats.overview?.aiQuestionGrowthRate)">
                {{ formatGrowthRate(stats.overview?.aiQuestionGrowthRate) }}
              </span>
            </div>
          </div>
        </div>
      </el-col>
    </el-row>

    <!-- 趋势图表 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>用户增长趋势</span>
              <el-tag 
                size="small" 
                class="time-range-tag" 
                @click="toggleTimeRange"
                :type="timeRange === 7 ? 'primary' : 'success'"
              >
                最近{{ timeRange }}天 ↻
              </el-tag>
            </div>
          </template>
          <div ref="userTrendChart" class="chart"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>笔记增长趋势</span>
              <el-tag 
                size="small" 
                class="time-range-tag" 
                @click="toggleTimeRange"
                :type="timeRange === 7 ? 'primary' : 'success'"
              >
                最近{{ timeRange }}天 ↻
              </el-tag>
            </div>
          </template>
          <div ref="noteTrendChart" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>思维导图增长趋势</span>
              <el-tag 
                size="small" 
                class="time-range-tag" 
                @click="toggleTimeRange"
                :type="timeRange === 7 ? 'primary' : 'success'"
              >
                最近{{ timeRange }}天 ↻
              </el-tag>
            </div>
          </template>
          <div ref="mindmapTrendChart" class="chart"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="12">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>AI提问趋势</span>
              <el-tag 
                size="small" 
                class="time-range-tag" 
                @click="toggleTimeRange"
                :type="timeRange === 7 ? 'primary' : 'success'"
              >
                最近{{ timeRange }}天 ↻
              </el-tag>
            </div>
          </template>
          <div ref="aiTrendChart" class="chart"></div>
        </el-card>
      </el-col>
    </el-row>
    
    <!-- 分类统计 -->
    <el-row :gutter="16" class="chart-row">
      <el-col :xs="24" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>笔记分类分布</span>
            </div>
          </template>
          <div ref="noteCategoryChart" class="chart"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>思维导图分类分布</span>
            </div>
          </template>
          <div ref="mindmapCategoryChart" class="chart"></div>
        </el-card>
      </el-col>
      
      <el-col :xs="24" :lg="8">
        <el-card class="chart-card">
          <template #header>
            <div class="card-header">
              <span>数据总览</span>
            </div>
          </template>
          <div class="overview-stats">
            <div class="stat-item">
              <span class="stat-label">总浏览量</span>
              <span class="stat-value">{{ stats.overview?.totalViews || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">总点赞数</span>
              <span class="stat-value">{{ stats.overview?.totalLikes || 0 }}</span>
            </div>
            <div class="stat-item">
              <span class="stat-label">活跃用户</span>
              <span class="stat-value">{{ stats.overview?.totalUsers || 0 }}</span>
            </div>
          </div>
        </el-card>
      </el-col>
    </el-row>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { User, Document, Share, ChatDotRound } from '@element-plus/icons-vue'
import * as echarts from 'echarts'
import http from '../../api/http'
import websocketService from '../../utils/websocket'

const stats = ref({})
const timeRange = ref(7) // 默认显示7天

// DOM refs
const userTrendChart = ref(null)
const noteTrendChart = ref(null)
const mindmapTrendChart = ref(null)
const aiTrendChart = ref(null)
const noteCategoryChart = ref(null)
const mindmapCategoryChart = ref(null)

// ECharts 实例
let userTrendChartInstance = null
let noteTrendChartInstance = null
let mindmapTrendChartInstance = null
let aiTrendChartInstance = null
let noteCategoryChartInstance = null
let mindmapCategoryChartInstance = null

onMounted(async () => {
  await loadStats()
  await nextTick()
  initCharts()
  
  // 连接 WebSocket 并订阅所有数据更新
  websocketService.connect().then(() => {
    // 订阅笔记更新
    websocketService.subscribe('note', (data) => {
      console.log('收到笔记更新通知，刷新仪表板:', data)
      loadStats().then(() => {
        updateCharts()
      })
    })
    
    // 订阅思维导图更新
    websocketService.subscribe('mindmap', (data) => {
      console.log('收到思维导图更新通知，刷新仪表板:', data)
      loadStats().then(() => {
        updateCharts()
      })
    })
    
    // 订阅链接更新
    websocketService.subscribe('link', (data) => {
      console.log('收到链接更新通知，刷新仪表板:', data)
      loadStats().then(() => {
        updateCharts()
      })
    })
    
    // 订阅用户更新
    websocketService.subscribe('user', (data) => {
      console.log('收到用户更新通知，刷新仪表板:', data)
      loadStats().then(() => {
        updateCharts()
      })
    })
    
    // 订阅AI对话更新
    websocketService.subscribe('ai-chat', (data) => {
      console.log('收到AI对话更新通知，刷新仪表板:', data)
      loadStats().then(() => {
        updateCharts()
      })
    })
  }).catch(err => {
    console.error('WebSocket 连接失败:', err)
  })
})

onUnmounted(() => {
  // 取消所有订阅
  websocketService.unsubscribe('note')
  websocketService.unsubscribe('mindmap')
  websocketService.unsubscribe('link')
  websocketService.unsubscribe('user')
  websocketService.unsubscribe('ai-chat')
  
  // 销毁图表
  if (userTrendChartInstance) userTrendChartInstance.dispose()
  if (noteTrendChartInstance) noteTrendChartInstance.dispose()
  if (mindmapTrendChartInstance) mindmapTrendChartInstance.dispose()
  if (aiTrendChartInstance) aiTrendChartInstance.dispose()
  if (noteCategoryChartInstance) noteCategoryChartInstance.dispose()
  if (mindmapCategoryChartInstance) mindmapCategoryChartInstance.dispose()
})

// 加载统计数据
const loadStats = async () => {
  try {
    console.log('请求统计数据，天数:', timeRange.value)
    const { data } = await http.get('/admin/dashboard/stats', {
      params: { days: timeRange.value }
    })
    console.log('收到统计数据:', data)
    console.log('趋势数据日期数量:', data.trend?.userDates?.length)
    stats.value = data
  } catch (error) {
    console.error('加载统计数据失败:', error)
  }
}

// 切换时间范围（7天 <-> 30天）
const toggleTimeRange = async () => {
  timeRange.value = timeRange.value === 7 ? 30 : 7
  await loadStats()
  await nextTick()
  updateCharts()
}

// 更新所有图表
const updateCharts = () => {
  if (userTrendChartInstance) updateUserTrendChart()
  if (noteTrendChartInstance) updateNoteTrendChart()
  if (mindmapTrendChartInstance) updateMindmapTrendChart()
  if (aiTrendChartInstance) updateAiTrendChart()
  if (noteCategoryChartInstance) updateNoteCategoryChart()
  if (mindmapCategoryChartInstance) updateMindmapCategoryChart()
}

// 初始化图表
const initCharts = () => {
  initUserTrendChart()
  initNoteTrendChart()
  initMindmapTrendChart()
  initAiTrendChart()
  initNoteCategoryChart()
  initMindmapCategoryChart()
}

// 用户趋势图
const initUserTrendChart = () => {
  const chartInstance = echarts.init(userTrendChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: stats.value.trend?.userDates || [],
      boundaryGap: false
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: stats.value.trend?.userCounts || [],
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(64, 158, 255, 0.5)'
          }, {
            offset: 1, color: 'rgba(64, 158, 255, 0.1)'
          }]
        }
      },
      itemStyle: {
        color: '#409EFF'
      }
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  userTrendChartInstance = chartInstance
}

// 笔记趋势图
const initNoteTrendChart = () => {
  const chartInstance = echarts.init(noteTrendChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: stats.value.trend?.noteDates || [],
      boundaryGap: false
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: stats.value.trend?.noteCounts || [],
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(103, 194, 58, 0.5)'
          }, {
            offset: 1, color: 'rgba(103, 194, 58, 0.1)'
          }]
        }
      },
      itemStyle: {
        color: '#67C23A'
      }
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  noteTrendChartInstance = chartInstance
}

// 思维导图趋势图
const initMindmapTrendChart = () => {
  const chartInstance = echarts.init(mindmapTrendChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: stats.value.trend?.mindmapDates || [],
      boundaryGap: false
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: stats.value.trend?.mindmapCounts || [],
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(230, 162, 60, 0.5)'
          }, {
            offset: 1, color: 'rgba(230, 162, 60, 0.1)'
          }]
        }
      },
      itemStyle: {
        color: '#E6A23C'
      }
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  mindmapTrendChartInstance = chartInstance
}

// AI提问趋势图
const initAiTrendChart = () => {
  const chartInstance = echarts.init(aiTrendChart.value)
  const option = {
    tooltip: {
      trigger: 'axis'
    },
    xAxis: {
      type: 'category',
      data: stats.value.trend?.aiQuestionDates || [],
      boundaryGap: false
    },
    yAxis: {
      type: 'value'
    },
    series: [{
      data: stats.value.trend?.aiQuestionCounts || [],
      type: 'line',
      smooth: true,
      areaStyle: {
        color: {
          type: 'linear',
          x: 0,
          y: 0,
          x2: 0,
          y2: 1,
          colorStops: [{
            offset: 0, color: 'rgba(245, 108, 108, 0.5)'
          }, {
            offset: 1, color: 'rgba(245, 108, 108, 0.1)'
          }]
        }
      },
      itemStyle: {
        color: '#F56C6C'
      }
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  aiTrendChartInstance = chartInstance
}

// 笔记分类饼图
const initNoteCategoryChart = () => {
  const chartInstance = echarts.init(noteCategoryChart.value)
  const data = (stats.value.category?.noteCategories || []).map(item => ({
    name: item.name,
    value: item.count
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {d}%'
      },
      data: data
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  noteCategoryChartInstance = chartInstance
}

// 思维导图分类饼图
const initMindmapCategoryChart = () => {
  const chartInstance = echarts.init(mindmapCategoryChart.value)
  const data = (stats.value.category?.mindmapCategories || []).map(item => ({
    name: item.name,
    value: item.count
  }))
  
  const option = {
    tooltip: {
      trigger: 'item',
      formatter: '{b}: {c} ({d}%)'
    },
    series: [{
      type: 'pie',
      radius: ['40%', '70%'],
      avoidLabelOverlap: false,
      itemStyle: {
        borderRadius: 10,
        borderColor: '#fff',
        borderWidth: 2
      },
      label: {
        show: true,
        formatter: '{b}: {d}%'
      },
      data: data
    }]
  }
  chartInstance.setOption(option)
  window.addEventListener('resize', () => chartInstance.resize())
  mindmapCategoryChartInstance = chartInstance
}

// 更新用户趋势图
const updateUserTrendChart = () => {
  if (!userTrendChartInstance) return
  const option = {
    xAxis: {
      data: stats.value.trend?.userDates || []
    },
    series: [{
      data: stats.value.trend?.userCounts || []
    }]
  }
  userTrendChartInstance.setOption(option)
}

// 更新笔记趋势图
const updateNoteTrendChart = () => {
  if (!noteTrendChartInstance) return
  const option = {
    xAxis: {
      data: stats.value.trend?.noteDates || []
    },
    series: [{
      data: stats.value.trend?.noteCounts || []
    }]
  }
  noteTrendChartInstance.setOption(option)
}

// 更新思维导图趋势图
const updateMindmapTrendChart = () => {
  if (!mindmapTrendChartInstance) return
  const option = {
    xAxis: {
      data: stats.value.trend?.mindmapDates || []
    },
    series: [{
      data: stats.value.trend?.mindmapCounts || []
    }]
  }
  mindmapTrendChartInstance.setOption(option)
}

// 更新AI对话趋势图
const updateAiTrendChart = () => {
  if (!aiTrendChartInstance) return
  const option = {
    xAxis: {
      data: stats.value.trend?.aiQuestionDates || []
    },
    series: [{
      data: stats.value.trend?.aiQuestionCounts || []
    }]
  }
  aiTrendChartInstance.setOption(option)
}

// 更新笔记分类饼图
const updateNoteCategoryChart = () => {
  if (!noteCategoryChartInstance) return
  const data = (stats.value.category?.noteCategories || []).map(item => ({
    name: item.name,
    value: item.count
  }))
  const option = {
    series: [{
      data: data
    }]
  }
  noteCategoryChartInstance.setOption(option)
}

// 更新思维导图分类饼图
const updateMindmapCategoryChart = () => {
  if (!mindmapCategoryChartInstance) return
  const data = (stats.value.category?.mindmapCategories || []).map(item => ({
    name: item.name,
    value: item.count
  }))
  const option = {
    series: [{
      data: data
    }]
  }
  mindmapCategoryChartInstance.setOption(option)
}

// 格式化增长率
const formatGrowthRate = (rate) => {
  if (rate === undefined || rate === null) return '0%'
  const sign = rate >= 0 ? '+' : ''
  return `${sign}${rate.toFixed(1)}%`
}

// 获取增长率样式类
const getGrowthClass = (rate) => {
  if (rate === undefined || rate === null) return ''
  return rate >= 0 ? 'growth-positive' : 'growth-negative'
}
</script>

<style scoped>
.dashboard-container {
  padding: 20px;
  background: #f5f7fa;
  min-height: calc(100vh - 60px);
}

.time-range-tag {
  cursor: pointer;
  user-select: none;
  transition: all 0.3s;
  font-weight: 500;
  padding: 6px 14px !important;
  border-radius: 14px !important;
}

.time-range-tag:hover {
  transform: scale(1.05);
  box-shadow: 0 2px 8px rgba(135, 181, 255, 0.4);
}

.time-range-tag:active {
  transform: scale(0.95);
}

.stat-card {
  background: white;
  border-radius: 8px;
  padding: 20px;
  display: flex;
  align-items: center;
  gap: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
  transition: transform 0.3s, box-shadow 0.3s;
}

.stat-card:hover {
  transform: translateY(-4px);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.12);
}

.card-icon {
  width: 56px;
  height: 56px;
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 28px;
}

.user-card .card-icon {
  background: linear-gradient(135deg, #87b5ff 0%, #6a9fff 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(135, 181, 255, 0.3);
}

.note-card .card-icon {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(255, 154, 158, 0.3);
}

.mindmap-card .card-icon {
  background: linear-gradient(135deg, #a1c4fd 0%, #c2e9fb 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(161, 196, 253, 0.3);
}

.ai-card .card-icon {
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
  color: white;
  box-shadow: 0 4px 12px rgba(252, 182, 159, 0.3);
}

.card-content {
  flex: 1;
}

.card-title {
  font-size: 14px;
  color: #999;
  margin-bottom: 8px;
}

.card-value {
  font-size: 28px;
  font-weight: 600;
  color: #333;
  margin-bottom: 8px;
}

.card-footer {
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 12px;
  color: #666;
}

.growth-positive {
  color: #67C23A;
}

.growth-negative {
  color: #F56C6C;
}

.chart-row {
  margin-bottom: 16px;
}

.chart-card {
  height: 400px;
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(135, 181, 255, 0.1);
  transition: all 0.3s;
}

.chart-card:hover {
  box-shadow: 0 4px 20px rgba(135, 181, 255, 0.15);
  transform: translateY(-2px);
}

.chart-card :deep(.el-card__header) {
  border-bottom: 2px solid #f0f7ff;
  background: linear-gradient(to right, #fafcff 0%, #f5f8ff 100%);
}

.card-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-weight: 600;
  color: #333;
}

.card-header .el-tag {
  background: linear-gradient(135deg, #87b5ff 0%, #6a9fff 100%);
  color: white;
  border: none;
  font-weight: 500;
  padding: 4px 12px;
  border-radius: 12px;
}

.chart {
  width: 100%;
  height: 320px;
}

.overview-stats {
  padding: 20px 0;
}

.stat-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 0;
  border-bottom: 1px solid #f0f0f0;
}

.stat-item:last-child {
  border-bottom: none;
}

.stat-label {
  font-size: 14px;
  color: #666;
}
.overview-row{
  bottom: 20px;
}

.stat-value {
  font-size: 24px;
  font-weight: 600;
  color: #333;
}
</style>
