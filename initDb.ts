#!/usr/bin/env node
import { existsSync } from 'node:fs'
import { pathToFileURL } from 'node:url'
import 'dotenv/config'
import type { Knex } from 'knex'
import knexModule from 'knex'

interface KnexEnvConfig {
	development: Knex.Config
	staging: Knex.Config
	production: Knex.Config
}

type KnexFactory = (config: Knex.Config) => Knex

const KnexFactoryImpl: KnexFactory =
	(knexModule as unknown as { knex?: KnexFactory }).knex ??
	(knexModule as unknown as KnexFactory)

const knexfilePath = `${process.cwd()}/knexfile.ts`
if (!existsSync(knexfilePath)) {
	throw new Error('knexfile.ts not found in current working directory')
}

const knexConfigModule = await import(pathToFileURL(knexfilePath).href)
const knexConfig = (knexConfigModule.default ?? knexConfigModule) as Partial<KnexEnvConfig>
const { development, staging, production } = knexConfig

if (!development || !staging || !production) {
	throw new Error('knexfile.ts must export development, staging, and production config')
}

const config: Knex.Config = (() => {
	switch (process.env.NODE_ENV) {
	case 'testing':
	case 'test':
	case 'development':
		return development
	case 'staging':
		return staging
	default:
		return production
	}
})()

const initDatabase = async (): Promise<void> => {
	const DB = KnexFactoryImpl(config)

	try {
		await DB.schema.dropTableIfExists('farmers')
		await DB.schema.dropTableIfExists('farms')
		await DB.schema.dropTableIfExists('profiles')
		await DB.schema.dropTableIfExists('articles')

		await DB.schema.createTable('farmers', (table: Knex.CreateTableBuilder) => {
			table.bigIncrements('id')
			table.string('name')
			table.string('email').unique()
			table.string('password')
		})

		await DB.schema.createTable('farms', (table: Knex.CreateTableBuilder) => {
			table.bigIncrements('id')
			table.bigInteger('farmer_id')
			table.string('name')
		})

		await DB.schema.createTable('profiles', (table: Knex.CreateTableBuilder) => {
			table.bigIncrements('id')
			table.bigInteger('farmer_id')
			table.string('bio')
		})

		await DB.schema.createTable('articles', (table: Knex.CreateTableBuilder) => {
			table.bigIncrements('id')
			table.string('title')
			table.text('body')
			table.bigInteger('postable_id')
			table.string('postable_type')
		})

		await DB.table('Farmers').insert([
			{ name: 'Jane Doe', email: 'jane@mail.com', password: 'pasword' },
			{ name: 'Ashley Doe', email: 'ashley@mail.com', password: 'pasword' },
			{ name: 'Alice Doe', email: 'alice@mail.com', password: 'pasword' },
		])

		await DB.table('farms').insert([
			{ farmer_id: 1, name: 'Awesome Farm' },
			{ farmer_id: 1, name: 'Awesome Farm two' },
			{ farmer_id: 1, name: 'Awesome Farm three' },
		])

		await DB.table('profiles').insert([{ farmer_id: 1, bio: 'Profile for farmer one' }])

		await DB.table('articles').insert([
			{
				title: 'Awesome Post',
				body: 'fffgjdfjdbdb something #1',
				postable_id: 1,
				postable_type: 'Farmer',
			},
		])

		process.exit(0)
	} catch (error: unknown) {
		console.error(error)
		process.exit(1)
	}
}

await initDatabase()
