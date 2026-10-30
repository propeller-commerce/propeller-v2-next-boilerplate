// Extra CSP sources reCAPTCHA v3 needs; connect-src already allows https:.
export function recaptchaCspSources(enabled: boolean): { script: string; frame: string } {
  if (!enabled) return { script: '', frame: '' };
  return {
    script: ' https://www.google.com https://www.gstatic.com',
    frame: ' https://www.google.com',
  };
}
