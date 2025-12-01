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
// Initialize with demo data if needed
export async function initializeDemoData(): Promise<void> {
  const systemUsers = await getSystemUsers()
  
  if (systemUsers.length === 0) {
    // Create demo admin user
    const demoUsers: SystemUser[] = [
      {
        id: "1",
        email: "admin@sola.com",
        name: "Admin User",
        password: "admin123", // In production, this should be hashed
        role: "admin",
        isActive: true,
        createdAt: new Date().toISOString()
      }
    ]

    try {
      const response = await fetch('/api/azure/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(demoUsers)
      })
      
      if (response.ok) {
        console.log("Demo data saved to Azure")
      }
    } catch (error) {
      console.log("Azure API not available, using localStorage")
    }
    
    localStorage.setItem(STORAGE_KEYS.SYSTEM_USERS, JSON.stringify(demoUsers))
    console.log("Demo data initialized")
  }
}

export async function getGlobalData(): Promise<GlobalData> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getGlobalData called`)
  
  // PRIORITY 1: Check localStorage first for payroll data preservation
  const currentUser = getCurrentUser()
  if (currentUser) {
    const userDataKey = STORAGE_KEYS.USER_DATA_PREFIX + currentUser
    const userData = localStorage.getItem(userDataKey)
    if (userData) {
      try {
        const parsedData = JSON.parse(userData)
        // Use localStorage data if it contains any meaningful data (projects, users, allocations, or positions)
        const hasData = (parsedData.projects?.length > 0) || 
                       (parsedData.users?.length > 0) || 
                       (parsedData.allocations?.length > 0) || 
                       (parsedData.positions?.length > 0) ||
                       (parsedData.entities?.length > 0)
        
        if (hasData) {
          console.log(`[${timestamp}] [Enhanced Storage] Using localStorage data (priority for payroll)`, {
            projects: parsedData.projects?.length || 0,
            users: parsedData.users?.length || 0,
            allocations: parsedData.allocations?.length || 0,
            positions: parsedData.positions?.length || 0,
            entities: parsedData.entities?.length || 0
          })
          return parsedData
        }
      } catch (error) {
        console.error(`[${timestamp}] [Enhanced Storage] Error parsing localStorage data:`, error)
      }
    }
  }
  
  // PRIORITY 2: Try Azure enhanced storage
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
      console.log(`[${timestamp}] [Enhanced Storage] Detailed response check:`, {
        responseType: typeof azureData,
        hasProjects: !!azureData.projects,
        projectsType: typeof azureData.projects,
        projectsLength: azureData.projects?.length,
        hasUsers: !!azureData.users,
        usersType: typeof azureData.users,
        usersLength: azureData.users?.length,
        projectsArray: Array.isArray(azureData.projects),
        usersArray: Array.isArray(azureData.users),
        allKeys: Object.keys(azureData),
        projectsValue: azureData.projects,
        usersValue: azureData.users,
        hasTimestamp: !!azureData._apiTimestamp
      })
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage response:`, {
        projects: azureData.projects?.length || 0,
        users: azureData.users?.length || 0,
        allocations: azureData.allocations?.length || 0,
        positions: azureData.positions?.length || 0,
        entities: azureData.entities?.length || 0
      })
      
      // Check if our API changes are being applied (has timestamp field)
      if (azureData._apiTimestamp) {
        console.log(`[${timestamp}] [Enhanced Storage] API changes are being applied, using enhanced storage`)
        return azureData
      }
      
      if (azureData.projects?.length > 0 || azureData.users?.length > 0) {
        console.log(`[${timestamp}] [Enhanced Storage] Using Azure enhanced storage`)
        return azureData
      } else {
        console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage returned empty data, falling back to legacy`)
      }
    } else {
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage returned non-ok status:`, response.status)
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage not available, trying legacy...`)
    console.error(`[${timestamp}] [Enhanced Storage] Fetch error:`, error)
  }

  // PRIORITY 3: Fallback to legacy Azure storage
  try {
    console.log(`[${timestamp}] [Enhanced Storage] Trying legacy Azure storage...`)
    const response = await fetch('/api/azure/data')
    if (response.ok) {
      const azureData = await response.json()
      if (azureData.projects?.length > 0 || azureData.users?.length > 0) {
        console.log(`[${timestamp}] [Enhanced Storage] Using legacy Azure storage`)
        return azureData
      }
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Legacy Azure storage not available, using localStorage`)
  }

  // PRIORITY 4: Final fallback to empty data
  console.log(`[${timestamp}] [Enhanced Storage] All storage methods failed, returning empty data`)
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

export async function setCurrentUserData(data: Partial<GlobalData>): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] setCurrentUserData called with:`, {
    projects: data.projects?.length || 0,
    users: data.users?.length || 0,
    allocations: data.allocations?.length || 0,
    positions: data.positions?.length || 0,
    entities: data.entities?.length || 0
  })

  // PRIORITY 1: Always save to localStorage first (primary backup for payroll data)
  const currentUser = getCurrentUser()
  if (currentUser) {
    const existingData = await getCurrentUserData()
    const finalData = { ...existingData, ...data }
    
    localStorage.setItem(STORAGE_KEYS.USER_DATA_PREFIX + currentUser, JSON.stringify(finalData))
    console.log(`[${timestamp}] [Enhanced Storage] Data saved to localStorage as primary backup`)
  }

  // PRIORITY 2: Try Azure enhanced storage
  try {
    console.log(`[${timestamp}] [Enhanced Storage] Trying to save to Azure enhanced storage...`)
    const response = await fetch('/api/azure/enhanced/main', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] Data saved to Azure enhanced storage successfully`)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced storage not available, trying legacy...`)
  }

  // PRIORITY 3: Fallback to legacy Azure storage
  try {
    const response = await fetch('/api/azure/data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(data),
    })

    if (response.ok) {
      console.log(`[${timestamp}] [Enhanced Storage] Data saved to legacy Azure storage successfully`)
      return
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure storage not available, data already saved to localStorage`)
  }
}

