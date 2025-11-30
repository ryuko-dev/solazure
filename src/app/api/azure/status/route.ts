import { NextRequest, NextResponse } from 'next/server'
import { azureStorage } from '@/lib/azure-storage'

export async function GET() {
  try {
    const status = azureStorage.getAzureStatus()
    return NextResponse.json(status)
  } catch (error) {
    console.error('[API] Error getting Azure status:', error)
    return NextResponse.json(
      { error: 'Failed to get Azure status' },
      { status: 500 }
    )
  }
}
