"use client"

import React, { useState, useEffect } from "react"
import { Navigation } from "@/components/navigation"
import { getCurrentUser, getCurrentUserData, setCurrentUserData } from "@/lib/storage-enhanced"

export default function PlanningPage() {
  const [currentUser, setCurrentUserState] = useState<string | null>(null)
  const [projects, setProjects] = useState<any[]>([])
  const [users, setUsers] = useState<any[]>([])
  const [allocations, setAllocations] = useState<any[]>([])
  const [positions, setPositions] = useState<any[]>([])
  const [startMonth, setStartMonth] = useState(0)
  const [startYear, setStartYear] = useState(2024)

  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]

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
        setProjects(userData.projects || [])
        setUsers(userData.users || [])
        setAllocations(userData.allocations || [])
        setPositions(userData.positions || [])
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }
    
    loadData()
  }, [])

  useEffect(() => {
    if (currentUser && projects.length > 0) {
      setCurrentUserData({ projects })
    }
  }, [projects, currentUser])

  useEffect(() => {
    if (currentUser && users.length > 0) {
      setCurrentUserData({ users })
    }
  }, [users, currentUser])

  // Helper to convert percentage to days based on user work pattern
  const getDaysFromPercentage = (userId: string, monthIndex: number, percentage: number): number => {
    const user = users.find((u) => u.id === userId)
    if (!user) return 0
    
    // Get the month and year from monthIndex
    const year = Math.floor(monthIndex / 12) + 2024
    const month = monthIndex % 12
    
    // Get working days in month (assuming 22 working days per month for simplicity)
    const workingDays = 22 // This could be enhanced with actual calendar logic
    
    return Math.round((percentage / 100) * workingDays)
  }

  // Get display months starting from the selected start month/year
  const getDisplayMonths = () => {
    const startGlobalIndex = (startYear - 2024) * 12 + startMonth
    return months.map((month, index) => ({
      name: month,
      globalIndex: startGlobalIndex + index,
      displayName: `${month} ${startYear}`
    }))
  }

  // Sync with allocation page settings using the same data persistence
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userData = await getCurrentUserData()
        setStartMonth(userData.startMonth ?? 0)
        setStartYear(userData.startYear ?? 2024)
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    loadSettings()
  }, [])

  // Persist starting month/year when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      setCurrentUserData({ startMonth, startYear })
    }
  }, [startMonth, startYear, currentUser])

  // Helper to check if user has ended by a given month
  const isUserEndedInMonth = (userId: string, monthIndex: number): boolean => {
    const user = users.find((u) => u.id === userId)
    if (!user?.endDate) return false
    
    const end = new Date(user.endDate)
    if (Number.isNaN(end.getTime())) return false
    
    const endMonth = end.getMonth() // 0-11
    const endYear = end.getFullYear()
    const endGlobalIndex = (endYear - 2024) * 12 + endMonth
    
    return monthIndex > endGlobalIndex
  }
  
  // Helper to check if user has started by a given month
  const isUserStartedInMonth = (userId: string, monthIndex: number): boolean => {
    const user = users.find((u) => u.id === userId)
    if (!user?.startDate) return true
    
    const start = new Date(user.startDate)
    if (Number.isNaN(start.getTime())) return true
    
    const startMonth = start.getMonth() // 0-11
    const startYear = start.getFullYear()
    const startGlobalIndex = (startYear - 2024) * 12 + startMonth
    
    return monthIndex >= startGlobalIndex
  }

  // Get unallocated staff data grouped by department
  const getUnallocatedStaffByDepartment = () => {
    const displayMonths = getDisplayMonths()
    
    // Get all staff with availability data
    const staffWithAvailability = users.map(user => {
      const monthData = displayMonths.map(month => {
        const userEnded = isUserEndedInMonth(user.id, month.globalIndex)
        const userNotStarted = !isUserStartedInMonth(user.id, month.globalIndex)
        
        if (userEnded || userNotStarted) {
          return {
            monthIndex: month.globalIndex,
            status: userEnded ? 'ended' : 'not started',
            totalAllocated: 0,
            available: 0,
            allocations: []
          }
        }
        
        const userAllocations = allocations.filter(a => a.userId === user.id && a.monthIndex === month.globalIndex)
        const totalAllocated = userAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
        const available = 100 - totalAllocated
        
        return {
          monthIndex: month.globalIndex,
          status: 'active',
          totalAllocated,
          available,
          allocations: userAllocations
        }
      })
      
      const hasAnyAvailability = monthData.some(data => data.available > 0 && data.status === 'active')
      
      return {
        ...user,
        monthData,
        hasAnyAvailability
      }
    }).filter(staff => staff.hasAnyAvailability)
    
    // Group by department
    const groupedByDepartment = staffWithAvailability.reduce((groups: any, staff) => {
      const department = staff.department || 'Unassigned'
      if (!groups[department]) {
        groups[department] = []
      }
      groups[department].push(staff)
      return groups
    }, {})
    
    return groupedByDepartment
  }

  const unallocatedStaffByDepartment = getUnallocatedStaffByDepartment()
  const displayMonths = getDisplayMonths()

  return (
    <main className="min-h-screen bg-white">
      <Navigation currentPage="/planning" />
      <div className="p-4">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-bold text-gray-900">Planning</h2>
          <div className="flex gap-4 items-end">
            <div className="space-y-2">
              <label className="block text-sm font-medium">Starting Month</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number.parseInt(e.target.value))}
                className="border rounded px-2 py-1"
              >
                {months.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="block text-sm font-medium">Starting Year</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number.parseInt(e.target.value))}
                className="border rounded px-2 py-1"
              >
                <option value={2024}>2024</option>
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
              </select>
            </div>
          </div>
        </div>

        {/* Planning - Unallocated Staff Table by Department */}
        <div className="bg-white rounded-lg border border-gray-200 p-4">
          <h3 className="text-base font-semibold text-gray-900 mb-3">Planning - Unallocated Staff</h3>
          
          {Object.keys(unallocatedStaffByDepartment).length === 0 ? (
            <div className="text-center py-6 text-gray-500">
              <p>No unallocated staff for this period</p>
              <p className="text-sm mt-1">All staff are fully allocated or no staff data available.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-sm">
                <thead>
                  <tr className="bg-gray-50">
                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 text-xs">Department</th>
                    <th className="border border-gray-300 px-2 py-1 text-left font-semibold text-gray-700 text-xs">Staff Name</th>
                    {displayMonths.map((month) => (
                      <th key={month.globalIndex} className="border border-gray-300 px-1 py-1 text-center font-semibold text-gray-700 text-xs min-w-16">
                        {month.name.slice(0, 3)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {Object.entries(unallocatedStaffByDepartment).map(([department, staffList]: [string, any]) => (
                    <React.Fragment key={department}>
                      {/* Department header row */}
                      <tr className="bg-gray-100">
                        <td className="border border-gray-300 px-2 py-1 font-semibold text-gray-700 text-xs" colSpan={2 + displayMonths.length}>
                          {department} ({staffList.length} staff)
                        </td>
                      </tr>
                      {/* Staff rows for this department */}
                      {staffList.map((staff: any) => (
                        <tr key={staff.id} className="hover:bg-gray-50">
                          <td className="border border-gray-300 px-2 py-1"></td>
                          <td className="border border-gray-300 px-2 py-1 font-medium text-xs">
                            {staff.name}
                          </td>
                          {staff.monthData.map((monthData: any) => {
                            if (monthData.status === 'ended') {
                              return (
                                <td key={monthData.monthIndex} className="border border-gray-300 p-0.5 text-center">
                                  <div className="w-full h-6 flex items-center justify-center text-[8px] font-semibold text-gray-500 bg-gray-200">
                                    ended
                                  </div>
                                </td>
                              )
                            } else if (monthData.status === 'not started') {
                              return (
                                <td key={monthData.monthIndex} className="border border-gray-300 p-0.5 text-center">
                                  <div className="w-full h-6 flex items-center justify-center text-[8px] font-semibold text-gray-500 bg-gray-200">
                                    not started
                                  </div>
                                </td>
                              )
                            } else {
                              const barColor = monthData.totalAllocated >= 90 && monthData.totalAllocated <= 110 
                                ? '#2d7b51'  // Green for 90-110%
                                : monthData.totalAllocated < 90 
                                  ? '#BB7D63' // Brown for <90%
                                  : '#A82A00' // Red for >110%
                              
                              return (
                                <td key={monthData.monthIndex} className="border border-gray-300 p-0.5 text-center">
                                  {monthData.available > 0 ? (
                                    <div className="w-full h-6 flex flex-col justify-center">
                                      <div className="w-full h-3 bg-gray-200 rounded mb-0.5">
                                        <div 
                                          className="h-full rounded transition-all duration-300"
                                          style={{ 
                                            width: `${Math.min(100, monthData.totalAllocated)}%`,
                                            backgroundColor: barColor
                                          }}
                                        />
                                      </div>
                                      <div className="text-[8px] font-bold text-blue-600">
                                        {Math.round(monthData.available)}%
                                      </div>
                                    </div>
                                  ) : (
                                    <div className="w-full h-6 flex items-center justify-center text-[8px] font-semibold text-gray-400">
                                      0%
                                    </div>
                                  )}
                                </td>
                              )
                            }
                          })}
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  )
}
