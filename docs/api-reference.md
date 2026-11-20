# API Reference

All exports are named exports from the package root.

## Runtime Values

| Symbol                                | Kind     | Summary                                          |
| ------------------------------------- | -------- | ------------------------------------------------ |
| `DEFAULT_ENV_CONFIG`                  | object   | Frozen baseline policies.                        |
| `createEnvReader(config?)`            | function | Create a reader with merged policies.            |
| `envString(key, default?)`            | function | Read a string; empty is unset by default.        |
| `envOptionalString(key)`              | function | Read an optional string; no trimming by default. |
| `envInt(key, default?, min?, max?)`   | function | Read an integer with bounds.                     |
| `envFloat(key, default?, min?, max?)` | function | Read a finite float with bounds.                 |
| `envEnum(key, validValues, default?)` | function | Read a case-sensitive enum value.                |
| `envBool(key, default?)`              | function | Read a case-insensitive boolean.                 |
| `EmptyStringPolicy`                   | enum     | `Unset` and `Value`.                             |
| `NumberParsing`                       | enum     | `Strict` and `Lenient`.                          |
| `RangePolicy`                         | enum     | `Fallback` and `Clamp`.                          |

## Types

`EnvSource`, `EnvReaderConfig`, `ResolvedEnvReaderConfig` and `EnvReader`.

## `createEnvReader(config?)`

Create an `EnvReader` with the caller's defined fields merged over `DEFAULT_ENV_CONFIG`.

| Param    | Type              | Default | Description                                        |
| -------- | ----------------- | ------- | -------------------------------------------------- |
| `config` | `EnvReaderConfig` | `{}`    | Optional overrides; undefined fields keep defaults |

Returns `EnvReader`.

### `EnvReaderConfig`

| Field                  | Type                | Default                   | Description                               |
| ---------------------- | ------------------- | ------------------------- | ----------------------------------------- |
| `source`               | `EnvSource`         | `process.env`             | Environment source                        |
| `emptyString`          | `EmptyStringPolicy` | `EmptyStringPolicy.Unset` | Empty-string handling                     |
| `trimOptionalString`   | `boolean`           | `false`                   | Trim optional strings                     |
| `numberParsing`        | `NumberParsing`     | `NumberParsing.Strict`    | Number parsing strategy                   |
| `rangePolicy`          | `RangePolicy`       | `RangePolicy.Fallback`    | Out-of-range behavior                     |
| `booleanCaseSensitive` | `boolean`           | `false`                   | Compare boolean literals case-sensitively |
| `booleanTrue`          | `readonly string[]` | `['true', '1']`           | True literals                             |
| `booleanFalse`         | `readonly string[]` | `['false', '0']`          | False literals                            |
| `enumCaseSensitive`    | `boolean`           | `true`                    | Compare enum values case-sensitively      |

## `EnvReader`

### `string(key, defaultValue?)`

Read a string. An empty string is unset when `emptyString` is `EmptyStringPolicy.Unset`.

| Param          | Type     | Default     | Description                 |
| -------------- | -------- | ----------- | --------------------------- |
| `key`          | `string` |             | Environment key             |
| `defaultValue` | `string` | `undefined` | Value when the key is unset |

Returns `string` when `defaultValue` is supplied, else `string | undefined`.

### `optionalString(key)`

Read an optional string.

| Param | Type     | Default | Description     |
| ----- | -------- | ------- | --------------- |
| `key` | `string` |         | Environment key |

Returns `string | undefined`.

### `int(key, defaultValue?, min?, max?)`

Read an integer. Non-integers and non-finite values fall back to `defaultValue`.

| Param          | Type     | Default     | Description              |
| -------------- | -------- | ----------- | ------------------------ |
| `key`          | `string` |             | Environment key          |
| `defaultValue` | `number` | `undefined` | Value when parsing fails |
| `min`          | `number` | `undefined` | Inclusive lower bound    |
| `max`          | `number` | `undefined` | Inclusive upper bound    |

Returns `number` when `defaultValue` is supplied, else `number | undefined`.

### `float(key, defaultValue?, min?, max?)`

Read a finite float. Non-finite values fall back to `defaultValue`.

| Param          | Type     | Default     | Description              |
| -------------- | -------- | ----------- | ------------------------ |
| `key`          | `string` |             | Environment key          |
| `defaultValue` | `number` | `undefined` | Value when parsing fails |
| `min`          | `number` | `undefined` | Inclusive lower bound    |
| `max`          | `number` | `undefined` | Inclusive upper bound    |

Returns `number` when `defaultValue` is supplied, else `number | undefined`.

### `enum(key, validValues, defaultValue?)`

Read a value constrained to `validValues`.

| Param          | Type           | Default     | Description                   |
| -------------- | -------------- | ----------- | ----------------------------- |
| `key`          | `string`       |             | Environment key               |
| `validValues`  | `readonly T[]` |             | Accepted literals             |
| `defaultValue` | `T`            | `undefined` | Value when no literal matches |

Returns `T` when `defaultValue` is supplied, else `T | undefined`.

### `bool(key, defaultValue?)`

Read a boolean from the configured true and false literals.

| Param          | Type      | Default     | Description                   |
| -------------- | --------- | ----------- | ----------------------------- |
| `key`          | `string`  |             | Environment key               |
| `defaultValue` | `boolean` | `undefined` | Value when no literal matches |

Returns `boolean` when `defaultValue` is supplied, else `boolean | undefined`.

## Top-Level Helpers

`envString`, `envOptionalString`, `envInt`, `envFloat`, `envEnum` and `envBool` use one default `EnvReader` and accept the same parameters as the matching method.

| Helper              | Reader method    |
| ------------------- | ---------------- |
| `envString`         | `string`         |
| `envOptionalString` | `optionalString` |
| `envInt`            | `int`            |
| `envFloat`          | `float`          |
| `envEnum`           | `enum`           |
| `envBool`           | `bool`           |

## Policy Enums

| Enum                | Members                                    |
| ------------------- | ------------------------------------------ |
| `EmptyStringPolicy` | `Unset = 'unset'`, `Value = 'value'`       |
| `NumberParsing`     | `Strict = 'strict'`, `Lenient = 'lenient'` |
| `RangePolicy`       | `Fallback = 'fallback'`, `Clamp = 'clamp'` |

## Number Parsing

`NumberParsing.Strict` uses `Number(value)` and requires a finite number;
integers must also be integers. `NumberParsing.Lenient` reads a leading
numeric prefix with `Number()` and rejects non-finite results; integers must
still be integers. `'42abc'` reads as `42` and `'3.14xyz'` reads as `3.14`.

`int` and `float` bounds must be finite and ordered (`min <= max`).
