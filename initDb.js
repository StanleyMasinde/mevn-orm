#!/bin/env node
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import 'dotenv/config'
import knexModule from 'knex'

const Knex = knexModule.knex ?? knexModule

const knexfilePath = process.cwd() + '/knexfile.js'
if (!existsSync(knexfilePath)) {
	throw new Error('knexfile.js not found in current working directory')
}
const knexConfigModule = await import(pathToFileURL(knexfilePath).href)
const knexConfig = knexConfigModule.default ?? knexConfigModule
const { development, staging, production } = knexConfig
let config

switch (process.env.NODE_ENV) {
case 'testing':
case 'test':
	config = development
	break
case 'development':
	config = development
	break
case 'staging':
	config = staging
	break
default:
	config = production
	break
}
async function initDatabase() {
	const DB = Knex(config)

	try {
		await DB.schema.dropTableIfExists('farmers')
		await DB.schema.dropTableIfExists('farms')
		await DB.schema.dropTableIfExists('profiles')
		await DB.schema.dropTableIfExists('articles')
		await DB.schema.createTable('farmers', (table) => {
			table.bigIncrements('id')
			table.string('name')
			table.string('email').unique()
			table.string('password')
		})
		await DB.schema.createTable('farms', (table) => {
			table.bigIncrements('id')
			table.bigInteger('farmer_id')
			table.string('name')
		})

		await DB.schema.createTable('profiles', (table) => {
			table.bigIncrements('id')
			table.bigInteger('farmer_id')
			table.string('bio')
		})

		await DB.schema.createTable('articles', (table) => {
			table.bigIncrements('id')
			table.string('title')
			table.text('body')
			table.bigInteger('postable_id')
			table.string('postable_type')
		})

		await DB.table('Farmers').insert([
			{
				name: 'Jane Doe',
				email: 'jane@mail.com',
				password: 'pasword'
			},
			{
				name: 'Ashley Doe',
				email: 'ashley@mail.com',
				password: 'pasword'
			},
			{
				name: 'Alice Doe',
				email: 'alice@mail.com',
				password: 'pasword'
			}
		])

		await DB.table('farms').insert([
			{
				farmer_id: 1,
				name: 'Awesome Farm'
			},
			{
				farmer_id: 1,
				name: 'Awesome Farm two'
			},
			{
				farmer_id: 1,
				name: 'Awesome Farm three'
			}
		])

		await DB.table('profiles').insert([
			{
				farmer_id: 1,
				bio: 'Profile for farmer one'
			}
		])

		await DB.table('articles').insert([
			{
				title: 'Awesome Post',
				body: 'fffgjdfjdbdb something #1',
				postable_id: 1,
				postable_type: 'Farmer'
			}
		])

		process.exit(0)
	} catch (error) {
		// eslint-disable-next-line no-console
		console.error(error)
		process.exit(1)
	}
}
initDatabase()
