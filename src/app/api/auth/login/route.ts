import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, comparePassword } from '@/lib/auth'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 速率限制：每分钟最多5次登录尝试
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`login:${clientIp}`, {
      windowMs: 60 * 1000,
      maxRequests: 5,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: '登录尝试次数过多，请稍后再试'
      }, { status: 429 })
    }

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '请输入用户名和密码'
      }, { status: 400 })
    }

    // 查找用户
    const user = await prisma.user.findUnique({
      where: { username }
    })

    if (!user) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    // 检查是否被封禁
    if (user.isBanned) {
      return NextResponse.json({
        success: false,
        error: '该账号已被封禁'
      }, { status: 403 })
    }

    // 验证密码
    const validPassword = await comparePassword(password, user.passwordHash)

    if (!validPassword) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    // 生成JWT token
    const token = generateToken({
      userId: user.id,
      intercode: user.intercode
    })

    return NextResponse.json({
      success: true,
      data: {
        username: user.username,
        intercode: user.intercode,
        token
      }
    })
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json({
      success: false,
      error: '登录失败，请稍后重试'
    }, { status: 500 })
  }
}
