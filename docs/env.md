# Behavior

The package reads the source it is given (default: `process.env`) and never
loads a `.env` file itself.

## Default Behavior Matrix

| Input                       | Helper              | Default result                     |
| --------------------------- | ------------------- | ---------------------------------- |
| Unset                       | `envString`         | supplied default, else `undefined` |
| Empty string                | `envString`         | supplied default, else `undefined` |
| Whitespace only             | `envString`         | whitespace preserved               |
| Unset or empty              | `envOptionalString` | `undefined`                        |
| Whitespace only             | `envOptionalString` | whitespace preserved (no trim)     |
| `'42'`                      | `envInt`            | `42`                               |
| `'42.5'`                    | `envInt`            | supplied default, else `undefined` |
| `'abc'`                     | `envInt`/`envFloat` | supplied default, else `undefined` |
| `'Infinity'`                | `envFloat`          | supplied default, else `undefined` |
| Below `min` or above `max`  | `envInt`/`envFloat` | supplied default (fallback mode)   |
| Valid literal               | `envEnum`           | matching value (case-sensitive)    |
| Unknown literal             | `envEnum`           | supplied default, else `undefined` |
| `'true'`, `'1'` (any case)  | `envBool`           | `true`                             |
| `'false'`, `'0'` (any case) | `envBool`           | `false`                            |
| Other literal               | `envBool`           | supplied default, else `undefined` |

`envString` and `envInt`/`envFloat` keep the historical overloads: passing a
default makes the return type non-optional.

## Configurable Switches

| Config field           | Default                   | Alternatives                                                                          |
| ---------------------- | ------------------------- | ------------------------------------------------------------------------------------- |
| `source`               | `process.env`             | any `Record<string, string \| undefined>`                                             |
| `emptyString`          | `EmptyStringPolicy.Unset` | `EmptyStringPolicy.Value` preserves empty strings                                     |
| `trimOptionalString`   | `false`                   | `true` trims `optionalString`; trimmed-empty is unset unless `emptyString` is `Value` |
| `numberParsing`        | `NumberParsing.Strict`    | `NumberParsing.Lenient` reads a leading numeric prefix                                |
| `rangePolicy`          | `RangePolicy.Fallback`    | `RangePolicy.Clamp` returns the nearest bound                                         |
| `booleanCaseSensitive` | `false`                   | `true` compares literals exactly                                                      |
| `booleanTrue`          | `['true', '1']`           | any literal list                                                                      |
| `booleanFalse`         | `['false', '0']`          | any literal list                                                                      |
| `enumCaseSensitive`    | `true`                    | `false` compares case-insensitively                                                   |

Partial configs merge over the defaults; undefined fields are ignored rather
than replacing a default. `DEFAULT_ENV_CONFIG` is frozen.
