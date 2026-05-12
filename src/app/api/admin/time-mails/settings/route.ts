import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取监管设置
export async function GET(request: NextRequest) {
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

    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['time_mail_moderation', 'time_mail_keywords'] }
      }
    })

    const config: Record<string, string> = {}
    for (const c of configs) {
      config[c.key] = c.value
    }

    return NextResponse.json({
      success: true,
      data: {
        mode: config.time_mail_moderation || 'none',
        keywords: config.time_mail_keywords ? JSON.parse(config.time_mail_keywords) : []
      }
    })
  } catch (error) {
    console.error('Get moderation settings error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}

// 更新监管设置
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
    const { mode, keywords } = body

    // 验证模式
    if (mode && !['none', 'full', 'keyword'].includes(mode)) {
      return NextResponse.json({ error: '无效的监管模式' }, { status: 400 })
    }

    // 更新监管模式
    if (mode) {
      await prisma.systemConfig.upsert({
        where: { key: 'time_mail_moderation' },
        update: { value: mode },
        create: { key: 'time_mail_moderation', value: mode }
      })
    }

    // 更新关键词列表
    if (keywords !== undefined) {
      await prisma.systemConfig.upsert({
        where: { key: 'time_mail_keywords' },
        update: { value: JSON.stringify(keywords) },
        create: { key: 'time_mail_keywords', value: JSON.stringify(keywords) }
      })
    }

    return NextResponse.json({
      success: true,
      message: '设置已保存'
    })
  } catch (error) {
    console.error('Update moderation settings error:', error)
    return NextResponse.json({ error: '保存失败' }, { status: 500 })
  }
}
