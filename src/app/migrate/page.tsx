"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { azureStorageEnhanced } from "@/lib/azure-enhanced"
import { initializeEnhancedStorage } from "@/lib/storage-enhanced"

export default function MigratePage() {
  const [isInitializing, setIsInitializing] = useState(false)
  const [isMigrating, setIsMigrating] = useState(false)
  const [logs, setLogs] = useState<string[]>([])
  const [status, setStatus] = useState<string>('')
  const [localStorageData, setLocalStorageData] = useState({
    users: 0,
    projects: 0,
    allocations: 0,
    entities: 0
  })

  useEffect(() => {
    // Only access localStorage on the client side
    if (typeof window !== 'undefined') {
      try {
        const storedData = localStorage.getItem('solafire_current_user_data')
        const data = storedData ? JSON.parse(storedData) : {}
        setLocalStorageData({
          users: data.users?.length || 0,
          projects: data.projects?.length || 0,
          allocations: data.allocations?.length || 0,
          entities: data.entities?.length || 0
        })
      } catch (error) {
        console.error('Error reading localStorage:', error)
      }
    }
  }, [])

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString()
    setLogs(prev => [...prev, `[${timestamp}] ${message}`])
  }

  const initializeTables = async () => {
    setIsInitializing(true)
    setStatus('Initializing Azure tables...')
    addLog('Starting Azure table initialization...')

    try {
      await initializeEnhancedStorage()
      addLog('✅ Azure tables initialized successfully')
      setStatus('Tables initialized successfully')
    } catch (error) {
      addLog(`❌ Failed to initialize tables: ${error}`)
      setStatus('Failed to initialize tables')
    } finally {
      setIsInitializing(false)
    }
  }

  const migrateData = async () => {
    setIsMigrating(true)
    setStatus('Migrating data from localStorage to Azure...')
    addLog('Starting migration from localStorage to Azure...')

    try {
      // Check if there's data to migrate
      const storedData = localStorage.getItem('solafire_current_user_data')
      if (!storedData) {
        addLog('❌ No data found in localStorage to migrate')
        setStatus('No data found to migrate')
        return
      }

      const data = JSON.parse(storedData)
      addLog(`Found data to migrate: ${data.projects?.length || 0} projects, ${data.users?.length || 0} users`)

      // Initialize tables first
      await initializeEnhancedStorage()
      addLog('✅ Azure tables initialized')

      // Perform migration
      await azureStorageEnhanced.migrateFromLocalStorage()
      addLog('✅ Migration completed successfully')
      setStatus('Migration completed successfully')

      // Clear logs after successful migration
      setTimeout(() => {
        setLogs([])
        setStatus('')
      }, 5000)

    } catch (error) {
      addLog(`❌ Migration failed: ${error}`)
      setStatus('Migration failed')
    } finally {
      setIsMigrating(false)
    }
  }

  const clearLogs = () => {
    setLogs([])
    setStatus('')
  }

  return (
    <main className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Azure Migration Utility</h1>
          <p className="text-gray-600">
            Migrate SolaFire data from localStorage to the enhanced Azure 3-table structure.
          </p>
        </div>

        {/* Status */}
        {status && (
          <div className={`p-4 rounded-lg border ${
            status.includes('successfully') 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{status}</p>
          </div>
        )}

        {/* Actions */}
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={initializeTables}
              disabled={isInitializing || isMigrating}
              variant="outline"
            >
              {isInitializing ? 'Initializing...' : 'Initialize Azure Tables'}
            </Button>

            <Button
              onClick={migrateData}
              disabled={isInitializing || isMigrating}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isMigrating ? 'Migrating...' : 'Migrate Data to Azure'}
            </Button>

            <Button
              onClick={clearLogs}
              variant="ghost"
            >
              Clear Logs
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-blue-900 mb-4">Migration Instructions</h2>
          <ol className="list-decimal list-inside space-y-2 text-blue-800">
            <li>First, click "Initialize Azure Tables" to create the required tables in Azure</li>
            <li>Then, click "Migrate Data to Azure" to transfer all localStorage data</li>
            <li>The migration will transfer:
              <ul className="list-disc list-inside ml-6 mt-2 space-y-1">
                <li>Main data (users, projects, entities, allocations, positions)</li>
                <li>Monthly allocation data for all months</li>
                <li>Lock states for all months</li>
              </ul>
            </li>
            <li>After migration, the application will automatically use Azure storage</li>
            <li>localStorage will serve as backup only</li>
          </ol>
        </div>

        {/* Table Structure Information */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Azure Table Structure</h2>
          <div className="space-y-4">
            <div>
              <h3 className="font-medium text-gray-800">1. soladata (Main Data)</h3>
              <p className="text-gray-600 text-sm">Stores users, projects, entities, allocations, and positions</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">2. solamonthlyallocation (Monthly Allocation)</h3>
              <p className="text-gray-600 text-sm">Stores calculated monthly allocation items per month</p>
            </div>
            <div>
              <h3 className="font-medium text-gray-800">3. solalockstates (Lock States)</h3>
              <p className="text-gray-600 text-sm">Stores payroll lock status per month</p>
            </div>
          </div>
        </div>

        {/* Logs */}
        {logs.length > 0 && (
          <div className="bg-gray-900 text-gray-100 rounded-lg p-4">
            <h3 className="font-medium mb-2">Migration Logs</h3>
            <div className="space-y-1 font-mono text-sm">
              {logs.map((log, index) => (
                <div key={index}>{log}</div>
              ))}
            </div>
          </div>
        )}

        {/* Current localStorage Status */}
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <h2 className="text-lg font-semibold text-yellow-900 mb-4">Current localStorage Status</h2>
          <div className="space-y-2 text-yellow-800">
            <div>Users: {localStorageData.users}</div>
            <div>Projects: {localStorageData.projects}</div>
            <div>Allocations: {localStorageData.allocations}</div>
            <div>Entities: {localStorageData.entities}</div>
          </div>
        </div>
      </div>
    </main>
  )
}
