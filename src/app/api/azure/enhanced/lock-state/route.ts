import { NextRequest, NextResponse } from 'next/server'
import { azureStorageEnhanced } from '@/lib/azure-enhanced'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const monthKey = searchParams.get('monthKey')
    
    if (!monthKey) {
      return NextResponse.json(
        { error: 'monthKey parameter is required' },
        { status: 400 }
      )
    }

    console.log(`[API] GET /api/azure/enhanced/lock-state - Fetching for ${monthKey}`)
    const isLocked = await azureStorageEnhanced.getLockState(monthKey)
    console.log(`[API] GET /api/azure/enhanced/lock-state - Success: ${isLocked}`)
    
    return NextResponse.json({ isLocked })
  } catch (error) {
    console.error('[API] GET /api/azure/enhanced/lock-state - Error:', error)
    return NextResponse.json(
      { error: 'Failed to get lock state' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { monthKey, isLocked, lockedBy } = await request.json()
    
    if (!monthKey || typeof isLocked !== 'boolean') {
      return NextResponse.json(
        { error: 'monthKey and isLocked (boolean) are required' },
        { status: 400 }
      )
    }

    console.log(`[API] POST /api/azure/enhanced/lock-state - Setting lock for ${monthKey} to ${isLocked}`)
    await azureStorageEnhanced.setLockState(monthKey, isLocked, lockedBy)
    console.log('[API] POST /api/azure/enhanced/lock-state - Lock state saved successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Lock state saved successfully',
      isLocked
    })
  } catch (error) {
    console.error('[API] POST /api/azure/enhanced/lock-state - Error:', error)
    return NextResponse.json(
      { error: 'Failed to save lock state' },
      { status: 500 }
    )
  }
}
