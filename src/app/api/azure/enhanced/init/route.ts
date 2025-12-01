import { NextResponse } from 'next/server'
import { azureStorageEnhanced } from '@/lib/azure-enhanced'

export async function POST() {
  try {
    console.log('[API] POST /api/azure/enhanced/init - Initializing enhanced Azure tables')
    
    await azureStorageEnhanced.initializeTables()
    
    return NextResponse.json({ 
      success: true,
      message: 'Enhanced Azure tables initialized successfully',
      tables: ['soladata', 'solamonthlyallocation', 'solalockstates']
    })
  } catch (error) {
    console.error('[API] POST /api/azure/enhanced/init - Error:', error)
    return NextResponse.json(
      { error: 'Failed to initialize enhanced Azure tables' },
      { status: 500 }
    )
  }
}
