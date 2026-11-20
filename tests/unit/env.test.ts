import { beforeEach, describe, expect, expectTypeOf, it } from 'vitest';
import {
    DEFAULT_ENV_CONFIG,
    EmptyStringPolicy,
    NumberParsing,
    RangePolicy,
    createEnvReader,
    envBool,
    envEnum,
    envFloat,
    envInt,
    envOptionalString,
    envString,
} from '../../src/index.js';

const source = (values: Record<string, string | undefined>) => values;

beforeEach(() => {
    delete process.env.TEST_KEY;
    delete process.env.TEST_EMPTY;
    delete process.env.TEST_INT;
    delete process.env.TEST_FLOAT;
    delete process.env.TEST_BOOL;
});

describe('default env helpers', () => {
    it('reads strings and treats empty as unset without trimming', () => {
        process.env.TEST_KEY = ' hello ';
        process.env.TEST_EMPTY = '';
        expect(envString('TEST_KEY')).toBe(' hello ');
        expect(envString('TEST_EMPTY', 'fallback')).toBe('fallback');
        expect(envString('TEST_MISSING')).toBeUndefined();
        expect(envOptionalString('TEST_KEY')).toBe(' hello ');
        expect(envOptionalString('TEST_EMPTY')).toBeUndefined();
    });

    it('reads strict integers and floats with fallback bounds', () => {
        process.env.TEST_INT = '42';
        process.env.TEST_FLOAT = '3.14';
        expect(envInt('TEST_INT')).toBe(42);
        expect(envInt('TEST_INT', 1, 10, 50)).toBe(42);
        expect(envInt('TEST_INT', 1, 50, 100)).toBe(1);
        expect(envInt('TEST_INT', 1, 0, 10)).toBe(1);
        process.env.TEST_INT = '42.5';
        expect(envInt('TEST_INT', 0)).toBe(0);
        process.env.TEST_INT = 'not-a-number';
        expect(envInt('TEST_INT', 0)).toBe(0);
        process.env.TEST_INT = '';
        expect(envInt('TEST_INT', 9)).toBe(9);
        expect(envInt('TEST_MISSING')).toBeUndefined();
        expect(envFloat('TEST_FLOAT')).toBe(3.14);
        process.env.TEST_FLOAT = 'Infinity';
        expect(envFloat('TEST_FLOAT', 0)).toBe(0);
        expect(envFloat('TEST_MISSING', 1.5)).toBe(1.5);
    });

    it('reads enums case-sensitively and booleans from default literals', () => {
        process.env.TEST_KEY = 'a';
        process.env.TEST_BOOL = 'TRUE';
        expect(envEnum('TEST_KEY', ['a', 'b'] as const)).toBe('a');
        process.env.TEST_KEY = 'A';
        expect(envEnum('TEST_KEY', ['a', 'b'] as const, 'b')).toBe('b');
        expect(envEnum('TEST_MISSING', ['a'] as const)).toBeUndefined();
        expect(envBool('TEST_BOOL')).toBe(true);
        process.env.TEST_BOOL = '0';
        expect(envBool('TEST_BOOL')).toBe(false);
        process.env.TEST_BOOL = 'yes';
        expect(envBool('TEST_BOOL', false)).toBe(false);
        expect(envBool('TEST_MISSING')).toBeUndefined();
    });

    it('narrows results when a default is supplied', () => {
        expectTypeOf(envBool('TEST_MISSING', false)).toEqualTypeOf<boolean>();
        expectTypeOf(envInt('TEST_MISSING', 0)).toEqualTypeOf<number>();
        expectTypeOf(envFloat('TEST_MISSING', 0)).toEqualTypeOf<number>();
        expectTypeOf(envString('TEST_MISSING', 'x')).toEqualTypeOf<string>();
        expectTypeOf(envEnum('TEST_MISSING', ['a', 'b'] as const, 'a')).toEqualTypeOf<'a' | 'b'>();

        const reader = createEnvReader({ source: source({}) });
        expectTypeOf(reader.bool('MISSING', false)).toEqualTypeOf<boolean>();
        expectTypeOf(reader.int('MISSING', 0)).toEqualTypeOf<number>();
        expectTypeOf(reader.float('MISSING', 0)).toEqualTypeOf<number>();
        expectTypeOf(reader.string('MISSING', 'x')).toEqualTypeOf<string>();
        expectTypeOf(reader.enum('MISSING', ['a', 'b'] as const, 'a')).toEqualTypeOf<'a' | 'b'>();
    });
});

