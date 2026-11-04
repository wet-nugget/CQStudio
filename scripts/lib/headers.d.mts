export interface HeaderGroup { source: string; headers: { key: string; value: string }[] }
export declare function appHeaders(env: Record<string, string | undefined>): { rewrites: { source: string; destination: string }[]; headers: HeaderGroup[] };
