import type { Audit } from '../types'

export function filterAuditsByOwner(audits: Audit[], ownerEmail: string): Audit[] {
  const normalizedOwnerEmail = ownerEmail.trim().toLowerCase()
  return audits.filter(a => a.authorEmail.trim().toLowerCase() === normalizedOwnerEmail)
}
