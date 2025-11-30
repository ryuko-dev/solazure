// Local storage with Azure fallback for SolaFire
import { azureStorage, type GlobalData, type SystemUser } from "./azure"

// Local storage keys
const STORAGE_KEYS = {
  CURRENT_USER: 'solafire_current_user',
  USER_DATA_PREFIX: 'solafire_user_data_',
  SYSTEM_USERS: 'solafire_system_users'
}

// User management
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

// User-specific data
export async function getCurrentUserData(): Promise<GlobalData> {
  const currentUser = getCurrentUser()
  const timestamp = new Date().toISOString()
  
  console.log(`[${timestamp}] [Storage] getCurrentUserData called for user:`, currentUser)
  
  if (!currentUser) {
    console.log(`[${timestamp}] [Storage] No current user, returning empty data`)
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

  // Try Azure API first, fallback to localStorage
  try {
    console.log(`[${timestamp}] [Storage] Trying Azure API...`)
    const response = await fetch('/api/azure/data')
    if (response.ok) {
      const azureData = await response.json()
      console.log(`[${timestamp}] [Storage] Azure API response:`, {
        projects: azureData.projects?.length || 0,
        users: azureData.users?.length || 0,
        allocations: azureData.allocations?.length || 0,
        positions: azureData.positions?.length || 0,
        entities: azureData.entities?.length || 0
      })
      
      if (azureData.projects.length > 0 || azureData.users.length > 0) {
        console.log(`[${timestamp}] [Storage] Using Azure data`)
        return azureData
      }
    }
  } catch (error) {
    console.log(`[${timestamp}] [Storage] Azure API not available, using localStorage:`, error)
  }

  // Fallback to localStorage
  console.log(`[${timestamp}] [Storage] Falling back to localStorage...`)
  const localData = localStorage.getItem(STORAGE_KEYS.USER_DATA_PREFIX + currentUser)
  const parsedData = localData ? JSON.parse(localData) : {
    projects: [],
    users: [],
    allocations: [],
    positions: [],
    entities: [],
    expenses: [],
    scheduledRecords: []
  }
  
  console.log(`[${timestamp}] [Storage] localStorage data:`, {
    projects: parsedData.projects?.length || 0,
    users: parsedData.users?.length || 0,
    allocations: parsedData.allocations?.length || 0,
    positions: parsedData.positions?.length || 0,
    entities: parsedData.entities?.length || 0
  })
  
  return parsedData
}

export async function setCurrentUserData(data: Partial<GlobalData>): Promise<void> {
  const currentUser = getCurrentUser()
  if (!currentUser) return

  const timestamp = new Date().toISOString()
  const callStack = new Error().stack?.split('\n').slice(1, 6)
  
  console.log(`[${timestamp}] [Storage] setCurrentUserData called with:`, {
    projects: data.projects?.length || 0,
    users: data.users?.length || 0,
    allocations: data.allocations?.length || 0,
    positions: data.positions?.length || 0,
    entities: data.entities?.length || 0,
    dataKeys: Object.keys(data),
    dataKeysLength: Object.keys(data).length,
    callStack: callStack
  })
  
  // Log the specific caller for debugging
  if (callStack && callStack.length > 0) {
    console.log(`[${timestamp}] [Storage] Called from:`, callStack[0]?.trim())
  }

  // Save to Azure API if available
  try {
    const existingData = await getCurrentUserData()
    
    console.log(`[${timestamp}] [Storage] Existing data has:`, {
      projects: existingData.projects?.length || 0,
      users: existingData.users?.length || 0,
      allocations: existingData.allocations?.length || 0,
      positions: existingData.positions?.length || 0,
      entities: existingData.entities?.length || 0
    })
    
    // SAFEGUARD: Never overwrite existing data with empty arrays if there's already data
    let finalData = { ...existingData, ...data }
    
    console.log(`[${timestamp}] [Storage] Final merged data will have:`, {
      projects: finalData.projects?.length || 0,
      users: finalData.users?.length || 0,
      allocations: finalData.allocations?.length || 0,
      positions: finalData.positions?.length || 0,
      entities: finalData.entities?.length || 0
    })
    
    // Protect projects - only if we're not intentionally clearing them
    if (data.projects !== undefined && data.projects.length === 0 && existingData.projects && existingData.projects.length > 0 && Object.keys(data).length > 1) {
      console.log(`[${timestamp}] [Storage] SAFEGUARD: Preventing overwrite of`, existingData.projects.length, 'existing projects with empty array')
      finalData.projects = existingData.projects
    }
    
    // Protect users - only prevent if this looks like an accidental overwrite
    // Allow intentional deletions (when only users array is being updated to empty)
    if (data.users !== undefined && data.users.length === 0 && existingData.users && existingData.users.length > 0) {
      // Check if this is an intentional deletion (only users changing) vs accidental (other data also changing)
      const changingKeys = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined)
      const isIntentionalDeletion = changingKeys.length === 1 && changingKeys[0] === 'users'
      
      if (!isIntentionalDeletion) {
        console.log(`[${timestamp}] [Storage] SAFEGUARD: Preventing accidental overwrite of`, existingData.users.length, 'existing users with empty array')
        finalData.users = existingData.users
      }
    }
    
    // NEW: Protect allocations from being overwritten by empty data during page navigation
    if (data.allocations !== undefined && data.allocations.length === 0 && existingData.allocations && existingData.allocations.length > 0) {
      // Check if this looks like a page navigation data reload (multiple data types changing)
      const changingKeys = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined)
      const isPageNavigationReload = changingKeys.length > 1
      
      if (isPageNavigationReload) {
        console.log(`[${timestamp}] [Storage] ALLOCATION SAFEGUARD: Preventing page navigation overwrite of ${existingData.allocations.length} existing allocations`)
        finalData.allocations = existingData.allocations
      }
    }
    
    // DISABLED: Allow allocation changes completely
    // Allocations should be able to be edited and deleted without any restrictions
    // DISABLED: Allow position deletions completely
    // Positions should be able to be deleted without any restrictions
    
    console.log(`[${timestamp}] [Storage] Final data after safeguards:`, {
      projects: finalData.projects?.length || 0,
      users: finalData.users?.length || 0,
      allocations: finalData.allocations?.length || 0,
      positions: finalData.positions?.length || 0,
      entities: finalData.entities?.length || 0
    })
    
    console.log(`[${timestamp}] [Storage] Attempting to save to Azure API...`)
    const response = await fetch('/api/azure/data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalData),
      })

      if (response.ok) {
        const result = await response.json()
        console.log(`[${timestamp}] [Storage] Azure API response:`, result)
        if (result.verification) {
          console.log(`[${timestamp}] [Storage] Azure verification - projects saved:`, result.verification.projects)
          console.log(`[${timestamp}] [Storage] Azure verification - total data:`, result.verification)
        }
        console.log(`[${timestamp}] [Storage] Data saved to Azure successfully`)
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }
  } catch (error) {
    console.log(`[${timestamp}] [Storage] Azure API not available, using localStorage:`, error)
  }

  // Always save to localStorage as backup
  const existingData = await getCurrentUserData()
  let finalData = { ...existingData, ...data }
  
  console.log(`[${timestamp}] [Storage] localStorage backup - final data will have:`, {
    projects: finalData.projects?.length || 0,
    users: finalData.users?.length || 0,
    allocations: finalData.allocations?.length || 0,
    positions: finalData.positions?.length || 0,
    entities: finalData.entities?.length || 0
  })
  
  // Apply the same safeguard to localStorage
  // Protect projects - only if we're not intentionally clearing them
  if (data.projects !== undefined && data.projects.length === 0 && existingData.projects && existingData.projects.length > 0 && Object.keys(data).length > 1) {
    console.log(`[${timestamp}] [Storage] SAFEGUARD: Preventing localStorage overwrite of`, existingData.projects.length, 'existing projects')
    finalData.projects = existingData.projects
  }
  
  // Protect users - only prevent if this looks like an accidental overwrite
  // Allow intentional deletions (when only users array is being updated to empty)
  if (data.users !== undefined && data.users.length === 0 && existingData.users && existingData.users.length > 0) {
    // Check if this is an intentional deletion (only users changing) vs accidental (other data also changing)
    const changingKeys = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined)
    const isIntentionalDeletion = changingKeys.length === 1 && changingKeys[0] === 'users'
    
    if (!isIntentionalDeletion) {
      console.log(`[${timestamp}] [Storage] SAFEGUARD: Preventing localStorage accidental overwrite of`, existingData.users.length, 'existing users')
      finalData.users = existingData.users
    }
  }
  
  // NEW: Protect allocations from being overwritten by empty data during page navigation (localStorage backup)
  if (data.allocations !== undefined && data.allocations.length === 0 && existingData.allocations && existingData.allocations.length > 0) {
    // Check if this looks like a page navigation data reload (multiple data types changing)
    const changingKeys = Object.keys(data).filter(key => data[key as keyof typeof data] !== undefined)
    const isPageNavigationReload = changingKeys.length > 1
    
    if (isPageNavigationReload) {
      console.log(`[${timestamp}] [Storage] ALLOCATION SAFEGUARD: Preventing localStorage page navigation overwrite of ${existingData.allocations.length} existing allocations`)
      finalData.allocations = existingData.allocations
    }
  }
  
  console.log(`[${timestamp}] [Storage] localStorage backup - final data after safeguards:`, {
    projects: finalData.projects?.length || 0,
    users: finalData.users?.length || 0,
    allocations: finalData.allocations?.length || 0,
    positions: finalData.positions?.length || 0,
    entities: finalData.entities?.length || 0
  })
  
  localStorage.setItem(STORAGE_KEYS.USER_DATA_PREFIX + currentUser, JSON.stringify(finalData))
  console.log(`[${timestamp}] [Storage] Data saved to localStorage as backup`)
}

// System user management
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
