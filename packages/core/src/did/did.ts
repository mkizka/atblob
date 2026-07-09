export type Did = `did:${string}:${string}`;

const DID_PATTERN = /^did:(plc|web):[a-zA-Z0-9._:%-]+$/;

export const isDid = (value: string): value is Did => DID_PATTERN.test(value);
