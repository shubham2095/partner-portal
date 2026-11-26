import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { env } from './config/env.js'
import { corsOptions } from './config/cors.js'
import { requestLogger } from './middleware/requestLogger.js'
import { notFound } from './middleware/notFound.js'
import { errorHandler } from './middleware/errorHandler.js'
import { generalLimiter } from './middleware/rateLimiter.js'
import apiRoutes from './routes/index.js'

const app = express()

// In production the app runs behind Hostinger's reverse proxy, so the real
// client IP arrives in X-Forwarded-For. Without this, express-rate-limit keys
// every request by the proxy's single IP and one busy user throttles everyone.
// Trust exactly one proxy hop rather than `true` (which would let a client
// spoof its own X-Forwarded-For and dodge the limiter).
if (env.isProduction) {
  app.set('trust proxy', 1)
}

// Strict CSP for the SPA served from this process. Only Google Fonts and Google
// Identity Services (Sign-In) are allowed beyond 'self'. Inline styles are
// permitted because the UI libraries (framer-motion, recharts) set style attrs.
app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", 'https://accounts.google.com/gsi/client'],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com', 'https://accounts.google.com/gsi/style'],
        fontSrc: ["'self'", 'data:', 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'blob:', 'https:'],
        connectSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        frameSrc: ["'self'", 'https://accounts.google.com/gsi/'],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        frameAncestors: ["'self'"],
        // Only force https upgrades when actually served over TLS (production).
        upgradeInsecureRequests: env.isProduction ? [] : null,
      },
    },
  })
)
app.use(cors(corsOptions))
app.use(
  express.json({
    // Capture the raw request bytes alongside the parsed body so webhook
    // routes (Meta) can verify an HMAC signature computed over the exact
    // bytes the provider sent — re-serializing req.body would not match.
    verify: (req, res, buf) => {
      req.rawBody = buf
    },
  })
)
app.use(express.urlencoded({ extended: true }))
app.use(requestLogger)

app.use(`/api/${env.apiVersion}`, generalLimiter, apiRoutes)

// Serve the built frontend (client/dist copied to server/dist by `npm run build`)
// when present. Lets a single Node deployment host both the API and the React app.
// Resolved relative to this file (not process.cwd()) because hosting loaders
// may start the process from a different working directory.
const here = path.dirname(fileURLToPath(import.meta.url))
const clientDistPath = [path.join(here, 'dist'), path.join(process.cwd(), 'dist')].find((dir) =>
  fs.existsSync(path.join(dir, 'index.html'))
)

if (clientDistPath) {
  const clientIndexPath = path.join(clientDistPath, 'index.html')
  app.use(express.static(clientDistPath))
  app.get(/^(?!\/api\/).*/, (req, res) => {
    res.sendFile(clientIndexPath)
  })
} else {
  console.warn(
    `[app] Frontend build not found (looked in ${path.join(here, 'dist')}). ` +
      'Only the API is served - run "npm run build" in server/ during deployment.'
  )
}

app.use(notFound)
app.use(errorHandler)

export default app
