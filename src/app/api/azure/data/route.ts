import { NextRequest, NextResponse } from 'next/server'
import { azureStorage } from '@/lib/azure-storage'

export async function GET() {
  try {
    console.log('[API] GET /api/azure/data - Fetching global data')
    const data = await azureStorage.getGlobalData()
    console.log('[API] GET /api/azure/data - Success:', {
      projects: data.projects?.length || 0,
      users: data.users?.length || 0,
      allocations: data.allocations?.length || 0,
      positions: data.positions?.length || 0,
      entities: data.entities?.length || 0
    })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[API] GET /api/azure/data - Error:', error)
    return NextResponse.json(
      { error: 'Failed to get Azure data' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const data = await request.json()
    console.log('[API] POST /api/azure/data - Saving data:', {
      projects: data.projects?.length || 0,
      users: data.users?.length || 0,
      allocations: data.allocations?.length || 0,
      positions: data.positions?.length || 0,
      entities: data.entities?.length || 0
    })
    
    console.log('[API] POST /api/azure/data - Project details:', data.projects?.map((p: any) => ({
      id: p.id,
      name: p.name,
      color: p.color
    })))
    
    await azureStorage.setGlobalData(data)
    console.log('[API] POST /api/azure/data - setGlobalData completed successfully')
    
    // Verify the save by immediately reading it back
    console.log('[API] POST /api/azure/data - Verifying save...')
    const verifyData = await azureStorage.getGlobalData()
    console.log('[API] POST /api/azure/data - Verification result:', {
      projects: verifyData.projects?.length || 0,
      users: verifyData.users?.length || 0,
      allocations: verifyData.allocations?.length || 0,
      positions: verifyData.positions?.length || 0,
      entities: verifyData.entities?.length || 0
    })
    
    return NextResponse.json({ 
      success: true,
      verification: {
        projects: verifyData.projects?.length || 0,
        users: verifyData.users?.length || 0,
        allocations: verifyData.allocations?.length || 0,
        positions: verifyData.positions?.length || 0,
        entities: verifyData.entities?.length || 0
      }
    })
  } catch (error) {
    console.error('[API] POST /api/azure/data - Error:', error)
    return NextResponse.json(
      { error: 'Failed to set Azure data' },
      { status: 500 }
    )
  }
}
