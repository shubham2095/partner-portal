import app from './app.js'
import { env } from './config/env.js'
import { assertServerConfig } from './config/validateEnv.js'
import { startScheduler } from './jobs/scheduler.js'

// No top-level await here: Hostinger's Node loader require()s this file, and
// require() cannot load an ES module graph that contains top-level await.
try {
  assertServerConfig()
} catch (error) {
  console.error(`[server] ${error.message}`)
  process.exit(1)
}

app.listen(env.port, () => {
  console.log(`Partner Portal API running on http://localhost:${env.port}/api/${env.apiVersion}`)
  startScheduler()
})
