// Enhanced storage with Azure 3-table structure
import { azureStorageEnhanced } from "./azure-enhanced"
import type { GlobalData, SystemUser } from "./azure"

// Local storage keys (fallback)
const STORAGE_KEYS = {
  CURRENT_USER: 'solafire_current_user',
  USER_DATA_PREFIX: 'solafire_user_data_',
  SYSTEM_USERS: 'solafire_system_users'
}

// User management (unchanged)
export function getCurrentUser(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem(STORAGE_KEYS.CURRENT_USER)
}

export function setCurrentUser(email: string): void {
  if (typeof window === 'undefined') return
  localStorage.setItem(STORAGE_KEYS.CURRENT_USER, email)
}

export function clearCurrentUser(): void {
  if (typeof window === 'undefined') return
  localStorage.removeItem(STORAGE_KEYS.CURRENT_USER)
}

// System user management
export async function getSystemUsers(): Promise<SystemUser[]> {
  // Try Azure API first, fallback to localStorage
  try {
    const response = await fetch('/api/azure/users')
    if (response.ok) {
      const users = await response.json()
      if (users.length > 0) {
        return users
      }
    }
  } catch (error) {
    console.log("Azure API not available, using localStorage")
  }

  // Fallback to localStorage
  const localUsers = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS)
  return localUsers ? JSON.parse(localUsers) : []
}

// User-specific data
export async function getCurrentUserData(): Promise<GlobalData> {
  return await getGlobalData()
}

// Enhanced main data operations

export async function getGlobalData(): Promise<GlobalData> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getGlobalData called`)
  
  // PRIORITY 1: Try Azure enhanced storage only (no fallback to legacy)
  try {
    console.log(`[${timestamp}] [Enhanced Storage] Trying Azure enhanced storage...`)
    console.log(`[${timestamp}] [Enhanced Storage] About to fetch /api/azure/enhanced/main`)
    // Add cache-busting to force fresh response
    const cacheBuster = Date.now()
    const response = await fetch(`/api/azure/enhanced/main?t=${cacheBuster}`)
    console.log(`[${timestamp}] [Enhanced Storage] Fetch response status:`, response.status, response.statusText)
    
    if (response.ok) {
      const azureData = await response.json()
      console.log(`[${timestamp}] [Enhanced Storage] Raw Azure enhanced storage response:`, azureData)
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage response:`, {
        projects: azureData.projects?.length || 0,
        users: azureData.users?.length || 0,
        allocations: azureData.allocations?.length || 0,
        positions: azureData.positions?.length || 0,
        entities: azureData.entities?.length || 0
      })
      
      // Always return enhanced storage data, even if empty
      console.log(`[${timestamp}] [Enhanced Storage] Using Azure enhanced storage`)
      return azureData
    } else {
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage returned non-ok status:`, response.status)
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage not available`)
    console.error(`[${timestamp}] [Enhanced Storage] Fetch error:`, error)
  }

  // PRIORITY 2: Final fallback to empty data (no legacy Azure, no localStorage)
  console.log(`[${timestamp}] [Enhanced Storage] Enhanced storage failed, returning empty data`)
  return {
    projects: [],
    users: [],
    allocations: [],
    positions: [],
    entities: [],
    expenses: [],
    scheduledRecords: []
  }
}

// Save only specific settings without overwriting other data
export async function updateUserSettings(settings: Partial<GlobalData>): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] updateUserSettings called with:`, settings)
  
  try {
    // First get current data
    const currentData = await getGlobalData()
    console.log(`[${timestamp}] [Enhanced Storage] Current data before setting:`, {
      projects: currentData.projects?.length || 0,
      users: currentData.users?.length || 0,
      startMonth: currentData.startMonth,
      startYear: currentData.startYear
    })
    
    // Merge settings with existing data
    const updatedData = {
      ...currentData,
      ...settings
    }
    
    console.log(`[${timestamp}] [Enhanced Storage] Updated data after setting:`, {
      projects: updatedData.projects?.length || 0,
      users: updatedData.users?.length || 0,
      startMonth: updatedData.startMonth,
      startYear: updatedData.startYear
    })
    
    // Save the merged data
    const clientLast = (currentData as any).lastModified || null
    const response = await fetch('/api/azure/enhanced/main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-save-caller': new Error().stack?.split('\n')[2]?.trim() || 'unknown',
        'x-client-lastmodified': clientLast || '',
        'x-bypass-concurrency': 'true', // Custom header to bypass concurrency checks
        'x-allow-deletions': 'true' // Allow empty arrays for deletions
      },
      body: JSON.stringify(updatedData),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] ✅ Settings saved successfully`)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`[${timestamp}] [Enhanced Storage] Failed to save settings:`, error)
    throw new Error('Unable to save user settings')
  }
}

