/**
 * Attribute inference for write payloads (`create` / `where` / `update`).
 *
 * Declared instance fields (`declare name: string`) and interface-merged
 * columns become the payload shape. Models with no declared columns keep the
 * previous loose `Record<string, unknown>` behaviour.
 */

type Row = Record<string, unknown>

/**
 * Drops index signatures (`[key: string]: any`) so only explicitly declared
 * keys remain.
 */
type KnownKeys<T> = {
	[K in keyof T as string extends K ? never : number extends K ? never : K]: T[K]
}

type NonMethodKeys<T> = {
	[K in keyof T as T[K] extends (...args: never[]) => unknown ? never : K]: T[K]
}

type ModelReservedKeys = 'fillable' | 'hidden' | 'modelName' | 'table'

/**
 * Declared data fields on a model instance, including `id`.
 * Methods and ORM metadata (`fillable`, `hidden`, `table`, `modelName`) are omitted.
 */
type RawAttributes<T> = Omit<NonMethodKeys<KnownKeys<T>>, ModelReservedKeys>

type HasDeclaredColumns<T> = [keyof Omit<RawAttributes<T>, 'id'>] extends [never] ? false : true

/**
 * Column attributes inferred from a model instance type.
 *
 * Falls back to a loose row type when the model has no declared columns,
 * so existing untyped models keep compiling.
 */
type ModelAttributes<T> = HasDeclaredColumns<T> extends false ? Row : RawAttributes<T>

/**
 * Payload for {@link Model.create} / {@link Model.createMany}.
 *
 * Omits `id` (typically database-assigned). Database-default columns such as
 * timestamps should be declared optional (`declare created_at?: string`).
 */
type CreateAttributes<T> = HasDeclaredColumns<T> extends false ? Row : Omit<RawAttributes<T>, 'id'>

/**
 * Payload for `where()` equality objects. All declared columns are optional.
 */
type WhereAttributes<T> = HasDeclaredColumns<T> extends false ? Row : Partial<RawAttributes<T>>

/**
 * Payload for instance and static `update()`.
 */
type UpdateAttributes<T> = WhereAttributes<T>

/**
 * Column name for `orderBy` / similar helpers: declared keys when present, else `string`.
 */
type AttributeColumn<T> = HasDeclaredColumns<T> extends false ? string : Extract<keyof RawAttributes<T>, string>

export type {
	Row,
	ModelAttributes,
	CreateAttributes,
	WhereAttributes,
	UpdateAttributes,
	AttributeColumn,
}
