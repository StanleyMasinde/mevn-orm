// Copy to a Nuxt project root; run from its source checkout in development or CI.
// Example: node --import tsx db.mjs migrate
import { existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { parseArgs } from 'node:util'
import { fileURLToPath } from 'node:url'
import {
  configureDatabase,
  getDB,
  makeMigration,
  migrateLatest,
  migrateRollback,
  setMigrationConfig
} from 'mevn-orm'

const scriptDir = dirname(fileURLToPath(import.meta.url))
const envFile = resolve(scriptDir, '.env')
if (existsSync(envFile)) process.loadEnvFile(envFile)

const migrationDirectory = process.env.MEVN_MIGRATIONS_DIR ?? resolve(scriptDir, 'server/assets/migrations')
const seedDirectory = process.env.MEVN_SEEDS_DIR ?? resolve(scriptDir, 'server/assets/seeds')

const { values, positionals } = parseArgs({
  options: {
    name: { type: 'string', short: 'n' },
    help: { type: 'boolean', short: 'h' }
  },
  allowPositionals: true
})

const command = positionals[0]
if (values.help || !command) {
  console.log(`Usage: node --import tsx db.mjs <command> [options]

Commands:
  migration:make --name <name>  Create a migration
  migrate                       Run pending migrations
  rollback                      Roll back the last migration batch
  seed                          Run seed files

Options:
  -n, --name  Migration name
  -h, --help  Show this help`)
} else {
  if (!process.env.NUXT_DATABASE_CONNECTION) {
    throw new Error('NUXT_DATABASE_CONNECTION is not set')
  }

  configureDatabase({
    client: 'mysql2',
    connection: process.env.NUXT_DATABASE_CONNECTION
  })
  setMigrationConfig({
    directory: migrationDirectory,
    extension: 'ts'
  })

  try {
    switch (command) {
      case 'migration:make': {
        const name = values.name?.trim().replace(/\s+/g, '_').toLowerCase()
        if (!name) throw new Error('Missing required option: --name (-n)')
        console.log(await makeMigration(name))
        break
      }
      case 'migrate': {
        const result = await migrateLatest()
        console.log(result.log.length ? `Ran: ${result.log.join(', ')}` : 'Already at the latest migrations.')
        break
      }
      case 'rollback': {
        const result = await migrateRollback()
        console.log(result.log.length ? `Rolled back: ${result.log.join(', ')}` : 'No migrations to rollback.')
        break
      }
      case 'seed': {
        const [files] = await getDB().seed.run({ directory: seedDirectory, extension: 'ts' })
        console.log(files.length ? `Seeded: ${files.join(', ')}` : 'Seeding completed.')
        break
      }
      default:
        throw new Error(`Unknown command: "${command}"`)
    }
  } catch (error) {
    console.error(`Error: ${error instanceof Error ? error.message : String(error)}`)
    process.exitCode = 1
  } finally {
    await getDB().destroy()
  }
}
