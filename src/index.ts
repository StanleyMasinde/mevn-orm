import dotenv from 'dotenv'
dotenv.config()
import Model from './model'
import DB from './connection'

export = {
    Model, DB
}