function fallbackUuid() {
  return `${Date.now().toString(16)}_${Math.random().toString(16).slice(2)}`
}

export function newPhotoBookId(prefix: string) {
  // CRA runs in the browser; crypto.randomUUID may not exist in older runtimes.
  const cryptoObj = (globalThis as any).crypto as { randomUUID?: () => string } | undefined
  const uuid = cryptoObj?.randomUUID?.() ?? fallbackUuid()
  return `${prefix}_${uuid}`
}

