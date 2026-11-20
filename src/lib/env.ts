/** Environment source accepted by a reader. */
export type EnvSource = Readonly<Record<string, string | undefined>>;

/** How an empty string is treated by the string helpers. */
export enum EmptyStringPolicy {
    Unset = 'unset',
    Value = 'value',
}

/** Number parsing strategy for integer and float helpers. */
export enum NumberParsing {
    Strict = 'strict',
    Lenient = 'lenient',
}

/** Behavior when a number is outside the configured range. */
export enum RangePolicy {
    Fallback = 'fallback',
    Clamp = 'clamp',
}

/** Configuration for {@link createEnvReader}. Every field has a default. */
export interface EnvReaderConfig {
    /** Environment source. Defaults to `process.env`. */
    readonly source?: EnvSource;
    /** Empty strings are unset (`unset`) or preserved (`value`). Default `unset`. */
    readonly emptyString?: EmptyStringPolicy;
    /** Trim optional strings before returning them. Default false. */
    readonly trimOptionalString?: boolean;
    /** Strict Number parsing or lenient leading-prefix parsing. Default `strict`. */
    readonly numberParsing?: NumberParsing;
    /** Fall back to the default or clamp out-of-range numbers. Default `fallback`. */
    readonly rangePolicy?: RangePolicy;
    /** Compare boolean literals case-sensitively. Default false. */
    readonly booleanCaseSensitive?: boolean;
    /** Literal strings recognized as true. Default `['true', '1']`. */
    readonly booleanTrue?: readonly string[];
    /** Literal strings recognized as false. Default `['false', '0']`. */
    readonly booleanFalse?: readonly string[];
    /** Compare enum values case-sensitively. Default true. */
    readonly enumCaseSensitive?: boolean;
}

/** Fully resolved configuration used by one reader. */
export interface ResolvedEnvReaderConfig {
    readonly source: EnvSource;
    readonly emptyString: EmptyStringPolicy;
    readonly trimOptionalString: boolean;
    readonly numberParsing: NumberParsing;
    readonly rangePolicy: RangePolicy;
    readonly booleanCaseSensitive: boolean;
    readonly booleanTrue: readonly string[];
    readonly booleanFalse: readonly string[];
    readonly enumCaseSensitive: boolean;
}

/** Baseline policies: fallback ranges and no optional-string trimming. */
export const DEFAULT_ENV_CONFIG: Readonly<Omit<ResolvedEnvReaderConfig, 'source'>> = Object.freeze({
    emptyString: EmptyStringPolicy.Unset,
    trimOptionalString: false,
    numberParsing: NumberParsing.Strict,
    rangePolicy: RangePolicy.Fallback,
    booleanCaseSensitive: false,
    booleanTrue: Object.freeze(['true', '1']),
    booleanFalse: Object.freeze(['false', '0']),
    enumCaseSensitive: true,
});

/** Reader created by {@link createEnvReader}. */
export interface EnvReader {
    /** Read a string, falling back to `defaultValue` when unset. */
    string(key: string, defaultValue: string): string;
    string(key: string, defaultValue?: string): string | undefined;
    /** Read an optional string. */
    optionalString(key: string): string | undefined;
    /** Read an integer with optional bounds. */
    int(key: string, defaultValue: number, min?: number, max?: number): number;
    int(key: string, defaultValue?: number, min?: number, max?: number): number | undefined;
    /** Read a finite float with optional bounds. */
    float(key: string, defaultValue: number, min?: number, max?: number): number;
    float(key: string, defaultValue?: number, min?: number, max?: number): number | undefined;
    /** Read an enum value constrained to `validValues`. */
    enum<T extends string>(key: string, validValues: readonly T[], defaultValue: T): T;
    enum<T extends string>(key: string, validValues: readonly T[], defaultValue?: T): T | undefined;
    /** Read a boolean from the configured literals. */
    bool(key: string, defaultValue: boolean): boolean;
    bool(key: string, defaultValue?: boolean): boolean | undefined;
}

const LENIENT_INTEGER_PATTERN = /^[+-]?\d+/;
const LENIENT_FLOAT_PATTERN = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?/;

