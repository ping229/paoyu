import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'

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

    // 删除用户的所有数据
    // 由于数据库设置了级联删除，删除用户会自动删除所有关联数据
    await prisma.user.delete({
      where: { id: payload.userId }
    })

    return NextResponse.json({
      success: true,
      data: { destroyed: true }
    })
  } catch (error) {
    console.error('Self destruct error:', error)
    return NextResponse.json({
      success: false,
      error: '自我摧毁失败'
    }, { status: 500 })
  }
}
