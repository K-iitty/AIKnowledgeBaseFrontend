import SockJS from 'sockjs-client'
import { Client } from '@stomp/stompjs'

class WebSocketService {
  constructor() {
    this.client = null
    this.connected = false
    this.subscriptions = new Map()
    this.reconnectAttempts = 0
    this.maxReconnectAttempts = 5
    this.reconnectDelay = 3000
  }

  /**
   * 连接 WebSocket
   */
  connect() {
    if (this.connected) {
      console.log('WebSocket 已连接')
      return Promise.resolve()
    }

    return new Promise((resolve, reject) => {
      try {
        // 创建 SockJS 连接（使用后端实际端口 8081）
        const socket = new SockJS('http://localhost:8081/ws')
        
        // 创建 STOMP 客户端
        this.client = new Client({
          webSocketFactory: () => socket,
          debug: (str) => {
            console.log('STOMP Debug:', str)
          },
          reconnectDelay: this.reconnectDelay,
          heartbeatIncoming: 4000,
          heartbeatOutgoing: 4000,
        })

        // 连接成功
        this.client.onConnect = (frame) => {
          console.log('WebSocket 连接成功:', frame)
          this.connected = true
          this.reconnectAttempts = 0
          resolve()
        }

        // 连接错误
        this.client.onStompError = (frame) => {
          console.error('STOMP 错误:', frame)
          this.connected = false
          reject(new Error('WebSocket 连接失败'))
        }

        // WebSocket 错误
        this.client.onWebSocketError = (error) => {
          console.error('WebSocket 错误:', error)
          this.connected = false
        }

        // 连接关闭
        this.client.onWebSocketClose = () => {
          console.log('WebSocket 连接关闭')
          this.connected = false
          this.handleReconnect()
        }

        // 激活连接
        this.client.activate()
      } catch (error) {
        console.error('创建 WebSocket 连接失败:', error)
        reject(error)
      }
    })
  }

  /**
   * 处理重连
   */
  handleReconnect() {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++
      console.log(`尝试重连 (${this.reconnectAttempts}/${this.maxReconnectAttempts})...`)
      setTimeout(() => {
        this.connect().catch(err => {
          console.error('重连失败:', err)
        })
      }, this.reconnectDelay)
    } else {
      console.error('达到最大重连次数，停止重连')
    }
  }

  /**
   * 订阅数据更新
   * @param {string} type - 数据类型: note, mindmap, link, ai-chat
   * @param {function} callback - 回调函数
   */
  subscribe(type, callback) {
    if (!this.connected) {
      console.warn('WebSocket 未连接，等待连接后订阅')
      this.connect().then(() => {
        this.doSubscribe(type, callback)
      })
      return
    }

    this.doSubscribe(type, callback)
  }

  /**
   * 执行订阅
   */
  doSubscribe(type, callback) {
    const destination = `/topic/data-update/${type}`
    
    // 如果已经订阅过，先取消订阅
    if (this.subscriptions.has(type)) {
      this.unsubscribe(type)
    }

    try {
      const subscription = this.client.subscribe(destination, (message) => {
        try {
          const data = JSON.parse(message.body)
          console.log(`收到 ${type} 更新通知:`, data)
          callback(data)
        } catch (error) {
          console.error('解析消息失败:', error)
        }
      })

      this.subscriptions.set(type, subscription)
      console.log(`已订阅 ${type} 更新通知`)
    } catch (error) {
      console.error(`订阅 ${type} 失败:`, error)
    }
  }

  /**
   * 取消订阅
   * @param {string} type - 数据类型
   */
  unsubscribe(type) {
    const subscription = this.subscriptions.get(type)
    if (subscription) {
      subscription.unsubscribe()
      this.subscriptions.delete(type)
      console.log(`已取消订阅 ${type}`)
    }
  }

  /**
   * 断开连接
   */
  disconnect() {
    if (this.client) {
      // 取消所有订阅
      this.subscriptions.forEach((subscription, type) => {
        subscription.unsubscribe()
      })
      this.subscriptions.clear()

      // 断开连接
      this.client.deactivate()
      this.connected = false
      console.log('WebSocket 已断开')
    }
  }
}

// 创建单例
const websocketService = new WebSocketService()

export default websocketService
