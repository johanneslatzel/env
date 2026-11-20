# Quick Start

## Install

```bash
npm install @johannes.latzel/env
```

## Use the Default Helpers

```ts
import { envBool, envEnum, envFloat, envInt, envOptionalString } from '@johannes.latzel/env';

const port = envInt('PORT', 3000, 1, 65535);
const retries = envInt('RETRIES', 3);
const ratio = envFloat('RATIO', 0.5, 0, 1);
const token = envOptionalString('MCP_TOKEN');
const level = envEnum('LOG_LEVEL', ['debug', 'info', 'error'] as const, 'info');
const verbose = envBool('VERBOSE', false);
```

## Inject a Source or Change Policies

```ts
import { RangePolicy, createEnvReader } from '@johannes.latzel/env';

const reader = createEnvReader({
    source: { LEVEL: 'DEBUG', LIMIT: '500' },
    enumCaseSensitive: false,
    rangePolicy: RangePolicy.Clamp,
});

const level = reader.enum('LEVEL', ['debug', 'info'] as const, 'info'); // 'debug'
const limit = reader.int('LIMIT', 10, 1, 100); // 100
```

The package does not read `.env` files. Export variables in the shell, or load them with the runtime before creating a reader.

## Full API

See [API Reference](api-reference.md).
