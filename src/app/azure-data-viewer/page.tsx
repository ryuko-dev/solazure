"use client"

import React, { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { azureStorage } from "@/lib/azure-storage"
import { azureStorageEnhanced } from "@/lib/azure-enhanced"
import { GlobalData, SystemUser } from "@/lib/azure-storage"

interface CollectionData {
  name: string
  data: any[]
  count: number
  lastUpdated?: string
}

interface MonthlyAllocationData {
  monthKey: string
  items: any[]
  count: number
}

interface LockStateData {
  monthKey: string
  isLocked: boolean
  lockedBy?: string
  lockedAt?: string
}

export default function AzureDataViewer() {
  const [azureStatus, setAzureStatus] = useState<any>(null)
  const [globalData, setGlobalData] = useState<GlobalData | null>(null)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [monthlyAllocations, setMonthlyAllocations] = useState<MonthlyAllocationData[]>([])
  const [lockStates, setLockStates] = useState<LockStateData[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())
  const [activeTab, setActiveTab] = useState<'legacy' | 'enhanced'>('enhanced')

  useEffect(() => {
    loadData()
  }, [])

  const loadData = async () => {
    try {
      setLoading(true)
      setError(null)
      
      // Load Azure status
      const statusResponse = await fetch('/api/azure/status')
      if (statusResponse.ok) {
        const status = await statusResponse.json()
        setAzureStatus(status)
      }
      
      // Load enhanced data
      if (activeTab === 'enhanced') {
        await loadEnhancedData()
      } else {
        await loadLegacyData()
      }
      
      console.log("Data Loaded:", { globalData, systemUsers, azureStatus, monthlyAllocations, lockStates })
    } catch (err) {
      console.error("Error loading data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const loadEnhancedData = async () => {
    // Load main data using enhanced API with localStorage fallback
    try {
      // First try the enhanced API
      const dataResponse = await fetch('/api/azure/enhanced/main')
      if (dataResponse.ok) {
        const data = await dataResponse.json()
        // Check if we got real data (not empty due to caching)
        if (data.projects?.length > 0 || data.users?.length > 0 || data._apiTimestamp) {
          setGlobalData(data)
        } else {
          // Fallback to localStorage if enhanced API returns empty
          console.log('Enhanced API returned empty data, using localStorage fallback')
          await loadLocalStorageData()
        }
      } else {
        // Fallback to localStorage
        await loadLocalStorageData()
      }
    } catch (error) {
      console.log('Enhanced API failed, using localStorage fallback')
      await loadLocalStorageData()
    }
    
    // Load monthly allocations for all available months
    const allocationData: MonthlyAllocationData[] = []
    
    console.log('[Azure Data Viewer] NEW CODE: Loading monthly allocations with user-specific pattern')
    
    // Debug: Check all allocation-related keys and their contents
    console.log('[Azure Data Viewer] Checking all allocation-related keys:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && (key.includes('allocation') || key.includes('Allocation'))) {
        const data = localStorage.getItem(key)
        console.log(`[Azure Data Viewer] Key: ${key}`)
        console.log(`[Azure Data Viewer] Data:`, data)
        console.log(`[Azure Data Viewer] Data length:`, data?.length || 0)
        console.log('---')
      }
    }
    
    // Discover all available months from localStorage (monthly allocations have actual data)
    const availableMonths: string[] = []
    console.log('[Azure Data Viewer] Starting month discovery - checking all localStorage keys:')
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      console.log(`[Azure Data Viewer] Checking key ${i}: ${key}`)
      if (key && key.startsWith('sola-global-monthly-allocation-')) {
        console.log(`[Azure Data Viewer] Found monthly allocation key: ${key}`)
        // Extract month from key like "sola-global-monthly-allocation-2025-10"
        const monthKey = key.replace('sola-global-monthly-allocation-', '')
        availableMonths.push(monthKey)
        console.log(`[Azure Data Viewer] Extracted monthKey: ${monthKey}`)
      }
    }
    console.log(`[Azure Data Viewer] Final availableMonths array:`, availableMonths)
    
    // Remove duplicates and sort chronologically
    const uniqueMonths = Array.from(new Set(availableMonths))
    uniqueMonths.sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number)
      const [yearB, monthB] = b.split('-').map(Number)
      return (yearA * 12 + monthA) - (yearB * 12 + monthB)
    })
    
    console.log('[Azure Data Viewer] Found available months:', uniqueMonths)
    
    for (const monthKey of uniqueMonths) {
      console.log(`[Azure Data Viewer] Processing monthKey: ${monthKey}`)
      try {
        // Find all monthly allocations for this month
        const monthAllocations: any[] = []
        
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i)
          console.log(`[Azure Data Viewer] Checking for key: ${key} against target: sola-global-monthly-allocation-${monthKey}`)
          if (key && key === `sola-global-monthly-allocation-${monthKey}`) {
            const localData = localStorage.getItem(key)
            console.log(`[Azure Data Viewer] Found monthly allocation data for key: ${key}`)
            if (localData) {
              const items = JSON.parse(localData)
              console.log(`[Azure Data Viewer] Parsed items for ${key}:`, items)
              console.log(`[Azure Data Viewer] Items is array:`, Array.isArray(items))
              console.log(`[Azure Data Viewer] Items length:`, items?.length || 0)
              if (Array.isArray(items)) {
                monthAllocations.push(...items)
                console.log(`[Azure Data Viewer] Added ${items.length} items, total now: ${monthAllocations.length}`)
              }
            }
          }
        }
        
        console.log(`[Azure Data Viewer] Final monthAllocations for ${monthKey}:`, monthAllocations)
        console.log(`[Azure Data Viewer] monthAllocations.length > 0:`, monthAllocations.length > 0)
        
        if (monthAllocations.length > 0) {
          allocationData.push({
            monthKey,
            items: monthAllocations,
            count: monthAllocations.length
          })
          console.log(`[Azure Data Viewer] Added to allocationData, new total: ${allocationData.length}`)
        }
      } catch (error) {
        console.log(`No expense allocation data for ${monthKey}:`, error)
      }
    }
    setMonthlyAllocations(allocationData)
    
    // Load lock states for all available months
    const lockData: LockStateData[] = []
    
    // Discover all available months from localStorage for lock states
    const availableLockMonths: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith('sola-lock-state-')) {
        const monthKey = key.replace('sola-lock-state-', '')
        availableLockMonths.push(monthKey)
      }
    }
    
    // Sort months chronologically
    availableLockMonths.sort((a, b) => {
      const [yearA, monthA] = a.split('-').map(Number)
      const [yearB, monthB] = b.split('-').map(Number)
      return (yearA * 12 + monthA) - (yearB * 12 + monthB)
    })
    
    console.log('[Azure Data Viewer] Found available lock months:', availableLockMonths)
    
    for (const monthKey of availableLockMonths) {
      try {
        // Check localStorage first
        const localData = localStorage.getItem(`sola-lock-state-${monthKey}`)
        console.log(`[Azure Data Viewer] Lock state for ${monthKey}:`, {
          localStorageData: localData,
          isLocked: localData === 'true'
        })
        if (localData !== null) {
          lockData.push({
            monthKey,
            isLocked: localData === 'true'
          })
        }
      } catch (error) {
        console.log(`No lock state data for ${monthKey}`)
      }
    }
    setLockStates(lockData)
    
    // Load system users
    try {
      const usersResponse = await fetch('/api/azure/users')
      if (usersResponse.ok) {
        const users = await usersResponse.json()
        setSystemUsers(users)
      }
    } catch (error) {
      console.log("Failed to load system users")
    }
  }

  // Calculate summary statistics
  const monthlyAllocationSummary = {
    totalMonths: monthlyAllocations.length,
    totalItems: monthlyAllocations.reduce((sum, alloc) => sum + alloc.count, 0),
    latestMonth: monthlyAllocations[monthlyAllocations.length - 1]?.monthKey || 'None',
    activeMonths: monthlyAllocations.filter(alloc => alloc.count > 0).length
  }

  const lockStateSummary = {
    totalMonths: lockStates.length,
    lockedMonths: lockStates.filter(lock => lock.isLocked).length,
    unlockedMonths: lockStates.filter(lock => !lock.isLocked).length,
    latestLockedMonth: lockStates.filter(lock => lock.isLocked).pop()?.monthKey || 'None'
  }

  const loadLocalStorageData = async () => {
    try {
      // Import and use the enhanced storage getGlobalData function
      const { getGlobalData } = await import("@/lib/storage-enhanced")
      const data = await getGlobalData()
      setGlobalData(data)
    } catch (error) {
      console.error("Failed to load from localStorage:", error)
      // Final fallback to empty data
      setGlobalData({
        projects: [],
        users: [],
        allocations: [],
        positions: [],
        entities: []
      })
    }
  }

  const loadLegacyData = async () => {
    // Load global data using legacy API
    const dataResponse = await fetch('/api/azure/data')
    if (dataResponse.ok) {
      const data = await dataResponse.json()
      setGlobalData(data)
    } else {
      // Fallback to localStorage if Azure not configured
      const { getCurrentUserData } = await import("@/lib/storage")
      const data = await getCurrentUserData()
      setGlobalData(data)
    }
    
    // Load system users using API
    const usersResponse = await fetch('/api/azure/users')
    if (usersResponse.ok) {
      const users = await usersResponse.json()
      setSystemUsers(users)
    } else {
      // Fallback to localStorage if Azure not configured
      const { getSystemUsers } = await import("@/lib/storage")
      const users = await getSystemUsers()
      setSystemUsers(users)
    }
  }

  const legacyCollections: CollectionData[] = [
    {
      name: "Projects",
      data: globalData?.projects || [],
      count: globalData?.projects?.length || 0
    },
    {
      name: "Users", 
      data: globalData?.users || [],
      count: globalData?.users?.length || 0
    },
    {
      name: "Allocations",
      data: globalData?.allocations || [],
      count: globalData?.allocations?.length || 0
    },
    {
      name: "Positions",
      data: globalData?.positions || [],
      count: globalData?.positions?.length || 0
    },
    {
      name: "Entities",
      data: globalData?.entities || [],
      count: globalData?.entities?.length || 0
    },
    {
      name: "System Users",
      data: systemUsers,
      count: systemUsers.length
    }
  ]

  const enhancedCollections: CollectionData[] = [
    {
      name: "Projects",
      data: globalData?.projects || [],
      count: globalData?.projects?.length || 0
    },
    {
      name: "Users", 
      data: globalData?.users || [],
      count: globalData?.users?.length || 0
    },
    {
      name: "Allocations",
      data: globalData?.allocations || [],
      count: globalData?.allocations?.length || 0
    },
    {
      name: "Positions",
      data: globalData?.positions || [],
      count: globalData?.positions?.length || 0
    },
    {
      name: "Entities",
      data: globalData?.entities || [],
      count: globalData?.entities?.length || 0
    },
    {
      name: "System Users",
      data: systemUsers,
      count: systemUsers.length
    },
    {
      name: "Monthly Allocations",
      data: monthlyAllocations,
      count: monthlyAllocations.length
    },
    {
      name: "Lock States",
      data: lockStates,
      count: lockStates.length
    }
  ]

  const collections = activeTab === 'enhanced' ? enhancedCollections : legacyCollections

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems)
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId)
    } else {
      newExpanded.add(itemId)
    }
    setExpandedItems(newExpanded)
  }

  const renderJsonItem = (item: any, index: number, collectionName: string) => {
    const itemId = `${collectionName}-${index}`
    const isExpanded = expandedItems.has(itemId)
    
    return (
      <div key={itemId} className="border border-gray-200 rounded-lg overflow-hidden">
        <div
          className="flex items-center justify-between p-3 bg-gray-50 hover:bg-gray-100 cursor-pointer"
          onClick={() => toggleItemExpansion(itemId)}
        >
          <div className="flex items-center gap-3">
            <svg
              className={`w-4 h-4 text-gray-500 transition-transform ${isExpanded ? 'rotate-90' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="font-medium text-sm">
              {(() => {
                // Display readable month name for monthKeys
                if (item.monthKey && item.monthKey.includes('-')) {
                  const [year, month] = item.monthKey.split('-').map(Number)
                  const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"]
                  return monthNames[month] ? `${monthNames[month]} ${year}` : item.monthKey
                }
                return item.monthKey || item.id || item.name || `Item ${index + 1}`
              })()}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {item.items ? `${item.items.length} items` : `${Object.keys(item).length} properties`}
          </span>
        </div>
        
        {isExpanded && (
          <div className="p-4 bg-white border-t border-gray-200">
            <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap">
              {JSON.stringify(item, null, 2)}
            </pre>
          </div>
        )}
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading data from Azure...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="bg-red-50 border border-red-200 rounded-lg p-6">
            <h3 className="text-lg font-semibold text-red-800 mb-2">Error Loading Data</h3>
            <p className="text-red-600 mb-4">{error}</p>
            <button
              onClick={loadData}
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    )
  }

  const selectedCollectionData = collections.find(c => c.name === selectedCollection)

  return (
    <>
      <Navigation currentPage="/azure-data-viewer" />
      <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto p-6">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure Data Viewer</h1>
          <p className="text-gray-600">View all saved collections from Azure Table Storage</p>
        </div>

        {/* Storage Mode Tabs */}
        <div className="mb-6">
          <div className="flex gap-2 border-b border-gray-200">
            <button
              onClick={() => {
                setActiveTab('enhanced')
                setSelectedCollection(null)
                loadData()
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'enhanced'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Enhanced Storage (3 Tables)
            </button>
            <button
              onClick={() => {
                setActiveTab('legacy')
                setSelectedCollection(null)
                loadData()
              }}
              className={`px-4 py-2 font-medium text-sm border-b-2 transition-colors ${
                activeTab === 'legacy'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              Legacy Storage (Single Table)
            </button>
          </div>
        </div>

        {/* Connection Status */}
        <div className={`mb-6 p-4 border rounded-lg ${
          activeTab === 'enhanced' 
            ? 'bg-blue-50 border-blue-200' 
            : 'bg-green-50 border-green-200'
        }`}>
          <div className="flex items-center gap-2">
            <div className={`w-3 h-3 rounded-full ${
              activeTab === 'enhanced' ? 'bg-blue-500' : 'bg-green-500'
            }`}></div>
            <span className={`font-medium ${
              activeTab === 'enhanced' ? 'text-blue-800' : 'text-green-800'
            }`}>
              {activeTab === 'enhanced' ? 'Enhanced Azure Storage' : 'Legacy Azure Storage'}
            </span>
          </div>
          <p className={`text-sm mt-1 ${
            activeTab === 'enhanced' ? 'text-blue-700' : 'text-green-700'
          }`}>
            {activeTab === 'enhanced' 
              ? `Using 3-table structure: soladata, solamonthlyallocation, solalockstates | Account: ${azureStatus?.accountName || "sola1"}`
              : `Using single table structure: soladata | Account: ${azureStatus?.accountName || "sola1"}`
            }
          </p>
        </div>

        {/* Enhanced Storage Summary */}
        {activeTab === 'enhanced' && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Main Data Table</h3>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-500">Projects:</span>
                  <span className="font-medium">{globalData?.projects?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Users:</span>
                  <span className="font-medium">{globalData?.users?.length || 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-500">Entities:</span>
                  <span className="font-medium">{globalData?.entities?.length || 0}</span>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Monthly Allocation Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{monthlyAllocationSummary.totalMonths}</div>
                  <div className="text-gray-500">Total Months</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{monthlyAllocationSummary.totalItems}</div>
                  <div className="text-gray-500">Total Items</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-purple-600">{monthlyAllocationSummary.activeMonths}</div>
                  <div className="text-gray-500">Active Months</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {(() => {
                      const [year, month] = monthlyAllocationSummary.latestMonth.split('-').map(Number)
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                      return monthNames[month] ? `${monthNames[month]} ${year}` : monthlyAllocationSummary.latestMonth
                    })()}
                  </div>
                  <div className="text-gray-500">Latest Month</div>
                </div>
              </div>
            </div>
            
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <h3 className="font-semibold text-gray-900 mb-2">Lock State Summary</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-2xl font-bold text-blue-600">{lockStateSummary.totalMonths}</div>
                  <div className="text-gray-500">Total Months</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-red-600">{lockStateSummary.lockedMonths}</div>
                  <div className="text-gray-500">Locked</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-bold text-green-600">{lockStateSummary.unlockedMonths}</div>
                  <div className="text-gray-500">Unlocked</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {(() => {
                      const [year, month] = lockStateSummary.latestLockedMonth.split('-').map(Number)
                      const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
                      return monthNames[month] ? `${monthNames[month]} ${year}` : lockStateSummary.latestLockedMonth
                    })()}
                  </div>
                  <div className="text-gray-500">Latest Locked</div>
                </div>
              </div>
            </div>
            
                      </div>
        )}

        {/* Collections Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
          {collections.map((collection) => (
            <div
              key={collection.name}
              className={`bg-white border rounded-lg p-4 cursor-pointer transition-all hover:shadow-md ${
                selectedCollection === collection.name ? 'border-blue-500 ring-2 ring-blue-200' : 'border-gray-200'
              }`}
              onClick={() => setSelectedCollection(selectedCollection === collection.name ? null : collection.name)}
            >
              <h3 className="font-semibold text-gray-900 mb-2">{collection.name}</h3>
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-blue-600">{collection.count}</span>
                <span className="text-sm text-gray-500">items</span>
              </div>
            </div>
          ))}
        </div>

        {/* Settings Summary */}
        <div className="bg-white border border-gray-200 rounded-lg p-4 mb-8">
          <h3 className="font-semibold text-gray-900 mb-3">Application Settings</h3>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-500">Start Month:</span>
              <span className="ml-2 font-medium">{globalData?.startMonth || 0}</span>
            </div>
            <div>
              <span className="text-gray-500">Start Year:</span>
              <span className="ml-2 font-medium">{globalData?.startYear || 2024}</span>
            </div>
          </div>
        </div>

        {/* Selected Collection Details */}
        {selectedCollectionData && (
          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="p-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-gray-900">{selectedCollectionData.name}</h2>
                <span className="text-sm text-gray-500">{selectedCollectionData.count} items</span>
              </div>
            </div>
            
            <div className="p-4">
              {selectedCollectionData.data.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <p>No data in this collection</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedCollectionData.data.map((item, index) => 
                    renderJsonItem(item, index, selectedCollectionData.name)
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Raw Data View */}
        <div className="mt-8 bg-white border border-gray-200 rounded-lg">
          <div className="p-4 border-b border-gray-200">
            <h2 className="text-xl font-semibold text-gray-900">Raw Global Data</h2>
          </div>
          <div className="p-4">
            <pre className="text-xs text-gray-700 overflow-x-auto whitespace-pre-wrap max-h-96">
              {JSON.stringify(globalData, null, 2)}
            </pre>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-8 flex gap-4">
          <button
            onClick={loadData}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Data
          </button>
          <button
            onClick={() => {
              const exportData = activeTab === 'enhanced' 
                ? { globalData, systemUsers, monthlyAllocations, lockStates }
                : { globalData, systemUsers }
              
              const dataStr = JSON.stringify(exportData, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `azure-data-${activeTab}-export-${new Date().toISOString().split('T')[0]}.json`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}
            className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
          >
            Export JSON
          </button>
        </div>
      </div>
    </div>
    </>
  )
}
