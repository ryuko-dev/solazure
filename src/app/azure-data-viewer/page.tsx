"use client"

import React, { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { azureStorage } from "@/lib/azure-storage"
import { GlobalData, SystemUser } from "@/lib/azure-storage"

interface CollectionData {
  name: string
  data: any[]
  count: number
  lastUpdated?: string
}

export default function AzureDataViewer() {
  const [azureStatus, setAzureStatus] = useState<any>(null)
  const [globalData, setGlobalData] = useState<GlobalData | null>(null)
  const [systemUsers, setSystemUsers] = useState<SystemUser[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCollection, setSelectedCollection] = useState<string | null>(null)
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set())

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
      
      // Load global data using API
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
      
      console.log("Data Loaded:", { globalData, systemUsers, azureStatus })
    } catch (err) {
      console.error("Error loading data:", err)
      setError(err instanceof Error ? err.message : "Failed to load data")
    } finally {
      setLoading(false)
    }
  }

  const collections: CollectionData[] = [
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
              {item.id || item.name || `Item ${index + 1}`}
            </span>
          </div>
          <span className="text-xs text-gray-500">
            {Object.keys(item).length} properties
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
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Viewer</h1>
          <p className="text-gray-600">View all saved collections from application storage</p>
        </div>

        {/* Connection Status */}
        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span className="text-green-800 font-medium">Connected to Storage</span>
          </div>
          <p className="text-green-700 text-sm mt-1">
            {azureStatus?.isConfigured ? 
              `Using Azure Table Storage | Table: ${azureStatus.tableName} | Account: ${azureStatus.accountName}` :
              `Using localStorage fallback (Azure not configured) | Table: ${azureStatus?.tableName || "soladata"} | Account: ${azureStatus?.accountName || "sola1"}`
            }
          </p>
        </div>

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
              const dataStr = JSON.stringify({ globalData, systemUsers }, null, 2)
              const blob = new Blob([dataStr], { type: 'application/json' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `azure-data-export-${new Date().toISOString().split('T')[0]}.json`
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
