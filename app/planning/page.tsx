// Planning Page - Fixed getUserData imports - Updated: 2025-11-30 19:53
"use client"

import React, { useState, useEffect } from "react"
import type { Project, User, Allocation } from "@/lib/types"
import { getCurrentUser, getCurrentUserData, getCurrentSystemUser, getSystemUsers } from "@/lib/storage"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
]
const YEARS = Array.from({ length: 10 }, (_, i) => 2024 + i)

interface UnallocatedUser {
  user: User
  totalUnallocated: number
  monthlyBreakdown: { month: number; year: number; unallocated: number; displayName: string }[]
}

export default function PlanningPage() {
  const [currentUser, setCurrentUser] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<'admin' | 'editor' | 'viewer' | 'senior' | null>(null)
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [startMonth, setStartMonth] = useState(0)
  const [startYear, setStartYear] = useState(2024)
  const [viewMode, setViewMode] = useState<'percentage' | 'days'>('percentage')
  const [unallocatedUsers, setUnallocatedUsers] = useState<UnallocatedUser[]>([])

  // Check login status and load data on mount
  useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser()
      const systemUser = await getCurrentSystemUser()
      if (!user || !systemUser) {
        window.location.href = "/login"
        return
      }
      
      setCurrentUser(user)
      setCurrentUserRole(systemUser.role)

      // Load data based on user role
      if (systemUser.role === 'admin') {
        // Admin loads their own data
        const userData = await getCurrentUserData()
        setProjects(userData.projects)
        setUsers(userData.users.length > 0 ? userData.users : [
          { id: "1", name: "John Doe", department: "Engineering" },
          { id: "2", name: "Jane Smith", department: "Design" },
          { id: "3", name: "Bob Johnson", department: "Product" },
        ])
        setAllocations(userData.allocations)
      } else {
        const systemUsers = await getSystemUsers()
        const adminUser = systemUsers.find(u => u.role === 'admin' && u.isActive)
        
        if (adminUser) {
          const adminData = await getCurrentUserData()
          setProjects(adminData.projects)
          setUsers(adminData.users.length > 0 ? adminData.users : [
            { id: "1", name: "John Doe", department: "Engineering" },
            { id: "2", name: "Jane Smith", department: "Design" },
            { id: "3", name: "Bob Johnson", department: "Product" },
          ])
          setAllocations(adminData.allocations)
        }
      }
    }
    loadData()
  }, [])

  // Load saved view settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const userData = await getCurrentUserData()
        setStartMonth(userData.startMonth ?? 0)
        setStartYear(userData.startYear ?? 2024)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Calculate unallocated users whenever data changes
  useEffect(() => {
    calculateUnallocatedUsers()
  }, [users, allocations, startMonth, startYear, viewMode])

  // Helper to calculate working days in a month
  const getWorkingDaysInMonth = (year: number, month: number, startDay: number = 1): number => {
    const date = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let workingDays = 0
    
    for (let day = 1; day <= daysInMonth; day++) {
      date.setDate(day)
      const dayOfWeek = date.getDay() // 0 = Sunday, 6 = Saturday
      
      if (startDay === 1) {
        // Monday to Friday (1-5)
        if (dayOfWeek >= 1 && dayOfWeek <= 5) {
          workingDays++
        }
      } else {
        // Sunday to Thursday (0-4)
        if (dayOfWeek >= 0 && dayOfWeek <= 4) {
          workingDays++
        }
      }
    }
    
    return workingDays
  }

  // Helper to convert percentage to days based on user work pattern
  const getDaysFromPercentage = (user: User, monthIndex: number, percentage: number): number => {
    // Get the month and year from monthIndex
    const year = Math.floor(monthIndex / 12) + 2024
    const month = monthIndex % 12
    
    // Get working days based on user's work pattern
    const workPattern = user.workDays || 'mon-fri'
    const startDay = workPattern === 'mon-fri' ? 1 : 0
    const workingDays = getWorkingDaysInMonth(year, month, startDay)
    
    // Calculate days from percentage
    return Math.round((percentage / 100) * workingDays)
  }

  // Helper to check if user has ended by a given month
  const isUserEndedInMonth = (user: User, monthIndex: number): boolean => {
    if (!user?.endDate) return false
    
    const end = new Date(user.endDate)
    if (Number.isNaN(end.getTime())) return false
    
    const endMonth = end.getMonth() // 0-11
    const endYear = end.getFullYear()
    const endGlobalIndex = (endYear - 2024) * 12 + endMonth
    
    return monthIndex > endGlobalIndex
  }
  
  // Helper to check if user has started by a given month
  const isUserStartedInMonth = (user: User, monthIndex: number): boolean => {
    if (!user?.startDate) return true
    
    const start = new Date(user.startDate)
    if (Number.isNaN(start.getTime())) return true
    
    const startMonth = start.getMonth() // 0-11
    const startYear = start.getFullYear()
    const startGlobalIndex = (startYear - 2024) * 12 + startMonth
    
    return monthIndex >= startGlobalIndex
  }

  const calculateUnallocatedUsers = () => {
    const months = Array.from({ length: 12 }, (_, i) => {
      const date = new Date(startYear, startMonth + i, 1)
      const month = date.getMonth()
      const year = date.getFullYear()
      const globalIndex = (year - 2024) * 12 + month

      return {
        month,
        year,
        globalIndex,
        displayName: `${MONTHS[month].slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`,
      }
    })

    const unallocatedData: UnallocatedUser[] = users
      .filter(user => {
        // Only include users who are active during the selected timeframe
        const gridStartGlobalIndex = (startYear - 2024) * 12 + startMonth
        const gridEndGlobalIndex = gridStartGlobalIndex + 11

        // Check if user is active during any month in the grid
        return months.some(month => 
          isUserStartedInMonth(user, month.globalIndex) && 
          !isUserEndedInMonth(user, month.globalIndex)
        )
      })
      .map(user => {
        const monthlyBreakdown = months.map(month => {
          if (!isUserStartedInMonth(user, month.globalIndex) || isUserEndedInMonth(user, month.globalIndex)) {
            return {
              month: month.month,
              year: month.year,
              unallocated: 0,
              displayName: month.displayName
            }
          }

          const userAllocations = allocations.filter(
            a => a.userId === user.id && a.monthIndex === month.globalIndex
          )
          
          const totalAllocated = userAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
          const unallocated = Math.max(0, 100 - totalAllocated)

          return {
            month: month.month,
            year: month.year,
            unallocated,
            displayName: month.displayName
          }
        })

        const totalUnallocated = monthlyBreakdown.reduce((sum, month) => sum + month.unallocated, 0)

        return {
          user,
          totalUnallocated,
          monthlyBreakdown
        }
      })
      .filter(user => user.totalUnallocated > 0) // Only show users with some unallocated time
      .sort((a, b) => b.totalUnallocated - a.totalUnallocated) // Sort by most unallocated first

    setUnallocatedUsers(unallocatedData)
  }

  // Group users by department
  const groupedUnallocatedUsers = Array.from(
    unallocatedUsers.reduce((acc, userUser) => {
      const dept = userUser.user.department
      if (!acc.has(dept)) {
        acc.set(dept, [])
      }
      acc.get(dept)!.push(userUser)
      return acc
    }, new Map<string, UnallocatedUser[]>()),
  ).map(([dept, deptUsers]) => ({
    department: dept,
    users: deptUsers.sort((a, b) => b.totalUnallocated - a.totalUnallocated),
  })).sort((a, b) => a.department.localeCompare(b.department))

  const exportToExcel = () => {
    let csvContent = ""
    
    // Add header row
    const headerRow = ["Staff", "Department", "Total Unallocated", ...unallocatedUsers[0]?.monthlyBreakdown.map(m => m.displayName) || []]
    csvContent += headerRow.join(",") + "\n"
    
    // Add user data
    groupedUnallocatedUsers.forEach(group => {
      group.users.forEach(userUser => {
        const userRow = [
          userUser.user.name,
          userUser.user.department,
          viewMode === 'percentage' ? `${Math.round(userUser.totalUnallocated / 12)}%` : `${Math.round(getDaysFromPercentage(userUser.user, startMonth * 12 + startYear, userUser.totalUnallocated / 12))} days`,
          ...userUser.monthlyBreakdown.map(month => {
            if (viewMode === 'percentage') {
              return `${Math.round(month.unallocated)}%`
            } else {
              const days = getDaysFromPercentage(userUser.user, (month.year - 2024) * 12 + month.month, month.unallocated)
              return `${days} days`
            }
          })
        ]
        csvContent += userRow.join(",") + "\n"
      })
    })
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const fileName = `unallocated-staff-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation currentPage="/planning" />
      <div className="space-y-4 p-4">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">Planning - Unallocated Staff</h1>
          <div className="flex gap-3 items-end">
            <div className="space-y-1">
              <label className="block text-xs font-medium">Start Month</label>
              <select
                value={startMonth}
                onChange={(e) => setStartMonth(Number.parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {MONTHS.map((month, idx) => (
                  <option key={month} value={idx}>
                    {month}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1">
              <label className="block text-xs font-medium">Start Year</label>
              <select
                value={startYear}
                onChange={(e) => setStartYear(Number.parseInt(e.target.value))}
                className="border rounded px-2 py-1 text-sm"
              >
                {YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2 ml-3">
              <span className="text-xs text-gray-600">View:</span>
              <div className="flex border rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('percentage')}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  %
                </button>
                <button
                  onClick={() => setViewMode('days')}
                  className={`px-2 py-1 text-xs font-medium transition-colors ${
                    viewMode === 'days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Days
                </button>
              </div>
            </div>
            <button
              onClick={exportToExcel}
              className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
            >
              Export
            </button>
          </div>
        </div>

        {groupedUnallocatedUsers.length === 0 ? (
          <div className="text-center py-6 text-gray-500">
            <p className="text-base">No unallocated staff found in the selected time period.</p>
            <p className="text-xs mt-1">All staff members are fully allocated or there are no active staff members.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse border border-gray-200">
              <thead>
                <tr className="bg-gray-100">
                  <th className="border border-gray-200 px-3 py-1.5 text-left text-xs font-semibold text-gray-800 sticky left-0 bg-gray-100 z-10">
                    Staff Name
                  </th>
                  <th className="border border-gray-200 px-3 py-1.5 text-center text-xs font-semibold text-gray-800 sticky left-32 bg-gray-100 z-10 w-32">
                    Total
                  </th>
                  {Array.from({ length: 12 }, (_, i) => {
                    const date = new Date(startYear, startMonth + i, 1)
                    const month = date.getMonth()
                    const year = date.getFullYear()
                    const displayName = `${MONTHS[month].slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`
                    
                    return (
                      <th key={i} className="border border-gray-200 px-2 py-1.5 text-center text-xs font-semibold text-gray-800 min-w-20">
                        {displayName}
                      </th>
                    )
                  })}
                </tr>
              </thead>
              <tbody>
                {groupedUnallocatedUsers.map((group) => (
                  <React.Fragment key={group.department}>
                    <tr className="bg-gray-50">
                      <td colSpan={14} className="border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-700">
                        {group.department} ({group.users.length} staff)
                      </td>
                    </tr>
                    {group.users.map((userUser) => (
                      <tr key={userUser.user.id} className="hover:bg-gray-50">
                        <td className="border border-gray-200 px-3 py-1 text-xs font-medium sticky left-0 bg-white z-10">
                          {userUser.user.name}
                        </td>
                        <td className="border border-gray-200 px-3 py-1 text-center text-xs font-medium sticky left-32 bg-white z-10 w-32">
                          <span className="font-medium">
                            {viewMode === 'percentage' 
                              ? `${Math.round(userUser.totalUnallocated)}%`
                              : `${Math.round(userUser.totalUnallocated * 0.3)}d`
                            }
                          </span>
                          <span className="text-[10px] text-gray-500 ml-1">
                            ({viewMode === 'percentage' 
                              ? `${Math.round(userUser.totalUnallocated / 12)}% avg`
                              : `${Math.round(getDaysFromPercentage(userUser.user, startMonth * 12 + startYear, userUser.totalUnallocated / 12))}d avg`
                            })
                          </span>
                        </td>
                        {userUser.monthlyBreakdown.map((month) => (
                          <td
                            key={`${month.year}-${month.month}`}
                            className={`border border-gray-200 px-2 py-1 text-center text-xs font-medium ${
                              month.unallocated === 0 ? 'bg-gray-100' :
                              month.unallocated <= 25 ? 'bg-yellow-100' :
                              month.unallocated <= 50 ? 'bg-orange-100' :
                              month.unallocated <= 75 ? 'bg-red-100' : 'bg-red-200'
                            }`}
                          >
                            {month.unallocated === 0 ? (
                              <span className="text-gray-400">-</span>
                            ) : (
                              <span className="font-medium">
                                {viewMode === 'percentage' 
                                  ? `${Math.round(month.unallocated)}%`
                                  : `${getDaysFromPercentage(userUser.user, (month.year - 2024) * 12 + month.month, month.unallocated)}d`
                                }
                              </span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </main>
  )
}
