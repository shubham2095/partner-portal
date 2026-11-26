import { env } from './env.js'

const PLACEHOLDER = /replace_with|changeme|your_|example/i
const MIN_SECRET_LENGTH = 32

/**
 * Fail fast at boot: a missing or placeholder secret should stop the server
 * immediately instead of surfacing later as a 500 on the first login.
 */
export function assertServerConfig() {
  const problems = []

  const checkSecret = (name, value) => {
    if (!value) problems.push(`${name} is not set`)
    else if (PLACEHOLDER.test(value)) problems.push(`${name} is still the placeholder value from .env.example`)
    else if (env.isProduction && value.length < MIN_SECRET_LENGTH) {
      problems.push(`${name} must be at least ${MIN_SECRET_LENGTH} characters in production`)
    }
  }

  checkSecret('JWT_SECRET', env.jwt.secret)
  checkSecret('JWT_REFRESH_SECRET', env.jwt.refreshSecret)
  if (env.jwt.secret && env.jwt.secret === env.jwt.refreshSecret) {
    problems.push('JWT_SECRET and JWT_REFRESH_SECRET must be different')
  }

  if (!process.env.DB_NAME) problems.push('DB_NAME is not set')

  if (env.isProduction) {
    if (!process.env.DB_PASSWORD) problems.push('DB_PASSWORD is empty in production')
    if (!process.env.CLIENT_URL) problems.push('CLIENT_URL is not set')

    // Not fatal (the API still works) but almost certainly a misconfiguration.
    if (!process.env.DB_USER || process.env.DB_USER === 'root') {
      console.warn('[config] DB_USER is root/unset in production - use a dedicated database user')
    }
    if (!env.smtp.host || !env.smtp.user || !env.smtp.password) {
      console.warn('[config] SMTP is not configured - email verification and notifications will fail')
    }
  }

  if (problems.length) {
    throw new Error(`Invalid server configuration:\n  - ${problems.join('\n  - ')}`)
  }
}
