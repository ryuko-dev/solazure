"use client"

import Link from "next/link"
import { getCurrentSystemUser } from "../lib/storage"
import { canAccessTab, UserRole } from "../lib/permissions"
import { useState, useEffect } from "react"

interface NavigationProps {
  currentPage: string
}

export function Navigation({ currentPage }: NavigationProps) {
  const [userRole, setUserRole] = useState<UserRole | null>(null)

  useEffect(() => {
    const checkAuth = async () => {
      const systemUser = await getCurrentSystemUser()
      // TEMP: Set default role for testing
      setUserRole(systemUser?.role || "admin")
    }
    checkAuth()
  }, [])

  // TEMP: Show navigation even without auth for testing
  // if (!userRole) return null

  const tabs = [
    { key: 'allocation', label: 'Allocation', href: '/' },
    { key: 'planning', label: 'Planning', href: '/planning' },
    { key: 'actualAllocation', label: 'Payroll Allocation', href: '/actual-allocation' },
    { key: 'expenseAllocation', label: 'Expense Allocation', href: '/expense-allocation' },
    { key: 'scheduledRecords', label: 'Scheduled Records', href: '/scheduled-records' },
  ] as const

  const visibleTabs = tabs.filter(tab => userRole && canAccessTab(userRole, tab.key))

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-gray-900">Sola Allocation Tool</h1>
        <div className="flex gap-4">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={
                currentPage === tab.href
                  ? "text-blue-600 hover:text-blue-800 font-medium"
                  : "text-gray-600 hover:text-gray-800 font-medium"
              }
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
