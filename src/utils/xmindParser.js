import JSZip from 'jszip'

/**
 * 解析XMind文件
 * @param {File} file - XMind文件
 * @returns {Promise<Object>} 解析后的思维导图数据
 */
export async function parseXMindFile(file) {
  try {
    console.log('开始解析XMind文件:', file.name)
    
    // 读取ZIP文件
    const zip = await JSZip.loadAsync(file)
    
    // 优先尝试content.json (XMind 2020/2021)
    let contentFile = zip.file('content.json')
    let isJsonFormat = false
    
    if (contentFile) {
      console.log('检测到XMind 2020/2021格式 (JSON)')
      isJsonFormat = true
    } else {
      // 尝试content.xml (XMind 8)
      contentFile = zip.file('content.xml')
      console.log('检测到XMind 8格式 (XML)')
    }
    
    if (!contentFile) {
      throw new Error('无效的XMind文件：未找到content.xml或content.json')
    }
    
    const contentText = await contentFile.async('text')
    console.log('读取到内容，长度:', contentText.length)
    
    // 根据格式选择解析方式
    if (isJsonFormat) {
      return parseJsonContent(contentText)
    } else {
      return parseXmlContent(contentText)
    }
    
  } catch (error) {
    console.error('XMind解析失败:', error)
    throw error
  }
}

/**
 * 解析JSON格式内容 (XMind 2020/2021)
 */
function parseJsonContent(jsonText) {
  try {
    const data = JSON.parse(jsonText)
    console.log('JSON解析成功:', data)
    
    // XMind 2020/2021的JSON结构
    if (!data || !data[0] || !data[0].rootTopic) {
      throw new Error('无效的XMind JSON格式')
    }
    
    const rootTopic = data[0].rootTopic
    const rootNode = parseJsonNode(rootTopic)
    
    const result = {
      root: rootNode
    }
    
    console.log('解析完成，节点数:', countNodes(result))
    return result
    
  } catch (error) {
    throw new Error('JSON解析失败: ' + error.message)
  }
}

/**
 * 递归解析JSON节点
 */
function parseJsonNode(node) {
  const parsed = {
    id: node.id || generateId(),
    topic: node.title || ''
  }
  
  console.log('  解析节点:', parsed.topic)
  
  // 解析子节点
  if (node.children && node.children.attached && node.children.attached.length > 0) {
    parsed.children = node.children.attached.map(child => parseJsonNode(child))
    console.log('    子节点数:', parsed.children.length)
  }
  
  // 解析备注
  if (node.notes && node.notes.plain) {
    parsed.note = node.notes.plain.content || ''
  }
  
  // 解析标签
  if (node.labels && node.labels.length > 0) {
    parsed.labels = node.labels
  }
  
  return parsed
}

/**
 * 解析XML格式内容 (XMind 8)
 */
function parseXmlContent(xmlText) {
  // 解析XML
  const parser = new DOMParser()
  const xmlDoc = parser.parseFromString(xmlText, 'text/xml')
  
  // 检查解析错误
  const parseError = xmlDoc.querySelector('parsererror')
  if (parseError) {
    throw new Error('XML解析失败: ' + parseError.textContent)
  }
  
  // 获取根节点
  const sheet = xmlDoc.querySelector('sheet')
  if (!sheet) {
    throw new Error('无效的XMind文件结构：未找到sheet元素')
  }
  
  const rootTopic = sheet.querySelector('topic')
  if (!rootTopic) {
    throw new Error('无效的XMind文件结构：未找到根topic元素')
  }
  
  console.log('找到根主题节点')
  
  // 解析节点树
  let rootNode = parseXmlNode(rootTopic)
  
  // 检查是否是警告节点（XMind版本兼容性警告）
  const rootTitle = rootNode.topic || ''
  if (rootTitle.includes('Warning') || rootTitle.includes('警告') || rootTitle.includes('Attention')) {
    console.log('检测到警告节点，尝试查找实际内容...')
    
    // 尝试在其他sheet中查找
    const allSheets = xmlDoc.querySelectorAll('sheet')
    for (let i = 1; i < allSheets.length; i++) {
      const topic = allSheets[i].querySelector('topic')
      if (topic) {
        const node = parseXmlNode(topic)
        const title = node.topic || ''
        if (!title.includes('Warning') && !title.includes('警告')) {
          console.log('找到实际内容节点:', title)
          rootNode = node
          break
        }
      }
    }
    
    // 如果还是警告节点，抛出错误
    if (rootNode.topic && (rootNode.topic.includes('Warning') || rootNode.topic.includes('警告'))) {
      throw new Error('此XMind文件仅包含版本警告信息，没有实际内容。请使用XMind 8 Update 3或更高版本打开并重新保存。')
    }
  }
  
  const result = {
    root: rootNode
  }
  
  console.log('解析完成，节点数:', countNodes(result))
  return result
}

