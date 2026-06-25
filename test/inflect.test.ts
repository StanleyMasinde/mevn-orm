import { describe, it, expect } from 'vitest'
import { getTableName, toSnakeCase } from '../src/inflect.js'

describe('inflect', () => {
	it('converts PascalCase class names to snake_case', () => {
		expect(toSnakeCase('PasswordResetToken')).toBe('password_reset_token')
		expect(toSnakeCase('User')).toBe('user')
		expect(toSnakeCase('Farmer')).toBe('farmer')
	})

	it('pluralizes snake_case table names', () => {
		expect(getTableName('PasswordResetToken')).toBe('password_reset_tokens')
		expect(getTableName('User')).toBe('users')
		expect(getTableName('Farmer')).toBe('farmers')
	})
})