import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { testAI, isAIReplyEnabled, getActiveAIConfigs } from '@/lib/ai'
import { prisma } from '@/lib/prisma'

// 测试 AI 对话
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
    const { configId, message } = body

    if (!configId || !message) {
      return NextResponse.json({ error: '缺少参数' }, { status: 400 })
    }

    // 获取配置
    const config = await prisma.aIConfig.findUnique({
      where: { id: configId }
    })

    if (!config) {
      return NextResponse.json({ error: '配置不存在' }, { status: 404 })
    }

    // 测试调用
    const result = await testAI(config, message)

    return NextResponse.json({
      success: true,
      data: result
    })
  } catch (error) {
    console.error('Test AI error:', error)
    return NextResponse.json({ error: '测试失败' }, { status: 500 })
  }
}

// 切换 AI 回复总开关
export async function PUT(request: NextRequest) {
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
    const { enabled } = body

    await prisma.systemConfig.upsert({
      where: { key: 'ai_reply_enabled' },
      update: { value: enabled ? 'true' : 'false' },
      create: { key: 'ai_reply_enabled', value: enabled ? 'true' : 'false' }
    })

    return NextResponse.json({
      success: true,
      message: enabled ? '已开启 AI 回复' : '已关闭 AI 回复'
    })
  } catch (error) {
    console.error('Toggle AI error:', error)
    return NextResponse.json({ error: '操作失败' }, { status: 500 })
  }
}
