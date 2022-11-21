import Buffer from "buffer";

type JSONValue =
    | string
    | number
    | boolean
    | { [x: string]: JSONValue }
    | Array<JSONValue>;

export type PackageArg = JSONValue | Buffer | undefined;
