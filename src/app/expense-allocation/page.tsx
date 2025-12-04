"use client"

import * as React from "react"
import type { User, Project, Allocation } from "@/lib/types"
import { getGlobalData, getCurrentSystemUser } from "@/lib/storage-enhanced"
import { canEditPage, UserRole } from "@/lib/permissions"
// using group-specific start-settings for persistence
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"
import Link from "next/link"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

interface ExpenseAllocationRow {
  id: string
  entity: string
  description: string
  currency: string
  amount: number
  projectAmounts: Record<string, number>
}

export default function ExpenseAllocationPage() {
  const [currentUser, setCurrentUser] = React.useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = React.useState<UserRole | null>(null)
  
  // Initialize with shared month/year state (expense/scheduled/payroll group)
  const [selectedMonth, setSelectedMonth] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedGroup = localStorage.getItem('sola-start-expense-payroll')
      if (storedGroup) {
        try {
          const parsed = JSON.parse(storedGroup)
          if (typeof parsed.month === 'number') return parsed.month
        } catch {}
      }
      const stored = localStorage.getItem('sola-selected-month')
      if (stored) return Number(stored)
      return new Date().getMonth()
    }
    return new Date().getMonth()
  })

  const [selectedYear, setSelectedYear] = React.useState<number>(() => {
    if (typeof window !== 'undefined') {
      const storedGroup = localStorage.getItem('sola-start-expense-payroll')
      if (storedGroup) {
        try {
          const parsed = JSON.parse(storedGroup)
          if (typeof parsed.year === 'number') return parsed.year
        } catch {}
      }
      const stored = localStorage.getItem('sola-selected-year')
      if (stored) return Number(stored)
      return new Date().getFullYear()
    }
    return new Date().getFullYear()
  })
  
  const [users, setUsers] = React.useState<User[]>([])
  const [projects, setProjects] = React.useState<Project[]>([])
  const [allocations, setAllocations] = React.useState<Allocation[]>([])
  const [expenseRows, setExpenseRows] = React.useState<ExpenseAllocationRow[]>([])
  const [selectedEntity, setSelectedEntity] = React.useState<string | null>(null)
  const [showEntityUsers, setShowEntityUsers] = React.useState<boolean>(false)
  const [descriptionFilter, setDescriptionFilter] = React.useState<string>("")
  const [isPayrollLocked, setIsPayrollLocked] = React.useState<boolean>(false)
  const [isClient, setIsClient] = React.useState<boolean>(false)

  // Update shared state when month/year changes
  const updateMonthYear = React.useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    // Persist group-level settings (expense/scheduled/payroll)
    import('@/lib/start-settings').then(({ setStartForGroup }) => {
      setStartForGroup('expensePayroll', month, year).catch(err => console.error('Failed to save group start:', err))
    }).catch(err => console.error('Failed to load start-settings:', err))
  }, [])

  // Persist selected month/year to group-specific storage when they change
  React.useEffect(() => {
    // setStartForGroup is already called by updateMonthYear when the user changes via UI.
    // Keep a local copy in the group key so other pages in the same group read it synchronously.
    if (typeof window !== 'undefined') {
      try {
        const groupKey = JSON.stringify({ month: selectedMonth, year: selectedYear })
        localStorage.setItem('sola-start-expense-payroll', groupKey)
      } catch (err) {
        console.error('Failed to write group start key to localStorage:', err)
      }
    }
  }, [selectedMonth, selectedYear])

  // Handle client-side hydration
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // Load persisted group start settings on mount
  React.useEffect(() => {
    const load = async () => {
      try {
        const { getStartForGroup } = await import('@/lib/start-settings')
        const { month, year } = await getStartForGroup('expensePayroll')
        setSelectedMonth(month)
        setSelectedYear(year)
      } catch (error) {
        console.error('Failed to load expense group start settings:', error)
      }
    }
    load()
  }, [])

  // Load user data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      const user = localStorage.getItem('sola-current-user')
      const systemUser = await getCurrentSystemUser()

      if (!user || !systemUser) {
        console.log('[expense-allocation] No current user found; redirecting to login')
        window.location.href = '/login'
        return
      } else {
        setCurrentUser(user)
        // Cast the role from SystemUser to UserRole
        setCurrentUserRole(systemUser.role as UserRole)
      }

      // Load data from global storage (await since it's async)
      const globalData = await getGlobalData()
      setUsers(globalData.users || [])
      setProjects(globalData.projects || [])
      setAllocations(globalData.allocations || [])
    }
    
    loadData()
  }, [])

  // Load expense allocation data when month changes or user is set
  React.useEffect(() => {
    if (!currentUser) return
    
    const monthKey = `${selectedYear}-${selectedMonth}`
    const savedExpenseRows = localStorage.getItem(`sola-expense-allocation-${currentUser}-${monthKey}`)
    if (savedExpenseRows) {
      try {
        setExpenseRows(JSON.parse(savedExpenseRows))
      } catch (error) {
        console.error('Error parsing expense rows:', error)
        setExpenseRows([])
      }
    } else {
      setExpenseRows([])
    }
  }, [selectedMonth, selectedYear, currentUser])

  // Save expense allocation data when it changes
  React.useEffect(() => {
    if (!currentUser) return
    
    const monthKey = `${selectedYear}-${selectedMonth}`
    localStorage.setItem(`sola-expense-allocation-${currentUser}-${monthKey}`, JSON.stringify(expenseRows))
  }, [expenseRows, selectedMonth, selectedYear, currentUser])

  // Calculate average % allocation by project for each entity
  const entityProjectAllocations = React.useMemo(() => {
    const monthIndex = (selectedYear - 2024) * 12 + selectedMonth
    
    // Get active projects for the selected month
    const activeProjects = projects.filter(project => {
      const projectStartMonth = ((project.startYear || 2024) - 2024) * 12 + (project.startMonth || 0)
      const projectEndMonth = ((project.endYear || 2024) - 2024) * 12 + (project.endMonth || 11)
      return monthIndex >= projectStartMonth && monthIndex <= projectEndMonth
    })

    // Group users by entity
    const entityGroups: Record<string, User[]> = {}
    users.forEach(user => {
      const entity = user.entity || "Unassigned"
      if (!entityGroups[entity]) {
        entityGroups[entity] = []
      }
      entityGroups[entity].push(user)
    })

    // Calculate entity allocation by averaging user percentages (not total hours)
    const entityProjectAllocations: Record<string, Record<string, number>> = {}

    Object.entries(entityGroups).forEach(([entity, entityUsers]) => {
      entityProjectAllocations[entity] = {}
      
      activeProjects.forEach(project => {
        const userPercentages: number[] = []
        
        entityUsers.forEach(user => {
          // Get project data from user's projectDataByMonth
          const monthKey = `${selectedYear}-${selectedMonth}`
          const projectData = (user as any).projectDataByMonth?.[monthKey] || {}
          const userProjectHours = projectData[project.id] || 0
          
          // Calculate this user's total hours across all projects
          const totalUserHours = activeProjects.reduce((total, project) => total + (projectData[project.id] || 0), 0)
          
          // Calculate this user's percentage for this project
          if (totalUserHours > 0) {
            const userPercentage = (userProjectHours / totalUserHours) * 100
            userPercentages.push(userPercentage)
          }
        })
        
        // Calculate average percentage for this entity-project combination
        if (userPercentages.length > 0) {
          const averagePercentage = userPercentages.reduce((sum, percentage) => sum + percentage, 0) / userPercentages.length
          entityProjectAllocations[entity][project.name] = averagePercentage
        } else {
          entityProjectAllocations[entity][project.name] = 0
        }
      })
    })

    return entityProjectAllocations
  }, [users, projects, allocations, selectedMonth, selectedYear])

  // Get unique projects for columns
  const uniqueProjects = React.useMemo(() => {
    const monthIndex = (selectedYear - 2024) * 12 + selectedMonth
    return projects
      .filter(project => {
        const projectStartMonth = ((project.startYear || 2024) - 2024) * 12 + (project.startMonth || 0)
        const projectEndMonth = ((project.endYear || 2024) - 2024) * 12 + (project.endMonth || 11)
        return monthIndex >= projectStartMonth && monthIndex <= projectEndMonth
      })
      .map(p => p.name)
      .sort()
  }, [projects, selectedMonth, selectedYear])

  // Get unique entities for dropdown
  const uniqueEntities = React.useMemo(() => {
    const entities = new Set<string>()
    users.forEach(user => {
      if (user.entity) {
        entities.add(user.entity)
      }
    })
    return Array.from(entities).sort()
  }, [users])

  // Check if current user has permission for editing
  const canEdit = currentUserRole ? canEditPage(currentUserRole) : false

  // Add new expense row
  const addExpenseRow = () => {
    const newRow: ExpenseAllocationRow = {
      id: Date.now().toString(),
      entity: uniqueEntities[0] || '',
      description: '',
      currency: 'USD',
      amount: 0,
      projectAmounts: {}
    }
    
    // Initialize project amounts
    uniqueProjects.forEach(project => {
      newRow.projectAmounts[project] = 0
    })
    
    setExpenseRows([...expenseRows, newRow])
  }

  // Update expense row
  const updateExpenseRow = (id: string, field: keyof ExpenseAllocationRow, value: string | number) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { ...row, [field]: value } : row
    ))
  }

  // Update project amount for expense row
  const updateProjectAmount = (id: string, project: string, value: number) => {
    setExpenseRows(expenseRows.map(row => 
      row.id === id ? { 
        ...row, 
        projectAmounts: { ...row.projectAmounts, [project]: value }
      } : row
    ))
  }

  // Delete expense row
  const deleteExpenseRow = (id: string) => {
    setExpenseRows(expenseRows.filter(row => row.id !== id))
  }

  // Handle entity click in summary table
  const handleEntityClick = (entity: string) => {
    if (selectedEntity === entity && showEntityUsers) {
      // If already selected, toggle off
      setSelectedEntity(null)
      setShowEntityUsers(false)
    } else {
      // Select new entity
      setSelectedEntity(entity)
      setShowEntityUsers(true)
    }
  }

  // Calculate user project percentages for selected entity
  const entityUserProjectAllocations = React.useMemo(() => {
    if (!selectedEntity || !showEntityUsers) return {}

    const monthIndex = (selectedYear - 2024) * 12 + selectedMonth
    
    // Get active projects for the selected month
    const activeProjects = projects.filter(project => {
      const projectStartMonth = ((project.startYear || 2024) - 2024) * 12 + (project.startMonth || 0)
      const projectEndMonth = ((project.endYear || 2024) - 2024) * 12 + (project.endMonth || 11)
      return monthIndex >= projectStartMonth && monthIndex <= projectEndMonth
    })

    // Get users for the selected entity
    const entityUsers = users.filter(user => user.entity === selectedEntity)

    // Calculate project percentages for each user
    const userProjectAllocations: Record<string, Record<string, number>> = {}

    entityUsers.forEach(user => {
      userProjectAllocations[user.name] = {}
      
      // Get project data from user's projectDataByMonth
      const monthKey = `${selectedYear}-${selectedMonth}`
      const projectData = (user as any).projectDataByMonth?.[monthKey] || {}
      
      // Calculate this user's total hours across all projects
      const totalUserHours = activeProjects.reduce((total, project) => total + (projectData[project.id] || 0), 0)
      
      // Calculate percentage for each project
      activeProjects.forEach(project => {
        const userProjectHours = projectData[project.id] || 0
        if (totalUserHours > 0) {
          userProjectAllocations[user.name][project.name] = (userProjectHours / totalUserHours) * 100
        } else {
          userProjectAllocations[user.name][project.name] = 0
        }
      })
    })

    return userProjectAllocations
  }, [selectedEntity, showEntityUsers, users, projects, selectedMonth, selectedYear])

  // Filter expense rows by selected entity and description
  const filteredExpenseRows = React.useMemo(() => {
    let filtered = expenseRows
    
    // Filter by entity
    if (selectedEntity) {
      filtered = filtered.filter(row => row.entity === selectedEntity)
    }
    
    // Filter by description
    if (descriptionFilter.trim()) {
      filtered = filtered.filter(row => 
        row.description.toLowerCase().includes(descriptionFilter.toLowerCase().trim())
      )
    }
    
    return filtered
  }, [expenseRows, selectedEntity, descriptionFilter])

  // Filter entity allocations by selected entity
  const filteredEntityAllocations = React.useMemo(() => {
    if (!selectedEntity) return entityProjectAllocations
    return { [selectedEntity]: entityProjectAllocations[selectedEntity] }
  }, [entityProjectAllocations, selectedEntity])

  // Check if payroll allocation is locked for the selected month
  React.useEffect(() => {
    const checkLockState = () => {
      const monthKey = `${selectedYear}-${selectedMonth}`
      const lockState = localStorage.getItem(`sola-lock-state-${monthKey}`)
      const newState = lockState === 'true'
      console.log(`Checking lock state for ${monthKey}:`, lockState, newState)
      setIsPayrollLocked(newState)
    }

    // Initial check
    checkLockState()

    // Listen for storage changes
    const handleStorageChange = (e: StorageEvent) => {
      console.log('Storage change detected:', e.key, e.newValue)
      if (e.key === `sola-lock-state-${selectedYear}-${selectedMonth}`) {
        checkLockState()
      }
    }

    // Also listen for any localStorage changes (same tab)
    let storageTimer: NodeJS.Timeout
    const monitorStorage = () => {
      const currentLockState = localStorage.getItem(`sola-lock-state-${selectedYear}-${selectedMonth}`)
      const isLocked = currentLockState === 'true'
      
      // Check if state changed
      setIsPayrollLocked(prevState => {
        if (prevState !== isLocked) {
          console.log(`Lock state changed from ${prevState} to ${isLocked}`)
          return isLocked
        }
        return prevState
      })
    }

    // Set up periodic monitoring
    storageTimer = setInterval(monitorStorage, 500)

    // Also check when window gets focus
    const handleWindowFocus = () => {
      console.log('Window focused, checking lock state')
      checkLockState()
    }

    // Also check when page becomes visible
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        console.log('Page became visible, checking lock state')
        checkLockState()
      }
    }

    window.addEventListener('storage', handleStorageChange)
    window.addEventListener('focus', handleWindowFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    // Cleanup
    return () => {
      window.removeEventListener('storage', handleStorageChange)
      window.removeEventListener('focus', handleWindowFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      if (storageTimer) clearInterval(storageTimer)
    }
  }, [selectedMonth, selectedYear])

  // Export to PDF functionality
  const exportToPDF = () => {
    window.print()
  }

  // Manual refresh of lock state
  const refreshLockState = () => {
    const monthKey = `${selectedYear}-${selectedMonth}`
    const lockState = localStorage.getItem(`sola-lock-state-${monthKey}`)
    const newState = lockState === 'true'
    console.log(`Manual refresh - Lock state for ${monthKey}:`, lockState, newState)
    setIsPayrollLocked(newState)
  }

  // Calculate project amounts when entity or total amount changes
  React.useEffect(() => {
    expenseRows.forEach(row => {
      if (row.entity && row.amount > 0) {
        const newProjectAmounts: Record<string, number> = {}
        uniqueProjects.forEach(project => {
          const percentage = entityProjectAllocations[row.entity]?.[project] || 0
          newProjectAmounts[project] = (row.amount * percentage) / 100
        })
        
        // Update row if project amounts changed
        const currentProjectAmounts = JSON.stringify(row.projectAmounts)
        const newProjectAmountsStr = JSON.stringify(newProjectAmounts)
        if (currentProjectAmounts !== newProjectAmountsStr) {
          setExpenseRows(expenseRows.map(r => 
            r.id === row.id ? { 
              ...r, 
              projectAmounts: newProjectAmounts
            } : r
          ))
        }
      }
    })
  }, [entityProjectAllocations, expenseRows.map(r => `${r.entity}-${r.amount}`).join(','), uniqueProjects])

  if (!isClient) {
    return null
  }

  return (
    <>
      <style jsx global>{`
        @media print {
          body {
            -webkit-print-color-adjust: exact;
            color-adjust: exact;
          }
          
          nav {
            display: none !important;
          }
          
          button:not(.print-visible) {
            display: none !important;
          }
          
          .no-print {
            display: none !important;
          }
          
          .print-only {
            display: block !important;
          }
          
          table {
            page-break-inside: avoid;
          }
          
          tr {
            page-break-inside: avoid;
          }
          
          td, th {
            page-break-inside: avoid;
          }
        }
        
        .print-only {
          display: none;
        }
      `}</style>
      
      <main className="min-h-screen bg-background">
      <Navigation currentPage="/expense-allocation" />
      <div className="p-6">
        {/* Warning Message - Only show if payroll is not locked */}
        {!isPayrollLocked && (
          <div className="mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
            <div className="flex items-start">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3 flex-1">
                <h3 className="text-sm font-medium text-yellow-800">
                  Payroll Allocation Not Locked
                </h3>
                <div className="mt-2 text-sm text-yellow-700">
                  <p>
                    The payroll allocation for <strong>{MONTHS[selectedMonth]} {selectedYear}</strong> is not yet locked. 
                    Expense allocations may change if payroll data is modified.
                  </p>
                  <p className="mt-1">
                    Please lock the payroll allocation in the <strong>Payroll Allocation</strong> page to finalize the data.
                  </p>
                </div>
                <div className="mt-3 flex items-center gap-3">
                  <Link
                    href="/actual-allocation"
                    className="text-sm font-medium text-yellow-800 hover:text-yellow-900 underline"
                  >
                    Go to Payroll Allocation →
                  </Link>
                  <button
                    onClick={refreshLockState}
                    className="text-sm font-medium text-yellow-700 hover:text-yellow-800 underline"
                  >
                    🔄 Refresh Status
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Print Header - Only visible when printing */}
        <div className="print-only mb-6 text-center">
          <h1 className="text-2xl font-bold text-gray-800 mb-2">Expense Allocation Report</h1>
          <p className="text-lg text-gray-600">Period: {MONTHS[selectedMonth]} {selectedYear}</p>
          {selectedEntity && (
            <p className="text-md text-gray-500 mt-1">Filtered by Entity: {selectedEntity}</p>
          )}
          <p className="text-sm text-gray-400 mt-2">Generated on: {new Date().toLocaleDateString()}</p>
          {!isPayrollLocked && (
            <p className="text-xs text-orange-500 mt-1 font-medium">⚠️ Payroll Allocation Not Locked</p>
          )}
        </div>

        <div className="flex justify-between items-center mb-6 no-print">
          <h2 className="text-xl font-semibold text-gray-800">Expense Allocation</h2>
          <div className="flex gap-3 items-center">
            {/* Month/Year Selectors */}
            <div className="flex gap-2 items-center">
              <select
                value={selectedMonth}
                onChange={(e) => updateMonthYear(Number(e.target.value), selectedYear)}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {MONTHS.map((month, idx) => (
                  <option key={idx} value={idx}>{month}</option>
                ))}
              </select>
              <select
                value={selectedYear}
                onChange={(e) => updateMonthYear(selectedMonth, Number(e.target.value))}
                className="border border-gray-300 rounded px-2 py-1 text-sm"
              >
                {[2023, 2024, 2025, 2026, 2027].map(year => (
                  <option key={year} value={year}>{year}</option>
                ))}
              </select>
            </div>
            
            {/* Lock Status and Logout */}
            <div className="flex gap-2 items-center">
              {isPayrollLocked && (
                <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  Locked
                </div>
              )}
              <Button
                onClick={() => {
                  const user = localStorage.getItem('sola-current-user')
                  if (user) {
                    window.location.href = "/login"
                  }
                }}
                variant="outline"
                size="sm"
              >
                Logout
              </Button>
            </div>
          </div>
        </div>

        {uniqueProjects.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-lg">No projects found for the selected month.</p>
            <p className="text-sm mt-2">Please ensure there are active projects for {MONTHS[selectedMonth]} {selectedYear}.</p>
          </div>
        ) : (
          <>
            {/* Entity Allocation Summary Table - Compact */}
            <div className="mb-8">
              <div className="flex justify-between items-center mb-3">
                <h3 className="text-lg font-medium text-gray-700">Entity Allocation Summary</h3>
                <div className="flex gap-2">
                  {selectedEntity && (
                    <Button
                      onClick={() => {
                        setSelectedEntity(null)
                        setShowEntityUsers(false)
                      }}
                      variant="outline"
                      size="sm"
                    >
                      Clear Filter
                    </Button>
                  )}
                  <Button onClick={exportToPDF} variant="outline" size="sm">
                    📄 Export PDF
                  </Button>
                </div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left text-xs font-semibold">Entity</th>
                      {uniqueProjects.map(project => (
                        <th key={project} className="border border-gray-300 p-2 bg-gray-50 text-right text-xs font-semibold whitespace-nowrap">
                          {project}
                        </th>
                      ))}
                      <th className="border border-gray-300 p-2 bg-gray-50 text-right text-xs font-semibold">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(filteredEntityAllocations).map(([entity, projectAllocations]) => {
                      const entityTotal = Object.values(projectAllocations).reduce((sum, allocation) => sum + allocation, 0)
                      const isSelected = selectedEntity === entity && showEntityUsers
                      
                      return (
                        <React.Fragment key={entity}>
                          <tr className={isSelected ? "bg-blue-50" : ""}>
                            <td className="border border-gray-300 p-2 text-xs font-medium">
                              <button
                                onClick={() => handleEntityClick(entity)}
                                className="text-blue-600 hover:text-blue-800 underline cursor-pointer"
                              >
                                {entity}
                              </button>
                            </td>
                            {uniqueProjects.map(project => (
                              <td key={project} className="border border-gray-300 p-2 text-xs text-right">
                                {(projectAllocations[project] || 0).toFixed(1)}%
                              </td>
                            ))}
                            <td className="border border-gray-300 p-2 text-xs text-right font-bold">
                              {entityTotal.toFixed(1)}%
                            </td>
                          </tr>
                          {isSelected && Object.entries(entityUserProjectAllocations).map(([userName, userAllocations]) => (
                            <tr key={`${entity}-${userName}`} className="bg-gray-50">
                              <td className="border border-gray-300 p-2 text-xs pl-6 text-gray-600">
                                👤 {userName}
                              </td>
                              {uniqueProjects.map(project => (
                                <td key={project} className="border border-gray-300 p-2 text-xs text-right text-gray-600">
                                  {(userAllocations[project] || 0).toFixed(1)}%
                                </td>
                              ))}
                              <td className="border border-gray-300 p-2 text-xs text-right font-bold text-gray-600">
                                {Object.values(userAllocations).reduce((sum, allocation) => sum + allocation, 0).toFixed(1)}%
                              </td>
                            </tr>
                          ))}
                        </React.Fragment>
                      )
                    })}
                    {!selectedEntity && (
                      <tr className="font-bold bg-gray-100">
                        <td className="border border-gray-300 p-2 text-xs font-bold">Average</td>
                        {uniqueProjects.map(project => {
                          const projectValues = Object.values(entityProjectAllocations).map(allocations => allocations[project] || 0)
                          const projectAverage = projectValues.length > 0 ? projectValues.reduce((sum, val) => sum + val, 0) / projectValues.length : 0
                          return (
                            <td key={project} className="border border-gray-300 p-2 text-xs text-right font-bold">
                              {projectAverage.toFixed(1)}%
                            </td>
                          )
                        })}
                        <td className="border border-gray-300 p-2 text-xs text-right font-bold">
                          {Object.values(entityProjectAllocations).length > 0 
                            ? (Object.values(entityProjectAllocations)
                                .reduce((sum, allocations) => sum + Object.values(allocations).reduce((s, a) => s + a, 0), 0) / 
                                Object.values(entityProjectAllocations).length).toFixed(1) + '%'
                            : '0.0%'
                          }
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Expense Allocation Details Table */}
            <div>
              <div className="flex justify-between items-center mb-3">
                <div className="flex items-center gap-3">
                  <h3 className="text-lg font-medium text-gray-700">Expense Allocation Details</h3>
                  {selectedEntity && (
                    <span className="text-sm text-blue-600 bg-blue-50 px-2 py-1 rounded">
                      Filtered by: {selectedEntity}
                    </span>
                  )}
                  {descriptionFilter && (
                    <span className="text-sm text-green-600 bg-green-50 px-2 py-1 rounded">
                      Description: "{descriptionFilter}"
                    </span>
                  )}
                </div>
                {canEdit && (
                  <Button onClick={addExpenseRow} variant="outline" size="sm">
                    + Add Row
                  </Button>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-gray-300 text-xs">
                  <thead>
                    <tr>
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left text-xs font-semibold w-24">Entity</th>
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left text-xs font-semibold">
                        <div className="flex flex-col gap-1">
                          <span>Description</span>
                          <input
                            type="text"
                            value={descriptionFilter}
                            onChange={(e) => setDescriptionFilter(e.target.value)}
                            placeholder="Filter descriptions..."
                            className="w-full px-1 py-0.5 text-xs border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                          />
                        </div>
                      </th>
                      <th className="border border-gray-300 p-2 bg-gray-50 text-left text-xs font-semibold w-20">Currency</th>
                      <th className="border border-gray-300 p-2 bg-gray-50 text-right text-xs font-semibold w-28">Amount</th>
                      {uniqueProjects.map(project => (
                        <th key={project} className="border border-gray-300 p-2 bg-gray-50 text-right text-xs font-semibold whitespace-nowrap w-24">
                          {project}
                        </th>
                      ))}
                      <th className="border border-gray-300 p-2 bg-gray-50 text-center text-xs font-semibold w-20">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredExpenseRows.map((row) => (
                      <tr key={row.id}>
                        <td className="border border-gray-300 p-1 w-24">
                          {canEdit ? (
                            <select
                              value={row.entity}
                              onChange={(e) => updateExpenseRow(row.id, 'entity', e.target.value)}
                              className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                            >
                              <option value="">Select Entity</option>
                              {uniqueEntities.map(entity => (
                                <option key={entity} value={entity}>{entity}</option>
                              ))}
                            </select>
                          ) : (
                            <div className="text-xs">{row.entity}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1">
                          {canEdit ? (
                            <input
                              type="text"
                              value={row.description}
                              onChange={(e) => updateExpenseRow(row.id, 'description', e.target.value)}
                              className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                              placeholder="Enter description"
                            />
                          ) : (
                            <div className="text-xs">{row.description}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 w-20">
                          {canEdit ? (
                            <input
                              type="text"
                              value={row.currency}
                              onChange={(e) => updateExpenseRow(row.id, 'currency', e.target.value)}
                              className="w-full border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs text-center"
                              placeholder="USD"
                              maxLength={3}
                            />
                          ) : (
                            <div className="text-xs text-center">{row.currency}</div>
                          )}
                        </td>
                        <td className="border border-gray-300 p-1 w-28">
                          {canEdit ? (
                            <input
                              type="number"
                              value={row.amount}
                              onChange={(e) => updateExpenseRow(row.id, 'amount', parseFloat(e.target.value) || 0)}
                              className="w-full text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded text-xs"
                              placeholder="0.00"
                              step="0.01"
                              min="0"
                            />
                          ) : (
                            <div className="text-xs text-right">{row.amount.toFixed(2)}</div>
                          )}
                        </td>
                        {uniqueProjects.map(project => (
                          <td key={project} className="border border-gray-300 p-1 text-right text-xs w-24">
                            {(row.projectAmounts[project] || 0).toFixed(2)}
                          </td>
                        ))}
                        <td className="border border-gray-300 p-1 text-center w-20">
                          {canEdit && (
                            <Button
                              onClick={() => deleteExpenseRow(row.id)}
                              variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-800 text-xs px-2 py-1"
                            >
                            Delete
                          </Button>
                        )}
                        </td>
                      </tr>
                    ))}
                    {filteredExpenseRows.length === 0 && (
                      <tr>
                        <td colSpan={5 + uniqueProjects.length} className="border border-gray-300 p-8 text-center text-gray-500">
                          {selectedEntity || descriptionFilter ? (
                            <>
                              {selectedEntity && descriptionFilter 
                                ? `No expense rows found for ${selectedEntity} with descriptions matching "${descriptionFilter}". 
                                   Try adjusting your filters or click "Add Row" to add a new expense.`
                                : selectedEntity 
                                ? `No expense rows found for ${selectedEntity}. Click "Add Row" to add expenses for this entity.`
                                : `No expense rows found with descriptions matching "${descriptionFilter}". 
                                   Try adjusting your filter or click "Add Row" to add a new expense.`
                              }
                            </>
                          ) : (
                            "No expense rows added yet. Click 'Add Row' to get started."
                          )}
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>
      </main>
    </>
  )
}
