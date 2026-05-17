import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { generateAICommentsForMessageSet } from '@/lib/ai'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { messages } = body

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json({ error: '消息不能为空' }, { status: 400 })
    }

    // 验证每条消息
    for (const msg of messages) {
      if (!['text', 'image', 'voice'].includes(msg.type)) {
        return NextResponse.json({ error: '消息类型不正确' }, { status: 400 })
      }
      if (!msg.content) {
        return NextResponse.json({ error: '消息内容不能为空' }, { status: 400 })
      }
    }

    // 查找或创建系统用户用于发送公共消息
    let systemUser = await prisma.user.findUnique({
      where: { username: '__system__' }
    })

    if (!systemUser) {
      // 创建系统用户
      const { generateUniqueIntercode } = await import('@/lib/intercode')
      const intercode = await generateUniqueIntercode()

      systemUser = await prisma.user.create({
        data: {
          username: '__system__',
          passwordHash: 'SYSTEM_USER_NO_LOGIN',
          intercode: intercode,
        }
      })
    }

    // 创建公开的信息集
    const now = new Date()

    const messageSet = await prisma.messageSet.create({
      data: {
        senderId: systemUser.id,
        receiverId: systemUser.id,
        isPublic: true,
        publicAt: now,
        messages: {
          create: messages.map((msg: { type: string; content: string }, index: number) => ({
            type: msg.type,
            content: msg.content,
            order: index
          }))
        }
      }
    })

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: payload.userId,
        action: 'send_public_message',
        targetId: messageSet.id,
        details: `发送了 ${messages.length} 条消息到公共频道`
      }
    })

    // 异步触发 AI 回复（不阻塞响应）
    generateAICommentsForMessageSet(
      messageSet.id,
      messages.map((m: { type: string; content: string }) => ({
        type: m.type as 'text' | 'image',
        content: m.content
      }))
    ).catch(err => console.error('AI comment error:', err))

    return NextResponse.json({
      success: true,
      data: { messageSetId: messageSet.id }
    })
  } catch (error) {
    console.error('Send public message error:', error)
    return NextResponse.json({ error: '发送失败' }, { status: 500 })
  }
}
