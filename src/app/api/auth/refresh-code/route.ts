import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { generateUniqueIntercode } from '@/lib/intercode'

export async function POST(request: NextRequest) {
  try {
    // 验证token
    const authHeader = request.headers.get('authorization')
    const token = getTokenFromHeader(authHeader)

    if (!token) {
      return NextResponse.json({
        success: false,
        error: '未登录'
      }, { status: 401 })
    }

    const payload = verifyToken(token)
    if (!payload) {
      return NextResponse.json({
        success: false,
        error: '登录已过期'
      }, { status: 401 })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { id: payload.userId }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户不存在'
      }, { status: 404 })
    }

    // 检查刷新频率（24小时内只能刷新一次）
    const now = new Date()
    const lastUpdate = new Date(user.intercodeUpdatedAt)
    const hoursDiff = (now.getTime() - lastUpdate.getTime()) / (1000 * 60 * 60)

    if (hoursDiff < 24) {
      const remainingHours = Math.ceil(24 - hoursDiff)
      return NextResponse.json({
        success: false,
        error: `刷新冷却中，请${remainingHours}小时后再试`
      }, { status: 400 })
    }

    // 生成新的交互码
    const newIntercode = await generateUniqueIntercode()
    const oldIntercode = user.intercode

    // 更新用户交互码并记录历史
    await prisma.$transaction([
      prisma.user.update({
        where: { id: user.id },
        data: {
          intercode: newIntercode,
          intercodeUpdatedAt: now
        }
      }),
      prisma.intercodeHistory.create({
        data: {
          userId: user.id,
          oldCode: oldIntercode,
          newCode: newIntercode,
          changedAt: now
        }
      })
    ])

    // 生成新token
    const newToken = verifyToken(token) ? token : null

    return NextResponse.json({
      success: true,
      data: {
        intercode: newIntercode
      }
    })
  } catch (error) {
    console.error('Refresh code error:', error)
    return NextResponse.json({
      success: false,
      error: '刷新失败，请稍后重试'
    }, { status: 500 })
  }
}
