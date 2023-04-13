const checkers = {
    "number": (r: unknown): r is number => typeof r === "number",
    "string": (r: unknown): r is string => typeof r === "string",
    "boolean": (r: unknown): r is boolean => typeof r === "boolean",
}

type CheckFirstArgType<F> = F extends (r: any) => r is infer Z ? Z : never


type TypeMap = { [K in keyof typeof checkers]: CheckFirstArgType<(typeof checkers)[K]> }

type DeepMap =
    | Extract<keyof typeof checkers, string>
    | `${Extract<keyof typeof checkers, string>}?`
    | { [key: string]: (keyof typeof checkers)|DeepMap }
    | readonly (string|number|boolean)[]

export type DataForm<T extends DeepMap> =
    T extends keyof TypeMap ? TypeMap[T] :
    T extends readonly (infer S)[] ? S :
    T extends `${infer K}?` ? (K extends keyof TypeMap ? TypeMap[K]: never) :
    & { [K in ({[KK in keyof T]: T[KK] extends `${string}?` ? KK : never}[keyof T])]?: T[K] extends DeepMap ? DataForm<T[K]> : never }
    & { [K in ({[KK in keyof T]: T[KK] extends keyof TypeMap ? KK : never}[keyof T])]: T[K] extends DeepMap ? DataForm<T[K]> : never }
    & { [K in ({[KK in keyof T]: T[KK] extends string ? never : KK }[keyof T])]: T[K] extends DeepMap ? DataForm<T[K]> : never }

export function checkForm<T extends DeepMap>(form: T, data: unknown): data is DataForm<T> {
    if (Array.isArray(form)) return form.includes(data as any);
    if (typeof form === "string") {
        if (form.endsWith("?") && data === undefined) return true;
        const cutForm = form.replaceAll("?", "");
        if (cutForm in checkers) return checkers[cutForm as keyof typeof checkers](data);
    }
    if (typeof form === "object" && data && typeof data === "object") {
        for (let formKey in form) {
            const formElement = form[formKey] as any;
            if (typeof formElement === "string" && formElement.endsWith("?") && !(formKey in data)) continue;
            if (!checkForm(form[formKey] as any, data[formKey as never])) return false;
        }
        return true;
    }
    return false;
}

export function parseJsonForm<T extends DeepMap>(form: T, json: string): DataForm<T> {
	const data = JSON.parse(json);
	if (checkForm(form, data)) return data;
	throw new Error("wrong data format. Expected: "+JSON.stringify(form));
}