/**
 * 递归解析XML节点
 */
function parseXmlNode(element) {
  const node = {
    id: element.getAttribute('id') || generateId(),
    topic: '',
    children: []
  }
  
  // 获取标题
  const titleElement = element.querySelector(':scope > title')
  if (titleElement) {
    node.topic = titleElement.textContent.trim()
    console.log('  解析节点:', node.topic)
  }
  
  // 获取子节点
  const childrenElement = element.querySelector(':scope > children')
  if (childrenElement) {
    const topicsElements = childrenElement.querySelectorAll(':scope > topics')
    
    topicsElements.forEach(topicsElement => {
      const topicElements = topicsElement.querySelectorAll(':scope > topic')
      topicElements.forEach(topicElement => {
        node.children.push(parseXmlNode(topicElement))
      })
    })
    
    if (node.children.length > 0) {
      console.log('    子节点数:', node.children.length)
    } else {
      delete node.children
    }
  } else {
    delete node.children
  }
  
  // 获取备注
  const notesElement = element.querySelector(':scope > notes > plain')
  if (notesElement) {
    node.note = notesElement.textContent.trim()
  }
  
  // 获取标签
  const labelsElement = element.querySelector(':scope > labels')
  if (labelsElement) {
    const labelElements = labelsElement.querySelectorAll('label')
    if (labelElements.length > 0) {
      node.labels = Array.from(labelElements).map(el => el.textContent.trim())
    }
  }
  
  return node
}

/**
 * 统计节点数量
 */
function countNodes(data) {
  if (!data || !data.root) return 0
  
  function count(node) {
    let total = 1
    if (node.children && Array.isArray(node.children)) {
      node.children.forEach(child => {
        total += count(child)
      })
    }
    return total
  }
  
  return count(data.root)
}

/**
 * 生成唯一ID
 */
function generateId() {
  return 'node_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

/**
 * 提取描述信息
 */
export function extractDescription(data) {
  if (!data || !data.root) return '思维导图'
  
  const topic = data.root.topic || '思维导图'
  return topic.length > 100 ? topic.substring(0, 100) + '...' : topic
}

/**
 * 转换为项目使用的格式
 * 将XMind格式转换为 { nodeData: {...}, linkData: {} } 格式
 */
export function convertToProjectFormat(xmindData) {
  if (!xmindData || !xmindData.root) {
    throw new Error('无效的XMind数据')
  }
  
  // 转换节点，添加root标记
  const convertNode = (node, isRoot = false) => {
    const converted = {
      id: node.id,
      topic: node.topic || '',
      root: isRoot
    }
    
    if (node.note) {
      converted.note = node.note
    }
    
    if (node.labels && node.labels.length > 0) {
      converted.labels = node.labels
    }
    
    if (node.children && node.children.length > 0) {
      converted.children = node.children.map(child => convertNode(child, false))
    }
    
    return converted
  }
  
  return {
    nodeData: convertNode(xmindData.root, true),
    linkData: {}
  }
}
