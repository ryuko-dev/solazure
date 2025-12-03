// Enhanced Azure Cosmos DB Table API for SolaFire with 3-table structure
import { TableClient, TableServiceClient, AzureSASCredential, odata } from "@azure/data-tables"

// Azure configuration - support both connection string and separate credentials (like legacy)
const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || ""
const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME || "sola1"
const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY || ""

// Table names
const TABLE_NAMES = {
  MAIN_DATA: "soladata",
  MONTHLY_ALLOCATION: "solamonthlyallocation", 
  LOCK_STATES: "solalockstates"
}

// Determine if we're using connection string or separate credentials
const useConnectionString = connectionString && connectionString.trim() !== ""

console.log('[Azure Enhanced] Configuration:', {
  useConnectionString,
  hasConnectionString: !!connectionString,
  connectionStringLength: connectionString.length,
  accountName,
  hasAccountKey: !!accountKey,
  accountKeyLength: accountKey.length
})

// Check if Azure is properly configured
const isAzureConfigured: boolean = Boolean(useConnectionString && connectionString.trim() !== "")

// Create TableServiceClient only if Azure is configured
let tableService: TableServiceClient | null = null
let mainTableClient: TableClient | null = null
let monthlyAllocationTableClient: TableClient | null = null
let lockStatesTableClient: TableClient | null = null

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
}

export interface MonthlyAllocationData {
  partitionKey: string
  rowKey: string
  items: MonthlyAllocationItem[]
}

export interface LockState {
  partitionKey: string
  rowKey: string
  isLocked: boolean
  lockedBy?: string
  lockedAt?: string
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

