//Taken from https://github.com/Microsoft/TypeScript/issues/12215#issuecomment-307871458
export type ObjOmit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>
export type ObjKeys<T> = Extract<keyof T, string | number>

//Examples
interface S {
    a: string
    b: number
    c: Symbol
}
type C = Omit<S, "a">

interface If {
    a: string
    c: object
    d: number
}

type NewIf = Omit<If, "c">

/** Utility function to create a K:V from a list of strings */
export const strEnum = <T extends string>(o: Array<T>): { [K in T]: K } =>
    o.reduce((res, key) => {
        res[key] = key;
        return res;
    }, Object.create(null))

const EnumExample = strEnum(["A", "B", "C"])
type enumKeys = keyof typeof EnumExample