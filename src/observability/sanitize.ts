const REDACT_PATTERNS = [
  /authorization/i,
  /^cookie$/i,
  /set-cookie/i,
  /secret/i,
  /token/i,
  /api[-_ ]?key/i,
  /sessionsecret/i,
  /clientsecret/i,
];

export function isRedactedKey(key: string): boolean {
  return REDACT_PATTERNS.some((re) => re.test(key));
}

/** Return a copy of attrs with secret values replaced by "[Redacted]". */
export function sanitizeAttributes(attrs: Record<string, unknown> = {}): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(attrs)) {
    out[k] = isRedactedKey(k) ? "[Redacted]" : v;
  }
  return out;
}
