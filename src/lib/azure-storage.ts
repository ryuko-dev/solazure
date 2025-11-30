// Azure Cosmos DB Table API for SolaFire - Clean App Version
import { TableClient, TableServiceClient, AzureSASCredential, TableEntity } from "@azure/data-tables"

// Azure configuration - support both connection string and separate credentials
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || ""
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "sola1"
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || ""
const tableName = process.env.AZURE_TABLE_NAME || "soladata"

// Determine if we're using connection string or separate credentials
const useConnectionString = connectionString && connectionString.trim() !== ""

console.log('[Azure] Configuration:', {
  useConnectionString,
  hasConnectionString: !!connectionString,
  connectionStringLength: connectionString.length,
  accountName,
  hasAccountKey: !!accountKey,
  accountKeyLength: accountKey.length,
  tableName
})

// Check if Azure is properly configured
const isAzureConfigured: boolean = useConnectionString ? true : Boolean(accountKey && accountKey.trim() !== "")

// Create TableServiceClient
let tableService: TableServiceClient | null = null
let tableClient: TableClient | null = null

if (isAzureConfigured) {
  try {
    if (useConnectionString) {
      // Use connection string
      tableService = TableServiceClient.fromConnectionString(connectionString)
      tableClient = TableClient.fromConnectionString(connectionString, tableName)
      console.log('[Azure] Using connection string approach')
    } else {
      // Use separate account name and key
      tableService = new TableServiceClient(
        `https://${accountName}.table.core.windows.net`,
        new AzureSASCredential(accountKey)
      )
      tableClient = new TableClient(
        `https://${accountName}.table.core.windows.net`,
        tableName,
        new AzureSASCredential(accountKey)
      )
      console.log('[Azure] Using separate credentials approach')
    }
  } catch (error: any) {
    console.error('[Azure] Failed to create clients:', error.message)
    tableService = null
    tableClient = null
  }
} else {
  console.log('[Azure] Azure not configured')
}

// System user interface
export interface SystemUser {
  id: string
  email: string
  name: string
  password: string
  role: 'admin' | 'editor' | 'viewer' | 'senior'
  isActive: boolean
  createdAt: string
}

// Global data interface
export interface GlobalData {
  projects: any[]
  users: any[]
  allocations: any[]
  positions: any[]
  entities: any[]
  startMonth?: number
  startYear?: number
  systemUsers?: SystemUser[]
}

// Azure Table Entity interface
interface AzureTableEntity extends TableEntity {
  data: string
  timestamp?: Date
}

export class AzureStorage {
  // Initialize Azure table if it doesn't exist
  async initializeTable(): Promise<void> {
    if (!tableService) {
      console.log('[Azure] Cannot initialize table - no table service')
      return
    }
    
    try {
      console.log('[Azure] Creating table if it doesn\'t exist:', tableName)
      await tableService.createTable(tableName)
      console.log('[Azure] Table created/verified successfully')
    } catch (error: any) {
      if (error.statusCode === 409) {
        // Table already exists - this is fine
        console.log('[Azure] Table already exists')
      } else {
        console.error('[Azure] Error creating table:', error)
        throw error
      }
    }
  }

