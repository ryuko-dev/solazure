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

    console.log(`[API] GET /api/azure/enhanced/monthly-allocation - Fetching for ${monthKey}`)
    const items = await azureStorageEnhanced.getMonthlyAllocation(monthKey)
    console.log(`[API] GET /api/azure/enhanced/monthly-allocation - Success: ${items.length} items`)
    
    return NextResponse.json({ items })
  } catch (error) {
    console.error('[API] GET /api/azure/enhanced/monthly-allocation - Error:', error)
    return NextResponse.json(
      { error: 'Failed to get monthly allocation' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const { monthKey, items } = await request.json()
    
    if (!monthKey || !items) {
      return NextResponse.json(
        { error: 'monthKey and items are required' },
        { status: 400 }
      )
    }

    console.log(`[API] POST /api/azure/enhanced/monthly-allocation - Saving ${items.length} items for ${monthKey}`)
    await azureStorageEnhanced.setMonthlyAllocation(monthKey, items)
    console.log('[API] POST /api/azure/enhanced/monthly-allocation - Monthly allocation saved successfully')
    
    return NextResponse.json({ 
      success: true,
      message: 'Monthly allocation saved successfully',
      itemsCount: items.length
    })
  } catch (error) {
    console.error('[API] POST /api/azure/enhanced/monthly-allocation - Error:', error)
    return NextResponse.json(
      { error: 'Failed to save monthly allocation' },
      { status: 500 }
    )
  }
}
