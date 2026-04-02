import React, { useState, useEffect } from "react"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"

export interface UserFilterValues {
  search?: string
  registrationStatus?: string
  council?: string
  depositPaymentStatus?: string
  fullPaymentStatus?: string
}

interface UserFiltersProps {
  showRegistrationStatus?: boolean
  showCouncil?: boolean
  showDepositPaymentStatus?: boolean
  showFullPaymentStatus?: boolean
  onFiltersChange: (filters: UserFilterValues) => void
}

export const UserFilters: React.FC<UserFiltersProps> = ({
  showRegistrationStatus,
  showCouncil,
  showDepositPaymentStatus,
  showFullPaymentStatus,
  onFiltersChange,
}) => {
  const [filters, setFilters] = useState<UserFilterValues>({})
  const [searchValue, setSearchValue] = useState("")

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => {
      onFiltersChange({ ...filters, search: searchValue || undefined })
    }, 300)

    return () => clearTimeout(timer)
  }, [searchValue, filters, onFiltersChange])

  const handleFilterChange = (key: keyof UserFilterValues, value: string) => {
    const newFilters = { ...filters, [key]: value === "all" ? undefined : value }
    setFilters(newFilters)
    onFiltersChange({ ...newFilters, search: searchValue || undefined })
  }

  const clearFilters = () => {
    setFilters({})
    setSearchValue("")
    onFiltersChange({})
  }

  const hasFilters = searchValue || Object.values(filters).some(v => v !== undefined)

  return (
    <div className="flex flex-wrap items-center gap-4 p-4 border-b bg-muted/5">
      <div className="relative flex-1 min-w-[200px] max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search name or email..."
          value={searchValue}
          onChange={(e) => setSearchValue(e.target.value)}
          className="pl-9"
        />
      </div>

      {showRegistrationStatus && (
        <Select
          value={filters.registrationStatus || "all"}
          onValueChange={(v) => handleFilterChange("registrationStatus", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Registration" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showCouncil && (
        <div className="w-[160px]">
          <Input
            placeholder="Council..."
            value={filters.council || ""}
            onChange={(e) => handleFilterChange("council", e.target.value)}
          />
        </div>
      )}

      {showDepositPaymentStatus && (
        <Select
          value={filters.depositPaymentStatus || "all"}
          onValueChange={(v) => handleFilterChange("depositPaymentStatus", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Deposit" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Deposits</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      )}

      {showFullPaymentStatus && (
        <Select
          value={filters.fullPaymentStatus || "all"}
          onValueChange={(v) => handleFilterChange("fullPaymentStatus", v)}
        >
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="Full Payment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Payments</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="paid">Paid</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button
          variant="ghost"
          onClick={clearFilters}
          className="h-9 px-2 lg:px-3"
        >
          Reset
          <X className="ml-2 h-4 w-4" />
        </Button>
      )}
    </div>
  )
}
