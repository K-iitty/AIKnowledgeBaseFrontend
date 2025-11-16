import axios from 'axios'
import { ElMessage } from 'element-plus'

const http = axios.create({ baseURL: '/api' })

http.interceptors.request.use(config => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
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
      localStorage.removeItem('token')
      location.href = '/login'
    }
    return Promise.reject(err)
  }
)

export default http
