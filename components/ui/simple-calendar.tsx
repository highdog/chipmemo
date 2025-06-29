"use client"

import * as React from "react"
import Calendar from 'react-calendar'
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { buttonVariants } from "@/components/ui/button"
import 'react-calendar/dist/Calendar.css'

export type SimpleCalendarProps = {
  className?: string
  value?: Date | null
  onChange?: (value: Date | null) => void
  showOutsideDays?: boolean
  hasScheduleDates?: Date[]
}

function SimpleCalendar({
  className,
  value,
  onChange,
  showOutsideDays = false,
  hasScheduleDates = [],
  ...props
}: SimpleCalendarProps) {
  return (
    <div className={cn("p-3", className)}>
      <Calendar
        value={value}
        onChange={(newValue) => {
          if (Array.isArray(newValue)) {
            onChange?.(newValue[0])
          } else {
            onChange?.(newValue)
          }
        }}
        showNeighboringMonth={true}
        formatShortWeekday={(locale, date) => {
          const weekdays = ['日', '一', '二', '三', '四', '五', '六']
          return weekdays[date.getDay()]
        }}
        formatDay={(locale, date) => {
          return date.getDate().toString()
        }}
        tileClassName={({ date, view }) => {
          if (view === 'month') {
            const hasSchedule = hasScheduleDates.some(scheduleDate => 
              scheduleDate.getFullYear() === date.getFullYear() &&
              scheduleDate.getMonth() === date.getMonth() &&
              scheduleDate.getDate() === date.getDate()
            )
            return hasSchedule ? 'has-schedule' : ''
          }
          return ''
        }}
        prevLabel={<ChevronLeft className="h-4 w-4" />}
        nextLabel={<ChevronRight className="h-4 w-4" />}
        prev2Label={null}
        next2Label={null}
        className="react-calendar-custom"
        {...props}
      />
      <style jsx global>{`
        .react-calendar-custom {
          width: 100%;
          background: transparent;
          border: none;
          font-family: inherit;
        }
        
        .react-calendar-custom .react-calendar__navigation {
          display: flex;
          height: 44px;
          margin-bottom: 0.5em;
          align-items: center;
          justify-content: space-between;
        }
        
        .react-calendar-custom .react-calendar__navigation__label {
          font-weight: 500;
          font-size: 0.875rem;
          background: transparent;
          border: none;
          cursor: pointer;
          padding: 0.25rem 0.5rem;
          border-radius: 0.375rem;
        }
        
        .react-calendar-custom .react-calendar__navigation__label:hover {
          background-color: hsl(var(--accent));
        }
        
        .react-calendar-custom .react-calendar__navigation__arrow {
          ${buttonVariants({ variant: "outline" })}
          height: 1.75rem;
          width: 1.75rem;
          background: transparent;
          padding: 0;
          opacity: 0.5;
          border-radius: 0.375rem;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .react-calendar-custom .react-calendar__navigation__arrow:hover {
          opacity: 1;
        }
        
        .react-calendar-custom .react-calendar__month-view__weekdays {
          text-align: center;
          text-transform: uppercase;
          font-weight: normal;
          font-size: 0.8rem;
          color: hsl(var(--muted-foreground));
        }
        
        .react-calendar-custom .react-calendar__month-view__weekdays__weekday {
          padding: 0.25rem;
          border-bottom: none;
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day {
          height: 2.25rem;
          min-width: 2.25rem;
          width: 100%;
          text-align: center;
          font-size: 0.875rem;
          padding: 0;
          position: relative;
          border-radius: 0.375rem;
          border: none;
          background: transparent;
          cursor: pointer;
          margin: 0;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day:hover {
          background-color: hsl(var(--accent));
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day--active {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day--active:hover {
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        .react-calendar-custom .react-calendar__month-view__days__day--neighboringMonth {
          color: hsl(var(--muted-foreground));
          opacity: 0.4;
        }
        
        .react-calendar-custom .react-calendar__month-view {
          overflow: hidden;
        }
        
        .react-calendar-custom .react-calendar__month-view__days {
          display: grid !important;
          grid-template-columns: repeat(7, 1fr);
          gap: 0.125rem;
          padding: 0;
          margin: 0;
        }
        
        .react-calendar-custom .react-calendar__tile {
          width: 100%;
          min-width: 0;
          text-align: center;
          padding: 0.5em 0.25em;
          background: none;
          border: none;
          cursor: pointer;
          box-sizing: border-box;
        }
        
        .react-calendar-custom .react-calendar__tile:enabled:hover,
        .react-calendar-custom .react-calendar__tile:enabled:focus {
          background-color: hsl(var(--accent));
        }
        
        .react-calendar-custom .react-calendar__tile--now {
          background: transparent;
          color: inherit;
          font-weight: 600;
        }
        
        .react-calendar-custom .react-calendar__tile--now:enabled:hover,
        .react-calendar-custom .react-calendar__tile--now:enabled:focus {
          background-color: hsl(var(--accent));
        }
        
        .react-calendar-custom .has-schedule::after {
          content: '';
          position: absolute;
          bottom: 2px;
          left: 50%;
          transform: translateX(-50%);
          width: 4px;
          height: 4px;
          background-color: hsl(var(--primary));
          border-radius: 50%;
        }
        
        .react-calendar-custom .react-calendar__tile--active {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
        
        .react-calendar-custom .react-calendar__tile--active:enabled:hover,
        .react-calendar-custom .react-calendar__tile--active:enabled:focus {
          background: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
        }
      `}</style>
    </div>
  )
}

SimpleCalendar.displayName = "SimpleCalendar"

export { SimpleCalendar }