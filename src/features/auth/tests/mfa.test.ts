import { describe,expect,it } from 'vitest';
import { mfaQrUrl,totpSchema } from '../api/mfa';
describe('authenticator setup',()=>{
  it('handles the installed auth-js SVG data-URI response without double prefixing',()=>{
    const svg='<svg xmlns="http://www.w3.org/2000/svg"><path fill="#000"/></svg>';
    const url=mfaQrUrl(`data:image/svg+xml;utf-8,${svg}`);
    expect(decodeURIComponent(url.split(',')[1]!)).toBe(svg);
    expect(mfaQrUrl(svg)).toBe(url);
  });
  it('rejects remote QR sources and malformed codes',()=>{
    expect(()=>mfaQrUrl('https://outside.test/qr.svg')).toThrow();
    expect(totpSchema.safeParse({code:'123456'}).success).toBe(true);
    expect(totpSchema.safeParse({code:'12345a'}).success).toBe(false);
    expect(totpSchema.safeParse({code:'123456',factor:'untrusted'}).success).toBe(false);
  });
});
