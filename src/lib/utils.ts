import { Response } from 'express'

// API响应工具函数
export function successResponse(data: any) {
  return { success: true, data }
}

export function errorResponse(message: string, code?: string) {
  return { success: false, error: message, code }
}

// 消息摘要生成
export function generateMessageSummary(messages: Array<{ type: string; content: string }>): string {
  if (messages.length === 0) return '空消息'

  const firstMsg = messages[0]
  if (firstMsg.type === 'text') {
    const text = firstMsg.content.slice(0, 20)
    return text.length < firstMsg.content.length ? `${text}...` : text
  } else if (firstMsg.type === 'image') {
    return '[图片消息]'
  } else if (firstMsg.type === 'voice') {
    return '[语音消息]'
  }
  return '未知类型消息'
}

// 格式化日期
export function formatDate(date: Date): string {
  return `${date.getFullYear()}年${date.getMonth() + 1}月${date.getDate()}日`
}

export function formatDateTime(date: Date): string {
  return `${formatDate(date)} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}
