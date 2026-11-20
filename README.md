<a id="readme-top"></a>

# @johannes.latzel/env

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![NPM](https://nodei.co/npm/@johannes.latzel/env.svg?style=shields&data=n,v,u,d,s)](https://www.npmjs.com/package/@johannes.latzel/env)
[![version](https://img.shields.io/github/package-json/v/johanneslatzel/env)](https://github.com/johanneslatzel/env/releases)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-blue)](https://www.typescriptlang.org/)
[![Node](https://img.shields.io/node/v/@johannes.latzel/env.svg)](https://www.npmjs.com/package/@johannes.latzel/env)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/johanneslatzel/env/pulls)
[![Feedback Welcome](https://img.shields.io/badge/feedback-welcome-brightgreen)](https://github.com/johanneslatzel/env/discussions)
[![codecov](https://codecov.io/gh/johanneslatzel/env/graph/badge.svg)](https://codecov.io/gh/johanneslatzel/env)
[![CI](https://github.com/johanneslatzel/env/actions/workflows/ci.yml/badge.svg)](https://github.com/johanneslatzel/env/actions/workflows/ci.yml)
[![Socket Badge](https://badge.socket.dev/npm/package/@johannes.latzel/env/latest)](https://badge.socket.dev/npm/package/@johannes.latzel/env/latest)
[![AI Assisted Yes](https://img.shields.io/badge/AI%20Assisted-Yes-green)](https://github.com/mefengl/made-by-ai)

<p align="center">
<a href="https://www.npmjs.com/package/@johannes.latzel/env">npm</a>
&middot;
<a href="https://github.com/johanneslatzel/env">GitHub</a>
&middot;
<a href="https://johanneslatzel.github.io/env/">Docs</a>
&middot;
<a href="#quick-start">Quick start</a>
&middot;
<a href="https://github.com/johanneslatzel/env/issues">Issues</a>
&middot;
<a href="https://github.com/johanneslatzel/env/releases">Releases</a>
</p>

Typed environment variable readers with configurable parsing, bounds and literal policies.

<details>
<summary>Table of Contents</summary>

- [Features](#features)
- [Prerequisites](#prerequisites)
- [Installation](#installation)
- [Quick Start](#quick-start)
    - [Read typed values](#read-typed-values)
    - [Configure a reader](#configure-a-reader)
- [API](#api)
    - [Helpers](#helpers)
    - [Policy enums](#policy-enums)
- [Behavior](#behavior)
- [Troubleshooting](#troubleshooting)
- [Support](#support)
- [Documentation](#documentation)
- [Development](#development)
- [Security](#security)
- [Maintainer](#maintainer)
- [License](#license)
- [Contributing](#contributing)

</details>

## Features

- Typed reads for strings, integers, floats, enums and booleans.
- Predictable fallbacks instead of exceptions for malformed values.
- Bounded numbers with fallback or clamp semantics.
- One implementation shared by top-level helpers and custom readers.
- No runtime dependencies; the package only reads the supplied source.

[Back to top](#readme-top)

## Prerequisites

| Requirement | Value |
|---|---|
| Node.js | >= 22 |
| Module format | ESM-only (no CommonJS build) |
| Runtime dependencies | none |
| TypeScript | Optional; `.d.ts` files included |

[Back to top](#readme-top)

## Installation

```bash
npm install @johannes.latzel/env
```

[Back to top](#readme-top)

## Quick Start

### Read typed values

```typescript
import {
    envBool,
    envEnum,
    envFloat,
    envInt,
    envOptionalString,
} from '@johannes.latzel/env';

const port = envInt('PORT', 3000, 1, 65535);
const retries = envInt('RETRIES', 3);
const ratio = envFloat('RATIO', 0.5, 0, 1);
const token = envOptionalString('API_TOKEN');
const level = envEnum('LOG_LEVEL', ['debug', 'info', 'error'] as const, 'info');
const verbose = envBool('VERBOSE', false);
```

The helpers never throw for malformed values. They return the supplied default,
or `undefined` when no default is supplied.

[Back to top](#readme-top)

### Configure a reader

```typescript
import { NumberParsing, RangePolicy, createEnvReader } from '@johannes.latzel/env';

const reader = createEnvReader({
    source: { RETRIES: '42abc', LIMIT: '500' },
    numberParsing: NumberParsing.Lenient,
    rangePolicy: RangePolicy.Clamp,
});

reader.int('RETRIES'); // 42
reader.int('LIMIT', 10, 1, 100); // 100
```

Pass a custom `source` to read a plain object instead of `process.env`. Every
config field is optional and merges over the frozen `DEFAULT_ENV_CONFIG`.

[Back to top](#readme-top)

## API

### Helpers

| Export | Returns |
|---|---|
| `envString(key, default?)` | `string` when a default is passed, else `string \| undefined` |
| `envOptionalString(key)` | `string \| undefined` |
| `envInt(key, default?, min?, max?)` | `number` when a default is passed, else `number \| undefined` |
| `envFloat(key, default?, min?, max?)` | `number` when a default is passed, else `number \| undefined` |
| `envEnum(key, validValues, default?)` | `T` when a default is passed, else `T \| undefined` |
| `envBool(key, default?)` | `boolean` when a default is passed, else `boolean \| undefined` |
| `createEnvReader(config?)` | `EnvReader` |
| `DEFAULT_ENV_CONFIG` | frozen baseline policies |

`envBool` and `envEnum` return the non-optional type when a default is supplied.

### Policy enums

| Enum | Values |
|---|---|
| `EmptyStringPolicy` | `Unset`, `Value` |
| `NumberParsing` | `Strict`, `Lenient` |
| `RangePolicy` | `Fallback`, `Clamp` |

The complete type surface is `EnvSource`, `EnvReaderConfig`,
`ResolvedEnvReaderConfig`, `EnvReader` and the three policy enums above.

[Back to top](#readme-top)

## Behavior

Defaults use fallback ranges and no optional-string trimming. Historical clamp
and trim behavior requires a configured reader:

| Situation | Default result |
|---|---|
| Unset or empty string | supplied default, else `undefined` |
| Whitespace-only string | preserved; `envOptionalString` does not trim |
| Non-integer for `envInt` (`42.5`) | supplied default, else `undefined` |
| Non-finite for `envFloat` (`Infinity`) | supplied default, else `undefined` |
| Outside `min`/`max` | supplied default (`RangePolicy.Fallback`) |
| Unknown enum value | supplied default, else `undefined` |
| `'true'`, `'1'` (any case) | `true` |
| `'false'`, `'0'` (any case) | `false` |
| Other boolean literal | supplied default, else `undefined` |

Switches cover injected sources, empty-string preservation, optional trimming,
strict vs lenient number parsing, fallback vs clamp ranges, custom boolean
literals/case and enum case. See the [behavior matrix](https://johanneslatzel.github.io/env/env/).

[Back to top](#readme-top)

## Troubleshooting

### A value is ignored

Check whether the variable is empty. By default an empty string is treated as
unset; use `EmptyStringPolicy.Value` to preserve it.

### `envInt` rejects `42.5`

Strict parsing requires an integer. Use `NumberParsing.Lenient` for a leading
numeric prefix.

### An out-of-range number becomes the default

That is `RangePolicy.Fallback`. Use `RangePolicy.Clamp` to return the nearest
bound instead.

### `envBool` rejects `yes`

The default literals are `true`/`1` and `false`/`0`. Supply custom
`booleanTrue` and `booleanFalse` lists for other vocabularies.

[Back to top](#readme-top)

## Support

- Bugs and feature requests: [GitHub Issues](https://github.com/johanneslatzel/env/issues)
- Questions and discussion: [GitHub Discussions](https://github.com/johanneslatzel/env/discussions)

[Back to top](#readme-top)

## Documentation

- [Overview](https://johanneslatzel.github.io/env/)
- [Architecture](https://johanneslatzel.github.io/env/architecture/)
- [API Reference](https://johanneslatzel.github.io/env/api-reference/)
- [Behavior](https://johanneslatzel.github.io/env/env/)
- [Quick Start](https://johanneslatzel.github.io/env/quickstart/)

Full documentation: **[johanneslatzel.github.io/env](https://johanneslatzel.github.io/env/)**

[Back to top](#readme-top)

## Development

```bash
git clone https://github.com/johanneslatzel/env.git
cd env
npm install
npm run verify
```

`npm run verify` runs the type check, lint, formatting, file-size and
documentation checks, and the test suite with 100% coverage thresholds.

[Back to top](#readme-top)

## Security

Report vulnerabilities privately through
[GitHub Security Advisories](https://github.com/johanneslatzel/env/security/advisories/new).
Do not open a public issue for a security problem.

## Maintainer

Johannes B. Latzel ([@johanneslatzel](https://github.com/johanneslatzel)).

## License

MIT © Johannes B. Latzel. See
[LICENSE](https://github.com/johanneslatzel/env/blob/main/LICENSE).

## Contributing

Issues and pull requests are welcome.

1. Fork the repository and create a feature branch.
2. Run `npm install`.
3. Make the change and add tests.
4. Run `npm run verify`.
5. Open a pull request.

Use conventional commit messages.

[Back to top](#readme-top)