export async function setCurrentUserData(data: Partial<GlobalData>): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] 🔴 setCurrentUserData called with:`, {
    projects: data.projects?.length || 0,
    users: data.users?.length || 0,
    allocations: data.allocations?.length || 0,
    positions: data.positions?.length || 0,
    entities: data.entities?.length || 0,
    caller: new Error().stack?.split('\n')[2]?.trim()
  })

  // USE ENHANCED AZURE STORAGE ONLY
  try {
    console.log(`[${timestamp}] [Enhanced Storage] Trying to save to Azure enhanced storage...`)
    // Fetch current server metadata to include client lastModified for optimistic checks
    let clientLast: string | null = null
    try {
      const currentServer = await getGlobalData()
      clientLast = (currentServer as any).lastModified || null
    } catch (e) {
      console.warn(`[${timestamp}] [Enhanced Storage] Failed to fetch server metadata for optimistic check:`, e)
    }

    const response = await fetch('/api/azure/enhanced/main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-save-caller': new Error().stack?.split('\n')[2]?.trim() || 'unknown',
        'x-client-lastmodified': '', // Skip optimistic concurrency for deletions
        'x-bypass-concurrency': 'true', // Custom header to bypass concurrency checks
        'x-allow-deletions': 'true' // Allow empty arrays for deletions
      },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] ✅ Data saved to Azure enhanced storage successfully`)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`[${timestamp}] [Enhanced Storage] Azure enhanced storage failed:`, error)
    throw new Error('Unable to save data to enhanced storage')
  }
}

// Monthly allocation operations
export async function getMonthlyAllocation(monthKey: string): Promise<any[]> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getMonthlyAllocation called for ${monthKey}`)
  
  // PRIORITY 1: Try Azure enhanced storage only
  try {
    const response = await fetch(`/api/azure/enhanced/monthly-allocation?monthKey=${monthKey}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation: ${data.items?.length || 0} items`)
      
      if (data.items && data.items.length > 0) {
        return data.items
      } else {
        console.log(`[${timestamp}] [Enhanced Storage] Azure returned empty data, returning empty array`)
        return []
      }
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation not available`)
  }

  // PRIORITY 2: Return empty array if Azure fails (no localStorage fallback)
  console.log(`[${timestamp}] [Enhanced Storage] Azure storage not available, returning empty array`)
  return []
}

export async function setMonthlyAllocation(monthKey: string, items: any[]): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] setMonthlyAllocation called for ${monthKey} with ${items.length} items`)
  
  // PRIORITY 1: Try Azure enhanced storage only
  try {
    const response = await fetch('/api/azure/enhanced/monthly-allocation', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monthKey, items }),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] Monthly allocation saved to Azure enhanced storage successfully`)
      return
    } else {
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation failed with status: ${response.status}`)
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation not available, data not saved:`, error)
    throw new Error('Unable to save monthly allocation to Azure storage')
  }
}

// Lock state operations
export async function getLockState(monthKey: string): Promise<boolean> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getLockState called for ${monthKey}`)
  
  // PRIORITY 1: Try Azure enhanced storage only
  try {
    const response = await fetch(`/api/azure/enhanced/lock-state?monthKey=${monthKey}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state: ${data.isLocked}`)
      return data.isLocked
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state not available`)
  }
  
  // PRIORITY 2: Default to unlocked if Azure fails (no localStorage fallback)
  console.log(`[${timestamp}] [Enhanced Storage] No lock state found in Azure, defaulting to unlocked`)
  return false
}

export async function setLockState(monthKey: string, isLocked: boolean, lockedBy?: string): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] setLockState called for ${monthKey}: ${isLocked}`)
  
  // PRIORITY 1: Try Azure enhanced storage only
  try {
    const response = await fetch('/api/azure/enhanced/lock-state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ monthKey, isLocked, lockedBy }),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] Lock state saved to Azure enhanced storage successfully`)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.error(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state not available, data not saved:`, error)
    throw new Error('Unable to save lock state to Azure storage')
  }
}

// --- Missing functions needed by allocation-grid.tsx ---
export async function getCurrentSystemUser(): Promise<any | null> {
  const currentUser = getCurrentUser()
  if (!currentUser) return null

  try {
    const systemUsers = await getSystemUsers()
    return systemUsers.find(u => u.email === currentUser && u.isActive) || null
  } catch (error) {
    console.log("Error getting current system user:", error)
    return null
  }
}

// Migration helper
export async function initializeEnhancedStorage(): Promise<void> {
  try {
    const response = await fetch('/api/azure/enhanced/init', { method: 'POST' })
    if (response.ok) {
      console.log("Enhanced Azure tables initialized successfully")
    } else {
      console.error("Failed to initialize enhanced Azure tables")
    }
  } catch (error) {
    console.error("Failed to initialize enhanced Azure tables:", error)
  }
}
