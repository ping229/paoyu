import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'

const JWT_SECRET = process.env.JWT_SECRET

if (!JWT_SECRET) {
  console.error('WARNING: JWT_SECRET is not set! Using insecure default.')
}

// 获取JWT密钥，如果未设置则使用随机生成的密钥（仅用于开发环境）
function getJwtSecret(): string {
  if (JWT_SECRET) return JWT_SECRET
  // 生产环境必须设置JWT_SECRET
  if (process.env.NODE_ENV === 'production') {
    throw new Error('JWT_SECRET must be set in production environment')
  }
  // 开发环境使用固定值（不安全但至少不会每次重启都变）
  return 'dev-insecure-secret-key-change-in-production'
}

export interface JWTPayload {
  userId: string
  intercode: string
  isAdmin?: boolean
}

export function generateToken(payload: JWTPayload): string {
  return jwt.sign(payload, getJwtSecret(), { expiresIn: '7d' })
}

export function verifyToken(token: string): JWTPayload | null {
  try {
    return jwt.verify(token, getJwtSecret()) as JWTPayload
  } catch {
    return null
  }
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function getTokenFromHeader(authHeader: string | null): string | null {
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null
  }
  return authHeader.slice(7)
}
