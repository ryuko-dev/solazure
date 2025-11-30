"use client"

import React from "react"
import { useState, useEffect } from "react"
import type { Project, User, Allocation, Position, Entity } from "../lib/types"
import { Button } from "./ui/button"
import { AllocationCell } from "./allocation-cell"
import { ProjectManager } from "./project-manager"
import { getCurrentUser, clearCurrentUser, getCurrentUserData, setCurrentUserData, getCurrentSystemUser, getSystemUsers } from "../lib/storage"
import { UserManagement } from "./user-management"
import { canEditPage, canAccessTab, UserRole } from "../lib/permissions"

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
]
const YEARS = Array.from({ length: 10 }, (_, i) => 2024 + i)

export function AllocationGrid() {
  // Check if user is logged in and get their role
  const [currentUser, setCurrentUserState] = useState<string | null>(null)
  const [currentUserRole, setCurrentUserRole] = useState<UserRole | null>(null)
  
  // Load user-specific data on component mount
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  // Load data on component mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const systemUser = await getCurrentSystemUser()
        
        if (systemUser?.role === 'admin') {
          // Admin loads their own data
          const userData = await getCurrentUserData()
          console.log("[v0] Admin loading own data:", userData.projects)
          setProjects(userData.projects)
          setUsers(userData.users.length > 0 ? userData.users : [
            { id: "1", name: "John Doe", department: "Engineering" },
            { id: "2", name: "Jane Smith", department: "Design" },
            { id: "3", name: "Bob Johnson", department: "Product" },
          ])
          setAllocations(userData.allocations)
          setPositions(userData.positions)
        } else {
          // System users load admin's data
          const systemUsers = await getSystemUsers()
          const adminUser = systemUsers.find(u => u.role === 'admin' && u.isActive)
          
          if (adminUser) {
            const adminData = await getCurrentUserData()
            console.log("[v0] System user loading admin data:", adminData.projects)
            setProjects(adminData.projects)
            setUsers(adminData.users.length > 0 ? adminData.users : [
              { id: "1", name: "John Doe", department: "Engineering" },
              { id: "2", name: "Jane Smith", department: "Design" },
              { id: "3", name: "Bob Johnson", department: "Product" },
            ])
            setAllocations(adminData.allocations)
            setPositions(adminData.positions)
          }
        }
      } catch (error) {
        console.error("Failed to load data:", error)
      }
    }
    loadData()
  }, [])

  // Check login status and role on mount
  useEffect(() => {
    const checkAuth = async () => {
      const user = getCurrentUser()
      const systemUser = await getCurrentSystemUser()
      if (!user || !systemUser) {
        window.location.href = "/login"
      } else {
        setCurrentUserState(user)
        setCurrentUserRole(systemUser.role)
      }
    }
    checkAuth()
  }, [])

  // Save data to user-specific storage whenever it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      console.log("[v0] Saving projects for user:", currentUser, projects)
      setCurrentUserData({ projects })
    }
  }, [projects, currentUser])

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      setCurrentUserData({ users })
    }
  }, [users, currentUser])

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      setCurrentUserData({ allocations })
    }
  }, [allocations, currentUser])

  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      setCurrentUserData({ positions })
    }
  }, [positions, currentUser])

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Grid starting month/year (top-right selectors). Persist per user.
  const [startMonth, setStartMonth] = useState<number>(0)
  const [startYear, setStartYear] = useState<number>(2024)

  // Load initial settings
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

  // Persist starting month/year when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      setCurrentUserData({ startMonth, startYear })
    }
  }, [startMonth, startYear, currentUser])
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editValue, setEditValue] = useState(0)
  const [showUnallocatedModal, setShowUnallocatedModal] = useState(false)
  const [pendingAllocation, setPendingAllocation] = useState<{ userId: string; monthIndex: number } | null>(null)
  const [showUserModal, setShowUserModal] = useState(false)
  const [editingUserId, setEditingUserId] = useState<string | null>(null)
  const [editingUserName, setEditingUserName] = useState("")
  const [editingUserDept, setEditingUserDept] = useState("")
  const [editingUserEntity, setEditingUserEntity] = useState("")
  const [editingUserVendorAC, setEditingUserVendorAC] = useState("")
  const [editingUserStartDate, setEditingUserStartDate] = useState("")
  const [editingUserEndDate, setEditingUserEndDate] = useState("")
  const [editingUserWorkDays, setEditingUserWorkDays] = useState<'mon-fri' | 'sun-thu'>('mon-fri')
  const [selectedCellMonth, setSelectedCellMonth] = useState<number | null>(null)
  const [selectedCellUser, setSelectedCellUser] = useState<string | null>(null)
  const [showPositionModal, setShowPositionModal] = useState(false)
  const [showUserManagement, setShowUserManagement] = useState(false)
  const [viewMode, setViewMode] = useState<'percentage' | 'days'>('percentage')
  const [showMonthDetail, setShowMonthDetail] = useState(false)
  const [selectedMonthForDetail, setSelectedMonthForDetail] = useState<{ year: number; month: number; globalIndex: number } | null>(null)
  const [showGanttChart, setShowGanttChart] = useState(false)
  const [ganttStartYear, setGanttStartYear] = useState(new Date().getFullYear())
  const [customAllocationAmount, setCustomAllocationAmount] = useState<{ [key: string]: string }>({})
  const [selectedPositionForCustom, setSelectedPositionForCustom] = useState<string | null>(null)
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null)
  
  // Load entities from localStorage for dropdown
  const [entities, setEntities] = useState<Entity[]>([])

  // Load entities
  useEffect(() => {
    const loadEntities = async () => {
      try {
        const userData = await getCurrentUserData()
        setEntities(userData.entities || [])
      } catch (error) {
        console.error("Failed to load entities:", error)
      }
    }
    loadEntities()
  }, [])

  // Check if current user has permission for specific actions
  const canEdit = currentUserRole ? canEditPage(currentUserRole, 'allocation') : false
  const canView = currentUserRole ? canAccessTab(currentUserRole, 'allocation') : false

  // Filter projects to show only those active between starting month and starting month + 11 months
  const filteredProjects = projects.filter(project => {
    console.log('[DEBUG] Checking project:', project.name)
    console.log('[DEBUG] Project dates:', {
      startMonth: project.startMonth,
      startYear: project.startYear,
      endMonth: project.endMonth,
      endYear: project.endYear,
      hasEndMonth: !!project.endMonth,
      hasEndYear: !!project.endYear,
      endMonthType: typeof project.endMonth,
      endYearType: typeof project.endYear
    })
    
    // If project has no end date, include it
    if (!project.endMonth || !project.endYear) {
      console.log('[DEBUG] Project has no end date, including - endMonth:', project.endMonth, 'endYear:', project.endYear)
      return true
    }
    
    // Calculate project start date - ensure proper year handling
    const projectStartYear = project.startYear || 2024
    const projectEndYear = project.endYear || 2024
    
    console.log('[DEBUG] Using years:', {
      projectStartYear,
      projectEndYear
    })
    
    // Create date objects
    const projectStartDate = new Date(projectStartYear, project.startMonth || 0, 1)
    const projectEndDate = new Date(projectEndYear, project.endMonth, 1)
    
    // Calculate staff allocation start and end dates
    const staffStartDate = new Date(startYear, startMonth, 1)
    const staffEndDate = new Date(startYear, startMonth + 11, 1)
    
    console.log('[DEBUG] Date comparison:', {
      projectStartDate: projectStartDate.toISOString().split('T')[0],
      projectEndDate: projectEndDate.toISOString().split('T')[0],
      staffStartDate: staffStartDate.toISOString().split('T')[0],
      staffEndDate: staffEndDate.toISOString().split('T')[0]
    })
    
    // Check if project overlaps with staff allocation period
    const overlaps = projectStartDate <= staffEndDate && projectEndDate >= staffStartDate
    
    console.log('[DEBUG] Overlap result:', {
      projectStartBeforeStaffEnd: projectStartDate <= staffEndDate,
      projectEndAfterStaffStart: projectEndDate >= staffStartDate,
      overlaps: overlaps
    })
    
    return overlaps
  })

  const MONTHS = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ]

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? "#000" : "#fff"
  }

  const addProject = (project: Project) => {
    setProjects((prev) => [...prev, project])
  }

  // Export to Excel function
  const exportToExcel = () => {
    // Create CSV content
    let csvContent = ""
    
    // Add header row
    const headerRow = ["Staff", ...months.map(m => m.display)]
    csvContent += headerRow.join(",") + "\n"
    
    // Add department rows and user data
    groupedUsers.forEach(group => {
      // Add department header
      csvContent += `${group.department},\n`
      
      // Add users in this department
      group.users.forEach(user => {
        const userRow = [user.name]
        
        months.forEach(month => {
          const userAllocations = allocations.filter(
            a => a.userId === user.id && a.monthIndex === month.globalIndex
          )
          
          if (userAllocations.length > 0) {
            const totalAllocated = userAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
            let displayValue
            
            if (viewMode === 'days') {
              displayValue = getDaysFromPercentage(user.id, month.globalIndex, totalAllocated)
              userRow.push(`${displayValue} days`)
            } else {
              displayValue = Math.round(totalAllocated)
              userRow.push(`${displayValue}%`)
            }
          } else {
            // Check if user hasn't started or has ended
            if (!isUserStartedInMonth(user.id, month.globalIndex)) {
              userRow.push("not started")
            } else if (isUserEndedInMonth(user.id, month.globalIndex)) {
              userRow.push("ended")
            } else {
              userRow.push("")
            }
          }
        })
        
        csvContent += userRow.join(",") + "\n"
      })
    })
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const fileName = `staff-allocation-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Export month detail to Excel function
  const exportMonthDetailToExcel = () => {
    if (!selectedMonthForDetail) return
    
    // Create CSV content for month detail view
    let csvContent = ""
    
    // Add header row with projects
    const headerRow = ["Staff", ...filteredProjects.map(p => p.name), "Total"]
    csvContent += headerRow.join(",") + "\n"
    
    // Add department rows and user data for the selected month
    groupedUsers.forEach(group => {
      // Add department header
      csvContent += `${group.department},\n`
      
      // Add users in this department
      group.users.forEach(user => {
        const userRow = [user.name]
        
        // Add allocations for each project
        filteredProjects.forEach(project => {
          const userAllocations = allocations.filter(
            a => a.userId === user.id && 
            a.projectId === project.id && 
            a.monthIndex === selectedMonthForDetail.globalIndex
          )
          
          if (userAllocations.length > 0) {
            const totalAllocated = userAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
            let displayValue
            
            if (viewMode === 'days') {
              displayValue = Math.round(getDaysFromPercentage(user.id, selectedMonthForDetail.globalIndex, totalAllocated))
              userRow.push(`${displayValue} days`)
            } else {
              displayValue = Math.round(totalAllocated)
              userRow.push(`${displayValue}%`)
            }
          } else {
            userRow.push("")
          }
        })
        
        // Add total column
        const totalAllocated = allocations
          .filter((a) => a.userId === user.id && a.monthIndex === selectedMonthForDetail.globalIndex)
          .reduce((sum, a) => sum + (a.percentage || 0), 0)
        
        if (viewMode === 'days') {
          const totalDays = Math.round(getDaysFromPercentage(user.id, selectedMonthForDetail.globalIndex, totalAllocated))
          userRow.push(`${totalDays} days`)
        } else {
          userRow.push(`${Math.round(totalAllocated)}%`)
        }
        
        csvContent += userRow.join(",") + "\n"
      })
    })
    
    // Create and download the file
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    
    const fileName = `staff-allocation-detail-${MONTHS[selectedMonthForDetail.month]}-${selectedMonthForDetail.year}-${viewMode}-${new Date().toISOString().split('T')[0]}.csv`
    link.setAttribute('href', url)
    link.setAttribute('download', fileName)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  const updateProject = (projectId: string, updates: Partial<Project>) => {
    console.log("[v0] updateProject called:", { projectId, updates })
    console.trace("[v0] updateProject call stack")
    setProjects((prev) => {
      const existing = prev.find((p) => p.id === projectId)
      if (existing && Object.entries(updates).every(([key, value]) => existing[key as keyof Project] === value)) {
        console.log("[v0] Skipping update: no actual changes detected")
        return prev
      }
      const next = prev.map((p) => (p.id === projectId ? { ...p, ...updates } : p))
      console.log("[v0] projects after update:", next)
      return next
    })
  }

  const deleteProject = (projectId: string) => {
    setProjects((prev) => prev.filter((p) => p.id !== projectId))
    setAllocations((prev) => prev.filter((a) => a.projectId !== projectId))
  }

  const addUser = () => {
    setEditingUserId(null)
    setEditingUserName("")
    setEditingUserDept("")
    setEditingUserEntity("")
    setEditingUserVendorAC("")
    setEditingUserStartDate("")
    setEditingUserEndDate("")
    setEditingUserWorkDays('mon-fri')
    setShowUserModal(true)
  }

  const editUser = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user) {
      setEditingUserId(userId)
      setEditingUserName(user.name)
      setEditingUserDept(user.department)
      setEditingUserEntity(user.entity || "")
      setEditingUserVendorAC(user.vendorAC || "")
      setEditingUserStartDate(user.startDate || "")
      setEditingUserEndDate(user.endDate || "")
      setEditingUserWorkDays(user.workDays || 'mon-fri')
      setShowUserModal(true)
    }
  }

  const saveUserChanges = () => {
    if (!editingUserName.trim()) return

    if (editingUserId) {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === editingUserId
            ? {
                ...u,
                name: editingUserName,
                department: editingUserDept,
                entity: editingUserEntity || undefined,
                vendorAC: editingUserVendorAC || undefined,
                startDate: editingUserStartDate || undefined,
                endDate: editingUserEndDate || undefined,
                workDays: editingUserWorkDays,
              }
            : u,
        ),
      )
    } else {
      const newUser: User = {
        id: `user-${Date.now()}`,
        name: editingUserName,
        department: editingUserDept,
        entity: editingUserEntity || undefined,
        vendorAC: editingUserVendorAC || undefined,
        startDate: editingUserStartDate || undefined,
        endDate: editingUserEndDate || undefined,
        workDays: editingUserWorkDays,
      }
      setUsers((prev) => [...prev, newUser])
    }

    setShowUserModal(false)
    setEditingUserId(null)
    setEditingUserName("")
    setEditingUserDept("")
    setEditingUserEntity("")
    setEditingUserVendorAC("")
    setEditingUserStartDate("")
    setEditingUserEndDate("")
    setEditingUserWorkDays('mon-fri')
  }

  const deleteUser = (userId: string) => {
    setUsers((prev) => prev.filter((u) => u.id !== userId))
    setAllocations((prev) => prev.filter((a) => a.userId !== userId))
  }

  const updatePositions = (newPositions: Position[]) => {
    const updatedProjects = projects.map((project) => ({
      ...project,
      positions: newPositions.filter((p) => p.projectId === project.id),
    }))
    setProjects(updatedProjects)
    
    // Update allocations to match new position budgets
    const updatedAllocations = allocations.map(allocation => {
      const newPosition = newPositions.find(p => 
        p.projectId === allocation.projectId && 
        p.monthIndex === allocation.monthIndex && 
        p.name === allocation.positionName
      )
      
      if (newPosition && allocation.percentage > newPosition.percentage) {
        // Reduce allocation to match new budget
        return {
          ...allocation,
          percentage: newPosition.percentage
        }
      }
      
      return allocation
    })
    
    setAllocations(updatedAllocations)
  }

  const handleMonthClick = (monthIndex: number) => {
    const year = Math.floor(monthIndex / 12) + 2024
    const month = monthIndex % 12
    setSelectedMonthForDetail({ year, month, globalIndex: monthIndex })
    setShowMonthDetail(true)
  }

  // Months shown in the grid. The globalIndex here MUST match how ProjectManager
  // stores position.monthIndex: (year - 2024) * 12 + month.
  const months = Array.from({ length: 12 }, (_, i) => {
    const date = new Date(startYear, startMonth + i, 1)
    const month = date.getMonth()
    const year = date.getFullYear()
    const globalIndex = (year - 2024) * 12 + month

    return {
      month,
      year,
      globalIndex,
      display: `${MONTHS[month].slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`,
    }
  })

  const handleEmptyCellClick = (userId: string, monthIndex: number) => {
    if (!canEdit) return // Only allow editing if user is admin
    
    console.log("[v0] Empty cell clicked:", { userId, monthIndex, selectedMonth })

    // Respect user end date: do not allow new allocations after their end date
    const user = users.find((u) => u.id === userId)
    if (user?.endDate) {
      const end = new Date(user.endDate)
      if (!Number.isNaN(end.getTime())) {
        const endMonth = end.getMonth() // 0-11
        const endYear = end.getFullYear()
        const endGlobalIndex = (endYear - 2024) * 12 + endMonth
        if (monthIndex > endGlobalIndex) {
          // After end date: block allocation
          return
        }
      }
    }
    
    // Respect user start date: do not allow new allocations before their start date
    if (user?.startDate) {
      const start = new Date(user.startDate)
      if (!Number.isNaN(start.getTime())) {
        const startMonth = start.getMonth() // 0-11
        const startYear = start.getFullYear()
        const startGlobalIndex = (startYear - 2024) * 12 + startMonth
        if (monthIndex < startGlobalIndex) {
          // Before start date: block allocation
          return
        }
      }
    }

    setSelectedCellUser(userId)
    setSelectedCellMonth(monthIndex)
    setShowPositionModal(true)
  }

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
  const getDaysFromPercentage = (userId: string, monthIndex: number, percentage: number): number => {
    const user = users.find((u) => u.id === userId)
    if (!user) return 0
    
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

  const handleAddAllocation = (projectId: string, positionName: string, customAmount?: number) => {
    if (selectedCellUser && selectedCellMonth !== null) {
      // Find the underlying position so we can link by positionId
      const project = projects.find((p) => p.id === projectId)
      const position = project?.positions?.find(
        (pos) => pos.monthIndex === selectedCellMonth && pos.name === positionName,
      )

      // If we can't find the position or it has no budget, do nothing
      if (!position || !position.percentage) {
        return
      }

      // How much of this position is already allocated in this month (across all users)
      const alreadyAllocated = allocations
        .filter(
          (a) =>
            a.projectId === projectId &&
            a.monthIndex === selectedCellMonth &&
            (a.positionId === position.id || a.positionName === positionName),
        )
        .reduce((sum, a) => sum + (a.percentage || 0), 0)

      const remaining = Math.max(0, position.percentage - alreadyAllocated)

      // Nothing left to allocate
      if (remaining <= 0) {
        return
      }

      // Use custom amount if provided, otherwise use full remaining
      const allocationAmount = customAmount ? Math.min(customAmount, remaining) : remaining

      const newAllocation: Allocation = {
        id: `alloc-${Date.now()}`,
        userId: selectedCellUser,
        projectId,
        monthIndex: selectedCellMonth,
        percentage: allocationAmount,
        positionId: position?.id,
        positionName,
      }
      setAllocations((prev) => [...prev, newAllocation])

      // Update allocated amount in positions
      setProjects((prev) =>
        prev.map((p) =>
          p.id === projectId
            ? {
                ...p,
                positions: p.positions?.map((pos) =>
                  pos.monthIndex === selectedCellMonth && pos.name === positionName
                    ? { ...pos, allocated: (pos.allocated || 0) + allocationAmount }
                    : pos,
                ),
              }
            : p,
        ),
      )

      // Close modal and reset custom allocation state
      setShowPositionModal(false)
      setSelectedPositionForCustom(null)
      setCustomAllocationAmount({})
      setSelectedCellUser(null)
      setSelectedCellMonth(null)
    }
  }

  const handleRemoveAllocation = (allocationId: string) => {
    const allocation = allocations.find((a) => a.id === allocationId)
    if (allocation) {
      setProjects((prev) =>
        prev.map((p) =>
          p.id === allocation.projectId
            ? {
                ...p,
                positions: p.positions?.map((pos) =>
                  pos.monthIndex === allocation.monthIndex && pos.name === allocation.positionName
                    ? { ...pos, allocated: Math.max(0, (pos.allocated || 0) - 1) }
                    : pos,
                ),
              }
            : p,
        ),
      )
    }
    setAllocations((prev) => prev.filter((a) => a.id !== allocationId))
  }

  const cleanupAllocations = (projectId: string, validPositionIds: string[]) => {
    setAllocations((prev) => {
      const filtered = prev.filter((allocation) => {
        // Keep allocation if it's not for this project
        if (allocation.projectId !== projectId) return true
        
        // Keep allocation if it has a valid positionId
        if (allocation.positionId && validPositionIds.includes(allocation.positionId)) return true
        
        // Remove allocation if positionId is not in the valid list
        return false
      })
      
      // Update allocated counts for the affected positions
      const removedAllocations = prev.filter((allocation) => {
        return allocation.projectId === projectId && 
               (!allocation.positionId || !validPositionIds.includes(allocation.positionId))
      })
      
      if (removedAllocations.length > 0) {
        setProjects((projectsPrev) =>
          projectsPrev.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  positions: project.positions?.map((position) => {
                    const removedCount = removedAllocations
                      .filter((a) => a.positionId === position.id)
                      .reduce((sum, a) => sum + (a.percentage || 0), 0)
                    
                    return {
                      ...position,
                      allocated: Math.max(0, (position.allocated || 0) - removedCount),
                    }
                  }),
                }
              : project,
          ),
        )
      }
      
      return filtered
    })
  }

  const handleEditAllocation = (allocationId: string, newPercentage: number) => {
    setAllocations((prev) => prev.map((a) => (a.id === allocationId ? { ...a, percentage: newPercentage } : a)))
    setEditingId(null)
    setEditValue(0)
  }

  // Only show users who are active for the current grid window.
  // If a user has an endDate before the starting month/year, hide them.
  // If a user has a startDate after the ending month/year, hide them.
  const gridStartGlobalIndex = (startYear - 2024) * 12 + startMonth
  const gridEndGlobalIndex = gridStartGlobalIndex + 11 // 12 months total

  const activeUsers = users.filter((user) => {
    // Check end date filtering
    if (user.endDate) {
      const end = new Date(user.endDate)
      if (!Number.isNaN(end.getTime())) {
        const endMonth = end.getMonth() // 0-11
        const endYear = end.getFullYear()
        const endGlobalIndex = (endYear - 2024) * 12 + endMonth
        if (endGlobalIndex < gridStartGlobalIndex) {
          return false // User ended before grid starts
        }
      }
    }

    // Check start date filtering
    if (user.startDate) {
      const start = new Date(user.startDate)
      if (!Number.isNaN(start.getTime())) {
        const startMonth = start.getMonth() // 0-11
        const startYear = start.getFullYear()
        const startGlobalIndex = (startYear - 2024) * 12 + startMonth
        if (startGlobalIndex > gridEndGlobalIndex) {
          return false // User starts after grid ends
        }
      }
    }

    return true
  })

  // Filter users based on selected project
  const filteredUsers = selectedProjectId 
    ? activeUsers.filter(user => 
        allocations.some(allocation => 
          allocation.userId === user.id && 
          allocation.projectId === selectedProjectId
        )
      )
    : activeUsers

  const groupedUsers = Array.from(
    filteredUsers.reduce((acc, user) => {
      if (!acc.has(user.department)) {
        acc.set(user.department, [])
      }
      acc.get(user.department)!.push(user)
      return acc
    }, new Map<string, User[]>()),
  ).map(([dept, deptUsers]) => ({
    department: dept,
    users: deptUsers.sort((a, b) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.department.localeCompare(b.department))

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          {/* Project Management - for users who can view allocation */}
          {canView && (
            <ProjectManager
              projects={filteredProjects}
              positions={filteredProjects.flatMap((p) => p.positions || [])}
              months={MONTHS}
              startMonth={startMonth}
              startYear={startYear}
              onAddProject={addProject}
              onUpdateProject={updateProject}
              onDeleteProject={deleteProject}
              onUpdatePositions={updatePositions}
              onProjectSelect={setSelectedProjectId}
              selectedProjectId={selectedProjectId}
              onCleanupAllocations={cleanupAllocations}
              currentUserRole={currentUserRole}
            />
          )}
        </div>
        <div className="flex gap-4 items-end">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Starting Month</label>
            <select
              value={startMonth}
              onChange={(e) => setStartMonth(Number.parseInt(e.target.value))}
              className="border rounded px-2 py-1"
            >
              {MONTHS.map((month, idx) => (
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
              {YEARS.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="space-y-2 rounded-full">
        <div className="flex justify-between items-center">
          <div className="flex items-center gap-2">
            {selectedProjectId && (
              <div className="flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm">
                <span>Filtered by: {projects.find(p => p.id === selectedProjectId)?.name}</span>
                <button
                  onClick={() => setSelectedProjectId(null)}
                  className="text-blue-600 hover:text-blue-800 font-bold"
                >
                  ×
                </button>
              </div>
            )}
            {/* Add Staff button - only for users who can edit */}
            {canEdit && (
              <Button onClick={addUser} variant="default" size="sm" className="bg-blue-900 hover:bg-blue-800 text-white">
                + New Staff
              </Button>
            )}
            {/* View Mode Selector */}
            <div className="flex items-center gap-2 ml-4">
              <span className="text-sm text-gray-600">View:</span>
              <div className="flex border rounded overflow-hidden">
                <button
                  onClick={() => setViewMode('percentage')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    viewMode === 'percentage'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  % View
                </button>
                <button
                  onClick={() => setViewMode('days')}
                  className={`px-3 py-1 text-sm font-medium transition-colors ${
                    viewMode === 'days'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-gray-700 hover:bg-gray-100'
                  }`}
                >
                  Days View
                </button>
              </div>
            </div>
            {/* Export to Excel Button */}
            <button
              onClick={exportToExcel}
              className="px-3 py-1 text-sm bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors ml-4"
            >
              Export to Excel
            </button>
            {/* Gantt Chart Button */}
            <button
              onClick={() => setShowGanttChart(true)}
              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors ml-2"
              title="Show Project Gantt Chart"
            >
              📊 Gantt Chart
            </button>
          </div>
          <div className="flex gap-2 items-center">
            {/* Current User Display */}
            <div className="text-right mr-4">
              <div className="text-sm text-gray-600">Current User</div>
              <div className="font-medium">{currentUser}</div>
              <div className="text-xs text-gray-500 capitalize">{currentUserRole}</div>
            </div>
            {/* Settings button - only for admins */}
            {currentUserRole === 'admin' && (
              <Button 
                onClick={() => setShowUserManagement(true)} 
                variant="outline" 
                size="sm"
                className="flex items-center gap-2"
              >
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z"
                  />
                </svg>
                Settings
              </Button>
            )}
            <Button
              onClick={() => {
                // Clear current user session but keep their data
                const user = getCurrentUser()
                if (user) {
                  setCurrentUserData({ startMonth, startYear }) // Save current view settings
                }
                clearCurrentUser()
                window.location.href = "/login"
              }}
              variant="outline"
              size="sm"
              className="flex items-center gap-2"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                />
              </svg>
              Logout
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100 w-42">Staff</th>
                {months.map((month, idx) => {
                  const monFriDays = getWorkingDaysInMonth(month.year, month.month, 1) // Monday to Friday
                  const sunThuDays = getWorkingDaysInMonth(month.year, month.month, 0) // Sunday to Thursday
                  return (
                    <th
                      key={idx}
                      className="border border-gray-300 p-2 bg-gray-100 w-32 cursor-pointer hover:bg-gray-200 text-sm"
                      onClick={() => handleMonthClick(month.globalIndex)}
                    >
                      <div className="flex flex-col items-center">
                        <div>{month.display}</div>
                        <div className="text-[10px] text-gray-600 mt-1">
                          <div>Mon-Fri: {monFriDays}</div>
                          <div>Sun-Thu: {sunThuDays}</div>
                        </div>
                      </div>
                    </th>
                  )
                })}
              </tr>
              <tr>
                <th className="border border-gray-300 bg-gray-50 w-42 text-xs text-muted-foreground">Unallocated</th>
                {months.map((month) => {
                  const monthUnallocated = filteredProjects.flatMap((project) => {
                    // If a project filter is active, only show unallocated positions for that project
                    if (selectedProjectId && project.id !== selectedProjectId) {
                      return []
                    }
                    
                    const positionsForMonth =
                      project.positions?.filter((pos) => pos.monthIndex === month.globalIndex) || []

                    return positionsForMonth
                      .map((position) => {
                        const allocated = allocations
                          .filter(
                            (a) =>
                              a.projectId === project.id &&
                              a.monthIndex === month.globalIndex &&
                              a.positionId === position.id,
                          )
                          .reduce((sum, a) => sum + (a.percentage || 0), 0)

                        const unallocated = Math.max(0, position.percentage - allocated)
                        if (unallocated <= 0) return null

                        // Calculate display value based on project allocation mode and view mode
                        let displayValue: number
                        let displayText: string
                        
                        if (viewMode === 'days') {
                          // Day view - calculate days for both allocation modes
                          const workingDays = getWorkingDaysInMonth(month.year, month.month, 1) // Default to Mon-Fri
                          const calculatedDays = Math.round((unallocated / 100) * workingDays)
                          displayValue = calculatedDays
                          displayText = `${calculatedDays} days`
                        } else {
                          // Percentage view - show rounded percentages for both allocation modes
                          displayValue = Math.round(unallocated)
                          displayText = `${displayValue}%`
                        }

                        return {
                          projectId: project.id,
                          projectName: project.name,
                          projectColor: project.color,
                          positionId: position.id,
                          positionName: position.name || "Position",
                          percentage: unallocated,
                          displayValue,
                          displayText,
                        }
                      })
                      .filter((p): p is NonNullable<typeof p> => p != null)
                  })

                  return (
                    <td
                      key={month.globalIndex}
                      className="border border-gray-300 bg-gray-50 p-1 align-top"
                      style={{ verticalAlign: "top" }}
                    >
                      <div className="flex flex-wrap gap-1">
                        {monthUnallocated.map((pos) => (
                          <div
                            key={`${pos.projectId}-${pos.positionId}`}
                            className="flex items-center h-8 rounded overflow-hidden bg-gray-200 text-[9px] text-white"
                            style={{
                              minWidth: "50px",
                              maxWidth: "120px",
                            }}
                            title={`${pos.projectName} - ${pos.positionName} (${pos.displayText} unallocated)`}
                          >
                            <div
                              className="h-full flex items-center justify-center px-1 text-center leading-tight"
                              style={{
                                backgroundColor: pos.projectColor || "#3b82f6",
                                width: "100%",
                              }}
                            >
                              {pos.positionName} ({pos.displayText})
                            </div>
                          </div>
                        ))}
                      </div>
                    </td>
                  )
                })}
              </tr>
            </thead>
            <tbody>
              {groupedUsers.map((group) => (
                <React.Fragment key={group.department}>
                  <tr>
                    <td colSpan={months.length + 1} className="border border-gray-300 p-1 font-semibold text-xs text-gray-800 bg-cyan-200">
                      {group.department}
                    </td>
                  </tr>
                  {group.users.map((user) => (
                    <tr key={user.id}>
                      <td className="border border-gray-300 p-1 w-42">
                        <div className="flex items-center justify-between gap-1">
                          <span className="text-xs leading-tight">{user.name}</span>
                          {/* Edit user button - only for users who can edit */}
                          {canEdit && (
                            <button
                              onClick={() => editUser(user.id)}
                              className="text-blue-600 hover:text-blue-800 text-xs"
                            >
                              ✏️
                            </button>
                          )}
                        </div>
                      </td>
                      {months.map((month) => (
                        <AllocationCell
                          key={`${user.id}-${month.globalIndex}`}
                          userId={user.id}
                          monthIndex={month.globalIndex}
                          allocations={allocations.filter(
                            (a) => a.userId === user.id && a.monthIndex === month.globalIndex,
                          )}
                          project={filteredProjects.find((p) => p.id === allocations[0]?.projectId)}
                          projects={filteredProjects}
                          users={users}
                          month={month}
                          userEnded={isUserEndedInMonth(user.id, month.globalIndex)}
                          userNotStarted={!isUserStartedInMonth(user.id, month.globalIndex)}
                          viewMode={viewMode}
                          getDaysFromPercentage={getDaysFromPercentage}
                          readOnly={currentUserRole === 'viewer'}
                          selectedProjectId={selectedProjectId}
                          onEdit={(id) => {
                            setEditingId(id)
                            const alloc = allocations.find((a) => a.id === id)
                            if (alloc) setEditValue(alloc.percentage)
                          }}
                          onSaveEdit={handleEditAllocation}
                          onRemove={handleRemoveAllocation}
                          onEmptyCellClick={() => handleEmptyCellClick(user.id, month.globalIndex)}
                        />
                      ))}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {showUserModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-96">
            <h3 className="text-lg font-bold mb-4">{editingUserId ? "Edit User" : "Add User"}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={editingUserName}
                  onChange={(e) => setEditingUserName(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="User name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Department</label>
                <input
                  type="text"
                  value={editingUserDept}
                  onChange={(e) => setEditingUserDept(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Department"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Entity</label>
                <select
                  value={editingUserEntity}
                  onChange={(e) => setEditingUserEntity(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                >
                  <option value="">Select Entity</option>
                  {entities.map(entity => (
                    <option key={entity.id} value={entity.name}>
                      {entity.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Vendor AC</label>
                <input
                  type="text"
                  value={editingUserVendorAC}
                  onChange={(e) => setEditingUserVendorAC(e.target.value)}
                  className="w-full border rounded px-2 py-1"
                  placeholder="Vendor AC"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Date</label>
                  <input
                    type="date"
                    value={editingUserStartDate}
                    onChange={(e) => setEditingUserStartDate(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Date</label>
                  <input
                    type="date"
                    value={editingUserEndDate}
                    onChange={(e) => setEditingUserEndDate(e.target.value)}
                    className="w-full border rounded px-2 py-1 text-sm"
                  />
                  <p className="mt-1 text-[11px] text-gray-500">Leave blank if working indefinitely.</p>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Work Days</label>
                <select
                  value={editingUserWorkDays}
                  onChange={(e) => setEditingUserWorkDays(e.target.value as 'mon-fri' | 'sun-thu')}
                  className="w-full border rounded px-2 py-1 text-sm"
                >
                  <option value="mon-fri">Monday - Friday</option>
                  <option value="sun-thu">Sunday - Thursday</option>
                </select>
              </div>
              <div className="flex gap-2 justify-end">
                {editingUserId && (
                  <Button
                    variant="destructive"
                    onClick={() => {
                      deleteUser(editingUserId)
                      setShowUserModal(false)
                    }}
                  >
                    Delete
                  </Button>
                )}
                <Button variant="outline" onClick={() => setShowUserModal(false)}>
                  Cancel
                </Button>
                <Button onClick={saveUserChanges}>Save</Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showPositionModal && selectedCellMonth !== null && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-[500px] max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-bold mb-4">Select Position</h3>
            <div className="space-y-3">
              {projects.flatMap((project) => {
                // If a project filter is active, only show positions for that project
                if (selectedProjectId && project.id !== selectedProjectId) {
                  return []
                }
                
                // Positions created in ProjectManager already use a global monthIndex (0 = Jan 2024, ...)
                // Cells in the grid also use this same global monthIndex. So we just match directly.
                const monthPositions = (project.positions || [])
                  .filter((p) => p.monthIndex === selectedCellMonth && (p.percentage || 0) > 0)
                  .map((p) => {
                    const allocated = allocations
                      .filter(
                        (a) =>
                          a.projectId === project.id &&
                          a.monthIndex === selectedCellMonth &&
                          a.positionName === p.name,
                      )
                      .reduce((sum, a) => sum + (a.percentage || 0), 0)

                    const available = Math.max(0, (p.percentage || 0) - allocated)
                    const availableDays = selectedCellUser 
                      ? getDaysFromPercentage(selectedCellUser, selectedCellMonth, available)
                      : 0
                    const allocatedDays = selectedCellUser 
                      ? getDaysFromPercentage(selectedCellUser, selectedCellMonth, allocated)
                      : 0

                    return {
                      ...p,
                      projectId: project.id,
                      projectName: project.name,
                      projectColor: project.color,
                      available,
                      availableDays,
                      allocated,
                      allocatedDays,
                    }
                  })
                  .filter((p) => p.available > 0)

                const availablePositions = monthPositions

                return availablePositions.map((position) => {
                  const positionKey = `${position.projectId}-${position.id}`
                  const isCustomMode = selectedPositionForCustom === positionKey
                  const customValue = customAllocationAmount[positionKey] || ""

                  return (
                    <div
                      key={positionKey}
                      className="border border-gray-200 rounded-lg p-3 hover:bg-blue-50 transition-colors"
                      style={{
                        borderLeft: `4px solid ${position.projectColor}`,
                      }}
                    >
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <div className="font-medium">{position.name || "Unnamed"}</div>
                          <div className="text-sm text-gray-600">{position.projectName}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-medium">
                            {Math.round(position.available)}% ({position.availableDays} days)
                          </div>
                          <div className="text-xs text-gray-500">
                            {Math.round(position.allocated)}% ({position.allocatedDays} days) allocated
                          </div>
                        </div>
                      </div>
                      
                      {/* Progress bar */}
                      <div className="w-full bg-gray-200 rounded-full h-2 mb-3">
                        <div
                          className="h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${(position.allocated / position.percentage) * 100}%`,
                            backgroundColor: position.projectColor,
                          }}
                        />
                      </div>

                      {/* Custom allocation controls */}
                      <div className="space-y-2">
                        {!isCustomMode ? (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                handleAddAllocation(position.projectId, position.name || "", position.available)
                              }}
                              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 transition-colors"
                            >
                              Allocate Full ({Math.round(position.available)}%)
                            </button>
                            <button
                              onClick={() => {
                                setSelectedPositionForCustom(positionKey)
                                setCustomAllocationAmount({
                                  ...customAllocationAmount,
                                  [positionKey]: Math.round(position.available).toString()
                                })
                              }}
                              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700 transition-colors"
                            >
                              Custom Amount
                            </button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              <input
                                type="number"
                                min="0"
                                max={Math.round(position.available)}
                                value={customValue}
                                onChange={(e) => {
                                  setCustomAllocationAmount({
                                    ...customAllocationAmount,
                                    [positionKey]: e.target.value
                                  })
                                }}
                                className="flex-1 px-3 py-2 border border-gray-300 rounded text-sm"
                                placeholder={`Enter % (max: ${Math.round(position.available)})`}
                              />
                              <span className="text-sm text-gray-600">%</span>
                            </div>
                            {selectedCellUser && (
                              <div className="text-xs text-gray-500">
                                {customValue ? `${Math.round((Number(customValue) / 100) * getDaysFromPercentage(selectedCellUser, selectedCellMonth, 100))} days` : '0 days'}
                              </div>
                            )}
                            <div className="flex gap-2">
                              <button
                                onClick={() => {
                                  const amount = Number(customValue)
                                  if (amount > 0 && amount <= position.available) {
                                    handleAddAllocation(position.projectId, position.name || "", amount)
                                  }
                                }}
                                disabled={!customValue || Number(customValue) <= 0 || Number(customValue) > position.available}
                                className="flex-1 px-3 py-2 bg-green-600 text-white rounded text-sm hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Allocate Custom
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedPositionForCustom(null)
                                  setCustomAllocationAmount({
                                    ...customAllocationAmount,
                                    [positionKey]: ""
                                  })
                                }}
                                className="flex-1 px-3 py-2 bg-gray-400 text-white rounded text-sm hover:bg-gray-500 transition-colors"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )
                })
              })}
            </div>
            {projects.every(
              (project) =>
                !project.positions?.some((p) => p.monthIndex === selectedCellMonth && (p.percentage || 0) > 0),
            ) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                No positions available for this month. Add positions in the project settings.
              </div>
            )}
            <Button variant="outline" onClick={() => {
              setShowPositionModal(false)
              setSelectedPositionForCustom(null)
              setCustomAllocationAmount({})
            }} className="w-full mt-4">
              Close
            </Button>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      <UserManagement 
        isOpen={showUserManagement} 
        onClose={() => setShowUserManagement(false)} 
      />

      {/* Month Detail Modal */}
      {showMonthDetail && selectedMonthForDetail && (
        <div className="fixed inset-0 bg-white z-50 overflow-y-auto">
          <div className="w-full h-full p-6">
            <div className="flex justify-between items-center mb-3">
              <div>
                <h2 className="text-base font-bold">
                  Staff Allocation Detail - {MONTHS[selectedMonthForDetail.month]} {selectedMonthForDetail.year}
                </h2>
                {/* View Mode Selector */}
                <div className="flex items-center gap-2 mt-1">
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
                      % View
                    </button>
                    <button
                      onClick={() => setViewMode('days')}
                      className={`px-2 py-1 text-xs font-medium transition-colors ${
                        viewMode === 'days'
                          ? 'bg-blue-600 text-white'
                          : 'bg-white text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      Days View
                    </button>
                  </div>
                  {/* Export to Excel Button */}
                  <button
                    onClick={exportMonthDetailToExcel}
                    className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors ml-3"
                  >
                    Export to Excel
                  </button>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowMonthDetail(false)
                  setSelectedMonthForDetail(null)
                }}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors text-sm font-medium"
              >
                × Close
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full border-collapse border border-gray-300 text-xs">
                <thead>
                  <tr>
                    <th className="border border-gray-300 p-1 bg-gray-100 w-32 text-xs">Staff</th>
                    {filteredProjects.map((project) => (
                      <th
                        key={project.id}
                        className="border border-gray-300 p-1 bg-gray-100 min-w-24 text-xs"
                        style={{ backgroundColor: project.color, color: getContrastColor(project.color) }}
                      >
                        {project.name}
                      </th>
                    ))}
                    <th className="border border-gray-300 p-1 bg-gray-100 w-48 text-xs">Total</th>
                  </tr>
                </thead>
                <tbody>
                  {groupedUsers.map((group) => (
                    <React.Fragment key={group.department}>
                      <tr>
                        <td colSpan={filteredProjects.length + 2} className="border border-gray-300 p-1 font-semibold text-xs text-gray-800 bg-cyan-200">
                          {group.department}
                        </td>
                      </tr>
                      {group.users.map((user) => (
                        <tr key={user.id}>
                          <td className="border border-gray-300 p-1 text-xs">
                            {user.name}
                          </td>
                          {filteredProjects.map((project) => {
                            const userAllocations = allocations.filter(
                              (a) => a.userId === user.id && a.monthIndex === selectedMonthForDetail.globalIndex
                            )
                            const projectAllocations = userAllocations.filter((a) => a.projectId === project.id)
                            
                            return (
                              <td key={project.id} className="border border-gray-300 p-0.5 text-center">
                                {projectAllocations.length > 0 ? (
                                  projectAllocations.map((allocation) => {
                                    const position = project.positions?.find(
                                      (p) => p.id === allocation.positionId
                                    )
                                    const displayValue = viewMode === 'days' 
                                      ? getDaysFromPercentage(user.id, selectedMonthForDetail.globalIndex, allocation.percentage)
                                      : Math.round(allocation.percentage || 0)
                                    const displayText = viewMode === 'days' 
                                      ? `${Math.round(displayValue)}d`
                                      : `${displayValue}%`
                                    
                                    return (
                                      <div
                                        key={allocation.id}
                                        className="w-full h-4 rounded flex items-center justify-center text-white font-bold text-xs mb-1"
                                        style={{ backgroundColor: project.color }}
                                        title={`${position?.name || 'Position'} - ${Math.round(allocation.percentage || 0)}%`}
                                      >
                                        {displayText}
                                      </div>
                                    )
                                  })
                                ) : (
                                  <div className="w-full h-4 rounded flex items-center justify-center text-gray-400 text-xs">
                                    -
                                  </div>
                                )}
                              </td>
                            )
                          })}
                          <td className="border border-gray-300 p-0.5 text-center text-xs font-medium">
                            {(() => {
                              const totalAllocated = allocations
                                .filter((a) => a.userId === user.id && a.monthIndex === selectedMonthForDetail.globalIndex)
                                .reduce((sum, a) => sum + (a.percentage || 0), 0)
                              const totalDays = getDaysFromPercentage(user.id, selectedMonthForDetail.globalIndex, totalAllocated)
                              const roundedTotalAllocated = Math.round(totalAllocated)
                              const roundedTotalDays = Math.round(totalDays)
                              
                              // Determine progress bar color based on total allocation
                              let barColor = roundedTotalAllocated >= 90 && roundedTotalAllocated <= 110 
                                ? '#2d7b51'  // Green for 90-110%
                                : roundedTotalAllocated < 90 
                                  ? '#BB7D63' // Brown for <90%
                                  : '#A82A00' // Red for >110%
                              
                              const displayText = viewMode === 'days' 
                                ? `${roundedTotalDays} days`
                                : `${roundedTotalAllocated}%`
                              
                              return (
                                <div className="w-full h-4 rounded flex items-center justify-center text-white font-bold text-xs"
                                  style={{
                                    backgroundColor: barColor
                                  }}
                                >
                                  {displayText}
                                </div>
                              )
                            })()}
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Gantt Chart Modal */}
      {showGanttChart && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-6xl max-h-[90vh] overflow-y-auto mx-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Project Gantt Chart</h2>
              <button
                onClick={() => setShowGanttChart(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl font-bold"
              >
                ×
              </button>
            </div>
            
            <div className="space-y-4">
              {projects.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No projects to display in Gantt chart
                </div>
              ) : (
                <>
                  {/* Timeline Header with Date Selector */}
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="text-sm font-medium text-gray-700">Project Timeline (Monthly View)</div>
                        <div className="text-xs text-gray-500">
                          Based on today's date: {new Date().toLocaleDateString()}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <label className="text-xs font-medium text-gray-600">Start Year:</label>
                        <select
                          value={ganttStartYear}
                          onChange={(e) => setGanttStartYear(Number(e.target.value))}
                          className="border border-gray-300 rounded px-2 py-1 text-xs bg-white"
                        >
                          {(() => {
                            const allDates = projects.flatMap(p => [
                              p.startYear || 2024,
                              p.endYear || 2024
                            ])
                            const minYear = Math.min(...allDates, new Date().getFullYear() - 2)
                            const maxYear = Math.max(...allDates, new Date().getFullYear() + 2)
                            const years = []
                            for (let y = minYear; y <= maxYear; y++) {
                              years.push(y)
                            }
                            return years.map(year => (
                              <option key={year} value={year}>
                                {year}
                              </option>
                            ))
                          })()}
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* Calculate month range for 2 years from selected start year */}
                  {(() => {
                    // Create months for 2 years from ganttStartYear
                    const months: { year: number; month: number; label: string }[] = []
                    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
                    for (let year = ganttStartYear; year < ganttStartYear + 2; year++) {
                      for (let m = 0; m < 12; m++) {
                        months.push({ year, month: m, label: `${monthNames[m]} ${year}` })
                      }
                    }
                    
                    const today = new Date()
                    const currentYear = today.getFullYear()
                    const currentMonth = today.getMonth()
                    const currentMonthIndex = months.findIndex(m => 
                      m.year === currentYear && m.month === currentMonth
                    )

                    return (
                      <div className="space-y-4">
                        {/* Timeline Grid */}
                        <div className="border rounded-lg overflow-hidden relative">
                          {/* Today Line Indicator */}
                          {currentMonthIndex >= 0 && (
                            <div 
                              className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-10 pointer-events-none"
                              style={{ 
                                left: `calc((3 / (months.length + 3)) * 100% + ${(currentMonthIndex + 0.5) * (97 / (months.length + 3))}%)` 
                              }}
                            >
                              <div className="absolute -top-2 -left-3 w-6 h-4 bg-red-500 text-white text-xs rounded flex items-center justify-center font-bold">
                                Today
                              </div>
                            </div>
                          )}
                          
                          {/* Month Header */}
                          <div className="grid bg-gray-100" style={{ gridTemplateColumns: '3fr repeat(24, 1fr)' }}>
                            <div className="p-0.5 text-xs font-medium text-gray-700 border-r">Project</div>
                            {months.map((month, index) => (
                              <div key={`${month.year}-${month.month}`} className="p-0 text-xs font-medium text-center text-gray-700 border-r last:border-r-0">
                                <div className="text-xs">{month.label.split(' ')[0]}</div>
                                <div className="text-xs font-bold">{month.label.split(' ')[1]}</div>
                              </div>
                            ))}
                          </div>

                          {/* Ongoing Projects */}
                          {(() => {
                            const ongoingProjects = projects.filter(p => {
                              const start = new Date(p.startYear || 2024, p.startMonth || 0, 1)
                              const end = new Date(p.endYear || 2024, p.endMonth || 11, 1)
                              return today >= start && today <= end
                            })

                            if (ongoingProjects.length > 0) {
                              return (
                                <>
                                  <div className="p-0.5 bg-blue-50 text-xs font-medium text-blue-700 border-b" style={{ gridColumn: '1 / -1' }}>
                                    🔵 Ongoing ({ongoingProjects.length})
                                  </div>
                                  {ongoingProjects.map((project) => {
                                    const projectStart = new Date(project.startYear || 2024, project.startMonth || 0, 1)
                                    const projectEnd = new Date(project.endYear || 2024, project.endMonth || 11, 1)
                                    const totalDays = Math.ceil((projectEnd.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
                                    const elapsedDays = Math.ceil((today.getTime() - projectStart.getTime()) / (1000 * 60 * 60 * 24))
                                    const completionPercentage = Math.max(0, Math.min(100, Math.round((elapsedDays / totalDays) * 100)))

                                    return (
                                      <div key={project.id} className="grid border-b hover:bg-gray-50 relative" style={{ gridTemplateColumns: '3fr repeat(24, 1fr)' }}>
                                        <div className="p-0.5 border-r">
                                          <div className="flex items-center gap-1">
                                            <div 
                                              className="w-2 h-2 rounded flex-shrink-0"
                                              style={{ backgroundColor: project.color }}
                                            />
                                            <span className="text-xs font-medium truncate">{project.name}</span>
                                          </div>
                                        </div>
                                        {months.map((month, index) => {
                                          const monthStart = new Date(month.year, month.month, 1)
                                          const monthEnd = new Date(month.year, month.month + 1, 0)
                                          
                                          const overlapStart = projectStart < monthStart ? monthStart : projectStart
                                          const overlapEnd = projectEnd > monthEnd ? monthEnd : projectEnd
                                          const hasOverlap = overlapStart <= overlapEnd
                                          
                                          const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
                                          const overlapDays = hasOverlap ? Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) : 0
                                          const monthCoverage = hasOverlap ? (overlapDays / monthDays) * 100 : 0
                                          
                                          const isCurrentMonthInProject = month.year === currentYear && 
                                            month.month === currentMonth && 
                                            today >= projectStart && today <= projectEnd
                                          
                                          return (
                                            <div key={`${month.year}-${month.month}`} className="border-r last:border-r-0 p-0">
                                              {hasOverlap ? (
                                                <div className="relative h-3 bg-gray-200 rounded overflow-hidden">
                                                  <div 
                                                    className="h-full rounded transition-all duration-300"
                                                    style={{ 
                                                      width: `${monthCoverage}%`,
                                                      backgroundColor: project.color,
                                                      opacity: isCurrentMonthInProject ? 1 : 0.8
                                                    }}
                                                  >
                                                  </div>
                                                  {isCurrentMonthInProject && (
                                                    <div className="absolute inset-0 border-2 border-blue-400 rounded pointer-events-none"></div>
                                                  )}
                                                </div>
                                              ) : (
                                                <div className="h-3"></div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  })}
                                </>
                              )
                            }
                            return null
                          })()}

                          {/* Completed Projects */}
                          {(() => {
                            const completedProjects = projects.filter(p => {
                              const end = new Date(p.endYear || 2024, p.endMonth || 11, 1)
                              return today > end
                            })

                            if (completedProjects.length > 0) {
                              return (
                                <>
                                  <div className="p-0.5 bg-green-50 text-xs font-medium text-green-700 border-b" style={{ gridColumn: '1 / -1' }}>
                                    🟢 Completed ({completedProjects.length})
                                  </div>
                                  {completedProjects.map((project) => {
                                    const projectStart = new Date(project.startYear || 2024, project.startMonth || 0, 1)
                                    const projectEnd = new Date(project.endYear || 2024, project.endMonth || 11, 1)

                                    return (
                                      <div key={project.id} className="grid border-b hover:bg-gray-50" style={{ gridTemplateColumns: '3fr repeat(24, 1fr)' }}>
                                        <div className="p-0.5 border-r">
                                          <div className="flex items-center gap-1">
                                            <div 
                                              className="w-2 h-2 rounded flex-shrink-0"
                                              style={{ backgroundColor: project.color }}
                                            />
                                            <span className="text-xs font-medium truncate">{project.name}</span>
                                          </div>
                                        </div>
                                        {months.map((month) => {
                                          const monthStart = new Date(month.year, month.month, 1)
                                          const monthEnd = new Date(month.year, month.month + 1, 0)
                                          
                                          const overlapStart = projectStart < monthStart ? monthStart : projectStart
                                          const overlapEnd = projectEnd > monthEnd ? monthEnd : projectEnd
                                          const hasOverlap = overlapStart <= overlapEnd
                                          
                                          const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
                                          const overlapDays = hasOverlap ? Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) : 0
                                          const monthCoverage = hasOverlap ? (overlapDays / monthDays) * 100 : 0
                                          
                                          return (
                                            <div key={`${month.year}-${month.month}`} className="border-r last:border-r-0 p-0">
                                              {hasOverlap ? (
                                                <div className="relative h-3 bg-gray-200 rounded overflow-hidden">
                                                  <div 
                                                    className="h-full rounded transition-all duration-300"
                                                    style={{ 
                                                      width: `${monthCoverage}%`,
                                                      backgroundColor: project.color,
                                                      opacity: 0.7
                                                    }}
                                                  >
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="h-3"></div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  })}
                                </>
                              )
                            }
                            return null
                          })()}

                          {/* Planned Projects */}
                          {(() => {
                            const plannedProjects = projects.filter(p => {
                              const start = new Date(p.startYear || 2024, p.startMonth || 0, 1)
                              return today < start
                            })

                            if (plannedProjects.length > 0) {
                              return (
                                <>
                                  <div className="p-0.5 bg-yellow-50 text-xs font-medium text-yellow-700 border-b" style={{ gridColumn: '1 / -1' }}>
                                    🟡 Planned ({plannedProjects.length})
                                  </div>
                                  {plannedProjects.map((project) => {
                                    const projectStart = new Date(project.startYear || 2024, project.startMonth || 0, 1)
                                    const projectEnd = new Date(project.endYear || 2024, project.endMonth || 11, 1)
                                    const daysUntilStart = Math.ceil((projectStart.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

                                    return (
                                      <div key={project.id} className="grid border-b hover:bg-gray-50" style={{ gridTemplateColumns: '3fr repeat(24, 1fr)' }}>
                                        <div className="p-0.5 border-r">
                                          <div className="flex items-center gap-1">
                                            <div 
                                              className="w-2 h-2 rounded flex-shrink-0"
                                              style={{ backgroundColor: project.color }}
                                            />
                                            <span className="text-xs font-medium truncate">{project.name}</span>
                                          </div>
                                        </div>
                                        {months.map((month) => {
                                          const monthStart = new Date(month.year, month.month, 1)
                                          const monthEnd = new Date(month.year, month.month + 1, 0)
                                          
                                          const overlapStart = projectStart < monthStart ? monthStart : projectStart
                                          const overlapEnd = projectEnd > monthEnd ? monthEnd : projectEnd
                                          const hasOverlap = overlapStart <= overlapEnd
                                          
                                          const monthDays = Math.ceil((monthEnd.getTime() - monthStart.getTime()) / (1000 * 60 * 60 * 24))
                                          const overlapDays = hasOverlap ? Math.ceil((overlapEnd.getTime() - overlapStart.getTime()) / (1000 * 60 * 60 * 24)) : 0
                                          const monthCoverage = hasOverlap ? (overlapDays / monthDays) * 100 : 0
                                          
                                          return (
                                            <div key={`${month.year}-${month.month}`} className="border-r last:border-r-0 p-0">
                                              {hasOverlap ? (
                                                <div className="relative h-3 bg-gray-200 rounded overflow-hidden">
                                                  <div 
                                                    className="h-full rounded transition-all duration-300"
                                                    style={{ 
                                                      width: `${monthCoverage}%`,
                                                      backgroundColor: project.color,
                                                      opacity: 0.6,
                                                      borderStyle: 'dashed'
                                                    }}
                                                  >
                                                  </div>
                                                </div>
                                              ) : (
                                                <div className="h-3"></div>
                                              )}
                                            </div>
                                          )
                                        })}
                                      </div>
                                    )
                                  })}
                                </>
                              )
                            }
                            return null
                          })()}
                        </div>

                        {/* Date Range Info */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-2">Timeline Range</div>
                          <div className="text-xs text-gray-600">
                            Showing: {ganttStartYear} - {ganttStartYear + 1} (24 months)
                          </div>
                        </div>

                        {/* Compact Summary */}
                        <div className="bg-gray-50 p-3 rounded-lg">
                          <div className="text-sm font-medium text-gray-700 mb-2">Summary</div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <div className="text-center">
                              <div className="font-medium text-green-600">
                                {projects.filter(p => new Date() > new Date(p.endYear || 2024, p.endMonth || 11, 1)).length}
                              </div>
                              <div className="text-gray-500">Completed</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-blue-600">
                                {projects.filter(p => {
                                  const start = new Date(p.startYear || 2024, p.startMonth || 0, 1)
                                  const end = new Date(p.endYear || 2024, p.endMonth || 11, 1)
                                  return today >= start && today <= end
                                }).length}
                              </div>
                              <div className="text-gray-500">Ongoing</div>
                            </div>
                            <div className="text-center">
                              <div className="font-medium text-yellow-600">
                                {projects.filter(p => new Date() < new Date(p.startYear || 2024, p.startMonth || 0, 1)).length}
                              </div>
                              <div className="text-gray-500">Planned</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })()}
                </>
              )}
            </div>
          </div>
        </div>
      )}

          </div>
  )
}
