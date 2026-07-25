import { createRequire } from 'node:module'
import { defineConfig } from 'vitepress'

const require = createRequire(import.meta.url)
const { version } = require('../../package.json') as { version: string }

const siteUrl = 'https://stanleymasinde.github.io/mevn-orm'

export default defineConfig({
	// Project site: https://stanleymasinde.github.io/mevn-orm/
	base: '/mevn-orm/',
	title: 'Mevn ORM',
	description: 'A small ActiveRecord-style ORM for Node.js, built on Knex',
	lang: 'en-GB',
	cleanUrls: true,
	lastUpdated: true,
	appearance: 'force-auto',

	sitemap: {
		hostname: siteUrl,
	},

	head: [
		['meta', { name: 'theme-color', content: '#3eaf7c' }],
		['meta', { name: 'og:type', content: 'website' }],
		['meta', { name: 'og:title', content: 'Mevn ORM' }],
		['meta', { name: 'og:description', content: 'A small ActiveRecord-style ORM for Node.js, built on Knex' }],
		['meta', { name: 'og:url', content: `${siteUrl}/` }],
		['meta', { name: 'twitter:card', content: 'summary' }],
	],

	themeConfig: {
		siteTitle: 'Mevn ORM',
		externalLinkIcon: true,
		nav: [
			{ text: 'Guide', link: '/guide/getting-started', activeMatch: '/guide/' },
			{ text: 'API', link: '/api/', activeMatch: '/api/' },
			{
				text: `v${version}`,
				items: [
					{ text: 'Changelog', link: 'https://github.com/StanleyMasinde/mevn-orm/blob/main/changelog.md' },
					{ text: 'npm', link: 'https://www.npmjs.com/package/mevn-orm' },
				],
			},
		],

		sidebar: {
			'/guide/': [
				{
					text: 'Introduction',
					items: [
						{ text: 'What is Mevn ORM?', link: '/guide/what-is-mevn-orm' },
						{ text: 'Getting Started', link: '/guide/getting-started' },
					],
				},
				{
					text: 'Core Concepts',
					items: [
						{ text: 'Configuration', link: '/guide/configuration' },
						{ text: 'Models', link: '/guide/models' },
						{ text: 'Queries', link: '/guide/queries' },
						{ text: 'Relationships', link: '/guide/relationships' },
						{ text: 'Serialization', link: '/guide/serialization' },
						{ text: 'Migrations', link: '/guide/migrations' },
					],
				},
				{
					text: 'Recipes',
					items: [
						{ text: 'Express', link: '/guide/express' },
						{ text: 'Nuxt / Nitro', link: '/guide/nuxt' },
						{ text: 'Raw Knex (DB)', link: '/guide/raw-knex' },
						{ text: 'Security', link: '/guide/security' },
					],
				},
			],
			'/api/': [
				{
					text: 'API Reference',
					items: [
						{ text: 'Overview', link: '/api/' },
						{ text: 'Model', link: '/api/model' },
						{ text: 'Configuration', link: '/api/configuration' },
						{ text: 'Relationships', link: '/api/relationships' },
						{ text: 'Migrations', link: '/api/migrations' },
						{ text: 'Helpers', link: '/api/helpers' },
					],
				},
			],
		},

		socialLinks: [
			{ icon: 'github', link: 'https://github.com/StanleyMasinde/mevn-orm' },
			{ icon: 'npm', link: 'https://www.npmjs.com/package/mevn-orm' },
		],

		editLink: {
			pattern: 'https://github.com/StanleyMasinde/mevn-orm/edit/main/docs/:path',
			text: 'Edit this page on GitHub',
		},

		footer: {
			message: 'Released under the MIT License.',
			copyright: 'Copyright © Stanley Masinde',
		},

		search: {
			provider: 'local',
		},

		outline: {
			level: [2, 3],
		},
	},
})
