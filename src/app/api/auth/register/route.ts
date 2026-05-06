import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateToken, hashPassword } from '@/lib/auth'
import { generateUniqueIntercode } from '@/lib/intercode'
import { checkRateLimit, getClientIp } from '@/lib/rate-limit'

export async function POST(request: NextRequest) {
  try {
    // 速率限制：每小时最多10次注册尝试
    const clientIp = getClientIp(request)
    const rateLimit = checkRateLimit(`register:${clientIp}`, {
      windowMs: 60 * 60 * 1000,
      maxRequests: 10,
    })

    if (!rateLimit.allowed) {
      return NextResponse.json({
        success: false,
        error: '注册请求次数过多，请稍后再试'
      }, { status: 429 })
    }

    const body = await request.json()
    const { username, password, agreedToContract } = body

    // 必须同意契约
    if (!agreedToContract) {
      return NextResponse.json({
        success: false,
        error: '必须同意异世界契约才能注册'
      }, { status: 400 })
    }

    // 验证用户名
    if (!username || username.length < 3 || username.length > 20) {
      return NextResponse.json({
        success: false,
        error: '用户名需要3-20个字符'
      }, { status: 400 })
    }

    // 验证密码
    if (!password || password.length < 6) {
      return NextResponse.json({
        success: false,
        error: '密码至少需要6个字符'
      }, { status: 400 })
    }

    // 检查用户名是否已存在
    const existingUser = await prisma.user.findUnique({
      where: { username }
    })

    if (existingUser) {
      return NextResponse.json({
        success: false,
        error: '用户名已被占用'
      }, { status: 400 })
    }

    // 生成交互码和密码哈希
    const intercode = await generateUniqueIntercode()
    const passwordHash = await hashPassword(password)

    // 创建用户
    const user = await prisma.user.create({
      data: {
        username,
        passwordHash,
        intercode,
      }
    })

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
    console.error('Register error:', error)
    return NextResponse.json({
      success: false,
      error: '注册失败，请稍后重试'
    }, { status: 500 })
  }
}
