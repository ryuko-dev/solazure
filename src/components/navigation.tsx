"use client"

import Link from "next/link"
import { useState, useEffect } from "react"

interface NavigationProps {
  currentPage: string
}

export function Navigation({ currentPage }: NavigationProps) {
  const [userRole, setUserRole] = useState<string | null>(null)

  useEffect(() => {
    // For now, set a default role - we'll implement auth later
    setUserRole("admin")
  }, [])

  const tabs = [
    { key: 'allocation', label: 'Allocation', href: '/' },
    { key: 'planning', label: 'Planning', href: '/planning' },
    { key: 'actualAllocation', label: 'Payroll Allocation', href: '/actual-allocation' },
    { key: 'expenseAllocation', label: 'Expense Allocation', href: '/expense-allocation' },
    { key: 'scheduledRecords', label: 'Scheduled Records', href: '/scheduled-records' },
  ] as const

  const visibleTabs = tabs.filter(tab => true) // Show all tabs for now

  return (
    <nav className="bg-white border-b border-gray-200 px-6 py-3">
      <div className="flex items-center gap-6">
        <h1 className="text-lg font-semibold text-gray-900">Sola Allocation Tool</h1>
        <div className="flex gap-4">
          {visibleTabs.map((tab) => (
            <Link
              key={tab.key}
              href={tab.href}
              className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                currentPage === tab.href
                  ? "bg-blue-100 text-blue-700"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
      </div>
    </nav>
  )
}
