"use client"

import * as React from "react"
import * as XLSX from "xlsx"
import type { User, Project, Allocation, Position, Entity } from "@/lib/types"
import { getCurrentUser, getGlobalData, getCurrentSystemUser, getSystemUsers, clearCurrentUser, getCurrentUserData, setCurrentUserData, getMonthlyAllocation, setMonthlyAllocation as saveMonthlyAllocation, getLockState, setLockState } from "@/lib/storage-enhanced"
import { canEditPage, canAccessTab, UserRole, canLockPayroll as canLockPayrollRole } from "@/lib/permissions"
import { getSharedMonthYear, setSharedMonthYear } from "@/lib/shared-state"
import { Button } from "@/components/ui/button"
import { Navigation } from "@/components/navigation"

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

interface PayrollData {
  currency: string
  netSalary: number
  socialSecurity: number
  employeeTax: number
  employerTax: number
  housing: number
  otherBenefits: number
}

interface FringeData {
  workingDays: number
  annualLeave: number
  sickLeave: number
  publicHolidays: number
  dailyRate: number
}

interface UserExtended extends User {
  entity?: string
  payrollDataByMonth?: Record<string, PayrollData> // key: "year-month" (e.g., "2024-0")
  fringeDataByMonth?: Record<string, FringeData> // key: "year-month" (e.g., "2024-0")
  projectDataByMonth?: Record<string, Record<string, number>> // key: "year-month" -> projectId -> allocation percentage
}

interface MonthlyAllocationItem {
  id: string
  name: string
  code: string
  description: string
  currency: string
  amount: number
  project: string
  projectTask: string
  account: string
}

