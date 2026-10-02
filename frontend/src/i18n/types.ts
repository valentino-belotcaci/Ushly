export type TranslationShape<T> = T extends string
  ? string
  : T extends readonly (infer Item)[]
    ? readonly TranslationShape<Item>[]
    : T extends object
      ? { readonly [Key in keyof T]: TranslationShape<T[Key]> }
      : T;
