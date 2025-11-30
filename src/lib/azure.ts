// Azure Cosmos DB Table API for SolaFire
import { TableClient, TableServiceClient, AzureSASCredential, odata } from "@azure/data-tables"

// Azure configuration
const azureConfig = {
  accountName: process.env.AZURE_STORAGE_ACCOUNT_NAME || "sola1",
  accountKey: process.env.AZURE_STORAGE_ACCOUNT_KEY || "",
  tableName: process.env.AZURE_TABLE_NAME || "soladata"
}

// Check if Azure is properly configured
const isAzureConfigured = azureConfig.accountKey && azureConfig.accountKey.trim() !== ""

// Create TableServiceClient only if Azure is configured
const tableService = isAzureConfigured ? new TableServiceClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  new AzureSASCredential(azureConfig.accountKey)
) : null

// Create TableClient for our data only if Azure is configured
const tableClient = isAzureConfigured ? new TableClient(
  `https://${azureConfig.accountName}.table.core.windows.net`,
  azureConfig.tableName,
  new AzureSASCredential(azureConfig.accountKey)
) : null

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
  expenses?: any[]
  scheduledRecords?: any[]
  startMonth?: number
  startYear?: number
}

// Azure Storage class
export class AzureStorage {
  private static instance: AzureStorage

  static getInstance(): AzureStorage {
    if (!AzureStorage.instance) {
      AzureStorage.instance = new AzureStorage()
    }
    return AzureStorage.instance
  }

  async initializeTable(): Promise<void> {
    if (!tableService) return
    
    try {
      await tableService.createTable(azureConfig.tableName)
      console.log("Azure table initialized successfully")
    } catch (error: any) {
      if (error.statusCode !== 409) { // Table already exists
        console.error("Failed to initialize Azure table:", error)
      }
    }
  }

  async getGlobalData(partitionKey: string): Promise<GlobalData> {
    if (!tableClient) {
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
      const entities = tableClient.listEntities({
        queryOptions: {
          filter: odata`PartitionKey eq ${partitionKey}`
        }
      })

      const result: GlobalData = {
        projects: [],
        users: [],
        allocations: [],
        positions: [],
        entities: []
      }

      for await (const entity of entities) {
        const dataStr = (entity as any).data || "{}"
        const data = JSON.parse(dataStr)
        Object.assign(result, data)
      }

      return result
    } catch (error) {
      console.error("Failed to get global data:", error)
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

  async setGlobalData(partitionKey: string, data: Partial<GlobalData>): Promise<void> {
    if (!tableClient) return

    try {
      const entity = {
        partitionKey,
        rowKey: partitionKey,
        data: JSON.stringify(data)
      }

      await tableClient.upsertEntity(entity)
      console.log("Data saved to Azure successfully")
    } catch (error) {
      console.error("Failed to save data to Azure:", error)
    }
  }
}

// Export singleton instance
export const azureStorage = AzureStorage.getInstance()
