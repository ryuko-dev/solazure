// Shared state management for SolaFire
import { getCurrentUser } from "./storage"

interface SharedMonthYear {
  month: number
  year: number
}

const SHARED_STATE_KEY = 'solafire_shared_state'

export function getSharedMonthYear(): SharedMonthYear {
  if (typeof window === 'undefined') return { month: new Date().getMonth(), year: new Date().getFullYear() }
  
  const stored = localStorage.getItem(SHARED_STATE_KEY)
  if (stored) {
    try {
      return JSON.parse(stored)
    } catch (error) {
      console.error('Failed to parse shared state:', error)
    }
  }
  
  // Default to current month/year
  const now = new Date()
  return { month: now.getMonth(), year: now.getFullYear() }
}

export function setSharedMonthYear(month: number, year: number): void {
  if (typeof window === 'undefined') return
  
  const state: SharedMonthYear = { month, year }
  localStorage.setItem(SHARED_STATE_KEY, JSON.stringify(state))
}
