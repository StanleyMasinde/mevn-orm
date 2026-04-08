import tsParser from '@typescript-eslint/parser'

const baseRules = {
	'no-console': 'warn',
	'constructor-super': 'off',
	'no-this-before-super': 'off',
	'arrow-parens': ['error', 'always'],
	'class-methods-use-this': 'error',
	'indent': ['error', 'tab'],
	'linebreak-style': ['error', 'unix'],
	'quotes': ['error', 'single'],
	'semi': ['error', 'never'],
}

export default [
	{
		ignores: ['dist/**', 'node_modules/**', 'coverage/**', 'dev.sqlite'],
	},
	{
		files: ['**/*.js', '**/*.ts'],
		languageOptions: {
			parser: tsParser,
			ecmaVersion: 2022,
			sourceType: 'module',
		},
		rules: baseRules,
	},
	{
		files: ['initDb.ts', 'scripts/**/*.ts'],
		rules: {
			'no-console': 'off',
		},
	},
]