  constructor() {
    // Initialize clients when singleton is created
    if (isAzureConfigured && !mainTableClient) {
      try {
        // ONLY use connection string approach (proven to work)
        tableService = TableServiceClient.fromConnectionString(connectionString)
        mainTableClient = TableClient.fromConnectionString(connectionString, TABLE_NAMES.MAIN_DATA)
        monthlyAllocationTableClient = TableClient.fromConnectionString(connectionString, TABLE_NAMES.MONTHLY_ALLOCATION)
        lockStatesTableClient = TableClient.fromConnectionString(connectionString, TABLE_NAMES.LOCK_STATES)
        console.log('[Azure Enhanced] Using connection string approach only')
        console.log('[Azure Enhanced] mainTableClient created:', !!mainTableClient)
      } catch (error: any) {
        console.error('[Azure Enhanced] Failed to create clients:', error.message)
        tableService = null
        mainTableClient = null
        monthlyAllocationTableClient = null
        lockStatesTableClient = null
      }
    } else if (!isAzureConfigured) {
      console.log('[Azure Enhanced] Azure not configured')
    }
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
      console.log('[Azure Enhanced] Querying entities with PartitionKey eq "globaldata"')
      const entities = mainTableClient.listEntities({
        queryOptions: {
          filter: odata`PartitionKey eq 'globaldata'`
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
      let latestTimestamp: string | undefined = undefined
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
        // Capture latest Timestamp for optimistic checks
        const ts = (entity as any).Timestamp
        if (ts) {
          const iso = new Date(ts).toISOString()
          if (!latestTimestamp || iso > latestTimestamp) latestTimestamp = iso
        }
      }

      console.log('[Azure Enhanced] Total entities found:', entityCount)
      console.log('[Azure Enhanced] Final result:', {
        usersCount: result.users?.length || 0,
        projectsCount: result.projects?.length || 0,
        hasUserPayrollData: result.users?.[0]?.payrollDataByMonth ? true : false
      })

      // Attach lastModified metadata for optimistic concurrency
      if (latestTimestamp) {
        try {
          ;(result as any).lastModified = latestTimestamp
        } catch (e) {
          // ignore
        }
      }

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

  // Alias for getMainData to maintain compatibility with existing API calls
  async getGlobalData(): Promise<any> {
    return this.getMainData()
  }

  // Alias for setMainData to maintain compatibility with existing API calls
  async setGlobalData(data: any, allowDeletions: boolean = false): Promise<void> {
    return this.setMainData(data, allowDeletions)
  }

  async setMainData(data: any, allowDeletions: boolean = false): Promise<void> {
    if (!mainTableClient) {
      throw new Error('Azure Enhanced: mainTableClient not available')
    }

    try {
      // Server-side safe merge: avoid blind replace of the single-blob entity.
      // Fetch existing data and merge collections by id where possible.
      const existing = await this.getMainData()

      const merged: any = { ...existing }

      const arrayKeys = ['projects', 'users', 'allocations', 'positions', 'entities', 'expenses', 'scheduledRecords']

      for (const key of arrayKeys) {
        const incoming = data[key]

        // If incoming is undefined, leave existing as-is
        if (incoming === undefined) continue

        // If incoming is an empty array, allow it (deletions are now always allowed)
        if (Array.isArray(incoming) && incoming.length === 0) {
          console.log(`[Azure Enhanced] Processing empty incoming array for '${key}' (deletion allowed)`)
          merged[key] = []
          continue
        }

        // If incoming is an array with items, merge by id where possible
        if (Array.isArray(incoming)) {
          // For deletions, don't preserve existing items - use only incoming items
          if (allowDeletions) {
            console.log(`[Azure Enhanced] Deletion mode: using only incoming items for '${key}'`)
            merged[key] = incoming
            continue
          }
          
          const existingArr = Array.isArray(existing[key]) ? existing[key] : []
          const map: Record<string, any> = {}

          for (const item of existingArr) {
            if (item && item.id) map[item.id] = item
          }

          for (const item of incoming) {
            if (item && item.id) {
              map[item.id] = { ...(map[item.id] || {}), ...item }
            } else {
              // Items without id: push as-is (use timestamp-based id to avoid collisions)
              const genId = `gen-${Date.now()}-${Math.floor(Math.random()*10000)}`
              map[genId] = item
            }
          }

          merged[key] = Object.values(map)
          continue
        }

        // Non-array incoming value: replace/assign
        merged[key] = incoming
      }

      // Copy other top-level scalar values from incoming (e.g., startMonth_allocPlanning)
      for (const k of Object.keys(data)) {
        if (!arrayKeys.includes(k)) {
          merged[k] = data[k]
        }
      }

      const entity = {
        partitionKey: 'globaldata',
        rowKey: 'main',
        data: JSON.stringify(merged)
      }

      await mainTableClient.upsertEntity(entity)
      console.log('Main data saved to Azure successfully (merged)')
    } catch (error) {
      console.error("Failed to save main data to Azure:", error)
      throw error
    }
  }

  // Monthly allocation operations
  async getMonthlyAllocation(monthKey: string): Promise<MonthlyAllocationItem[]> {
    if (!monthlyAllocationTableClient) return []

    try {
      const entity = await monthlyAllocationTableClient.getEntity("allocation", monthKey)
      const data = entity as any

      const rawItems = data.items
      if (!rawItems) return []

      // If items were stored as a JSON string (common with Table storage), parse it
      if (typeof rawItems === 'string') {
        try {
          const parsed = JSON.parse(rawItems)
          return Array.isArray(parsed) ? parsed : []
        } catch (err) {
          console.warn('[Azure Enhanced] Failed to parse stringified monthly items for', monthKey)
          return []
        }
      }

      // If items already an array, return as-is
      if (Array.isArray(rawItems)) return rawItems

      return []
    } catch (error) {
      // Entity doesn't exist, return empty array
      return []
    }
  }

  // List available monthly allocation monthKeys (and optional metadata)
  async listMonthlyAllocations(): Promise<{ monthKey: string, itemsCount: number, lastModified?: string }[]> {
    if (!monthlyAllocationTableClient) return []

    try {
      const result: { monthKey: string, itemsCount: number, lastModified?: string }[] = []
      const entities = monthlyAllocationTableClient.listEntities()
      for await (const e of entities) {
        const monthKey = (e.rowKey as string) || ''
        const rawItems = (e as any).items
        let itemsCount = 0

        if (rawItems) {
          if (Array.isArray(rawItems)) itemsCount = rawItems.length
          else if (typeof rawItems === 'string') {
            try {
              const parsed = JSON.parse(rawItems)
              if (Array.isArray(parsed)) itemsCount = parsed.length
            } catch (err) {
              // ignore parse errors
            }
          }
        }

        const lastModified = (e as any).Timestamp ? new Date((e as any).Timestamp).toISOString() : undefined
        result.push({ monthKey, itemsCount, lastModified })
      }
      return result
    } catch (error) {
      console.error('Failed to list monthly allocations:', error)
      return []
    }
  }

  async setMonthlyAllocation(monthKey: string, items: MonthlyAllocationItem[]): Promise<void> {
    if (!monthlyAllocationTableClient) return

    try {
      // Store items as a JSON string to avoid type/coercion issues with Table storage
      const entity: any = {
        partitionKey: "allocation",
        rowKey: monthKey,
        items: JSON.stringify(items)
      }

      await monthlyAllocationTableClient.upsertEntity(entity)
      console.log(`Monthly allocation for ${monthKey} saved to Azure successfully (${items.length} items)`)
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

  // List available lock state monthKeys
  async listLockStates(): Promise<{ monthKey: string, isLocked: boolean, lockedBy?: string, lockedAt?: string }[]> {
    if (!lockStatesTableClient) return []

    try {
      const result: { monthKey: string, isLocked: boolean, lockedBy?: string, lockedAt?: string }[] = []
      const entities = lockStatesTableClient.listEntities()
      for await (const e of entities) {
        const monthKey = (e.rowKey as string) || ''
        const isLocked = Boolean((e as any).isLocked)
        const lockedBy = (e as any).lockedBy
        const lockedAt = (e as any).lockedAt
        result.push({ monthKey, isLocked, lockedBy, lockedAt })
      }
      return result
    } catch (error) {
      console.error('Failed to list lock states:', error)
      return []
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
