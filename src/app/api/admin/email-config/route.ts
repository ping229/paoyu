import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

// 获取邮件配置
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

    // 获取邮件配置
    const configs = await prisma.systemConfig.findMany({
      where: {
        key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'sender_name', 'sender_email'] }
      }
    })

    const config: Record<string, string> = {}
    for (const c of configs) {
      config[c.key] = c.value
    }

    return NextResponse.json({
      success: true,
      data: config
    })
  } catch (error) {
    console.error('Get email config error:', error)
    return NextResponse.json({ error: '获取配置失败' }, { status: 500 })
  }
}

// 保存邮件配置
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
    const { smtp_host, smtp_port, smtp_user, smtp_pass, sender_name, sender_email } = body

    // 保存配置
    const configs = [
      { key: 'smtp_host', value: smtp_host || '' },
      { key: 'smtp_port', value: smtp_port || '' },
      { key: 'smtp_user', value: smtp_user || '' },
      { key: 'smtp_pass', value: smtp_pass || '' },
      { key: 'sender_name', value: sender_name || '泡语' },
      { key: 'sender_email', value: sender_email || '' },
    ]

    for (const config of configs) {
      await prisma.systemConfig.upsert({
        where: { key: config.key },
        update: { value: config.value },
        create: { key: config.key, value: config.value }
      })
    }

    return NextResponse.json({
      success: true,
      data: { message: '配置已保存' }
    })
  } catch (error) {
    console.error('Save email config error:', error)
    return NextResponse.json({ error: '保存配置失败' }, { status: 500 })
  }
}