function mergeConfig(config: EnvReaderConfig): ResolvedEnvReaderConfig {
    return {
        source: config.source ?? process.env,
        emptyString: config.emptyString ?? DEFAULT_ENV_CONFIG.emptyString,
        trimOptionalString: config.trimOptionalString ?? DEFAULT_ENV_CONFIG.trimOptionalString,
        numberParsing: config.numberParsing ?? DEFAULT_ENV_CONFIG.numberParsing,
        rangePolicy: config.rangePolicy ?? DEFAULT_ENV_CONFIG.rangePolicy,
        booleanCaseSensitive:
            config.booleanCaseSensitive ?? DEFAULT_ENV_CONFIG.booleanCaseSensitive,
        booleanTrue: config.booleanTrue ?? DEFAULT_ENV_CONFIG.booleanTrue,
        booleanFalse: config.booleanFalse ?? DEFAULT_ENV_CONFIG.booleanFalse,
        enumCaseSensitive: config.enumCaseSensitive ?? DEFAULT_ENV_CONFIG.enumCaseSensitive,
    };
}

function lenientNumber(raw: string, integer: boolean): number | undefined {
    const literal = raw
        .trimStart()
        .match(integer ? LENIENT_INTEGER_PATTERN : LENIENT_FLOAT_PATTERN)?.[0];
    return literal === undefined ? undefined : Number(literal);
}

function numberValue(
    raw: string | undefined,
    parsing: NumberParsing,
    integer: boolean,
): number | undefined {
    if (raw === undefined || raw === '') {
        return undefined;
    }
    const parsed = parsing === NumberParsing.Lenient ? lenientNumber(raw, integer) : Number(raw);
    if (parsed === undefined || !Number.isFinite(parsed)) {
        return undefined;
    }
    if (integer && !Number.isInteger(parsed)) {
        return undefined;
    }
    return parsed;
}

function inRange(value: number, min: number | undefined, max: number | undefined): boolean {
    return (min === undefined || value >= min) && (max === undefined || value <= max);
}

/** Create a reader with defaults merged over {@link DEFAULT_ENV_CONFIG}. */
export function createEnvReader(config: EnvReaderConfig = {}): EnvReader {
    const settings = mergeConfig(config);

    const readString = (key: string): string | undefined => {
        const value = settings.source[key];
        if (
            value === undefined ||
            (value === '' && settings.emptyString === EmptyStringPolicy.Unset)
        ) {
            return undefined;
        }
        return value;
    };

    const readNumber = (
        key: string,
        defaultValue: number | undefined,
        min: number | undefined,
        max: number | undefined,
        integer: boolean,
    ): number | undefined => {
        const parsed = numberValue(settings.source[key], settings.numberParsing, integer);
        if (parsed === undefined) {
            return defaultValue;
        }
        if (inRange(parsed, min, max)) {
            return parsed;
        }
        if (settings.rangePolicy === RangePolicy.Clamp) {
            const lower = min ?? Number.NEGATIVE_INFINITY;
            const upper = max ?? Number.POSITIVE_INFINITY;
            return Math.min(Math.max(parsed, lower), upper);
        }
        return defaultValue;
    };

    function string(key: string, defaultValue: string): string;
    function string(key: string, defaultValue?: string): string | undefined;
    function string(key: string, defaultValue?: string): string | undefined {
        return readString(key) ?? defaultValue;
    }

    const optionalString = (key: string): string | undefined => {
        let value = readString(key);
        if (value !== undefined && settings.trimOptionalString) {
            value = value.trim();
            if (value === '' && settings.emptyString === EmptyStringPolicy.Unset) {
                return undefined;
            }
        }
        return value;
    };

    function int(key: string, defaultValue: number, min?: number, max?: number): number;
    function int(
        key: string,
        defaultValue?: number,
        min?: number,
        max?: number,
    ): number | undefined;
    function int(
        key: string,
        defaultValue?: number,
        min?: number,
        max?: number,
    ): number | undefined {
        return readNumber(key, defaultValue, min, max, true);
    }

    function float(key: string, defaultValue: number, min?: number, max?: number): number;
    function float(
        key: string,
        defaultValue?: number,
        min?: number,
        max?: number,
    ): number | undefined;
    function float(
        key: string,
        defaultValue?: number,
        min?: number,
        max?: number,
    ): number | undefined {
        return readNumber(key, defaultValue, min, max, false);
    }

    function enumReader<T extends string>(
        key: string,
        validValues: readonly T[],
        defaultValue: T,
    ): T;
    function enumReader<T extends string>(
        key: string,
        validValues: readonly T[],
        defaultValue?: T,
    ): T | undefined;
    function enumReader<T extends string>(
        key: string,
        validValues: readonly T[],
        defaultValue?: T,
    ): T | undefined {
        const value = readString(key);
        if (value === undefined) {
            return defaultValue;
        }
        if (settings.enumCaseSensitive) {
            return validValues.find((candidate) => candidate === value) ?? defaultValue;
        }
        const lowered = value.toLowerCase();
        return validValues.find((candidate) => candidate.toLowerCase() === lowered) ?? defaultValue;
    }

    function bool(key: string, defaultValue: boolean): boolean;
    function bool(key: string, defaultValue?: boolean): boolean | undefined;
    function bool(key: string, defaultValue?: boolean): boolean | undefined {
        const value = readString(key);
        if (value === undefined) {
            return defaultValue;
        }
        const candidate = settings.booleanCaseSensitive ? value : value.toLowerCase();
        const matches = (literals: readonly string[]): boolean =>
            literals.some((literal) =>
                settings.booleanCaseSensitive
                    ? literal === candidate
                    : literal.toLowerCase() === candidate,
            );
        if (matches(settings.booleanTrue)) {
            return true;
        }
        if (matches(settings.booleanFalse)) {
            return false;
        }
        return defaultValue;
    }

    return { string, optionalString, int, float, enum: enumReader, bool };
}