export default function ActualAllocationPage() {
  const [currentUser, setCurrentUser] = React.useState<string | null>(null)
  const [users, setUsers] = React.useState<UserExtended[]>([])
  const [projects, setProjects] = React.useState<any[]>([])
  const [entities, setEntities] = React.useState<any[]>([])
  const [allocations, setAllocations] = React.useState<any[]>([]) // Load staff allocations
  
  // Initialize with shared month/year state
  const sharedState = getSharedMonthYear()
  const [selectedMonth, setSelectedMonth] = React.useState<number>(sharedState.month)
  const [selectedYear, setSelectedYear] = React.useState<number>(sharedState.year)
  
  const [isLocked, setIsLocked] = React.useState<boolean>(false)
  const [monthlyAllocation, setMonthlyAllocation] = React.useState<MonthlyAllocationItem[]>([])
  const [showPercentage, setShowPercentage] = React.useState<boolean>(false)
  const [isClient, setIsClient] = React.useState<boolean>(false)
  const [canLockPayroll, setCanLockPayroll] = React.useState<boolean>(false)

  // Update shared state when month/year changes
  const updateMonthYear = React.useCallback((month: number, year: number) => {
    setSelectedMonth(month)
    setSelectedYear(year)
    setSharedMonthYear(month, year)
  }, [])

  // Handle client-side hydration
  React.useEffect(() => {
    setIsClient(true)
  }, [])

  // Load user data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      const user = getCurrentUser()
      const systemUser = getCurrentSystemUser()
      if (!user || !systemUser) {
        window.location.href = "/login"
        return
      }
      
      setCurrentUser(user)
      
      // Check if user can lock payroll
      const sysUser = await systemUser
      if (sysUser) {
        setCanLockPayroll(canLockPayrollRole(sysUser.role as UserRole))
      }
      
      // Load users and projects data from global storage
      const globalData = await getGlobalData()
      const monthKey = `${selectedYear}-${selectedMonth}`
      console.log('[Payroll Page] Loading data for monthKey:', monthKey, { selectedYear, selectedMonth })
      
      // Load projects
      setProjects(globalData.projects || [])
      
      // Load allocations from staff allocation table
      setAllocations(globalData.allocations || [])
      
      // Load entities for account codes
      setEntities(globalData.entities || [])
      
      // Load month-specific lock state (applies to all users)
      const savedLockState = await getLockState(monthKey)
      setIsLocked(savedLockState)
      
      // Initialize monthly allocation items
      const savedMonthlyAllocation = await getMonthlyAllocation(monthKey)
      
      if (savedMonthlyAllocation && savedMonthlyAllocation.length > 0) {
        setMonthlyAllocation(savedMonthlyAllocation)
      } else {
        // Initialize with default items for each staff member and account category
        const accountCategories = [
          { name: 'Net Salary', code: '631 0001' },
          { name: 'Fringe Benefit - Leave', code: '631 0001' },
          { name: 'Social Security', code: '635 1001' },
          { name: 'Employee Tax', code: '620 1005' },
          { name: 'Employer Tax', code: '620 1005' },
          { name: 'Housing', code: '635 4001' },
          { name: 'Other Benefits', code: '602 4001' }
        ]
        
        const defaultItems: MonthlyAllocationItem[] = []
        globalData.users.forEach((user: any) => {
          accountCategories.forEach((category, index) => {
            defaultItems.push({
              id: `${user.id}-${category.code}-${index}`,
              name: user.name,
              code: category.code,
              description: `${user.name} - ${category.name} for ${MONTHS[selectedMonth]} ${selectedYear}`,
              currency: 'USD',
              amount: 0,
              project: '',
              projectTask: '',
              account: `${category.name} [${category.code}]`
            })
          })
        })
        setMonthlyAllocation(defaultItems)
        
        // Save the default items to storage so they can be loaded and edited
        console.log('[Payroll Page] Saving default monthly allocation to storage:', { monthKey, itemCount: defaultItems.length })
        saveMonthlyAllocation(monthKey, defaultItems).catch((error: unknown) => {
          console.error('Failed to save default monthly allocation:', error)
        })
      }
      
      const usersWithPayroll = globalData.users.map((user: any) => {
        // Load existing monthly data or create new empty structure
        const existingPayrollData = (user as any).payrollDataByMonth?.[monthKey]
        const existingFringeData = (user as any).fringeDataByMonth?.[monthKey]
        const existingProjectData = (user as any).projectDataByMonth?.[monthKey]
        
        return {
          ...user,
          entity: user.entity || "Unassigned",
          payrollDataByMonth: {
            ...(user as any).payrollDataByMonth,
            [monthKey]: existingPayrollData || {
              currency: "USD",
              netSalary: 0,
              socialSecurity: 0,
              employeeTax: 0,
              employerTax: 0,
              housing: 0,
              otherBenefits: 0
            }
          },
          fringeDataByMonth: {
            ...(user as any).fringeDataByMonth,
            [monthKey]: existingFringeData || {
              workingDays: calculateWorkingDays(user.workDays || 'mon-fri', selectedMonth, selectedYear),
              annualLeave: 0,
              sickLeave: 0,
              publicHolidays: 0,
              dailyRate: 0
            }
          },
          projectDataByMonth: {
            ...(user as any).projectDataByMonth,
            [monthKey]: existingProjectData || {}
          }
        }
      })
      setUsers(usersWithPayroll)
    }
    
    loadData()
  }, [])

  // Check if current user can lock payroll
  const canLock = () => {
    return canLockPayroll
  }

  // Toggle lock state (admin or senior only)
  const toggleLock = async () => {
    if (!canLock()) return
    
    const newLockState = !isLocked
    setIsLocked(newLockState)
    
    // Save month-specific lock state to Azure (applies to all users)
    const monthKey = `${selectedYear}-${selectedMonth}`
    await setLockState(monthKey, newLockState, currentUser || undefined)
    
    // Show success message
    alert(newLockState ? `Payroll for ${MONTHS[selectedMonth]} ${selectedYear} has been locked` : `Payroll for ${MONTHS[selectedMonth]} ${selectedYear} has been unlocked`)
  }

  // Reload lock state when month/year changes
  React.useEffect(() => {
    const loadLockState = async () => {
      const monthKey = `${selectedYear}-${selectedMonth}`
      console.log('[Payroll Page] Loading lock state for monthKey:', monthKey)
      const savedLockState = await getLockState(monthKey)
      console.log('[Payroll Page] Loaded lock state:', savedLockState)
      setIsLocked(savedLockState)
    }
    loadLockState()
  }, [selectedYear, selectedMonth])

  // Recalculate working days when month/year changes
  React.useEffect(() => {
    const monthKey = `${selectedYear}-${selectedMonth}`
    setUsers(prevUsers => 
      prevUsers.map(user => ({
        ...user,
        fringeDataByMonth: {
          ...user.fringeDataByMonth,
          [monthKey]: {
            ...(user.fringeDataByMonth?.[monthKey] || {
              annualLeave: 0,
              sickLeave: 0,
              publicHolidays: 0,
              dailyRate: 0
            }),
            workingDays: calculateWorkingDays(user.workDays || 'mon-fri', selectedMonth, selectedYear)
          }
        }
      }))
    )
  }, [selectedMonth, selectedYear])

  // Reload monthly allocation when month/year changes
  React.useEffect(() => {
    const loadMonthlyAllocation = async () => {
      const user = getCurrentUser()
      if (!user) return
      
      const monthKey = `${selectedYear}-${selectedMonth}`
      const savedMonthlyAllocation = await getMonthlyAllocation(monthKey)
      const globalData = await getGlobalData()
      
      if (savedMonthlyAllocation && savedMonthlyAllocation.length > 0) {
        // Update descriptions with current month/year, preserving account category
        const updatedData = savedMonthlyAllocation.map((item: MonthlyAllocationItem) => {
          // Extract account category name from the account field
          const accountName = item.account.split(' [')[0]
          return {
            ...item,
            description: `${item.name} - ${accountName} ${MONTHS[selectedMonth]} ${selectedYear}`
          }
        })
        setMonthlyAllocation(updatedData)
      } else {
        // Initialize with default items for each staff member and account category
        const accountCategories = [
          { name: 'Net Salary', code: '631 0001' },
          { name: 'Fringe Benefit - Leave', code: '631 0001' },
          { name: 'Social Security', code: '635 1001' },
          { name: 'Employee Tax', code: '620 1005' },
          { name: 'Employer Tax', code: '620 1005' },
          { name: 'Housing', code: '635 4001' },
          { name: 'Other Benefits', code: '602 4001' }
        ]
        
        const defaultItems: MonthlyAllocationItem[] = []
        globalData.users.forEach((user: any) => {
          accountCategories.forEach((category, index) => {
            defaultItems.push({
              id: `${user.id}-${category.code}-${index}`,
              name: user.name,
              code: category.code,
              description: `${user.name} - ${category.name} for ${MONTHS[selectedMonth]} ${selectedYear}`,
              currency: 'USD',
              amount: 0,
              project: '',
              projectTask: '',
              account: `${category.name} [${category.code}]`
            })
          })
        })
        setMonthlyAllocation(defaultItems)
      }
    }
    
    loadMonthlyAllocation()
  }, [selectedMonth, selectedYear])

  // Calculate working days based on user's work pattern
  const calculateWorkingDays = (workPattern: 'mon-fri' | 'sun-thu', month: number, year: number): number => {
    const date = new Date(year, month, 1)
    const daysInMonth = new Date(year, month + 1, 0).getDate()
    let workingDays = 0
    
    for (let day = 1; day <= daysInMonth; day++) {
      date.setDate(day)
      const dayOfWeek = date.getDay()
      
      if (workPattern === 'mon-fri') {
        if (dayOfWeek >= 1 && dayOfWeek <= 5) workingDays++
      } else {
        if (dayOfWeek >= 0 && dayOfWeek <= 4) workingDays++
      }
    }
    
    return workingDays
  }

  // Filter projects that are active in the selected month
  const getActiveProjects = () => {
    const monthIndex = (selectedYear - 2024) * 12 + selectedMonth
    return projects.filter(project => {
      const projectStartMonth = (project.startYear - 2024) * 12 + (project.startMonth || 0)
      const projectEndMonth = (project.endYear - 2024) * 12 + (project.endMonth || 11)
      return monthIndex >= projectStartMonth && monthIndex <= projectEndMonth
    })
  }

  // Handle cell value changes
  const handleCellValueChange = (userId: string, field: string, value: string, section: 'payroll' | 'fringe' | 'project', projectId?: string) => {
    // Prevent changes if locked
    if (isLocked) return
    
    const monthKey = `${selectedYear}-${selectedMonth}`
    const numValue = parseFloat(value) || 0
    
    setUsers(prevUsers => {
      const updatedUsers = prevUsers.map(user => {
        if (user.id === userId) {
          if (section === 'payroll') {
            return {
              ...user,
              payrollDataByMonth: {
                ...user.payrollDataByMonth,
                [monthKey]: {
                  ...(user.payrollDataByMonth?.[monthKey] || {
                    currency: "USD",
                    netSalary: 0,
                    socialSecurity: 0,
                    employeeTax: 0,
                    employerTax: 0,
                    housing: 0,
                    otherBenefits: 0
                  }),
                  [field]: field === 'currency' ? value : numValue
                }
              }
            }
          } else if (section === 'fringe') {
            return {
              ...user,
              fringeDataByMonth: {
                ...user.fringeDataByMonth,
                [monthKey]: {
                  ...(user.fringeDataByMonth?.[monthKey] || {
                    workingDays: calculateWorkingDays(user.workDays || 'mon-fri', selectedMonth, selectedYear),
                    annualLeave: 0,
                    sickLeave: 0,
                    publicHolidays: 0,
                    dailyRate: 0
                  }),
                  [field]: numValue
                }
              }
            }
          } else if (section === 'project' && projectId) {
            return {
              ...user,
              projectDataByMonth: {
                ...user.projectDataByMonth,
                [monthKey]: {
                  ...(user.projectDataByMonth?.[monthKey] || {}),
                  [projectId]: numValue
                }
              }
            }
          }
        }
        return user
      })
      
      // Save to global storage asynchronously
      const saveData = async () => {
        const globalData = await getGlobalData()
        const updatedGlobalData = {
          ...globalData,
          users: updatedUsers.map(user => ({
            ...user,
            payrollDataByMonth: user.payrollDataByMonth,
            fringeDataByMonth: user.fringeDataByMonth,
            projectDataByMonth: user.projectDataByMonth
          }))
        }
        
        // Save to global storage
        setCurrentUserData(updatedGlobalData)
      }
      
      saveData()
      
      return updatedUsers
    })
  }

  // Handle monthly allocation changes
  const handleMonthlyAllocationChange = async (itemId: string, field: keyof MonthlyAllocationItem, value: string | number) => {
    // Prevent changes if locked
    if (isLocked) return
    
    setMonthlyAllocation(prev => {
      const updated = prev.map(item => {
        if (item.id === itemId) {
          return { ...item, [field]: value }
        }
        return item
      })
      
      // Save to enhanced storage asynchronously
      const monthKey = `${selectedYear}-${selectedMonth}`
      console.log('[Payroll Page] Saving edited monthly allocation to storage:', { monthKey, itemCount: updated.length })
      saveMonthlyAllocation(monthKey, updated).catch((error: unknown) => {
        console.error('Failed to save monthly allocation:', error)
      })
      
      return updated
    })
  }

  // Helper to check if user has ended by a given month
  const isUserEndedInMonth = (user: UserExtended, month: number, year: number): boolean => {
    if (!user?.endDate) return false
    
    const end = new Date(user.endDate)
    if (Number.isNaN(end.getTime())) return false
    
    const endMonth = end.getMonth() // 0-11
    const endYear = end.getFullYear()
    
    // User has ended if selected month/year is after their end date
    return (year > endYear) || (year === endYear && month > endMonth)
  }
  
  // Helper to check if user has started by a given month
  const isUserStartedInMonth = (user: UserExtended, month: number, year: number): boolean => {
    if (!user?.startDate) return true // No start date means they've always been active
    
    const start = new Date(user.startDate)
    if (Number.isNaN(start.getTime())) return true
    
    const startMonth = start.getMonth() // 0-11
    const startYear = start.getFullYear()
    
    // User has started if selected month/year is on or after their start date
    return (year > startYear) || (year === startYear && month >= startMonth)
  }

  // Helper to check if user is active in selected month
  const isUserActiveInSelectedMonth = (user: UserExtended): boolean => {
    return isUserStartedInMonth(user, selectedMonth, selectedYear) && 
           !isUserEndedInMonth(user, selectedMonth, selectedYear)
  }

  // Group users by entity (only include users active in selected month)
  const groupedByEntity = users
    .filter(user => isUserActiveInSelectedMonth(user))
    .reduce((acc: Record<string, UserExtended[]>, user: UserExtended) => {
      const entity = user.entity || "Unassigned"
      if (!acc[entity]) {
        acc[entity] = []
      }
      acc[entity].push(user)
      return acc
    }, {} as Record<string, UserExtended[]>)

  const activeProjects = getActiveProjects()

  // Function to automatically populate project task based on staff allocation
  const getProjectTaskFromAllocation = (itemName: string, projectName: string, monthKey: string): string => {
    // Find the user for this allocation item
    const user = users.find((u: User) => u.name === itemName)
    if (!user) return ''
    
    // Get the global month index for the selected month/year
    const globalMonthIndex = (selectedYear - 2024) * 12 + selectedMonth
    
    // Find allocations for this user, project, and month
    const userAllocations = allocations.filter((a: Allocation) => 
      a.userId === user.id && 
      a.projectId === projects.find((p: Project) => p.name === projectName)?.id &&
      a.monthIndex === globalMonthIndex
    )
    
    if (userAllocations.length === 0) return ''
    
    // Get the position name from the allocation
    const positionName = userAllocations[0].positionName
    if (!positionName) return ''
    
    // Find the project and its positions for this month
    const project = projects.find((p: Project) => p.name === projectName)
    if (!project || !project.positions) return ''
    
    // Find the position for this month and get its projectTask
    const position = project.positions.find((p: Position) => 
      p.name === positionName && 
      p.monthIndex === globalMonthIndex
    )
    
    return position?.projectTask || ''
  }

  // Filter monthly allocation rows based on main table amounts and update currency and auto-calculate amounts
  const filteredMonthlyAllocation = React.useMemo(() => {
    const existingAllocationRows = monthlyAllocation.flatMap(item => {
      const user = users.find((u: User) => u.id === item.name || u.name === item.name)
      if (!user) return []
      
      const monthKey = `${selectedYear}-${selectedMonth}`
      const payrollData = user.payrollDataByMonth?.[monthKey]
      const fringeData = user.fringeDataByMonth?.[monthKey]
      const projectData = user.projectDataByMonth?.[monthKey] || {}
      
      // Calculate total project hours for percentage calculation
      const totalProjectHours = activeProjects.reduce((total, project) => total + (projectData[project.id] || 0), 0)
      
      // Calculate amount based on account type
      let calculatedAmount = 0
      const dailyRate = payrollData?.netSalary && fringeData?.workingDays ? payrollData.netSalary / fringeData.workingDays : 0
      const leaveDeduction = ((fringeData?.annualLeave || 0) + (fringeData?.sickLeave || 0) + (fringeData?.publicHolidays || 0)) * dailyRate
      const netSalaryForProjects = (payrollData?.netSalary || 0) - leaveDeduction
      const fringeBenefitAmount = leaveDeduction
      
      // Get base amount for this account type
      let baseAmount = 0
      switch (item.account) {
        case 'Net Salary [631 0001]':
          baseAmount = netSalaryForProjects
          break
        case 'Social Security [635 1001]':
          baseAmount = payrollData?.socialSecurity || 0
          break
        case 'Employee Tax [620 1005]':
          baseAmount = payrollData?.employeeTax || 0
          break
        case 'Employer Tax [620 1005]':
          baseAmount = payrollData?.employerTax || 0
          break
        case 'Housing [635 4001]':
          baseAmount = payrollData?.housing || 0
          break
        case 'Other Benefits [602 4001]':
          baseAmount = payrollData?.otherBenefits || 0
          break
        case 'Fringe Benefit - Leave [631 0001]':
          baseAmount = fringeBenefitAmount
          break
        default:
          baseAmount = 0
      }
      
      // Create rows for each project that has allocated hours
      const projectRows: MonthlyAllocationItem[] = []
      if (totalProjectHours > 0 && baseAmount > 0) {
        activeProjects.forEach(project => {
          const projectHours = projectData[project.id] || 0
          if (projectHours > 0) {
            const projectPercentage = (projectHours / totalProjectHours) * 100
            const calculatedAmount = baseAmount * projectPercentage / 100
            
            projectRows.push({
              ...item,
              id: `${item.id}-${project.id}`,
              currency: payrollData?.currency || 'USD',
              amount: parseFloat(calculatedAmount.toFixed(2)),
              project: project.name,
              projectTask: getProjectTaskFromAllocation(item.name, project.name, monthKey)
            })
          }
        })
      }
      
      return projectRows
    }).filter(item => {
      const user = users.find((u: User) => u.id === item.name || u.name === item.name)
      if (!user) return false
      
      const monthKey = `${selectedYear}-${selectedMonth}`
      const payrollData = user.payrollDataByMonth?.[monthKey]
      
      // Check corresponding amount in main table based on account category
      switch (item.account) {
        case 'Net Salary [631 0001]':
          return payrollData?.netSalary && payrollData.netSalary > 0
        case 'Social Security [635 1001]':
          return payrollData?.socialSecurity && payrollData.socialSecurity > 0
        case 'Employee Tax [620 1005]':
          return payrollData?.employeeTax && payrollData.employeeTax > 0
        case 'Employer Tax [620 1005]':
          return payrollData?.employerTax && payrollData.employerTax > 0
        case 'Housing [635 4001]':
          return payrollData?.housing && payrollData.housing > 0
        case 'Other Benefits [602 4001]':
          return payrollData?.otherBenefits && payrollData.otherBenefits > 0
        case 'Fringe Benefit - Leave [631 0001]':
          // For fringe benefit, check if any leave data exists
          const fringeData = user.fringeDataByMonth?.[monthKey]
          return (fringeData?.annualLeave && fringeData.annualLeave > 0) ||
                 (fringeData?.sickLeave && fringeData.sickLeave > 0) ||
                 (fringeData?.publicHolidays && fringeData.publicHolidays > 0)
        default:
          return true
      }
    })

    // Add payroll allocation rows for each active user
    const payrollRows: MonthlyAllocationItem[] = []
    users.filter(user => isUserActiveInSelectedMonth(user)).forEach(user => {
      const monthKey = `${selectedYear}-${selectedMonth}`
      const payrollData = user.payrollDataByMonth?.[monthKey]
      
      if (payrollData) {
        const netSalary = payrollData?.netSalary || 0
        const housing = payrollData?.housing || 0
        const otherBenefits = payrollData?.otherBenefits || 0
        const totalAmount = (netSalary + housing + otherBenefits) * -1
        
        payrollRows.push({
          id: `payroll-${user.id}-${monthKey}`,
          name: user.name,
          code: user.vendorAC || '',
          description: `${user.name} ${MONTHS[selectedMonth]} ${selectedYear} Payroll`,
          currency: payrollData?.currency || 'USD',
          amount: parseFloat(totalAmount.toFixed(2)),
          project: '',
          projectTask: '',
          account: user.vendorAC ? `${user.name} [${user.vendorAC}]` : user.name
        })
      }
    })

    // Add entity payroll tax rows for each entity
    const entityTaxRows: MonthlyAllocationItem[] = []
    const entitySocialSecurityRows: MonthlyAllocationItem[] = []
    Object.entries(groupedByEntity).forEach(([entity, entityUsers]) => {
      const monthKey = `${selectedYear}-${selectedMonth}`
      
      // Find the entity configuration to get account codes
      const entityConfig = entities.find((e: Entity) => e.name === entity)
      const taxAccountCode = entityConfig?.taxAccount || ''
      const ssAccountCode = entityConfig?.ssAccount || ''
      
      // Calculate totals for this entity
      let totalEmployeeTax = 0
      let totalEmployerTax = 0
      let totalSocialSecurity = 0
      let entityCurrency = 'USD' // Default currency
      
      entityUsers.forEach(user => {
        const payrollData = user.payrollDataByMonth?.[monthKey]
        if (payrollData) {
          totalEmployeeTax += payrollData?.employeeTax || 0
          totalEmployerTax += payrollData?.employerTax || 0
          totalSocialSecurity += payrollData?.socialSecurity || 0
          // Use the currency of the first user with payroll data
          if (!entityCurrency || entityCurrency === 'USD') {
            entityCurrency = payrollData?.currency || 'USD'
          }
        }
      })
      
      // Add entity payroll tax row
      const totalTaxAmount = (totalEmployeeTax + totalEmployerTax) * -1
      if (totalEmployeeTax > 0 || totalEmployerTax > 0) {
        entityTaxRows.push({
          id: `entity-tax-${entity}-${monthKey}`,
          name: entity,
          code: taxAccountCode,
          description: `${entity} Payroll Tax ${MONTHS[selectedMonth]} ${selectedYear}`,
          currency: entityCurrency,
          amount: parseFloat(totalTaxAmount.toFixed(2)),
          project: '',
          projectTask: '',
          account: taxAccountCode ? `${entity} Payroll Tax [${taxAccountCode}]` : entity
        })
      }
      
      // Add entity social security row
      const socialSecurityAmount = totalSocialSecurity * -1
      if (totalSocialSecurity > 0) {
        entitySocialSecurityRows.push({
          id: `entity-ss-${entity}-${monthKey}`,
          name: entity,
          code: ssAccountCode,
          description: `${entity} Social Security ${MONTHS[selectedMonth]} ${selectedYear}`,
          currency: entityCurrency,
          amount: parseFloat(socialSecurityAmount.toFixed(2)),
          project: '',
          projectTask: '',
          account: ssAccountCode ? `${entity} Social Security [${ssAccountCode}]` : entity
        })
      }
    })

    return [...existingAllocationRows, ...payrollRows, ...entityTaxRows, ...entitySocialSecurityRows]
  }, [monthlyAllocation, users, selectedMonth, selectedYear, activeProjects, isUserActiveInSelectedMonth, allocations, projects, entities])

  const getContrastColor = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16)
    const g = parseInt(hex.slice(3, 5), 16)
    const b = parseInt(hex.slice(5, 7), 16)
    const brightness = (r * 299 + g * 587 + b * 114) / 1000
    return brightness > 128 ? "#000" : "#fff"
  }

  // Export functions
  const exportToExcel = (data: any[], filename: string) => {
    const worksheet = XLSX.utils.json_to_sheet(data)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
    XLSX.writeFile(workbook, `${filename}.xlsx`)
  }

  const exportMainTable = () => {
    const exportData = users.map(user => {
      const monthKey = `${selectedYear}-${selectedMonth}`
      const payrollData = user.payrollDataByMonth?.[monthKey]
      const fringeData = user.fringeDataByMonth?.[monthKey]
      const projectData = user.projectDataByMonth?.[monthKey] || {}
      
      const row: any = {
        Name: user.name,
        Department: user.department,
        Entity: user.entity || '',
        Currency: payrollData?.currency || 'USD',
        'Net Salary': payrollData?.netSalary || 0,
        'Social Security': payrollData?.socialSecurity || 0,
        'Employee Tax': payrollData?.employeeTax || 0,
        'Employer Tax': payrollData?.employerTax || 0,
        'Housing': payrollData?.housing || 0,
        'Other Benefits': payrollData?.otherBenefits || 0,
        'Annual Leave': fringeData?.annualLeave || 0,
        'Sick Leave': fringeData?.sickLeave || 0,
        'Public Holidays': fringeData?.publicHolidays || 0,
        'Working Days': fringeData?.workingDays || 0,
        'Daily Rate': payrollData?.netSalary && fringeData?.workingDays ? (payrollData.netSalary / fringeData.workingDays).toFixed(2) : '0.00'
      }
      
      // Add project columns - respect showPercentage state
      activeProjects.forEach(project => {
        if (showPercentage) {
          // Calculate percentage for export
          const totalProjectHours = activeProjects.reduce((total, p) => total + (projectData[p.id] || 0), 0)
          const projectHours = projectData[project.id] || 0
          const percentage = totalProjectHours > 0 ? (projectHours / totalProjectHours * 100).toFixed(1) : '0.0'
          row[project.name] = `${percentage}%`
        } else {
          // Export raw values
          row[project.name] = projectData[project.id] || 0
        }
      })
      
      return row
    })
    
    exportToExcel(exportData, `Actual_Allocation_${MONTHS[selectedMonth]}_${selectedYear}_${showPercentage ? 'Percentage' : 'Values'}`)
  }

  const exportMonthlyTable = () => {
    const exportData = filteredMonthlyAllocation.map(item => {
      // Split account into name and code
      const accountName = item.account.split(' [')[0]
      const accountCode = item.account.includes(' [') ? item.account.split(' [')[1].replace(']', '') : ''
      
      // Find the user associated with this allocation item for percentage calculation
      const user = users.find(u => u.name === item.name)
      let exportValue = item.amount
      
      // If percentage view is active and this is a user allocation (not payroll/tax/ss rows), calculate percentage
      if (showPercentage && user && item.project) {
        const monthKey = `${selectedYear}-${selectedMonth}`
        const projectData = user.projectDataByMonth?.[monthKey] || {}
        const totalProjectHours = activeProjects.reduce((total, p) => total + (projectData[p.id] || 0), 0)
        const projectHours = projectData[item.project] || 0
        const percentage = totalProjectHours > 0 ? (projectHours / totalProjectHours * 100).toFixed(1) : '0.0'
        exportValue = parseFloat(percentage) // Export the percentage value
      }
      
      return {
        'Account Name': accountName,
        'Account Code': accountCode,
        Description: item.description,
        Currency: item.currency,
        'Amount/Percentage': showPercentage && user && item.project ? 
          `${exportValue}%` : exportValue,
        Project: item.project,
        'Project Task': item.projectTask
      }
    })
    
    exportToExcel(exportData, `Monthly_Allocation_${MONTHS[selectedMonth]}_${selectedYear}_${showPercentage ? 'Percentage' : 'Values'}`)
  }

  return (
    <main className="min-h-screen bg-background">
      <Navigation currentPage="/actual-allocation" />
      <div className="space-y-4 p-6">
      </div>

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Payroll Allocation</h2>
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
          
          {/* Lock and View Controls */}
          <div className="flex gap-2 items-center">
            {isClient && canLock() && (
              <Button
                onClick={toggleLock}
                variant={isLocked ? "destructive" : "outline"}
                size="sm"
                className="font-medium"
              >
                {isLocked ? "🔒 Locked" : "🔓 Lock"}
              </Button>
            )}
            {isClient && (
              <Button
                onClick={() => setShowPercentage(!showPercentage)}
                variant={showPercentage ? "default" : "outline"}
                size="sm"
                className="font-medium"
              >
                {showPercentage ? "🔢 Values" : "📊 % View"}
              </Button>
            )}
            <Button
              onClick={exportMainTable}
              variant="outline"
              size="sm"
              className="font-medium"
            >
              📊 Export
            </Button>
            <Button
              onClick={() => {
                const user = getCurrentUser()
                if (user) {
                  clearCurrentUser()
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

      <div className="overflow-x-auto">
        <table className="w-full border-collapse border border-gray-300 text-xs">
          <thead>
            <tr>
              <th className="border border-gray-300 p-1 bg-gray-100 w-32">Name</th>
              <th className="border border-gray-300 p-1 bg-gray-100 w-32">Department</th>
              <th className="border border-gray-300 p-1 bg-gray-100 text-center" colSpan={7}>Payroll</th>
              <th className="border border-gray-300 p-1 bg-gray-100 text-center" colSpan={5}>Fringe</th>
              <th className="border border-gray-300 p-1 bg-gray-100 text-center" colSpan={activeProjects.length + 1}>Projects</th>
            </tr>
            <tr>
              <th className="border border-gray-300 p-1 bg-gray-50 w-32 text-xs text-muted-foreground"></th>
              <th className="border border-gray-300 p-1 bg-gray-50 w-32 text-xs text-muted-foreground"></th>
              {/* Payroll columns */}
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Currency</th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Net Salary <span style={{fontSize: '10px', opacity: 0.7}}>[631 0001]</span></th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Social Security <span style={{fontSize: '10px', opacity: 0.7}}>[635 1001]</span></th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Employee Tax <span style={{fontSize: '10px', opacity: 0.7}}>[620 1005]</span></th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Employer Tax <span style={{fontSize: '10px', opacity: 0.7}}>[620 1005]</span></th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Housing <span style={{fontSize: '10px', opacity: 0.7}}>[635 4001]</span></th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Other Benefits <span style={{fontSize: '10px', opacity: 0.7}}>[602 4001]</span></th>
              {/* Fringe columns */}
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Working Days</th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Annual Leave</th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Sick Leave</th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Public Holidays</th>
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Daily Rate</th>
              {/* Project columns */}
              {activeProjects.map(project => (
                <th key={project.id} className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground" style={{ backgroundColor: project.color + '20', color: '#000' }}>
                  {project.name}
                </th>
              ))}
              <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Total</th>
            </tr>
          </thead>
          <tbody>
            {Object.entries(groupedByEntity).map(([entity, entityUsers]) => {
              // Calculate total payroll amounts for this entity
              const monthKey = `${selectedYear}-${selectedMonth}`
              const entityTotals = entityUsers.reduce((totals, user) => {
                const payrollData = user.payrollDataByMonth?.[monthKey]
                if (payrollData) {
                  totals.netSalary += payrollData.netSalary || 0
                  totals.socialSecurity += payrollData.socialSecurity || 0
                  totals.employeeTax += payrollData.employeeTax || 0
                  totals.employerTax += payrollData.employerTax || 0
                  totals.housing += payrollData.housing || 0
                  totals.otherBenefits += payrollData.otherBenefits || 0
                }
                return totals
              }, {
                netSalary: 0,
                socialSecurity: 0,
                employeeTax: 0,
                employerTax: 0,
                housing: 0,
                otherBenefits: 0
              })
              
              const grandTotal = entityTotals.netSalary + entityTotals.socialSecurity + entityTotals.employeeTax + 
                               entityTotals.employerTax + entityTotals.housing + entityTotals.otherBenefits
              
              return (
              <React.Fragment key={entity}>
                <tr>
                  <td className="border border-gray-300 p-1 font-semibold text-xs text-gray-800 bg-cyan-200">
                    {entity}
                  </td>
                  <td className="border border-gray-300 p-1 font-semibold text-xs text-gray-800 bg-cyan-200 text-right">
                    ({grandTotal.toFixed(2)})
                  </td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                  {/* Project average percentages */}
                  {activeProjects.map(project => {
                    // Calculate average percentage for this entity and project across ALL users
                    const userPercentages = entityUsers.map(user => {
                      const projectData = user.projectDataByMonth?.[monthKey] || {}
                      const totalHours = activeProjects.reduce((total, p) => total + (projectData[p.id] || 0), 0)
                      const projectHours = projectData[project.id] || 0
                      return totalHours > 0 ? (projectHours / totalHours * 100) : 0
                    })
                    
                    const avgPercentage = userPercentages.length > 0 
                      ? userPercentages.reduce((sum, percentage) => sum + percentage, 0) / userPercentages.length
                      : 0
                    
                    return (
                      <td key={project.id} className="border border-gray-300 p-1 bg-cyan-200">
                        <div className="w-full text-xs text-center font-medium">
                          {showPercentage && avgPercentage > 0 ? avgPercentage.toFixed(1) + '%' : ''}
                        </div>
                      </td>
                    )
                  })}
                  <td className="border border-gray-300 p-1 bg-cyan-200"></td>
                </tr>
                {entityUsers.map((user) => {
                  const monthKey = `${selectedYear}-${selectedMonth}`
                  const payrollData = user.payrollDataByMonth?.[monthKey]
                  const fringeData = user.fringeDataByMonth?.[monthKey]
                  const projectData = user.projectDataByMonth?.[monthKey] || {}
                  
                  return (
                  <tr key={user.id}>
                    <td className="border border-gray-300 p-0.5 w-32">
                      <span className="text-xs leading-tight">{user.name}</span>
                    </td>
                    <td className="border border-gray-300 p-0.5 w-32">
                      <span className="text-xs leading-tight text-gray-600">{user.department}</span>
                    </td>
                    {/* Payroll data - editable */}
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="text"
                        value={payrollData?.currency || ""}
                        onChange={(e) => handleCellValueChange(user.id, "currency", e.target.value, "payroll")}
                        className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="USD"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.netSalary || ""}
                        onChange={(e) => handleCellValueChange(user.id, "netSalary", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.socialSecurity || ""}
                        onChange={(e) => handleCellValueChange(user.id, "socialSecurity", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.employeeTax || ""}
                        onChange={(e) => handleCellValueChange(user.id, "employeeTax", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.employerTax || ""}
                        onChange={(e) => handleCellValueChange(user.id, "employerTax", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.housing || ""}
                        onChange={(e) => handleCellValueChange(user.id, "housing", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={payrollData?.otherBenefits || ""}
                        onChange={(e) => handleCellValueChange(user.id, "otherBenefits", e.target.value, "payroll")}
                        className="w-full text-xs text-right border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    {/* Fringe data - editable */}
                    <td className="border border-gray-300 p-0.5 bg-gray-50">
                      <div className="w-full text-xs text-center font-medium">
                        {fringeData?.workingDays || 0}
                      </div>
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={fringeData?.annualLeave || ""}
                        onChange={(e) => handleCellValueChange(user.id, "annualLeave", e.target.value, "fringe")}
                        className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={fringeData?.sickLeave || ""}
                        onChange={(e) => handleCellValueChange(user.id, "sickLeave", e.target.value, "fringe")}
                        className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5">
                      <input
                        type="number"
                        value={fringeData?.publicHolidays || ""}
                        onChange={(e) => handleCellValueChange(user.id, "publicHolidays", e.target.value, "fringe")}
                        className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                        placeholder="0"
                        disabled={isLocked}
                        style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                      />
                    </td>
                    <td className="border border-gray-300 p-0.5 bg-gray-50">
                      <div className="w-full text-xs text-right font-medium">
                        {payrollData?.netSalary && fringeData?.workingDays 
                          ? (payrollData.netSalary / fringeData.workingDays).toFixed(2)
                          : "0.00"
                        }
                      </div>
                    </td>
                    {/* Project data - editable */}
                    {activeProjects.map(project => {
                      const totalProjectHours = activeProjects.reduce((total, p) => total + (projectData[p.id] || 0), 0)
                      const projectHours = projectData[project.id] || 0
                      const percentage = totalProjectHours > 0 ? (projectHours / totalProjectHours * 100).toFixed(1) : '0.0'
                      
                      return (
                        <td key={project.id} className="border border-gray-300 p-0.5" style={{ backgroundColor: project.color + '10' }}>
                          {showPercentage ? (
                            <div className="w-full text-xs text-center" style={{ backgroundColor: isLocked ? '#f3f4f6' : '#f9fafb' }}>
                              {percentage}%
                            </div>
                          ) : (
                            <input
                              type="number"
                              value={projectData[project.id] || ""}
                              onChange={(e) => handleCellValueChange(user.id, project.id, e.target.value, "project", project.id)}
                              className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                              placeholder="0"
                              min="0"
                              max="100"
                              disabled={isLocked}
                              style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                            />
                          )}
                        </td>
                      )
                    })}
                    <td className="border border-gray-300 p-0.5 bg-gray-50">
                      <div className="w-full text-xs text-right font-medium">
                        {showPercentage ? 
                          "100%" :
                          activeProjects.reduce((total, project) => total + (projectData[project.id] || 0), 0)
                        }
                      </div>
                    </td>
                  </tr>
                  )
                })}
              </React.Fragment>
              )
            })}
          </tbody>
        </table>
      </div>

      {users.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          No staff data available. Please add staff members first.
        </div>
      )}

      {/* Monthly Allocation Table */}
      <div className="mt-8">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold text-gray-800">Monthly Allocation</h2>
          <Button
            onClick={exportMonthlyTable}
            variant="outline"
            size="sm"
            className="font-medium"
          >
            📊 Export to Excel
          </Button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse border border-gray-300 text-xs">
            <thead>
              <tr>
                <th className="border border-gray-300 p-1 bg-gray-100 text-center" colSpan={7}>Monthly Allocation</th>
              </tr>
              <tr>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Account Name</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Account Code</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Description</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Currency</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Amount</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Project</th>
                <th className="border border-gray-300 p-1 bg-gray-50 text-xs text-muted-foreground">Project Task</th>
              </tr>
            </thead>
            <tbody>
              {filteredMonthlyAllocation.map((item) => {
                // Split account into name and code
                const accountName = item.account.split(' [')[0]
                const accountCode = item.account.includes(' [') ? item.account.split(' [')[1].replace(']', '') : ''
                
                return (
                <tr key={item.id}>
                  <td className="border border-gray-300 p-0.5">
                    <span className="text-xs leading-tight">
                      {accountName}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <span className="text-xs leading-tight">
                      {accountCode}
                    </span>
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <div className="w-full text-xs text-center" style={{ backgroundColor: isLocked ? '#f3f4f6' : '#f9fafb' }}>
                      {item.description}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <input
                      type="text"
                      value={item.currency}
                      onChange={(e) => handleMonthlyAllocationChange(item.id, 'currency', e.target.value)}
                      className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      placeholder="USD"
                      disabled={isLocked}
                      style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                    />
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <div className="w-full text-xs text-right" style={{ backgroundColor: isLocked ? '#f3f4f6' : '#f9fafb' }}>
                      {item.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <div className="w-full text-xs text-center" style={{ backgroundColor: isLocked ? '#f3f4f6' : '#f9fafb' }}>
                      {item.project}
                    </div>
                  </td>
                  <td className="border border-gray-300 p-0.5">
                    <input
                      type="text"
                      value={item.projectTask}
                      onChange={(e) => handleMonthlyAllocationChange(item.id, 'projectTask', e.target.value)}
                      className="w-full text-xs text-center border-0 bg-transparent focus:outline-none focus:ring-1 focus:ring-blue-500 rounded"
                      placeholder="Enter task"
                      disabled={isLocked}
                      style={{ backgroundColor: isLocked ? '#f3f4f6' : 'transparent' }}
                    />
                  </td>
                </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </main>
  )
}
