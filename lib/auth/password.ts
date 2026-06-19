import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'crypto'
import { promisify } from 'util'

const scrypt = promisify(scryptCallback)
const SCRYPT_PREFIX = 'scrypt'

export async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  return `${SCRYPT_PREFIX}$${salt}$${derivedKey.toString('hex')}`
}

async function verifyScryptHash(hash: string, password: string) {
  const [, salt, expectedHex] = hash.split('$')
  if (!salt || !expectedHex) return false

  const derivedKey = (await scrypt(password, salt, 64)) as Buffer
  const expected = Buffer.from(expectedHex, 'hex')

  if (derivedKey.length !== expected.length) return false
  return timingSafeEqual(derivedKey, expected)
}

async function verifyLegacyArgon2Hash(hash: string, password: string) {
  const dynamicImport = new Function('specifier', 'return import(specifier)') as (
    specifier: string
  ) => Promise<{ verify: (hash: string, password: string) => Promise<boolean> }>
  const argon2 = await dynamicImport('argon2')
  return argon2.verify(hash, password)
}

export async function verifyPassword(hash: string, password: string): Promise<boolean> {
  if (hash.startsWith(`${SCRYPT_PREFIX}$`)) {
    return verifyScryptHash(hash, password)
  }

  if (hash.startsWith('$argon2')) {
    return verifyLegacyArgon2Hash(hash, password)
  }

  return false
}

export function needsPasswordRehash(hash: string): boolean {
  return !hash.startsWith(`${SCRYPT_PREFIX}$`)
}
