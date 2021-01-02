import importCwd from 'import-cwd'
const config = importCwd('./knexfile')
import knex from 'knex'

console.log(process.cwd());

//@ts-ignore
const connection = knex(process.env.NODE_ENV === 'testing' ? config.development : config.production)
export default connection
