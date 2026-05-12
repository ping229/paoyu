import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({ error: '未登录' }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({ error: '登录已过期' }, { status: 401 })
    }

    const body = await request.json()
    const { id } = body

    if (!id) {
      return NextResponse.json({ error: '缺少邮件ID' }, { status: 400 })
    }

    // 验证是本人的邮件且未发送
    const timeMail = await prisma.timeMail.findFirst({
      where: {
        id,
        senderId: payload.userId,
        isSent: false
      }
    })

    if (!timeMail) {
      return NextResponse.json({ error: '邮件不存在或已发送' }, { status: 404 })
    }

    // 删除邮件
    await prisma.timeMail.delete({
      where: { id }
    })

    return NextResponse.json({
      success: true,
      data: { deleted: true }
    })
  } catch (error) {
    console.error('Delete time mail error:', error)
    return NextResponse.json({ error: '删除失败' }, { status: 500 })
  }
}
