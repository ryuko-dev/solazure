// Allocation Grid Component - Fixed getUserData imports
"use client"

import React, { useState, useEffect, Fragment } from "react"
import { unstable_batchedUpdates } from "react-dom"
import { ChevronLeft, ChevronRight } from "lucide-react"
import type { Project, User, Allocation, Position, Entity, UserRole } from "@/lib/types"
import { getCurrentUser, clearCurrentUser, getCurrentUserData, setCurrentUserData, getCurrentSystemUser, getSystemUsers, updateUserSettings } from "../lib/storage-enhanced"

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
  const [isDataLoaded, setIsDataLoaded] = useState(false)
  
  // Load user-specific data on component mount
  const [projects, setProjects] = useState<Project[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [allocations, setAllocations] = useState<Allocation[]>([])
  const [positions, setPositions] = useState<Position[]>([])

  // Load initial data
  useEffect(() => {
    console.log('[DEBUG] Data loading useEffect triggered, currentUser:', currentUser)
    console.log('[DEBUG] Current state before loading:', {
      projects: projects.length,
      users: users.length,
      positions: positions.length
    })
    
    // Only load data if we don't already have it (prevent overwriting)
    if (projects.length > 0 || users.length > 0 || positions.length > 0) {
      console.log('[DEBUG] Data already exists, skipping load to prevent overwrite')
      return
    }
    
    const loadData = async () => {
      try {
        console.log('[DEBUG] Starting data load...')
        const systemUser = await getCurrentSystemUser()
        console.log('[DEBUG] System user loaded:', systemUser?.role)
        
        if (systemUser?.role === 'admin') {
          // Admin loads their own data
          console.log('[DEBUG] Loading admin data...')
          const userData = await getCurrentUserData()
          console.log("[v0] Admin loading own data:", userData.projects)
          console.log('[DEBUG] Full user data from storage:', {
            projects: userData.projects?.length || 0,
            users: userData.users?.length || 0,
            allocations: userData.allocations?.length || 0,
            positions: userData.positions?.length || 0,
            entities: userData.entities?.length || 0
          })
          console.log('[DEBUG] Users from storage:', userData.users?.map(u => u.name) || [])
          
          // SAFEGUARD: Don't overwrite existing data if we already have it
          if (isDataLoaded) {
            console.log('[DEBUG] SAFEGUARD: Data already loaded, skipping overwrite')
            console.log('[DEBUG] Current data counts:', {
              projects: projects.length,
              users: users.length,
              positions: positions.length
            })
            return
          }
          
          console.log('[DEBUG] Setting initial data from storage...')
          console.log('[DEBUG] About to setProjects with:', userData.projects?.length || 0, 'projects')
          setProjects(userData.projects || [])
          setUsers(userData.users || [])
          // Only set allocations if current state is empty (prevent overwriting edits)
          if (allocations.length === 0) {
            setAllocations(userData.allocations || [])
          }
          setPositions(userData.positions || [])
          setEntities(userData.entities || [])
          
          // Mark data as loaded to prevent future overwrites
          setIsDataLoaded(true)
        } else {
          // System users load admin's data
          console.log('[DEBUG] Loading system user data...')
          const systemUsers = await getSystemUsers()
          const adminUser = systemUsers.find(u => u.role === 'admin' && u.isActive)
          
          if (adminUser) {
            console.log('[DEBUG] Found admin user, loading admin data...')
            const adminData = await getCurrentUserData()
            console.log("[v0] System user loading admin data:", adminData.projects)
            console.log('[DEBUG] Full admin data from storage:', {
              projects: adminData.projects?.length || 0,
              users: adminData.users?.length || 0,
              allocations: adminData.allocations?.length || 0,
              positions: adminData.positions?.length || 0,
              entities: adminData.entities?.length || 0
            })
            console.log('[DEBUG] Users from storage:', adminData.users?.map(u => u.name) || [])
            
            // SAFEGUARD: Don't overwrite existing data if we already have it
            if (isDataLoaded) {
              console.log('[DEBUG] SAFEGUARD: Data already loaded, skipping overwrite')
              console.log('[DEBUG] Current data counts:', {
                projects: projects.length,
                users: users.length,
                positions: positions.length
              })
              return
            }
            
            console.log('[DEBUG] Setting initial data from storage...')
            console.log('[DEBUG] About to setProjects with:', adminData.projects?.length || 0, 'projects')
            setProjects(adminData.projects || [])
            setUsers(adminData.users || [])
            // Only set allocations if current state is empty (prevent overwriting edits)
            if (allocations.length === 0) {
              setAllocations(adminData.allocations || [])
            }
            setPositions(adminData.positions || [])
            setEntities(adminData.entities || [])
            
            // Mark data as loaded to prevent future overwrites
            setIsDataLoaded(true)
          } else {
            console.log('[DEBUG] No admin user found')
          }
        }
      } catch (error) {
        console.error("[DEBUG] Failed to load data:", error)
      }
    }
    loadData()
  }, [currentUser]) // Add currentUser dependency to trigger reload

  // Debug state changes
  useEffect(() => {
    console.log('[DEBUG] Users state changed:', users.length, users.map(u => u.name))
  }, [users])
  
  useEffect(() => {
    console.log('[DEBUG] Positions state changed:', positions.length, positions.map(p => p.name))
  }, [positions])

  // Check login status and role on mount
  useEffect(() => {
    console.log('[DEBUG] AUTH USEEFFECT TRIGGERED')
    const checkAuth = async () => {
      try {
        console.log('[DEBUG] Starting authentication check...')
        const user = getCurrentUser()
        const systemUser = await getCurrentSystemUser()
        
        console.log("[DEBUG] Auth check results - user:", user, "systemUser:", systemUser)
        
        if (!user || !systemUser) {
          console.log("[DEBUG] No user or systemUser found - setting test user as admin")
          // window.location.href = "/login"
          // For testing, set default values
          setCurrentUserState("test-user")
          setCurrentUserRole("admin")
          console.log("[DEBUG] Set test user role to admin")
        } else {
          console.log("[DEBUG] User found - setting real user role")
          setCurrentUserState(user)
          setCurrentUserRole(systemUser.role)
          console.log("[DEBUG] Set real user role to:", systemUser.role)
        }
      } catch (error) {
        console.error('[DEBUG] Error in authentication:', error)
        // Fallback: set test user as admin
        setCurrentUserState("test-user")
        setCurrentUserRole("admin")
        console.log('[DEBUG] Fallback: Set test user role to admin due to error')
      }
    }
    checkAuth()
  }, [])

  const [selectedMonth, setSelectedMonth] = useState<number | null>(null)

  // Grid starting month/year (top-right selectors). Persist per user.
  const [startMonth, setStartMonth] = useState<number>(0)
  const [startYear, setStartYear] = useState<number>(2024)

  // Initialize startMonth/startYear from localStorage on client side only
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Prefer group-specific local key, fall back to generic selected-month
      const storedGroup = localStorage.getItem('sola-start-alloc-planning')
      if (storedGroup) {
        try {
          const parsed = JSON.parse(storedGroup)
          if (typeof parsed.month === 'number') setStartMonth(parsed.month)
          if (typeof parsed.year === 'number') setStartYear(parsed.year)
          return
        } catch {}
      }
      
      const storedMonth = localStorage.getItem('sola-selected-month')
      const storedYear = localStorage.getItem('sola-selected-year')
      
      if (storedMonth) setStartMonth(Number(storedMonth))
      if (storedYear) setStartYear(Number(storedYear))
      else {
        // Only use current date as fallback if no stored values
        const now = new Date()
        setStartMonth(now.getMonth())
        setStartYear(now.getFullYear())
      }
    }
  }, [])

  // Load initial settings
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const { getStartForGroup } = await import("@/lib/start-settings")
        const { month, year } = await getStartForGroup('allocPlanning')
        setStartMonth(month ?? 0)
        setStartYear(year ?? 2024)
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }
    loadSettings()
  }, [])

  // Persist starting month/year when they change
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      console.log('[DEBUG] Saving startMonth/startYear for allocPlanning group')
      import("@/lib/start-settings").then(({ setStartForGroup }) => {
        setStartForGroup('allocPlanning', startMonth, startYear).catch(error => {
          console.error('[DEBUG] Failed to save group start settings:', error)
        })
      }).catch(err => console.error('Failed to load start-settings:', err))
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
  const [systemUsers, setSystemUsers] = useState<any[]>([])
  const [showEntityManagement, setShowEntityManagement] = useState(false)
  const [showSettingsDropdown, setShowSettingsDropdown] = useState(false)

  // Load system users when modal opens
  useEffect(() => {
    if (showUserManagement) {
      const loadSystemUsers = async () => {
        try {
          const users = await getSystemUsers()
          setSystemUsers(users)
        } catch (error) {
          console.error('Failed to load system users:', error)
        }
      }
      loadSystemUsers()
    }
  }, [showUserManagement])
  const [showUserSection, setShowUserSection] = useState(true)
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

  // Save data to user-specific storage whenever it changes - Combined into one useEffect
  useEffect(() => {
    if (typeof window !== 'undefined' && currentUser) {
      // 🚨 CRITICAL FIX: Don't save empty data during initialization
      const totalItems = projects.length + users.length + allocations.length + positions.length + entities.length
      if (totalItems === 0) {
        console.log("[v0] Skipping save - all data arrays are empty (initialization)")
        return
      }
      
      console.log("[v0] Saving all data for user:", currentUser, {
        projects: projects.length,
        users: users.length,
        allocations: allocations.length,
        positions: positions.length,
        entities: entities.length
      })
      console.log("[v0] Projects being saved:", projects.map(p => ({ id: p.id, name: p.name })))
      // Save ALL current data in one call
      setCurrentUserData({ projects, users, allocations, positions, entities })
        .then(() => {
          console.log("[v0] Data saved successfully")
        })
        .catch(error => {
          console.error("[v0] Failed to save data:", error)
        })
    } else {
      console.log("[v0] Not saving data - currentUser:", currentUser, "window:", typeof window !== 'undefined')
    }
  }, [projects, users, allocations, positions, entities, currentUser])

  // Debug: Track when states change
  useEffect(() => {
    console.log('[DEBUG] Projects state changed:', projects.length)
  }, [projects])
  
  useEffect(() => {
    console.log('[DEBUG] Users state changed:', users.length, users.map(u => u.name))
  }, [users])
  
  useEffect(() => {
    const timestamp = new Date().toISOString()
    console.log(`[${timestamp}] [DEBUG] Allocations state changed:`, allocations.length, allocations.map(a => ({ id: a.id, percentage: a.percentage })))
    
    // Track if allocations are being reset to empty
    if (allocations.length === 0) {
      console.log(`[${timestamp}] [DEBUG] ⚠️ Allocations reset to empty! Call stack:`, new Error().stack?.split('\n').slice(1, 8))
    }
  }, [allocations])
  
  useEffect(() => {
    console.log('[DEBUG] Positions state changed:', positions.length)
  }, [positions])

  // Project management state
  const [showProjectModal, setShowProjectModal] = useState(false)
  const [editingProjectId, setEditingProjectId] = useState<string | null>(null)
  const [newProjectName, setNewProjectName] = useState("")
  const [selectedColor, setSelectedColor] = useState("#3B82F6")
  const [projectStartMonth, setProjectStartMonth] = useState(0)
  const [projectStartYear, setProjectStartYear] = useState(2024)
  const [projectEndMonth, setProjectEndMonth] = useState(0)
  const [projectEndYear, setProjectEndYear] = useState(2024)
  const [allocationMode, setAllocationMode] = useState<'percentage' | 'days'>('percentage')
  const [positionBudgets, setPositionBudgets] = useState<any[]>([])
  const [monthTablePage, setMonthTablePage] = useState(0)
  
  // Helper function for working days calculation
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
  
  const COLORS = [
    "#3B82F6", "#10B981", "#F59E0B", "#EF4444", "#8B5CF6",
    "#EC4899", "#06B6D4", "#84CC16", "#F97316", "#6366F1"
  ]
  
  // Calculate display months for the table - defined inline where used
  const getDisplayMonths = () => {
    const months = []
    const startIndex = monthTablePage * 12
    const endIndex = Math.min(startIndex + 12, (projectEndYear - projectStartYear + 1) * 12)
    
    for (let i = startIndex; i < endIndex; i++) {
      const year = Math.floor(i / 12) + projectStartYear
      const month = i % 12
      // Calculate the actual global index that matches the grid
      const globalIndex = (year - 2024) * 12 + month
      months.push({
        globalIndex,  // Use the correct global index
        year,
        month,
        displayName: `${MONTHS[month].slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`,
      })
    }
    
    return months
  }

  // Calculate total months in the project
  const getTotalProjectMonths = () => {
    return (projectEndYear - projectStartYear + 1) * 12
  }

  // Check if navigation should be shown
  const shouldShowNavigation = () => {
    return getTotalProjectMonths() > 12
  }

  // Navigation handlers
  const handlePrevMonths = () => {
    if (monthTablePage > 0) {
      setMonthTablePage(monthTablePage - 1)
    }
  }

  const handleNextMonths = () => {
    const maxPage = Math.floor((getTotalProjectMonths() - 1) / 12)
    if (monthTablePage < maxPage) {
      setMonthTablePage(monthTablePage + 1)
    }
  }

  // Check if a month is beyond the project end date
  const isMonthBeyondProjectEnd = (monthIndex: number) => {
    if (!projectEndMonth || !projectEndYear) {
      return false // No end date set, allow all months
    }
    
    const monthYear = Math.floor(monthIndex / 12) + 2024
    const month = monthIndex % 12
    
    // Check if the month is after the project end month/year
    if (monthYear > projectEndYear) {
      return true
    } else if (monthYear === projectEndYear && month > projectEndMonth) {
      return true
    }
    
    return false
  }

  // Get all months in the project (not just displayed ones)
  const getAllProjectMonths = () => {
    const months = []
    const totalMonths = getTotalProjectMonths()
    
    for (let i = 0; i < totalMonths; i++) {
      const year = Math.floor(i / 12) + projectStartYear
      const month = i % 12
      const globalIndex = (year - 2024) * 12 + month
      months.push({
        globalIndex,
        year,
        month,
        displayName: `${MONTHS[month].slice(0, 3).toUpperCase()} ${String(year).slice(-2)}`,
      })
    }
    
    return months
  }

  // Check if any positions have been entered (have budget values > 0)
  const hasPositionEntries = () => {
    return positionBudgets.some(positionBudget => 
      Object.values(positionBudget.budgets).some((value) => typeof value === 'number' && value > 0)
    )
  }

  // Load entities
  useEffect(() => {
    const loadEntities = async () => {
      try {
        console.log('[DEBUG] Loading entities...')
        // Only load if we don't already have entities
        if (entities.length > 0) {
          console.log('[DEBUG] Entities already loaded, skipping')
          return
        }
        const userData = await getCurrentUserData()
        console.log('[DEBUG] Loaded entities:', userData.entities?.length || 0)
        setEntities(userData.entities || [])
      } catch (error) {
        console.error("Failed to load entities:", error)
      }
    }
    loadEntities()
  }, [])

  // Check if current user has permission for specific actions
  const canEdit = currentUserRole && ['admin', 'editor', 'senior'].includes(currentUserRole)
  const canView = currentUserRole && ['admin', 'editor', 'viewer', 'senior'].includes(currentUserRole)
  
  console.log('[DEBUG] USER ROLE DEBUG:', { currentUserRole, canEdit, canView, currentUser })

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

  const handleEditProject = (projectId: string) => {
    setEditingProjectId(projectId)
    const project = projects.find((p) => p.id === projectId)
    if (project) {
      console.log('[DEBUG] Editing project:', project.name, 'allocationMode:', project.allocationMode)
      setNewProjectName(project.name)
      setSelectedColor(project.color)
      setProjectStartMonth(project.startMonth ?? 0)
      setProjectStartYear(project.startYear ?? 2024)
      setProjectEndMonth(project.endMonth ?? 0)
      setProjectEndYear(project.endYear ?? 2024)
      
      // Set allocation mode from project or default to percentage
      const modeToSet = project.allocationMode ?? 'percentage'
      console.log('[DEBUG] Setting allocation mode to:', modeToSet)
      setAllocationMode(modeToSet)
      setMonthTablePage(0)

      const projectPositions = positions.filter((p) => p.projectId === projectId)
      const positionMap = new Map<string, any>()

      projectPositions.forEach((p) => {
        const name = p.name || "Unnamed Position"
        if (!positionMap.has(name)) {
          positionMap.set(name, {
            id: `${name}-${Date.now()}`,
            name,
            projectTask: p.projectTask,
            budgets: {},
          })
        }
        const pos = positionMap.get(name)!
        // If project allocationMode is 'days' prefer stored `days` value. If not present,
        // convert stored percentage back to days using the month working days.
        let value: number = 0
        if (project.allocationMode === 'days') {
          if (typeof p.days === 'number') {
            value = p.days
          } else if (typeof p.percentage === 'number') {
            const year = Math.floor(p.monthIndex / 12) + 2024
            const month = p.monthIndex % 12
            const workingDays = getWorkingDaysInMonth(year, month, 1)
            value = Math.round((p.percentage / 100) * workingDays)
          } else {
            value = 0
          }
        } else {
          // percentage mode: prefer percentage value
          value = typeof p.percentage === 'number' ? p.percentage : 0
        }
        console.log('[DEBUG] Loading position:', name, 'month:', p.monthIndex, 'value:', value, 'mode:', project.allocationMode)
        pos.budgets[p.monthIndex] = value
      })

      setPositionBudgets(Array.from(positionMap.values()))
      setShowProjectModal(true)
    }
  }

  const handleCreateProject = () => {
    setEditingProjectId(null)
    setNewProjectName("")
    setSelectedColor("#3B82F6")
    setProjectStartMonth(0)
    setProjectStartYear(2024)
    setProjectEndMonth(0)
    setProjectEndYear(2024)
    setShowProjectModal(true)
  }

  const handleSaveProject = () => {
    console.log('[DEBUG] handleSaveProject called:', {
      editingProjectId,
      newProjectName,
      positionBudgets: positionBudgets.length,
      currentUser
    })

    if (!newProjectName.trim()) return

    const displayMonths = getDisplayMonths()
    
    if (editingProjectId) {
      // Update existing project
      console.log('[DEBUG] Updating existing project:', editingProjectId)
      
      // Get all project months to preserve existing positions
      const allProjectMonths = getAllProjectMonths()
      
      // Update positions - preserve existing positions from all months
      const newPositions: Position[] = []
      allProjectMonths.forEach((projectMonth) => {
        positionBudgets.forEach((positionBudget) => {
          const value = positionBudget.budgets[projectMonth.globalIndex] || 0
          if (value > 0) {
            // Convert to percentage for the Position object (always stored as percentage)
            const percentageValue = allocationMode === 'days' ? (value / getWorkingDaysInMonth(projectMonth.year, projectMonth.month, 1)) * 100 : value
            
            // Calculate actual allocated amount from current allocations
            const currentAllocated = allocations
              .filter(a => 
                a.projectId === editingProjectId && 
                a.monthIndex === projectMonth.globalIndex && 
                a.positionName === positionBudget.name
              )
              .reduce((sum, a) => sum + (a.percentage || 0), 0)
            
            // Skip creating position if it's already fully allocated
            if (currentAllocated >= percentageValue) {
              console.log(`[DEBUG] Skipping position ${positionBudget.name} for month ${projectMonth.globalIndex} - already fully allocated (${currentAllocated}% >= ${percentageValue}%)`)
              return
            }
            
            const position: Position = {
              id: `pos-${editingProjectId}-${positionBudget.id}-${projectMonth.globalIndex}`,
              projectId: editingProjectId,
              monthIndex: projectMonth.globalIndex,
              percentage: percentageValue,
              // If allocation mode is days, store the original days value as well
              days: allocationMode === 'days' ? value : undefined,
              allocated: currentAllocated, // Preserve actual allocated amount
              name: positionBudget.name,
              projectTask: positionBudget.projectTask,
            }
            newPositions.push(position)
          }
        })
      })
      
      // Update positions state
      setPositions((prev) => {
        const filtered = prev.filter((p) => p.projectId !== editingProjectId)
        return [...filtered, ...newPositions]
      })
      
      // Update project's positions array and allocation mode
      setProjects((prev) =>
        prev.map((p) =>
          p.id === editingProjectId
            ? { ...p, positions: newPositions, allocationMode }
            : p
        )
      )
      
    } else {
      // Create new project
      console.log('[DEBUG] Creating new project')
      
      const newProject: Project = {
        id: `project-${Date.now()}`,
        name: newProjectName,
        color: selectedColor,
        startMonth: projectStartMonth,
        startYear: projectStartYear,
        endMonth: projectEndMonth,
        endYear: projectEndYear,
        allocationMode,
        positions: [],
      }
      
      // Create positions for the new project if any are defined
      const newPositions: Position[] = []
      const allProjectMonths = getAllProjectMonths()
      allProjectMonths.forEach((projectMonth) => {
        positionBudgets.forEach((positionBudget) => {
          const value = positionBudget.budgets[projectMonth.globalIndex] || 0
          if (value > 0) {
            // Convert to percentage for the Position object (always stored as percentage)
            const percentageValue = allocationMode === 'days' ? (value / getWorkingDaysInMonth(projectMonth.year, projectMonth.month, 1)) * 100 : value
            
            const position: Position = {
              id: `pos-${newProject.id}-${positionBudget.id}-${projectMonth.globalIndex}`,
              projectId: newProject.id,
              monthIndex: projectMonth.globalIndex,
              percentage: percentageValue,
              // Preserve entered days when project is in 'days' mode
              days: allocationMode === 'days' ? value : undefined,
              allocated: 0,
              name: positionBudget.name,
              projectTask: positionBudget.projectTask,
            }
            newPositions.push(position)
          }
        })
      })
      
      // Update project with positions
      newProject.positions = newPositions
      
      console.log('[DEBUG] New project created:', newProject)
      console.log('[DEBUG] New positions created:', newPositions.length)
      
      // Add project and positions
      addProject(newProject)
      setPositions((prev) => [...prev, ...newPositions])
      
      console.log('[DEBUG] Project added to state')
    }

    setShowProjectModal(false)
    setEditingProjectId(null)
    setNewProjectName("")
    setSelectedColor("#3B82F6")
    setPositionBudgets([])
    setAllocationMode('percentage')
  }

  const handleAddPosition = () => {
    const newPosition = {
      id: `pos-${Date.now()}`,
      name: "",
      projectTask: "",
      budgets: {} as Record<number, number>,
    }
    setPositionBudgets([...positionBudgets, newPosition])
  }

  const handleUpdatePositionName = (positionId: string, name: string) => {
    setPositionBudgets(positionBudgets.map((p) => 
      p.id === positionId ? { ...p, name } : p
    ))
  }

  const handleUpdateProjectTask = (positionId: string, projectTask: string) => {
    setPositionBudgets(positionBudgets.map((p) => 
      p.id === positionId ? { ...p, projectTask } : p
    ))
  }

  const handleUpdatePositionBudget = (positionId: string, monthIndex: number, value: number) => {
    // Check if the month is beyond the project end date
    if (isMonthBeyondProjectEnd(monthIndex) && value > 0) {
      // Don't allow adding values beyond project end
      return
    }
    
    setPositionBudgets(positionBudgets.map((p) => {
      if (p.id === positionId) {
        const budgets = { ...p.budgets }
        
        // Store value in the format matching the current allocation mode
        if (value > 0) {
          budgets[monthIndex] = value
        } else {
          delete budgets[monthIndex]
        }
        
        return { ...p, budgets }
      }
      return p
    }))
  }

  const handleDeletePositionLine = (positionId: string) => {
    console.log('[DEBUG] Deleting position line:', positionId)
    
    // Calculate all new values first to prevent intermediate empty states
    const newPositionBudgets = positionBudgets.filter((p) => p.id !== positionId)
    const updatedPositions = positions.filter((p) => !p.id.includes(positionId))
    const updatedAllocations = allocations.filter((a) => !a.positionId || !a.positionId.includes(positionId))
    const updatedProjects = projects.map((project) => ({
      ...project,
      positions: project.positions?.filter((p) => !p.id.includes(positionId)) || []
    }))
    
    // Update all state at once using batched updates to prevent race conditions
    unstable_batchedUpdates(() => {
      setPositionBudgets(newPositionBudgets)
      setPositions(updatedPositions)
      setAllocations(updatedAllocations)
      setProjects(updatedProjects)
    })
    
    console.log('[DEBUG] State updated - deletion should be visible in UI')
    
    // Force save by fetching latest data first, then applying deletion
    setTimeout(async () => {
      try {
        console.log('[DEBUG] Force save: Fetching latest data first...')
        const latestData = await getCurrentUserData()
        
        // Apply deletion to latest data (positionBudgets is derived from positions)
        const latestPositions = (latestData.positions || positions).filter((p: any) => !p.id.includes(positionId))
        const latestAllocations = (latestData.allocations || allocations).filter((a: any) => !a.positionId || !a.positionId.includes(positionId))
        const latestProjects = (latestData.projects || projects).map((project: any) => ({
          ...project,
          positions: project.positions?.filter((p: any) => !p.id.includes(positionId)) || []
        }))
        
        console.log('[DEBUG] Force save: Saving with latest data + deletion')
        console.log('[DEBUG] Data being saved:', {
          projects: latestProjects.length,
          users: (latestData.users || users).length,
          allocations: latestAllocations.length,
          positions: latestPositions.length,
          entities: (latestData.entities || entities).length
        })
        await setCurrentUserData({ 
          projects: latestProjects, 
          users: latestData.users || users, 
          allocations: latestAllocations, 
          positions: latestPositions, 
          entities: latestData.entities || entities 
        })
        console.log('[DEBUG] Force save successful')
      } catch (error) {
        console.error('[DEBUG] Force save failed:', error)
      }
    }, 200) // Small delay to ensure state updates complete
  }

  // Export positions to Excel
  const exportPositionsToExcel = () => {
    const displayMonths = getDisplayMonths()
    const headers = ['Project Task', 'Position Name', ...displayMonths.map(m => m.displayName)]
    
    const rows = positionBudgets.map(pb => [
      pb.projectTask || '',
      pb.name || '',
      ...displayMonths.map(m => pb.budgets[m.globalIndex] || '')
    ])
    
    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.join(','))
    ].join('\n')
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    const url = URL.createObjectURL(blob)
    link.setAttribute('href', url)
    link.setAttribute('download', `${newProjectName || 'project'}_positions.csv`)
    link.style.visibility = 'hidden'
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
  }

  // Import positions from Excel
  const importPositionsFromExcel = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return
    
    const reader = new FileReader()
    reader.onload = (e) => {
      const text = e.target?.result as string
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        alert('Invalid file format')
        return
      }
      
      const displayMonths = getDisplayMonths()
      const importedPositions: any[] = []
      
      // Skip header row, process data rows
      for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',').map(v => v.trim())
        if (values.length < 2) continue
        
        const position = {
          id: `pos-${Date.now()}-${i}`,
          projectTask: values[0] || '',
          name: values[1] || '',
          budgets: {} as Record<number, number>
        }
        
        // Map month columns to budget values
        displayMonths.forEach((month, index) => {
          if (values[index + 2]) {
            const value = parseFloat(values[index + 2])
            if (!isNaN(value) && value > 0) {
              position.budgets[month.globalIndex] = value
            }
          }
        })
        
        importedPositions.push(position)
      }
      
      setPositionBudgets(importedPositions)
      alert(`Successfully imported ${importedPositions.length} positions`)
    }
    
    reader.readAsText(file)
    // Reset file input
    event.target.value = ''
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
    // Remove project and get the updated list
    const updatedProjects = projects.filter((p) => p.id !== projectId)
    const updatedAllocations = allocations.filter((a) => a.projectId !== projectId)
    const updatedPositions = positions.filter((p) => p.projectId !== projectId)
    
    // Update state
    setProjects(updatedProjects)
    setAllocations(updatedAllocations)
    setPositions(updatedPositions)
    
    // Manually trigger save to ensure changes are persisted to Azure
    if (typeof window !== 'undefined' && currentUser) {
      console.log("[v0] Manually saving after project deletion")
      updateUserSettings({ 
        projects: updatedProjects,
        allocations: updatedAllocations,
        positions: updatedPositions
      })
        .catch(error => {
          console.error('[DEBUG] Failed to save after project deletion:', error)
        })
    }
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
    console.log('[DEBUG] saveUserChanges called:', {
      editingUserId,
      editingUserName,
      editingUserDept,
      currentUser: users.length
    })
    
    if (!editingUserName.trim()) return

    if (editingUserId) {
      console.log('[DEBUG] Updating existing user:', editingUserId)
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
      console.log('[DEBUG] Creating new user...')
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
      console.log('[DEBUG] New user created:', newUser)
      setUsers((prev) => {
        const updatedUsers = [...prev, newUser]
        console.log('[DEBUG] Users state updated from', prev.length, 'to', updatedUsers.length)
        console.log('[DEBUG] Updated users:', updatedUsers.map(u => u.name))
        return updatedUsers
      })
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
    console.log('[DEBUG] Deleting user:', userId)
    const updatedUsers = users.filter((u) => u.id !== userId)
    const updatedAllocations = allocations.filter((a) => a.userId !== userId)
    
    setUsers(updatedUsers)
    setAllocations(updatedAllocations)
    
    // The combined useEffect will automatically save the changes
    console.log('[DEBUG] User deleted, updated counts:', {
      users: updatedUsers.length,
      allocations: updatedAllocations.length
    })
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
      
      if (newPosition && allocation.percentage && allocation.percentage > newPosition.percentage) {
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
      const project = projects.find((p: Project) => p.id === projectId)
      const position = project?.positions?.find(
        (pos: Position) => pos.monthIndex === selectedCellMonth && pos.name === positionName,
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
        prev.map((p: Project) =>
          p.id === projectId
            ? {
                ...p,
                positions: p.positions?.map((pos: Position) =>
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
        prev.map((p: Project) =>
          p.id === allocation.projectId
            ? {
                ...p,
                positions: p.positions?.map((pos: Position) =>
                  pos.monthIndex === allocation.monthIndex && pos.name === allocation.positionName
                    ? { ...pos, allocated: Math.max(0, (pos.allocated || 0) - (allocation.percentage || 0)) }
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
          projectsPrev.map((project: Project) =>
            project.id === projectId
              ? {
                  ...project,
                  positions: project.positions?.map((position: Position) => {
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

  const groupedUsers = (Array.from(
    filteredUsers.reduce((acc, user: User) => {
      if (!acc.has(user.department)) {
        acc.set(user.department, [])
      }
      acc.get(user.department)!.push(user)
      return acc
    }, new Map<string, User[]>()),
  ) as [string, User[]][]).map(([dept, deptUsers]: [string, User[]]) => ({
    department: dept,
    users: deptUsers.sort((a: User, b: User) => a.name.localeCompare(b.name)),
  })).sort((a, b) => a.department.localeCompare(b.department))

  return (
    <div className="space-y-4 p-6">
      <div className="flex justify-between items-start gap-4">
        <div>
          {/* Project Management - for users who can view allocation */}
          {canView && (
            <div className="space-y-6">
              <div className="flex flex-wrap gap-4 items-center">
                {filteredProjects.map((project) => {
                  // Determine if text should be white or black based on background color brightness
                  const getContrastColor = (hex: string) => {
                    const r = parseInt(hex.slice(1, 3), 16)
                    const g = parseInt(hex.slice(3, 5), 16)
                    const b = parseInt(hex.slice(5, 7), 16)
                    const brightness = (r * 299 + g * 587 + b * 114) / 1000
                    return brightness > 128 ? "#000" : "#fff"
                  }
                  const textColor = getContrastColor(project.color)
                  
                  return (
                    <div
                      key={project.id}
                      className={`flex items-center justify-between px-3 py-1.5 rounded border border-gray-300 cursor-pointer hover:opacity-80 transition-opacity w-32 h-8 ${
                        selectedProjectId === project.id ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                      }`}
                      style={{ backgroundColor: project.color, color: textColor }}
                      onClick={() => {
                        setSelectedProjectId(selectedProjectId === project.id ? null : project.id)
                      }}
                    >
                      <span className="text-xs font-medium truncate flex-1">{project.name}</span>
                      {canEdit && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            handleEditProject(project.id)
                          }}
                          className="px-1.5 py-0.5 text-[10px] bg-white/20 rounded hover:bg-white/30 transition-colors flex-shrink-0"
                          style={{ color: textColor }}
                        >
                          Edit
                        </button>
                      )}
                    </div>
                  )
                })}
                {canEdit && (
                  <button
                    onClick={handleCreateProject}
                    className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 transition-colors text-sm"
                  >
                    + New Project
                  </button>
                )}
              </div>
            </div>
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
              <button 
              onClick={addUser} 
              className="px-3 py-1 text-sm bg-blue-900 hover:bg-blue-800 text-white rounded"
            >
              + New Staff
            </button>
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
              <div className="relative">
                <button 
                  onClick={() => setShowSettingsDropdown(!showSettingsDropdown)} 
                  className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
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
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                
                {showSettingsDropdown && (
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-gray-200 rounded-md shadow-lg z-50">
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false)
                        setShowUserManagement(true)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      User Management
                    </button>
                    <button
                      onClick={() => {
                        setShowSettingsDropdown(false)
                        setShowEntityManagement(true)
                      }}
                      className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    >
                      Entity Management
                    </button>
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => {
                // Clear current user session but keep their data
                const user = getCurrentUser()
                if (user) {
                  updateUserSettings({ startMonth, startYear }) // Save current view settings without overwriting
                    .catch(error => {
                      console.error('[DEBUG] Failed to save settings on logout:', error)
                    })
                }
                clearCurrentUser()
                window.location.href = "/login"
              }}
              className="flex items-center gap-2 px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50"
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
            </button>
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
                  const monthUnallocated = filteredProjects.flatMap((project: Project) => {
                    // If a project filter is active, only show unallocated positions for that project
                    if (selectedProjectId && project.id !== selectedProjectId) {
                      return []
                    }
                    
                    const positionsForMonth =
                      project.positions?.filter((pos: Position) => pos.monthIndex === month.globalIndex) || []

                    console.log(`[DEBUG] Unallocated check for ${project.name}, month ${month.globalIndex}:`, {
                      positionsForMonth: positionsForMonth.length,
                      totalPositions: project.positions?.length || 0,
                      monthDisplay: month.display,
                      lookingForMonthIndex: month.globalIndex
                    })
                    
                    // Debug: Show actual position month indices
                    const positionMonthIndices = project.positions?.map(p => `${p.name}:${p.monthIndex}`) || []
                    console.log(`[DEBUG] ${project.name} position month indices:`, positionMonthIndices)

                    return positionsForMonth
                      .map((position: Position) => {
                        // Calculate actual allocated amount from allocation records (not position.allocated field)
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

                        console.log(`[DEBUG] Found unallocated position:`, {
                          positionName: position.name,
                          positionId: position.id,
                          percentage: position.percentage,
                          allocatedFromRecords: allocated,
                          unallocated
                        })

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
                      .filter((p: any): p is NonNullable<typeof p> => p != null)
                  })

                  console.log(`[DEBUG] Month ${month.globalIndex} unallocated positions:`, monthUnallocated.length)

                  return (
                    <td
                      key={month.globalIndex}
                      className="border border-gray-300 bg-gray-50 p-1 align-top"
                      style={{ verticalAlign: "top" }}
                    >
                      <div className="flex flex-wrap gap-1">
                        {monthUnallocated.map((pos: any) => (
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
                      {months.map((month) => {
                        // Check user status for this month using the same logic as the allocation table
                        const userEnded = isUserEndedInMonth(user.id, month.globalIndex)
                        const userNotStarted = !isUserStartedInMonth(user.id, month.globalIndex)
                        
                        // Get allocations for this user and month
                        const userAllocations = allocations.filter(
                          (a) => a.userId === user.id && a.monthIndex === month.globalIndex,
                        )
                        
                        // Filter allocations by selected project if active
                        const filteredAllocations = selectedProjectId 
                          ? userAllocations.filter(allocation => allocation.projectId === selectedProjectId)
                          : userAllocations
                        
                        // Calculate total allocated percentage
                        const totalAllocated = filteredAllocations.reduce((sum, a) => sum + (a.percentage || 0), 0)
                        const freePercentage = Math.max(0, 100 - totalAllocated)
                        
                        // Calculate display value based on view mode
                        const totalDisplayValue = viewMode === 'days' 
                          ? Math.round(getDaysFromPercentage(user.id, month.globalIndex, totalAllocated))
                          : Math.round(totalAllocated)
                        
                        const totalDisplayText = viewMode === 'days' 
                          ? `${totalDisplayValue}d`
                          : `${totalDisplayValue}%`
                        
                        // Determine bar color based on total allocation
                        const barColor = totalAllocated >= 90 && totalAllocated <= 110 
                          ? '#2d7b51'  // Green for 90-110%
                          : totalAllocated < 90 
                            ? '#BB7D63' // Brown for <90%
                            : '#A82A00' // Red for >110%
                        
                        // Determine border class based on allocation level
                        const allocationBorderClass =
                          totalAllocated === 100
                            ? "border-2 border-green-500"
                            : totalAllocated > 100
                              ? "border-2 border-red-500"
                              : ""
                        
                        return (
                          <td
                            key={`${user.id}-${month.globalIndex}`}
                            data-user-id={user.id}
                            data-month={month.globalIndex}
                            className={`w-32 border-r border-b border-gray-300 bg-white px-1 py-0.5 min-h-8 transition-colors relative ${
                              userEnded || userNotStarted || currentUserRole === 'viewer'
                                ? "cursor-not-allowed bg-gray-50"
                                : freePercentage > 0
                                  ? "cursor-pointer hover:bg-gray-50"
                                  : "hover:bg-gray-50"
                            }`}
                            onClick={userEnded || userNotStarted || currentUserRole === 'viewer' ? undefined : () => handleEmptyCellClick(user.id, month.globalIndex)}
                          >
                            <div className="flex flex-col h-full gap-0.5">
                              {/* Allocation bars row */}
                              <div className="flex items-center flex-1">
                                <div className={`flex w-full h-4 rounded overflow-hidden bg-gray-100 ${allocationBorderClass}`}>
                                  {userEnded ? (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-semibold text-gray-500 bg-gray-200">
                                      ended
                                    </div>
                                  ) : userNotStarted ? (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-semibold text-gray-500 bg-gray-200">
                                      not started
                                    </div>
                                  ) : filteredAllocations.length === 0 ? (
                                    <div className="w-full h-full flex items-center justify-center text-[8px] font-semibold text-gray-400">
                                      {viewMode === 'percentage' ? '0%' : '0d'}
                                    </div>
                                  ) : (
                                    filteredAllocations.map((allocation) => {
                                      const project = filteredProjects.find((p) => p.id === allocation.projectId)
                                      
                                      // Apply the same color coding as the total allocation bars
                                      const allocationPercentage = allocation.percentage || 0
                                      const positionBarColor = allocationPercentage >= 90 && allocationPercentage <= 110 
                                        ? '#2d7b51'  // Green for 90-110%
                                        : allocationPercentage < 90 
                                          ? '#BB7D63' // Brown for <90%
                                          : '#A82A00' // Red for >110%
                                      
                                      // Keep total bar size constant at 100%, even if allocations exceed 100%
                                      const width = Math.max(
                                        0,
                                        Math.min(100, ((allocation.percentage || 0) / 100) * 100),
                                      )

                                      return (
                                        <div
                                          key={allocation.id}
                                          className={`h-full flex items-center justify-center font-semibold relative group cursor-pointer`}
                                          style={{
                                            backgroundColor: positionBarColor,
                                            width: `${width}%`,
                                            minWidth: width > 0 ? "8%" : undefined,
                                          }}
                                          onClick={(e) => {
                                            if (!currentUserRole || (currentUserRole as UserRole) === 'viewer') return
                                            e.stopPropagation()
                                            setEditingId(allocation.id)
                                            setEditValue(allocation.percentage || 0)
                                          }}
                                          title={`${project?.name ?? "Project"} - ${allocation.positionName || "Position"} - ${Math.round(allocation.percentage || 0)}% (${Math.round(getDaysFromPercentage(user.id, month.globalIndex, allocation.percentage || 0))} days)`}
                                        >
                                          {currentUserRole && (currentUserRole as UserRole) !== 'viewer' && (
                                            <button
                                              onClick={(e) => {
                                                if (!currentUserRole || (currentUserRole as UserRole) === 'viewer') return
                                                e.stopPropagation()
                                                handleRemoveAllocation(allocation.id)
                                              }}
                                              className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                                            >
                                              ×
                                            </button>
                                          )}
                                        </div>
                                      )
                                    })
                                  )}
                                </div>
                                
                                {/* Total text overlay - centered across filled part of bars */}
                                {filteredAllocations.length > 0 && (
                                  <div 
                                    className="absolute top-0 bottom-0 flex items-center justify-center pointer-events-none"
                                    style={{
                                      left: '0%',
                                      width: `${Math.min(totalAllocated, 100)}%`
                                    }}
                                  >
                                    <span className="text-white text-[8px] font-bold drop-shadow-md">{totalDisplayText}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                          </td>
                        )
                      })}
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
                  <button
                    className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                    onClick={() => {
                      deleteUser(editingUserId)
                      setShowUserModal(false)
                    }}
                  >
                    Delete
                  </button>
                )}
                <button className="px-3 py-1 text-sm border border-gray-300 rounded hover:bg-gray-50" onClick={() => setShowUserModal(false)}>
                  Cancel
                </button>
                <button onClick={saveUserChanges} className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700">Save</button>
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
              {projects.flatMap((project: Project) => {
                // If a project filter is active, only show positions for that project
                if (selectedProjectId && project.id !== selectedProjectId) {
                  return []
                }
                
                // Positions created in ProjectManager already use a global monthIndex (0 = Jan 2024, ...)
                // Cells in the grid also use this same global monthIndex. So we just match directly.
                const monthPositions = (project.positions || [])
                  .filter((p: Position) => p.monthIndex === selectedCellMonth && (p.percentage || 0) > 0)
                  .map((p: Position) => {
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
                  .filter((p: any) => p.available > 0)

                const availablePositions = monthPositions

                return availablePositions.map((position: any) => {
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
              (project: Project) =>
                !project.positions?.some((p: Position) => p.monthIndex === selectedCellMonth && (p.percentage || 0) > 0),
            ) && (
              <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                No positions available for this month. Add positions in the project settings.
              </div>
            )}
            <button className="w-full mt-4 px-3 py-2 border border-gray-300 rounded hover:bg-gray-50" onClick={() => {
              setShowPositionModal(false)
              setSelectedPositionForCustom(null)
              setCustomAllocationAmount({})
            }}>
              Close
            </button>
          </div>
        </div>
      )}

      
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
                  {groupedUsers.map((group: any) => (
                    <React.Fragment key={group.department}>
                      <tr>
                        <td colSpan={filteredProjects.length + 2} className="border border-gray-300 p-1 font-semibold text-xs text-gray-800 bg-cyan-200">
                          {group.department}
                        </td>
                      </tr>
                      {group.users.map((user: User) => (
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
                                      (p: Position) => p.id === allocation.positionId
                                    )
                                    const displayValue = viewMode === 'days' 
                                      ? getDaysFromPercentage(user.id, selectedMonthForDetail.globalIndex, allocation.percentage || 0)
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

      {/* User Management Modal */}
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

      {/* Project Management Modal */}
      {showProjectModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full h-full mx-4 overflow-y-auto">
            <h2 className="text-lg font-semibold mb-4">
              {editingProjectId ? "Edit Project" : "Create New Project"}
            </h2>

            {/* Export/Import Buttons */}
            <div className="flex gap-2 mb-4">
              <button
                onClick={exportPositionsToExcel}
                className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
                title="Export positions to Excel"
              >
                📥 Export to Excel
              </button>
              <label className="px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors cursor-pointer">
                📤 Import from Excel
                <input
                  type="file"
                  accept=".csv,.xlsx,.xls"
                  onChange={importPositionsFromExcel}
                  className="hidden"
                />
              </label>
            </div>

            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Project Name</label>
                <input
                  type="text"
                  value={newProjectName}
                  onChange={(e) => setNewProjectName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded text-gray-900 bg-white"
                  placeholder="Enter project name"
                  autoFocus
                />
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Project Color</label>
                <div className="flex gap-2 flex-wrap">
                  {COLORS.map((color) => (
                    <button
                      key={color}
                      onClick={() => setSelectedColor(color)}
                      className={`w-8 h-8 rounded transition-all ${selectedColor === color ? "ring-2 ring-offset-2 ring-blue-500" : "hover:opacity-80"}`}
                      style={{ backgroundColor: color }}
                      title={color}
                    />
                  ))}
                </div>
              </div>
            </div>

            <div className="mb-6">
              <label className="text-xs font-medium text-gray-600 mb-2 block">Allocation Mode</label>
              <div className="flex gap-4">
                <label className={`flex items-center gap-2 ${hasPositionEntries() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="allocationMode"
                    value="percentage"
                    checked={allocationMode === 'percentage'}
                    onChange={(e) => setAllocationMode('percentage')}
                    disabled={hasPositionEntries()}
                    className="text-blue-600"
                  />
                  <span className="text-sm">% Allocation</span>
                </label>
                <label className={`flex items-center gap-2 ${hasPositionEntries() ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}>
                  <input
                    type="radio"
                    name="allocationMode"
                    value="days"
                    checked={allocationMode === 'days'}
                    onChange={(e) => setAllocationMode('days')}
                    disabled={hasPositionEntries()}
                    className="text-blue-600"
                  />
                  <span className="text-sm">Day Allocation</span>
                </label>
              </div>
              {hasPositionEntries() && (
                <p className="text-xs text-amber-600 mt-2">
                  ⚠️ Allocation mode cannot be changed when positions have been entered. Clear all position values to change mode.
                </p>
              )}
            </div>

            <div className="mb-6 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Start Month</label>
                <select
                  value={projectStartMonth}
                  onChange={(e) => setProjectStartMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-white"
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">Start Year</label>
                <select
                  value={projectStartYear}
                  onChange={(e) => setProjectStartYear(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-white"
                >
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">End Month</label>
                <select
                  value={projectEndMonth}
                  onChange={(e) => setProjectEndMonth(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-white"
                >
                  {MONTHS.map((month, idx) => (
                    <option key={idx} value={idx}>
                      {month}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-medium text-gray-600 mb-2 block">End Year</label>
                <select
                  value={projectEndYear}
                  onChange={(e) => setProjectEndYear(Number(e.target.value))}
                  className="border border-gray-300 rounded px-3 py-2 w-full text-sm bg-white"
                >
                  {YEARS.map((year) => (
                    <option key={year} value={year}>
                      {year}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Positions by Month Table */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <h3 className="text-sm font-semibold text-gray-700">Positions by Month</h3>
                  {shouldShowNavigation() && (
                    <div className="flex items-center gap-2">
                      <button
                        onClick={handlePrevMonths}
                        disabled={monthTablePage === 0}
                        className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                        title="Previous 12 months"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <span className="text-xs text-gray-600 min-w-20 text-center">
                        {monthTablePage * 12 + 1}-{Math.min((monthTablePage + 1) * 12, getTotalProjectMonths())} of {getTotalProjectMonths()} months
                      </span>
                      <button
                        onClick={handleNextMonths}
                        disabled={monthTablePage >= Math.floor((getTotalProjectMonths() - 1) / 12)}
                        className="p-1 text-gray-600 hover:text-gray-900 disabled:text-gray-300 disabled:cursor-not-allowed transition-colors"
                        title="Next 12 months"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={handleAddPosition}
                    className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors"
                  >
                    + Add Position
                  </button>
                </div>
              </div>
              <div className="border border-gray-300 rounded overflow-x-auto">
                <table className="w-full text-[10px]">
                  <thead className="bg-gray-100 border-b border-gray-300">
                    <tr>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 min-w-20">
                        Project Task
                      </th>
                      <th className="px-4 py-2 text-left font-semibold text-gray-600 min-w-40">
                        Position Name
                      </th>
                      {getDisplayMonths().map((displayMonth) => (
                        <th
                          key={displayMonth.globalIndex}
                          className="px-4 py-2 text-center font-semibold text-gray-600 min-w-20"
                        >
                          {displayMonth.displayName}
                        </th>
                      ))}
                      <th className="px-4 py-2 text-center font-semibold text-gray-600 w-10">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {positionBudgets.length === 0 ? (
                      <tr>
                        <td colSpan={getDisplayMonths().length + 3} className="px-4 py-8 text-center text-gray-500">
                          No positions yet. Click "Add Position" to create one.
                        </td>
                      </tr>
                    ) : (
                      positionBudgets.map((positionBudget) => (
                        <tr key={positionBudget.id} className="border-t border-gray-300 hover:bg-gray-50">
                          <td className="px-4 py-2 border-r border-gray-300">
                            <input
                              type="text"
                              value={positionBudget.projectTask || ""}
                              onChange={(e) => handleUpdateProjectTask(positionBudget.id, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
                              placeholder="e.g., 01.03.01"
                            />
                          </td>
                          <td className="px-4 py-2 border-r border-gray-300">
                            <input
                              type="text"
                              value={positionBudget.name}
                              onChange={(e) => handleUpdatePositionName(positionBudget.id, e.target.value)}
                              className="w-full px-2 py-1 border border-gray-300 rounded text-gray-900 bg-white"
                              placeholder="e.g., Senior Developer"
                            />
                          </td>
                          {getDisplayMonths().map((displayMonth) => {
                            // Get the stored value (always stored as the current allocation mode)
                            const storedValue = positionBudget.budgets[displayMonth.globalIndex] || 0
                            
                            // Display the stored value directly - no conversion needed since we store in current mode
                            const displayValue = storedValue
                            
                            return (
                              <td
                                key={displayMonth.globalIndex}
                                className={`px-4 py-2 border-r border-gray-300 last:border-r-0 ${
                                  isMonthBeyondProjectEnd(displayMonth.globalIndex) ? 'bg-gray-100' : 'bg-white'
                                }`}
                              >
                                <input
                                  type="number"
                                  min="0"
                                  max={allocationMode === 'days' ? getWorkingDaysInMonth(displayMonth.year, displayMonth.month, 1) : 999}
                                  value={displayValue || ""}
                                  disabled={isMonthBeyondProjectEnd(displayMonth.globalIndex)}
                                  onChange={(e) =>
                                    handleUpdatePositionBudget(
                                      positionBudget.id,
                                      displayMonth.globalIndex,
                                      e.target.value ? Number(e.target.value) : 0,
                                    )
                                  }
                                  className={`w-full px-2 py-1 text-center border rounded ${
                                    isMonthBeyondProjectEnd(displayMonth.globalIndex)
                                      ? 'border-gray-200 bg-gray-50 text-gray-400 cursor-not-allowed'
                                      : 'border-gray-300 text-gray-900 bg-white'
                                  }`}
                                  placeholder={allocationMode === 'days' ? `0-${getWorkingDaysInMonth(displayMonth.year, displayMonth.month, 1)} days` : "0%"}
                                />
                              </td>
                            )
                          })}
                          <td className="px-4 py-2 text-center">
                            <button
                              onClick={() => handleDeletePositionLine(positionBudget.id)}
                              className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                            >
                              ✕
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => {
                  setShowProjectModal(false)
                  setEditingProjectId(null)
                  setNewProjectName("")
                  setSelectedColor("#3B82F6")
                  setPositionBudgets([])
                  setProjectStartMonth(0)
                  setProjectStartYear(2024)
                  setProjectEndMonth(0)
                  setProjectEndYear(2024)
                  setMonthTablePage(0)
                  setAllocationMode('percentage')
                }}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded font-medium hover:bg-gray-300 transition-colors text-sm"
              >
                Cancel
              </button>
              {editingProjectId && (
                <button
                  onClick={() => {
                    if (window.confirm(`Are you sure you want to delete "${newProjectName}"? This will also delete all associated allocations and positions.`)) {
                      deleteProject(editingProjectId)
                      setShowProjectModal(false)
                      setEditingProjectId(null)
                      setNewProjectName("")
                      setSelectedColor("#3B82F6")
                      setPositionBudgets([])
                      setProjectStartMonth(0)
                      setProjectStartYear(2024)
                      setProjectEndMonth(0)
                      setProjectEndYear(2024)
                      setMonthTablePage(0)
                      setAllocationMode('percentage')
                    }
                  }}
                  className="px-4 py-2 bg-red-600 text-white rounded font-medium hover:bg-red-700 transition-colors text-sm"
                >
                  Delete Project
                </button>
              )}
              <button
                onClick={handleSaveProject}
                disabled={!newProjectName.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-sm"
              >
                {editingProjectId ? "Update Project" : "Create Project"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User Management Modal */}
      {showUserManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">User Management</h2>
            
            {/* Add New User Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="text-sm font-semibold mb-3">Add New System User</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Name"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newUserName"
                />
                <input
                  type="email"
                  placeholder="Email"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newUserEmail"
                />
                <input
                  type="password"
                  placeholder="Password"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newUserPassword"
                />
                <select
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newUserRole"
                >
                  <option value="viewer">Viewer</option>
                  <option value="editor">Editor</option>
                  <option value="senior">Senior</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <button
                onClick={() => {
                  const name = (document.getElementById('newUserName') as HTMLInputElement)?.value
                  const email = (document.getElementById('newUserEmail') as HTMLInputElement)?.value
                  const password = (document.getElementById('newUserPassword') as HTMLInputElement)?.value
                  const role = (document.getElementById('newUserRole') as HTMLSelectElement)?.value as any
                  
                  if (name && email && password) {
                    // Add to system users via storage
                    import('../lib/storage-enhanced').then(({ getSystemUsers }) => {
                      getSystemUsers().then(systemUsers => {
                        const newUser = {
                          id: Date.now().toString(),
                          name,
                          email,
                          password,
                          role,
                          isActive: true,
                          createdAt: new Date().toISOString()
                        }
                        // Call Azure API to add system user
                        fetch('/api/azure/users', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify([...systemUsers, newUser])
                        }).then(() => {
                          // Clear form
                          const nameInput = document.getElementById('newUserName') as HTMLInputElement
                          const emailInput = document.getElementById('newUserEmail') as HTMLInputElement
                          const passwordInput = document.getElementById('newUserPassword') as HTMLInputElement
                          const roleSelect = document.getElementById('newUserRole') as HTMLSelectElement
                          
                          if (nameInput) nameInput.value = ''
                          if (emailInput) emailInput.value = ''
                          if (passwordInput) passwordInput.value = ''
                          if (roleSelect) roleSelect.value = 'viewer'
                          
                          // Refresh the system users list
                          getSystemUsers().then(updatedUsers => {
                            setSystemUsers(updatedUsers)
                          })
                        })
                      })
                    })
                  }
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add System User
              </button>
            </div>

            {/* Existing System Users List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Current System Users</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Email</th>
                      <th className="text-left py-2">Role</th>
                      <th className="text-left py-2">Status</th>
                      <th className="text-left py-2">Created</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {systemUsers.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="text-center py-4 text-gray-500">
                          No system users found. Add your first system user above.
                        </td>
                      </tr>
                    ) : (
                      systemUsers.map((user) => (
                        <tr key={user.id} className="border-b">
                          <td className="py-2">{user.name}</td>
                          <td className="py-2">{user.email}</td>
                          <td className="py-2">
                            <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs capitalize">
                              {user.role}
                            </span>
                          </td>
                          <td className="py-2">
                            <span className={`px-2 py-1 ${user.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'} rounded text-xs`}>
                              {user.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-gray-500">
                            {new Date(user.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-2">
                            <button
                              onClick={() => {
                                // Toggle active status
                                const updatedUsers = systemUsers.map(u => 
                                  u.id === user.id ? { ...u, isActive: !u.isActive } : u
                                )
                                fetch('/api/azure/users', {
                                  method: 'POST',
                                  headers: { 'Content-Type': 'application/json' },
                                  body: JSON.stringify(updatedUsers)
                                }).then(() => {
                                  setSystemUsers(updatedUsers)
                                })
                              }}
                              className="text-blue-600 hover:text-blue-800 text-sm mr-2"
                            >
                              {user.isActive ? 'Deactivate' : 'Activate'}
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this user?')) {
                                  const filteredUsers = systemUsers.filter(u => u.id !== user.id)
                                  fetch('/api/azure/users', {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json' },
                                    body: JSON.stringify(filteredUsers)
                                  }).then(() => {
                                    setSystemUsers(filteredUsers)
                                  })
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowUserManagement(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Entity Management Modal */}
      {showEntityManagement && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h2 className="text-xl font-bold mb-4">Entity Management</h2>
            
            {/* Add New Entity Form */}
            <div className="mb-6 p-4 bg-gray-50 rounded">
              <h3 className="text-sm font-semibold mb-3">Add New Entity</h3>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="text"
                  placeholder="Entity Name"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newEntityName"
                />
                <input
                  type="text"
                  placeholder="Currency Code (e.g., USD, EUR)"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newEntityCurrency"
                />
                <input
                  type="text"
                  placeholder="Tax Account"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newEntityTax"
                />
                <input
                  type="text"
                  placeholder="SS Account"
                  className="px-3 py-2 border border-gray-300 rounded text-sm"
                  id="newEntitySS"
                />
              </div>
              <button
                onClick={() => {
                  const name = (document.getElementById('newEntityName') as HTMLInputElement)?.value
                  const currencyCode = (document.getElementById('newEntityCurrency') as HTMLInputElement)?.value
                  const taxAccount = (document.getElementById('newEntityTax') as HTMLInputElement)?.value
                  const ssAccount = (document.getElementById('newEntitySS') as HTMLInputElement)?.value
                  
                  if (name && currencyCode && taxAccount && ssAccount) {
                    const newEntity = {
                      id: Date.now().toString(),
                      name,
                      currencyCode,
                      taxAccount,
                      ssAccount
                    }
                    const updatedEntities = [...entities, newEntity]
                    setEntities(updatedEntities)
                    updateUserSettings({ entities: updatedEntities })
                      .catch(error => {
                        console.error('[DEBUG] Failed to save entities:', error)
                      })
                    
                    // Clear form
                    const nameInput = document.getElementById('newEntityName') as HTMLInputElement
                    const currencyInput = document.getElementById('newEntityCurrency') as HTMLInputElement
                    const taxInput = document.getElementById('newEntityTax') as HTMLInputElement
                    const ssInput = document.getElementById('newEntitySS') as HTMLInputElement
                    
                    if (nameInput) nameInput.value = ''
                    if (currencyInput) currencyInput.value = ''
                    if (taxInput) taxInput.value = ''
                    if (ssInput) ssInput.value = ''
                  }
                }}
                className="mt-3 px-4 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
              >
                Add Entity
              </button>
            </div>

            {/* Existing Entities List */}
            <div className="space-y-4">
              <h3 className="text-sm font-semibold">Current Entities</h3>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left py-2">Name</th>
                      <th className="text-left py-2">Currency</th>
                      <th className="text-left py-2">Tax Account</th>
                      <th className="text-left py-2">SS Account</th>
                      <th className="text-left py-2">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {entities.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="text-center py-4 text-gray-500">
                          No entities found. Add your first entity above.
                        </td>
                      </tr>
                    ) : (
                      entities.map((entity) => (
                        <tr key={entity.id} className="border-b">
                          <td className="py-2 font-medium">{entity.name}</td>
                          <td className="py-2">
                            <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                              {entity.currencyCode}
                            </span>
                          </td>
                          <td className="py-2 text-xs text-gray-600">{entity.taxAccount}</td>
                          <td className="py-2 text-xs text-gray-600">{entity.ssAccount}</td>
                          <td className="py-2">
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this entity?')) {
                                  const filteredEntities = entities.filter(e => e.id !== entity.id)
                                  setEntities(filteredEntities)
                                  updateUserSettings({ entities: filteredEntities })
                                    .catch(error => {
                                      console.error('[DEBUG] Failed to save entities after deletion:', error)
                                    })
                                }
                              }}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Delete
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="flex gap-2 mt-6">
              <button
                onClick={() => setShowEntityManagement(false)}
                className="px-4 py-2 bg-gray-200 text-gray-700 rounded text-sm hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

          </div>
  )
}
