"use client"

import * as React from "react"
import { format } from "date-fns"
import { Calendar as CalendarIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface DatePickerProps {
  date: Date | undefined
  onDateChange: (date: Date | undefined) => void
  placeholder?: string
  disabled?: boolean
  minDate?: Date
}

export function DatePicker({
  date,
  onDateChange,
  placeholder = "Pick a date",
  disabled = false,
  minDate,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false)
  const [isMobile, setIsMobile] = React.useState(false)

  React.useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768)
    }
    checkMobile()
    window.addEventListener("resize", checkMobile)
    return () => window.removeEventListener("resize", checkMobile)
  }, [])

  const handleSelect = (selectedDate: Date | undefined) => {
    onDateChange(selectedDate)
    setOpen(false)
  }

  const triggerButton = (
    <Button
      variant={"outline"}
      className={cn(
        "w-full justify-start text-left font-normal",
        !date && "text-muted-foreground"
      )}
      disabled={disabled}
    >
      <CalendarIcon className="mr-2 h-4 w-4" />
      {date ? format(date, "PPP") : <span>{placeholder}</span>}
    </Button>
  )

  const calendarContent = (
    <Calendar
      mode="single"
      selected={date}
      onSelect={handleSelect}
      initialFocus
      disabled={(date) => minDate ? date < minDate : false}
      className="rounded-md border-0"
    />
  )

  if (isMobile) {
    return (
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          {triggerButton}
        </DialogTrigger>
        <DialogContent className="w-auto max-w-[calc(100vw-2rem)] p-0">
          <DialogHeader className="sr-only">
            <DialogTitle>Select Date</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            {calendarContent}
          </div>
        </DialogContent>
      </Dialog>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        {triggerButton}
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start" side="bottom" sideOffset={4}>
        {calendarContent}
      </PopoverContent>
    </Popover>
  )
}