const defaultReader = createEnvReader();

/** Read a string, falling back to `defaultValue` when unset. */
export function envString(key: string, defaultValue: string): string;
export function envString(key: string, defaultValue?: string): string | undefined;
export function envString(key: string, defaultValue?: string): string | undefined {
    return defaultReader.string(key, defaultValue);
}

/** Read an optional string. */
export function envOptionalString(key: string): string | undefined {
    return defaultReader.optionalString(key);
}

/** Read an integer with optional bounds. */
export function envInt(key: string, defaultValue: number, min?: number, max?: number): number;
export function envInt(
    key: string,
    defaultValue?: number,
    min?: number,
    max?: number,
): number | undefined;
export function envInt(
    key: string,
    defaultValue?: number,
    min?: number,
    max?: number,
): number | undefined {
    return defaultReader.int(key, defaultValue, min, max);
}

/** Read a finite float with optional bounds. */
export function envFloat(key: string, defaultValue: number, min?: number, max?: number): number;
export function envFloat(
    key: string,
    defaultValue?: number,
    min?: number,
    max?: number,
): number | undefined;
export function envFloat(
    key: string,
    defaultValue?: number,
    min?: number,
    max?: number,
): number | undefined {
    return defaultReader.float(key, defaultValue, min, max);
}

/** Read an enum value constrained to `validValues`. */
export function envEnum<T extends string>(
    key: string,
    validValues: readonly T[],
    defaultValue: T,
): T;
export function envEnum<T extends string>(
    key: string,
    validValues: readonly T[],
    defaultValue?: T,
): T | undefined;
export function envEnum<T extends string>(
    key: string,
    validValues: readonly T[],
    defaultValue?: T,
): T | undefined {
    return defaultReader.enum(key, validValues, defaultValue);
}

/** Read a boolean from the default true/false literals. */
export function envBool(key: string, defaultValue: boolean): boolean;
export function envBool(key: string, defaultValue?: boolean): boolean | undefined;
export function envBool(key: string, defaultValue?: boolean): boolean | undefined {
    return defaultReader.bool(key, defaultValue);
}
