import { NextResponse } from 'next/server'
import { azureStorage } from '@/lib/azure-storage'
import { TableServiceClient, AzureSASCredential } from "@azure/data-tables"

export async function GET() {
  try {
    console.log('[Test] Starting Azure connection test...')
    
    // Test Azure status
    const status = azureStorage.getAzureStatus()
    console.log('[Test] Azure status:', status)
    
    // Test table initialization
    let initTableError = null
    try {
      console.log('[Test] Initializing table...')
      await azureStorage.initializeTable()
      console.log('[Test] Table initialization successful')
    } catch (error: any) {
      console.error('[Test] Table initialization failed:', error.message)
      initTableError = error.message
    }
    
    // Test connection through azureStorage
    let connectionTest = false
    try {
      connectionTest = await azureStorage.testConnection()
      console.log('[Test] AzureStorage connection test result:', connectionTest)
    } catch (error: any) {
      console.log('[Test] AzureStorage connection test failed:', error.message)
    }
    
    // Test basic operations
    let getDataError = null
    try {
      await azureStorage.getGlobalData()
      console.log('[Test] getGlobalData successful')
    } catch (error: any) {
      console.log('[Test] getGlobalData failed:', error.message)
      getDataError = error.message
    }
    
    return NextResponse.json({
      status,
      connectionTest,
      initTableError,
      getDataError,
      timestamp: new Date().toISOString()
    })
  } catch (error: any) {
    console.error('[Test] Test failed:', error)
    return NextResponse.json(
      { 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}
