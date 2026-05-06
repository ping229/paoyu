import { NextRequest, NextResponse } from 'next/server'
import { verifyToken, getTokenFromHeader } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({
        success: false,
        error: '请选择文件'
      }, { status: 400 })
    }

    // 验证文件类型
    const allowedTypes = ['audio/webm', 'audio/mp3', 'audio/wav', 'audio/ogg', 'audio/m4a']
    if (!allowedTypes.includes(file.type)) {
      return NextResponse.json({
        success: false,
        error: '只支持 WebM, MP3, WAV, OGG, M4A 格式的语音'
      }, { status: 400 })
    }

    // 验证文件大小 (最大10MB)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({
        success: false,
        error: '语音大小不能超过10MB'
      }, { status: 400 })
    }

    // 生成文件名
    const ext = file.name.split('.').pop() || 'webm'
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

    // 确保上传目录存在
    const uploadDir = path.join(process.cwd(), 'uploads', 'voices')
    await mkdir(uploadDir, { recursive: true })

    // 保存文件
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    return NextResponse.json({
      success: true,
      data: {
        url: `/uploads/voices/${fileName}`,
        type: 'voice'
      }
    })
  } catch (error) {
    console.error('Upload voice error:', error)
    return NextResponse.json({
      success: false,
      error: '上传失败'
    }, { status: 500 })
  }
}
