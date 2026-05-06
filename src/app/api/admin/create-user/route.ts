import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { hash } from 'bcryptjs'
import { generateIntercode } from '@/lib/intercode'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 验证管理员token
    const { searchParams } = new URL(request.url)
    const adminToken = searchParams.get('token') || token

    // 简单验证 - 实际应该验证JWT
    const admin = await prisma.admin.findFirst()
    if (!admin) {
      return NextResponse.json({ error: '管理员不存在' }, { status: 404 })
    }

    // 检查是否已有关联的用户账号
    const existingUser = await prisma.user.findUnique({
      where: { username: admin.username }
    })

    if (existingUser) {
      return NextResponse.json({
        success: true,
        data: {
          userId: existingUser.id,
          intercode: existingUser.intercode,
          message: '用户账号已存在'
        }
      })
    }

    // 创建对应的用户账号
    const intercode = generateIntercode()
    const user = await prisma.user.create({
      data: {
        username: admin.username,
        passwordHash: admin.passwordHash, // 使用相同密码
        intercode: intercode,
      }
    })

    return NextResponse.json({
      success: true,
      data: {
        userId: user.id,
        intercode: user.intercode,
        message: '用户账号创建成功'
      }
    })
  } catch (error) {
    console.error('Create admin user error:', error)
    return NextResponse.json({ error: '创建失败' }, { status: 500 })
  }
}

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '')

    if (!token) {
      return NextResponse.json({ error: '未授权' }, { status: 401 })
    }

    // 获取管理员信息
    const admin = await prisma.admin.findFirst()
    if (!admin) {
      return NextResponse.json({ error: '管理员不存在' }, { status: 404 })
    }

    // 查找关联的用户账号
    const user = await prisma.user.findUnique({
      where: { username: admin.username }
    })

    return NextResponse.json({
      success: true,
      data: {
        adminId: admin.id,
        username: admin.username,
        userAccount: user ? {
          id: user.id,
          intercode: user.intercode,
          createdAt: user.createdAt
        } : null
      }
    })
  } catch (error) {
    console.error('Get admin user info error:', error)
    return NextResponse.json({ error: '获取失败' }, { status: 500 })
  }
}
