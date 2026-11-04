import { z } from 'zod';
export const totpSchema=z.strictObject({code:z.string().regex(/^\d{6}$/,'Enter the six-digit authenticator code.')});

export function mfaQrUrl(qr:string):string {
  // auth-js prefixes the raw SVG returned by GoTrue. Encode the markup once;
  // encoding the entire prefixed URI produces a broken image.
  const svg=qr.replace(/^data:image\/svg\+xml;utf-8,/,'');
  if(!svg.trimStart().startsWith('<svg'))throw new Error('Authenticator image unavailable.');
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}
