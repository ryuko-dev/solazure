// Permission system for SolaFire
import type { SystemUser } from "./azure"

export type UserRole = 'admin' | 'senior' | 'user'

export function canEditPage(role: UserRole): boolean {
  return role === 'admin' || role === 'senior'
}

export function canAccessTab(role: UserRole, tab: string): boolean {
  // All users can access all tabs for now
  return true
}

export function canLockPayroll(role: UserRole): boolean {
  return role === 'admin' || role === 'senior'
}
