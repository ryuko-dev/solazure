// Enhanced Azure Cosmos DB Table API for SolaFire with 3-table structure
import { TableClient, TableServiceClient, AzureSASCredential, odata } from "@azure/data-tables"

// Azure configuration
const azureConfig = {
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || "sola1",
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || ""
}

// Table names
const TABLE_NAMES = {
  MAIN_DATA: "soladata",
  MONTHLY_ALLOCATION: "solamonthlyallocation", 
  LOCK_STATES: "solalockstates"
}

// Check if Azure is properly configured
const isAzureConfigured = azureConfig.accountKey && azureConfig.accountKey.trim() !== ""

// Create TableServiceClient only if Azure is configured
const tableService = isAzureConfigured ? new TableServiceClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  new AzureSASCredential(azureConfig.accountKey)
) : null

// Create TableClients for each table
const mainTableClient = isAzureConfigured ? new TableClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  TABLE_NAMES.MAIN_DATA,
  new AzureSASCredential(azureConfig.accountKey)
) : null

const monthlyAllocationTableClient = isAzureConfigured ? new TableClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  TABLE_NAMES.MONTHLY_ALLOCATION,
  new AzureSASCredential(azureConfig.accountKey)
) : null

const lockStatesTableClient = isAzureConfigured ? new TableClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  TABLE_NAMES.LOCK_STATES,
  new AzureSASCredential(azureConfig.accountKey)
) : null

// Interfaces for the new table structure
export interface MonthlyAllocationItem {
  id: string
  name: string
  code: string
  description: string
  currency: string
  amount: number
  project: string
  projectTask: string
  account: string
}

export interface LockState {
  partitionKey: string
  rowKey: string
  isLocked: boolean
  lockedBy?: string
  lockedAt?: string
}

export interface MonthlyAllocationData {
  partitionKey: string
  rowKey: string
  items: MonthlyAllocationItem[]
}

// Enhanced Azure Storage class
export class AzureStorageEnhanced {
  private static instance: AzureStorageEnhanced

  static getInstance(): AzureStorageEnhanced {
    if (!AzureStorageEnhanced.instance) {
      AzureStorageEnhanced.instance = new AzureStorageEnhanced()
    }
    return AzureStorageEnhanced.instance
  }

  async initializeTables(): Promise<void> {
    if (!tableService) return
    
    const tables = [
      TABLE_NAMES.MAIN_DATA,
      TABLE_NAMES.MONTHLY_ALLOCATION,
      TABLE_NAMES.LOCK_STATES
    ]

    for (const tableName of tables) {
      try {
        await tableService.createTable(tableName)
        console.log(`Azure table '${tableName}' initialized successfully`)
      } catch (error: any) {
        if (error.statusCode !== 409) { // Table already exists
          console.error(`Failed to initialize Azure table '${tableName}':`, error)
        } else {
          console.log(`Azure table '${tableName}' already exists`)
        }
      }
    }
  }

