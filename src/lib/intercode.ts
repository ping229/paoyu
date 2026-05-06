import { v4 as uuidv4 } from 'uuid'
import { prisma } from './prisma'

// 排除易混淆字符: 0, O, I, l, 1
const ALLOWED_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

export function generateIntercode(): string {
  let code = ''
  for (let i = 0; i < 8; i++) {
    code += ALLOWED_CHARS.charAt(Math.floor(Math.random() * ALLOWED_CHARS.length))
  }
  return code
}

export function isValidIntercode(code: string): boolean {
  if (code.length !== 8) return false
  const validChars = new Set(ALLOWED_CHARS.split(''))
  return code.split('').every(char => validChars.has(char))
}

export async function generateUniqueIntercode(): Promise<string> {
  let code = generateIntercode()
  let attempts = 0
  const maxAttempts = 100

  while (attempts < maxAttempts) {
    const existing = await prisma.user.findUnique({
      where: { intercode: code }
    })
    if (!existing) return code

    code = generateIntercode()
    attempts++
  }

  throw new Error('Failed to generate unique intercode after maximum attempts')
}

export function generateTrueCode(): string {
  return uuidv4()
}
