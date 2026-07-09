/**
 * 创建一个轻量级的 i18n 实例。
 *
 * @param options - 初始化参数，包括默认语言、资源、分隔符等。
 * @returns I18n 实例，提供翻译与监听能力。
 */
export declare function createI18n<const TResourcesMap extends ResourceMap>({ lang, resources, fallback, fallbackLanguages, separator, onMissing, }: I18nCreateOptions<TResourcesMap>): I18n<TResourcesMap>;

/** 深度只读类型，禁止资源对象在运行期被修改。 */
export declare type DeepReadonly<T> = {
    readonly [K in keyof T]: T[K] extends Record<string, unknown> ? DeepReadonly<T[K]> : T[K];
};

export declare interface I18n<TResourcesMap extends ResourceMap> {
    /**
     * 获取翻译文本。
     *
     * @param key - 翻译键，支持嵌套路径。
     * @param defaultValue - 可选的兜底文本，优先级高于全局 fallback。
     */
    $t(key: TranslationKey<TResourcesMap>, defaultValue?: string): string;
    /**
     * 判断某个键在当前或指定语言中是否存在。
     *
     * @param key - 待检查的翻译键。
     * @param lang - 可选指定语言，不传则按回退链查找。
     */
    has(key: TranslationKey<TResourcesMap>, lang?: LanguageKey<TResourcesMap>): boolean;
    /** 获取当前语言。 */
    getCurrentLanguage(): LanguageKey<TResourcesMap>;
    /**
     * 设置当前语言。
     *
     * @param lang - 目标语言，必须存在于 resources 中。
     */
    setCurrentLanguage(lang: LanguageKey<TResourcesMap>): void;
    /** 列出可用语言。 */
    getAvailableLanguages(): readonly LanguageKey<TResourcesMap>[];
    /** 读取回退语言链。 */
    getFallbackLanguages(): readonly LanguageKey<TResourcesMap>[];
    /**
     * 设置回退语言链。
     *
     * @param langs - 单个或多个语言，非法项会被过滤。
     */
    setFallbackLanguages(langs: LanguageKey<TResourcesMap> | readonly LanguageKey<TResourcesMap>[]): void;
    /**
     * 注册语言变更监听器。
     *
     * @param fn - 在语言变化时触发的回调。
     * @returns 取消订阅函数。
     */
    onLanguageChange(fn: (lang: LanguageKey<TResourcesMap>) => void): () => void;
}

export declare interface I18nCreateOptions<TResourcesMap extends ResourceMap> {
    /** 默认语言。 */
    lang: LanguageKey<TResourcesMap>;
    /** 语言资源。 */
    resources: TResourcesMap;
    /** 默认缺失文案。 */
    fallback?: string;
    /** 回退语言链。 */
    fallbackLanguages?: LanguageKey<TResourcesMap> | readonly LanguageKey<TResourcesMap>[];
    /** 键分隔符，默认为 "."。 */
    separator?: string;
    /** 缺失文案时的回调。 */
    onMissing?: (info: MissingTranslationInfo<LanguageKey<TResourcesMap>>) => void;
}

export declare type I18nLanguages<TResourcesMap extends ResourceMap> = LanguageKey<TResourcesMap>;

export declare type LanguageKey<TResourcesMap extends ResourceMap> = keyof TResourcesMap & string;

export declare interface MissingTranslationInfo<Lang extends string> {
    key: string;
    languagesTried: Lang[];
}

/** 计算资源对象的所有嵌套键。 */
export declare type NestedKeyOf<T, Depth extends number = 5> = [Depth] extends [never] ? never : T extends Record<string, unknown> ? {
    [K in Extract<keyof T, string>]: T[K] extends Record<string, unknown> ? `${K}.${NestedKeyOf<T[K], Prev[Depth]>}` | K : K;
}[Extract<keyof T, string>] : never;

/** 递归深度控制数组。 */
export declare type Prev = [never, 0, 1, 2, 3, 4, 5];

/** 语言资源映射：键为语言标识，值为任意层级的字典。 */
declare type ResourceMap = Record<string, Record<string, unknown>>;

export declare type TranslationKey<TResourcesMap extends ResourceMap> = NestedKeyOf<TResourcesMap[LanguageKey<TResourcesMap>]>;

export { }
