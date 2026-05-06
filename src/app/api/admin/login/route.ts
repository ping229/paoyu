import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateToken, hashPassword } from '@/lib/auth'

// 初始化默认管理员（如果没有）
async function initDefaultAdmin() {
  const existingAdmin = await prisma.admin.findFirst()
  if (!existingAdmin) {
    const defaultPassword = process.env.ADMIN_DEFAULT_PASSWORD || 'admin123456'
    const hashedPassword = await hashPassword(defaultPassword)
    await prisma.admin.create({
      data: {
        username: 'admin',
        passwordHash: hashedPassword
      }
    })
  }
}

export async function POST(request: NextRequest) {
  try {
    // 确保有管理员账号
    await initDefaultAdmin()

    const body = await request.json()
    const { username, password } = body

    if (!username || !password) {
      return NextResponse.json({
        success: false,
        error: '请输入用户名和密码'
      }, { status: 400 })
    }

    const admin = await prisma.admin.findUnique({
      where: { username }
    })

    if (!admin) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    const valid = await comparePassword(password, admin.passwordHash)

    if (!valid) {
      return NextResponse.json({
        success: false,
        error: '用户名或密码错误'
      }, { status: 401 })
    }

    const token = generateToken({
      userId: admin.id,
      intercode: admin.username,
      isAdmin: true
    })

    return NextResponse.json({
      success: true,
      data: { token }
    })
  } catch (error) {
    console.error('Admin login error:', error)
    return NextResponse.json({
      success: false,
      error: '登录失败'
    }, { status: 500 })
  }
}
