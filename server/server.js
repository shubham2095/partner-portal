import { assertServerConfig } from './config/validateEnv.js'

try {
  assertServerConfig()
} catch (error) {
  console.error(`[server] ${error.message}`)
  process.exit(1)
}

// Imported after validation so a bad config stops the process before the
// database pool, scheduler or routes are initialised.
const { default: app } = await import('./app.js')
const { env } = await import('./config/env.js')
const { startScheduler } = await import('./jobs/scheduler.js')

app.listen(env.port, () => {
  console.log(`Partner Portal API running on http://localhost:${env.port}/api/${env.apiVersion}`)
  startScheduler()
})
