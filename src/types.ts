export type CustomType<T, T1, T2 = "", T3 = ""> = T & _I_TYPE<T1, T2, T3>
export declare class _I_TYPE<T1, T2, T3> { #_T1: T1; #_T2: T2; #_T3: T3}