  // Main data operations (users, projects, entities, etc.)
  async getMainData(): Promise<any> {
    if (!mainTableClient) {
      console.log('[Azure Enhanced] mainTableClient not available, returning empty data')
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

    try {
      console.log('[Azure Enhanced] Querying entities with PartitionKey eq "global"')
      const entities = mainTableClient.listEntities({
        queryOptions: {
          filter: odata`PartitionKey eq 'global'`
        }
      })

      let result: any = {
        projects: [],
        users: [],
        allocations: [],
        positions: [],
        entities: [],
        expenses: [],
        scheduledRecords: []
      }

      let entityCount = 0
      for await (const entity of entities) {
        entityCount++
        console.log('[Azure Enhanced] Found entity:', {
          partitionKey: entity.partitionKey,
          rowKey: entity.rowKey,
          hasData: !!(entity as any).data,
          dataLength: ((entity as any).data || "").length
        })
        const dataStr = (entity as any).data || "{}"
        const data = JSON.parse(dataStr)
        console.log('[Azure Enhanced] Parsed data:', {
          usersCount: data.users?.length || 0,
          projectsCount: data.projects?.length || 0,
          hasUserPayrollData: data.users?.[0]?.payrollDataByMonth ? true : false
        })
        Object.assign(result, data)
      }

      console.log('[Azure Enhanced] Total entities found:', entityCount)
      console.log('[Azure Enhanced] Final result:', {
        usersCount: result.users?.length || 0,
        projectsCount: result.projects?.length || 0,
        hasUserPayrollData: result.users?.[0]?.payrollDataByMonth ? true : false
      })

      return result
    } catch (error) {
      console.error("Failed to get main data:", error)
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
  }

  async setMainData(data: any): Promise<void> {
    if (!mainTableClient) return

    try {
      const entity = {
        partitionKey: "global",
        rowKey: "main",
        data: JSON.stringify(data)
      }

      await mainTableClient.upsertEntity(entity)
      console.log("Main data saved to Azure successfully")
    } catch (error) {
      console.error("Failed to save main data to Azure:", error)
    }
  }

  // Monthly allocation operations
  async getMonthlyAllocation(monthKey: string): Promise<MonthlyAllocationItem[]> {
    if (!monthlyAllocationTableClient) return []

    try {
      const entity = await monthlyAllocationTableClient.getEntity("allocation", monthKey)
      const data = entity as any
      return data.items || []
    } catch (error) {
      // Entity doesn't exist, return empty array
      return []
    }
  }

  async setMonthlyAllocation(monthKey: string, items: MonthlyAllocationItem[]): Promise<void> {
    if (!monthlyAllocationTableClient) return

    try {
      const entity: MonthlyAllocationData = {
        partitionKey: "allocation",
        rowKey: monthKey,
        items
      }

      await monthlyAllocationTableClient.upsertEntity(entity)
      console.log(`Monthly allocation for ${monthKey} saved to Azure successfully`)
    } catch (error) {
      console.error(`Failed to save monthly allocation for ${monthKey}:`, error)
    }
  }

  // Lock state operations
  async getLockState(monthKey: string): Promise<boolean> {
    if (!lockStatesTableClient) return false

    try {
      const entity = await lockStatesTableClient.getEntity("locks", monthKey)
      const data = entity as unknown as LockState
      return data.isLocked || false
    } catch (error) {
      // Entity doesn't exist, return false
      return false
    }
  }

  async setLockState(monthKey: string, isLocked: boolean, lockedBy?: string): Promise<void> {
    if (!lockStatesTableClient) return

    try {
      const entity: LockState = {
        partitionKey: "locks",
        rowKey: monthKey,
        isLocked,
        lockedBy,
        lockedAt: isLocked ? new Date().toISOString() : undefined
      }

      await lockStatesTableClient.upsertEntity(entity)
      console.log(`Lock state for ${monthKey} saved to Azure successfully`)
    } catch (error) {
      console.error(`Failed to save lock state for ${monthKey}:`, error)
    }
  }

  // Migration helper: migrate from localStorage to Azure
  async migrateFromLocalStorage(): Promise<void> {
    console.log("Starting migration from localStorage to Azure...")
    
    try {
      // Get data from localStorage
      const storedData = localStorage.getItem('solafire_current_user_data')
      if (!storedData) {
        console.log("No data found in localStorage to migrate")
        return
      }

      const data = JSON.parse(storedData)
      
      // Migrate main data
      await this.setMainData(data)
      console.log("Main data migrated successfully")

      // Migrate monthly allocation data
      const months = ["2024-11", "2024-12", "2025-0", "2025-1", "2025-2"] // Add more months as needed
      for (const monthKey of months) {
        const monthlyKey = `sola-global-monthly-allocation-${monthKey}`
        const monthlyData = localStorage.getItem(monthlyKey)
        if (monthlyData) {
          const items = JSON.parse(monthlyData)
          await this.setMonthlyAllocation(monthKey, items)
          console.log(`Monthly allocation for ${monthKey} migrated successfully`)
        }

        // Migrate lock states
        const lockKey = `sola-lock-state-${monthKey}`
        const lockData = localStorage.getItem(lockKey)
        if (lockData) {
          const isLocked = lockData === 'true'
          await this.setLockState(monthKey, isLocked, 'migration')
          console.log(`Lock state for ${monthKey} migrated successfully`)
        }
      }

      console.log("Migration from localStorage to Azure completed successfully")
    } catch (error) {
      console.error("Migration failed:", error)
    }
  }
}

// Export singleton instance
export const azureStorageEnhanced = AzureStorageEnhanced.getInstance()
