// No-op stub — implementação completa na Story 5.5 (tabela audit_logs)
export async function logAuditEvent(
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  try {
    console.log('[audit]', eventType, payload)
  } catch {
    // never throw — auditoria não bloqueia fluxo principal
  }
}
