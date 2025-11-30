export interface Entity {
  id: string
  name: string
  currencyCode: string
  taxAccount: string
  ssAccount: string
}

export interface Project {
  id: string
  name: string
  color: string
  positions?: Position[]
  startMonth?: number
  startYear?: number
  endMonth?: number
  endYear?: number
  allocationMode?: 'percentage' | 'days' // Allocation mode for positions
}

export interface Position {
  id: string
  projectId: string
  monthIndex: number
  percentage: number // Still stored as percentage for compatibility
  allocated: number
  name?: string
  projectTask?: string
  days?: number // Optional days field for day allocation mode
}

export interface User {
  id: string
  name: string
  department: string
  entity?: string    // Entity/organization assignment
  vendorAC?: string  // Vendor AC information
  startDate?: string // ISO date string (YYYY-MM-DD)
  endDate?: string   // ISO date string (YYYY-MM-DD), undefined = no end date
  workDays?: 'mon-fri' | 'sun-thu' // Work week pattern, defaults to mon-fri
  role?: 'admin' | 'editor' | 'viewer' | 'senior'
  email?: string     // For login system
  isActive?: boolean // For user management
}

export interface Allocation {
  id: string
  userId: string
  projectId: string
  monthIndex: number
  percentage?: number
  positionId?: string
  positionName?: string
}

export type UserRole = 'admin' | 'editor' | 'viewer' | 'senior'