  // Get global data from Azure Table
  async getGlobalData(): Promise<GlobalData> {
    if (!tableClient) {
      console.log('[Azure] Azure not configured, throwing error to use fallback')
      throw new Error('Azure not configured')
    }

    try {
      console.log('[Azure] Fetching global data from Azure Table...')
      
      const entity = await tableClient.getEntity('globaldata', 'main')
      const data = JSON.parse((entity as any).data)
      
      console.log('[Azure] Global data retrieved successfully:', {
        projects: data.projects?.length || 0,
        users: data.users?.length || 0,
        allocations: data.allocations?.length || 0,
        positions: data.positions?.length || 0,
        entities: data.entities?.length || 0,
        systemUsers: data.systemUsers?.length || 0
      })
      
      return data
    } catch (error: any) {
      console.log('[Azure] Error details:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
        stack: error.stack
      })
      
      if (error.statusCode === 404) {
        console.log('[Azure] No global data found, returning default')
        return {
          projects: [],
          users: [],
          allocations: [],
          positions: [],
          entities: [],
          startMonth: 0,
          startYear: 2024
        }
      }
      console.error('[Azure] Error getting global data:', error)
      throw error
    }
  }

  // Set global data to Azure Table
  async setGlobalData(data: Partial<GlobalData>): Promise<void> {
    if (!tableClient) {
      console.log('[Azure] Azure not configured, throwing error to use fallback')
      throw new Error('Azure not configured')
    }
    
    try {
      const logData = {
        projects: data.projects?.length || 0,
        users: data.users?.length || 0,
        allocations: data.allocations?.length || 0,
        positions: data.positions?.length || 0,
        entities: data.entities?.length || 0
      }
      console.log('[Azure] setGlobalData called with:', logData)
      
      // Ensure table exists before trying to save data
      await this.initializeTable()
      
      console.log('[Azure] Getting existing data...')
      const existing = await this.getGlobalData()
      const updated = { ...existing, ...data }
      
      console.log('[Azure] Saving to global storage:', {
        projects: updated.projects?.length || 0,
        users: updated.users?.length || 0,
        allocations: updated.allocations?.length || 0,
        positions: updated.positions?.length || 0,
        entities: updated.entities?.length || 0
      })

      // Store as JSON string in table entity
      const entity: AzureTableEntity = {
        partitionKey: 'globaldata',
        rowKey: 'main',
        data: JSON.stringify(updated),
        timestamp: new Date()
      }

      console.log('[Azure] Upserting entity to Azure...', {
        partitionKey: entity.partitionKey,
        rowKey: entity.rowKey,
        dataSize: entity.data.length
      })
      
      await tableClient.upsertEntity(entity, "Replace")
      console.log('[Azure] Data saved successfully - entity upserted')
      
      // Verify the save immediately
      console.log('[Azure] Verifying save...')
      const verifyEntity = await tableClient.getEntity('globaldata', 'main')
      const verifyData = JSON.parse((verifyEntity as any).data)
      const verifyResult = {
        projects: verifyData.projects?.length || 0,
        users: verifyData.users?.length || 0,
        allocations: verifyData.allocations?.length || 0,
        positions: verifyData.positions?.length || 0,
        entities: verifyData.entities?.length || 0
      }
      console.log('[Azure] Verification successful:', verifyResult)
      
      if (verifyResult.projects !== logData.projects) {
        console.error('[Azure] MISMATCH DETECTED! Expected projects:', logData.projects, 'but got:', verifyResult.projects)
        console.log('[Azure] Expected data:', data.projects)
        console.log('[Azure] Actual saved data:', verifyData.projects)
      }
      
    } catch (error: any) {
      console.log('[Azure] Error details in setGlobalData:', {
        message: error.message,
        statusCode: error.statusCode,
        name: error.name,
        stack: error.stack
      })
      console.error('[Azure] Error saving global data:', error)
      throw error
    }
  }

  // Clear global data
  async clearGlobalData(): Promise<void> {
    if (!tableClient) {
      console.log('[Azure] Azure not configured, throwing error to use fallback')
      throw new Error('Azure not configured')
    }

    try {
      await tableClient.deleteEntity('globaldata', 'main')
      console.log('[Azure] Global data cleared successfully')
    } catch (error: any) {
      if (error.statusCode === 404) {
        console.log('[Azure] No global data to clear')
        return
      }
      console.error('[Azure] Error clearing global data:', error)
      throw error
    }
  }

  // System users management
  async getSystemUsers(): Promise<SystemUser[]> {
    try {
      const globalData = await this.getGlobalData()
      return globalData.systemUsers || []
    } catch (error) {
      console.error('[Azure] Error getting system users:', error)
      throw error
    }
  }

  async setSystemUsers(users: SystemUser[]): Promise<void> {
    try {
      await this.setGlobalData({ systemUsers: users })
      console.log('[Azure] System users saved successfully')
    } catch (error) {
      console.error('[Azure] Error saving system users:', error)
      throw error
    }
  }

  async addSystemUser(user: Omit<SystemUser, 'id' | 'createdAt'>): Promise<SystemUser> {
    const users = await this.getSystemUsers()
    const newUser: SystemUser = {
      ...user,
      id: Date.now().toString(),
      createdAt: new Date().toISOString()
    }
    
    await this.setSystemUsers([...users, newUser])
    return newUser
  }

  async updateSystemUser(id: string, updates: Partial<SystemUser>): Promise<SystemUser> {
    const users = await this.getSystemUsers()
    const userIndex = users.findIndex(u => u.id === id)
    
    if (userIndex === -1) {
      throw new Error('User not found')
    }
    
    users[userIndex] = { ...users[userIndex], ...updates }
    await this.setSystemUsers(users)
    return users[userIndex]
  }

  async deleteSystemUser(id: string): Promise<void> {
    const users = await this.getSystemUsers()
    const filteredUsers = users.filter(u => u.id !== id)
    await this.setSystemUsers(filteredUsers)
  }

  // Get Azure configuration status
  getAzureStatus(): {
    isConfigured: boolean
    accountName: string
    tableName: string
    hasAccountKey: boolean
    useConnectionString: boolean
    hasConnectionString: boolean
  } {
    return {
      isConfigured: isAzureConfigured,
      accountName,
      tableName,
      hasAccountKey: Boolean(accountKey && accountKey.trim() !== ""),
      useConnectionString: Boolean(useConnectionString),
      hasConnectionString: Boolean(connectionString && connectionString.trim() !== "")
    }
  }

  // Test connection to Azure
  async testConnection(): Promise<boolean> {
    if (!tableClient || !tableService) {
      return false
    }

    try {
      await tableService.getProperties()
      return true
    } catch (error) {
      console.error('[Azure] Connection test failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const azureStorage = new AzureStorage()
