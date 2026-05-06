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
    if (!payload || !payload.isAdmin) {
      return NextResponse.json({ error: '无权限' }, { status: 403 })
    }

    const body = await request.json()
    const { code } = body

    if (!code) {
      return NextResponse.json({ error: '请输入交互码或真码' }, { status: 400 })
    }

    // 尝试作为交互码查找
    let user = await prisma.user.findUnique({
      where: { intercode: code.toUpperCase() }
    })

    // 如果没找到，尝试作为真码查找
    if (!user) {
      user = await prisma.user.findUnique({
        where: { id: code }
      })
    }

    if (!user) {
      return NextResponse.json({
        success: true,
        data: null
      })
    }

    // 获取交互码变更历史
    const history = await prisma.intercodeHistory.findMany({
      where: { userId: user.id },
      orderBy: { changedAt: 'desc' }
    })

    // 记录操作日志
    await prisma.adminLog.create({
      data: {
        adminId: payload.userId,
        action: 'lookup_intercode',
        targetId: user.id,
        details: `查询交互码：${code}`
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        intercode: user.intercode,
        createdAt: user.createdAt,
        isBanned: user.isBanned,
        history
      }
    })
  } catch (error) {
    console.error('Lookup error:', error)
    return NextResponse.json({ error: '查询失败' }, { status: 500 })
  }
}
