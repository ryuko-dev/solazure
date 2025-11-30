import { NextRequest, NextResponse } from 'next/server'
import { azureStorage } from '@/lib/azure-storage'

export async function GET() {
  try {
    const users = await azureStorage.getSystemUsers()
    return NextResponse.json(users)
  } catch (error) {
    console.error('[API] Error getting system users:', error)
    return NextResponse.json(
      { error: 'Failed to get system users' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const users = await request.json()
    await azureStorage.setSystemUsers(users)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[API] Error setting system users:', error)
    return NextResponse.json(
      { error: 'Failed to set system users' },
      { status: 500 }
    )
  }
}
