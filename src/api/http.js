import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use(config => {
  const adminToken = localStorage.getItem('admin_token')
  const userToken = localStorage.getItem('token')
  
  // 判断当前是否在管理后台页面
  const isAdminPage = window.location.pathname.startsWith('/admin')
  
  // 如果在管理后台页面，优先使用 admin_token
  if (isAdminPage && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`
    console.log('使用管理员 token 发送请求:', config.url)
    console.log('Token 前20个字符:', adminToken.substring(0, 20) + '...')
  } 
  // 如果是管理后台 API 接口，使用 admin_token
  else if (config.url.startsWith('/admin') && adminToken) {
    config.headers.Authorization = `Bearer ${adminToken}`
    console.log('使用管理员 token 发送请求:', config.url)
    console.log('Token 前20个字符:', adminToken.substring(0, 20) + '...')
  } 
  // 否则使用普通用户 token
  else if (userToken) {
    config.headers.Authorization = `Bearer ${userToken}`
    console.log('使用用户 token 发送请求:', config.url)
  } else {
    console.log('无 token，发送请求:', config.url)
  }
  
  return config
})

http.interceptors.response.use(
  resp => resp,
  err => {
    const msg = err?.response?.data?.message || err.message || '请求失败'
    ElMessage.error(msg)
    const status = err?.response?.status
    const text = (err?.response?.data || '').toString()
    
    if (status === 401 || status === 403 || (status === 400 && /Token|未授权|无权限/.test(text))) {
      // 判断是管理后台还是普通用户
      const isAdminPage = window.location.pathname.startsWith('/admin')
      
      if (isAdminPage) {
        localStorage.removeItem('admin_token')
        localStorage.removeItem('admin_info')
      } else {
        localStorage.removeItem('token')
      }
      
      // 统一跳转到登录页面
      location.href = '/login'
    }
    
    return Promise.reject(err)
  }
)

export default http
