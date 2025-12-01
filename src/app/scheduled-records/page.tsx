"use client"

import { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { getCurrentUser, getCurrentUserData, setCurrentUserData } from "@/lib/storage-enhanced"

export default function ScheduledRecordsPage() {
  const [currentUser, setCurrentUserState] = useState<string | null>(null)
  const [records, setRecords] = useState<any[]>([])

  useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser()
      if (!user) {
        window.location.href = "/login"
        return
      }
      
      setCurrentUserState(user)
      
      try {
        const userData = await getCurrentUserData()
        setRecords(userData.scheduledRecords || [])
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    if (currentUser) {
      setCurrentUserData({ scheduledRecords: records })
    }
  }, [records, currentUser])

  return (
    <main className="min-h-screen bg-white">
      <Navigation currentPage="/scheduled-records" />
      <div className="p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Scheduled Records</h2>
        
        <div className="bg-white rounded-lg border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Scheduled Data Management</h3>
          <p className="text-gray-600">Scheduled records management will be added here.</p>
          
          {/* Demo content */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900 mb-2">Current Records</h4>
            {records.length === 0 ? (
              <p className="text-gray-500">No scheduled records yet. Add records to get started.</p>
            ) : (
              <div className="space-y-2">
                {records.map((record) => (
                  <div key={record.id} className="p-3 border border-gray-200 rounded">
                    <h5 className="font-medium">{record.name}</h5>
                    <p className="text-sm text-gray-600">
                      Scheduled: {record.date} | Type: {record.type}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}
