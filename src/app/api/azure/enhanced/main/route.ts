import { NextRequest, NextResponse } from 'next/server'
import { azureStorageEnhanced } from '@/lib/azure-enhanced'

export async function GET() {
  try {
    console.log('[API] GET /api/azure/enhanced/main - Fetching main data')
    const data = await azureStorageEnhanced.getMainData()
    console.log('[API] GET /api/azure/enhanced/main - Success:', {
      projects: data.projects?.length || 0,
      users: data.users?.length || 0,
      allocations: data.allocations?.length || 0,
      positions: data.positions?.length || 0,
      entities: data.entities?.length || 0
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] GET /api/azure/enhanced/main - Error:', error)
    return NextResponse.json(
      { error: 'Failed to get main data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('[API] POST /api/azure/enhanced/main - Saving main data:', {
      projects: data.projects?.length || 0,
      users: data.users?.length || 0,
      allocations: data.allocations?.length || 0,
      positions: data.positions?.length || 0,
      entities: data.entities?.length || 0
    })
    
    await azureStorageEnhanced.setMainData(data)
    console.log('[API] POST /api/azure/enhanced/main - Main data saved successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Main data saved successfully'
    })
  } catch (error) {
    console.error('[API] POST /api/azure/enhanced/main - Error:', error)
    return NextResponse.json(
      { error: 'Failed to save main data' },
      { status: 500 }
    )
  }
}
