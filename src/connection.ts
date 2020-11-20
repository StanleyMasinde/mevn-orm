import config from './config/knexfile'
const { development, production } = config
import knex from 'knex'

const connection = knex(process.env.NODE_ENV === 'development' ? development : production)
export default connection