describe('createEnvReader', () => {
    it('merges partial config over frozen defaults without mutating them', () => {
        expect(Object.isFrozen(DEFAULT_ENV_CONFIG)).toBe(true);
        const reader = createEnvReader({
            source: source({}),
            rangePolicy: RangePolicy.Clamp,
        });
        expect(DEFAULT_ENV_CONFIG.rangePolicy).toBe(RangePolicy.Fallback);
        expect(reader.int('MISSING', 1)).toBe(1);
    });

    it('keeps baseline fallback and no-trim behavior separate from configured policies', () => {
        const baseline = createEnvReader({ source: source({ LOW: '0', SPACE: '  x  ' }) });
        expect(baseline.int('LOW', 3, 5)).toBe(3);
        expect(baseline.optionalString('SPACE')).toBe('  x  ');
        const historical = createEnvReader({
            source: source({ LOW: '0', SPACE: '  x  ' }),
            rangePolicy: RangePolicy.Clamp,
            trimOptionalString: true,
        });
        expect(historical.int('LOW', 3, 5)).toBe(5);
        expect(historical.optionalString('SPACE')).toBe('x');
    });

    it('supports empty-string and trimming policies', () => {
        const preserved = createEnvReader({
            source: source({ EMPTY: '', SPACE: '  ' }),
            emptyString: EmptyStringPolicy.Value,
        });
        expect(preserved.string('EMPTY', 'x')).toBe('');
        expect(preserved.optionalString('EMPTY')).toBe('');
        const trimmed = createEnvReader({
            source: source({ SPACE: '  x  ', BLANK: '   ', EMPTY: '' }),
            trimOptionalString: true,
        });
        expect(trimmed.optionalString('SPACE')).toBe('x');
        expect(trimmed.optionalString('EMPTY')).toBeUndefined();
        expect(trimmed.optionalString('BLANK')).toBeUndefined();
        expect(trimmed.optionalString('MISSING')).toBeUndefined();
        const trimmedPreserved = createEnvReader({
            source: source({ BLANK: '   ' }),
            trimOptionalString: true,
            emptyString: EmptyStringPolicy.Value,
        });
        expect(trimmedPreserved.optionalString('BLANK')).toBe('');
    });

    it('supports lenient numbers and clamped ranges', () => {
        const reader = createEnvReader({
            source: source({ INT: '42abc', FLOAT: '3.14xyz', LOW: '-5', HIGH: '200' }),
            numberParsing: NumberParsing.Lenient,
            rangePolicy: RangePolicy.Clamp,
        });
        expect(reader.int('INT')).toBe(42);
        expect(reader.float('FLOAT')).toBe(3.14);
        expect(reader.int('LOW', 0, 1, 10)).toBe(1);
        expect(reader.int('HIGH', 0, 1, 10)).toBe(10);
        expect(reader.int('HIGH', 0, undefined, 10)).toBe(10);
        expect(reader.int('LOW', 0, 1)).toBe(1);
        expect(reader.int('INT', 0, 100, 200)).toBe(100);
        expect(reader.float('HIGH', 0, 0, 10)).toBe(10);
        expect(reader.int('MISSING', 5, 1, 10)).toBe(5);
        expect(reader.float('MISSING', 5, 1, 10)).toBe(5);
    });

    it('parses leading numeric prefixes in lenient mode', () => {
        const reader = createEnvReader({
            source: source({ PADDED: ' 42', NONE: 'abc', HEX: '0x10' }),
            numberParsing: NumberParsing.Lenient,
        });
        expect(reader.int('PADDED')).toBe(42);
        expect(reader.int('NONE', 7)).toBe(7);
        expect(reader.float('NONE', 1.5)).toBe(1.5);
        expect(reader.int('HEX')).toBe(0);
    });

    it('supports case-insensitive enums and booleans', () => {
        const reader = createEnvReader({
            source: source({ ENUM: 'B', BOOL: 'Yes', OTHER: 'maybe' }),
            enumCaseSensitive: false,
            booleanCaseSensitive: false,
            booleanTrue: ['yes'],
            booleanFalse: ['no'],
        });
        expect(reader.enum('ENUM', ['a', 'b'] as const)).toBe('b');
        expect(reader.enum('ENUM', ['a', 'c'] as const, 'c')).toBe('c');
        expect(reader.bool('BOOL')).toBe(true);
        expect(reader.bool('OTHER', false)).toBe(false);
        expect(reader.bool('MISSING', true)).toBe(true);
    });

    it('supports case-sensitive booleans and custom literals', () => {
        const reader = createEnvReader({
            source: source({ UPPER: 'TRUE', LOWER: 'true' }),
            booleanCaseSensitive: true,
        });
        expect(reader.bool('UPPER', false)).toBe(false);
        expect(reader.bool('LOWER')).toBe(true);
        const custom = createEnvReader({
            source: source({ ON: 'on', OFF: 'off' }),
            booleanTrue: ['on'],
            booleanFalse: ['off'],
        });
        expect(custom.bool('ON')).toBe(true);
        expect(custom.bool('OFF')).toBe(false);
    });

    it('uses process.env when no source is configured', () => {
        process.env.TEST_KEY = 'from-process';
        const reader = createEnvReader();
        expect(reader.string('TEST_KEY', 'x')).toBe('from-process');
    });
});
