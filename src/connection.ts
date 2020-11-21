import config from './config/knexfile'
import knex from 'knex'

const connection = knex(process.env.NODE_ENV === 'development' ? config.development : config.production)
export default connection