// Monthly allocation operations
export async function getMonthlyAllocation(monthKey: string): Promise<any[]> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getMonthlyAllocation called for ${monthKey}`)
  
  // Try Azure enhanced storage first
  try {
    const response = await fetch(`/api/azure/enhanced/monthly-allocation?monthKey=${monthKey}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation: ${data.items?.length || 0} items`)
      
      // If Azure has data, return it. If empty, fall back to localStorage
      if (data.items && data.items.length > 0) {
        return data.items
      } else {
        console.log(`[${timestamp}] [Enhanced Storage] Azure returned empty data, falling back to localStorage`)
      }
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation not available, using localStorage`)
  }

  // Fallback to localStorage
  const localData = localStorage.getItem(`sola-global-monthly-allocation-${monthKey}`)
  console.log(`[${timestamp}] [Enhanced Storage] localStorage lookup for key: sola-global-monthly-allocation-${monthKey}`)
  console.log(`[${timestamp}] [Enhanced Storage] localStorage data found:`, !!localData)
  if (localData) {
    try {
      const parsedData = JSON.parse(localData)
      console.log(`[${timestamp}] [Enhanced Storage] localStorage parsed data:`, parsedData)
      console.log(`[${timestamp}] [Enhanced Storage] localStorage data length:`, parsedData?.length || 0)
      return parsedData
    } catch (error) {
      console.error(`[${timestamp}] [Enhanced Storage] Error parsing localStorage data:`, error)
      return []
    }
  }
  console.log(`[${timestamp}] [Enhanced Storage] No localStorage data found, returning empty array`)
  return []
}

export async function setMonthlyAllocation(monthKey: string, items: any[]): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] setMonthlyAllocation called for ${monthKey} with ${items.length} items`)
  
  // Try Azure enhanced storage first
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
    } else {
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation failed with status: ${response.status}`)
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced monthly allocation not available, using localStorage`)
  }

  // Always save to localStorage as backup (even if Azure succeeds)
  localStorage.setItem(`sola-global-monthly-allocation-${monthKey}`, JSON.stringify(items))
  console.log(`[${timestamp}] [Enhanced Storage] Monthly allocation saved to localStorage as backup (${items.length} items)`)
}

// Lock state operations
export async function getLockState(monthKey: string): Promise<boolean> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] getLockState called for ${monthKey}`)
  
  // PRIORITY 1: Check localStorage first
  const localData = localStorage.getItem(`sola-lock-state-${monthKey}`)
  if (localData !== null) {
    console.log(`[${timestamp}] [Enhanced Storage] Using localStorage lock state: ${localData === 'true'}`)
    return localData === 'true'
  }
  
  // PRIORITY 2: Try Azure enhanced storage
  try {
    const response = await fetch(`/api/azure/enhanced/lock-state?monthKey=${monthKey}`)
    if (response.ok) {
      const data = await response.json()
      console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state: ${data.isLocked}`)
      // Also save to localStorage for persistence
      localStorage.setItem(`sola-lock-state-${monthKey}`, data.isLocked.toString())
      return data.isLocked
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state not available, using localStorage`)
  }

  // PRIORITY 3: Default to unlocked
  console.log(`[${timestamp}] [Enhanced Storage] No lock state found, defaulting to unlocked`)
  return false
}

export async function setLockState(monthKey: string, isLocked: boolean, lockedBy?: string): Promise<void> {
  const timestamp = new Date().toISOString()
  console.log(`[${timestamp}] [Enhanced Storage] setLockState called for ${monthKey}: ${isLocked}`)
  
  // PRIORITY 1: Always save to localStorage first
  localStorage.setItem(`sola-lock-state-${monthKey}`, isLocked.toString())
  console.log(`[${timestamp}] [Enhanced Storage] Lock state saved to localStorage as primary`)
  
  // PRIORITY 2: Try Azure enhanced storage
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
    }
  } catch (error) {
    console.log(`[${timestamp}] [Enhanced Storage] Azure enhanced lock state not available, data already saved to localStorage`)
  }
}

// System user management (unchanged)
export async function getCurrentSystemUser(): Promise<SystemUser | null> {
  const currentUser = getCurrentUser()
  if (!currentUser) return null

  // Try Azure API first, fallback to localStorage
  try {
    const systemUsers = await getSystemUsers()
    return systemUsers.find(u => u.email === currentUser && u.isActive) || null
  } catch (error) {
    console.log("Azure API not available, using localStorage")
  }

  // Fallback to localStorage
  const localUsers = localStorage.getItem(STORAGE_KEYS.SYSTEM_USERS)
  const users: SystemUser[] = localUsers ? JSON.parse(localUsers) : []
  return users.find(u => u.email === currentUser && u.isActive) || null
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
