'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, CalendarDays, List } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';
import { turningAge, daysUntil } from '@/lib/utils';

interface CalendarEvent {
  id: string;
  type: string;
  name: string | null;
  profileId: string;
  profileName: string;
  profilePicture: string | null;
  isRecurring: boolean;
  originalDate: string;
  isPrivate: boolean;
}

interface DayEvents {
  date: string;
  events: CalendarEvent[];
}

interface CalendarProps {
  onEventClick: (profileId: string) => void;
}

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

function getEventEmoji(type: string) {
  switch (type.toLowerCase()) {
    case 'birthday':
      return '🎂';
    case 'anniversary':
      return '❤️';
    default:
      return '🎆';
  }
}

function getEventColorClasses(type: string) {
  switch (type.toLowerCase()) {
    case 'birthday':
      return 'bg-pink-50 text-pink-700 border-pink-200';
    case 'anniversary':
      return 'bg-red-50 text-red-700 border-red-200';
    default:
      return 'bg-teal-50 text-teal-700 border-teal-200';
  }
}

type ViewMode = 'calendar' | 'list';

interface ListEvent extends CalendarEvent {
  date: string;
  daysUntilEvent: number;
  age?: number;
}

export function Calendar({ onEventClick }: CalendarProps) {
  const today = new Date();
  const [viewMode, setViewMode] = useState<ViewMode>('calendar');
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<DayEvents[]>([]);
  const [listEvents, setListEvents] = useState<ListEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Fetch events for current month (calendar view)
  useEffect(() => {
    if (viewMode !== 'calendar') return;

    const fetchEvents = async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/calendar?year=${currentYear}&month=${currentMonth}`);
        const data = await res.json();
        setEvents(data.events || []);
      } catch (error) {
        console.error('Failed to fetch calendar events:', error);
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [currentYear, currentMonth, viewMode]);

  // Fetch events for next 12 months (list view)
  useEffect(() => {
    if (viewMode !== 'list') return;

    const fetchListEvents = async () => {
      setLoading(true);
      try {
        const allEvents: ListEvent[] = [];

        for (let i = 0; i < 12; i++) {
          const date = new Date(today.getFullYear(), today.getMonth() + i, 1);
          const year = date.getFullYear();
          const month = date.getMonth() + 1;

          const res = await fetch(`/api/calendar?year=${year}&month=${month}`);
          const data = await res.json();

          if (data.events) {
            data.events.forEach((day: DayEvents) => {
              day.events.forEach((event: CalendarEvent) => {
                const eventDaysUntil = daysUntil(day.date, event.isRecurring);
                if (eventDaysUntil >= 0) {
                  const age = event.type === 'birthday' ? turningAge(event.originalDate) ?? undefined : undefined;
                  allEvents.push({
                    ...event,
                    date: day.date,
                    daysUntilEvent: eventDaysUntil,
                    age,
                  });
                }
              });
            });
          }
        }

        allEvents.sort((a, b) => a.daysUntilEvent - b.daysUntilEvent);

        const uniqueEvents = allEvents.filter((event, index, self) =>
          index === self.findIndex(e => e.id === event.id)
        );

        setListEvents(uniqueEvents);
      } catch (error) {
        console.error('Failed to fetch list events:', error);
        setListEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchListEvents();
  }, [viewMode]);

  // Build event map for quick lookup
  const eventMap = new Map<string, CalendarEvent[]>();
  events.forEach(day => {
    eventMap.set(day.date, day.events);
  });

  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();

  const totalCells = firstDayOfMonth + daysInMonth;
  const weeksNeeded = Math.ceil(totalCells / 7);
  const totalDaysToShow = weeksNeeded * 7;

  const calendarDays: { day: number; isCurrentMonth: boolean; date: string }[] = [];

  for (let i = firstDayOfMonth - 1; i >= 0; i--) {
    const day = daysInPrevMonth - i;
    const prevMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const prevYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: `${prevYear}-${String(prevMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  const remainingDays = totalDaysToShow - calendarDays.length;
  for (let day = 1; day <= remainingDays; day++) {
    const nextMonth = currentMonth === 12 ? 1 : currentMonth + 1;
    const nextYear = currentMonth === 12 ? currentYear + 1 : currentYear;
    calendarDays.push({
      day,
      isCurrentMonth: false,
      date: `${nextYear}-${String(nextMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }

  const goToPrevMonth = () => {
    if (currentMonth === 1) {
      setCurrentMonth(12);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
    setSelectedDate(null);
  };

  const goToNextMonth = () => {
    if (currentMonth === 12) {
      setCurrentMonth(1);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
    setSelectedDate(null);
  };

  const goToToday = () => {
    setCurrentYear(today.getFullYear());
    setCurrentMonth(today.getMonth() + 1);
    setSelectedDate(null);
  };

  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const isToday = (date: string) => date === todayStr;
  const isPast = (date: string) => date < todayStr;

  const isCurrentMonthYear = currentYear === today.getFullYear() && currentMonth === today.getMonth() + 1;

  const selectedEvents = selectedDate ? eventMap.get(selectedDate) || [] : [];

  // Group list events by time period
  const groupListEvents = (evts: ListEvent[]) => {
    const groups: Record<string, ListEvent[]> = {};

    evts.forEach(event => {
      let group: string;
      if (event.daysUntilEvent === 0) group = 'Today';
      else if (event.daysUntilEvent === 1) group = 'Tomorrow';
      else if (event.daysUntilEvent <= 7) group = 'This Week';
      else if (event.daysUntilEvent <= 30) group = 'Next Four Weeks';
      else if (event.daysUntilEvent <= 90) group = 'Next 3 Months';
      else group = 'Later This Year';

      if (!groups[group]) groups[group] = [];
      groups[group].push(event);
    });

    return groups;
  };

  const groupOrder = ['Today', 'Tomorrow', 'This Week', 'Next Four Weeks', 'Next 3 Months', 'Later This Year'];
  const groupedListEvents = groupListEvents(listEvents);

  return (
    <div className="flex flex-col h-full">
      {/* Header bar: view toggle + navigation */}
      <div className="flex items-center justify-between px-3 py-2 md:px-5 md:py-3 border-b border-gray-200 bg-white">
        {/* Left: month nav (calendar) or title (list) */}
        {viewMode === 'calendar' ? (
          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={goToPrevMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronLeft className="w-5 h-5 text-gray-500" />
            </button>
            <button
              onClick={goToToday}
              className="font-display text-lg md:text-xl font-bold text-gray-900 hover:text-teal-600 transition-colors px-2"
            >
              {MONTH_NAMES[currentMonth - 1]} {currentYear}
            </button>
            <button
              onClick={goToNextMonth}
              className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ChevronRight className="w-5 h-5 text-gray-500" />
            </button>
            {!isCurrentMonthYear && (
              <button
                onClick={goToToday}
                className="ml-2 text-xs font-medium text-teal-600 hover:text-teal-700 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded-full transition-colors"
              >
                Today
              </button>
            )}
          </div>
        ) : (
          <h2 className="font-display text-lg md:text-xl font-bold text-gray-900">
            Upcoming
          </h2>
        )}

        {/* Right: view toggle */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-lg p-0.5">
          <button
            onClick={() => setViewMode('calendar')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'calendar'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <CalendarDays className="w-4 h-4" />
            Month
          </button>
          <button
            onClick={() => setViewMode('list')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-all ${
              viewMode === 'list'
                ? 'bg-white text-gray-900 shadow-sm'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            <List className="w-4 h-4" />
            Year
          </button>
        </div>
      </div>

      {viewMode === 'calendar' ? (
        <div className="flex-1 flex flex-col md:flex-row min-h-0">
          {/* Calendar grid area */}
          <div className="flex-1 flex flex-col min-h-0 min-w-0">
            {/* Day names header */}
            <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50/80">
              {DAY_NAMES.map(day => (
                <div
                  key={day}
                  className="py-2 md:py-2.5 text-center text-xs font-semibold text-gray-400 uppercase tracking-wider"
                >
                  {day}
                </div>
              ))}
            </div>

            {/* Calendar grid — fills remaining height */}
            <div className="flex-1 overflow-auto">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Spinner size="lg" />
                </div>
              ) : (
                <div
                  className="grid grid-cols-7 h-full"
                  style={{ gridTemplateRows: `repeat(${weeksNeeded}, 1fr)` }}
                >
                  {calendarDays.map((calDay, index) => {
                    const dayEvents = eventMap.get(calDay.date) || [];
                    const hasEvents = dayEvents.length > 0;
                    const isSelected = selectedDate === calDay.date;
                    const isTodayDate = isToday(calDay.date);
                    const isPastDate = isPast(calDay.date) && calDay.isCurrentMonth;

                    return (
                      <button
                        key={index}
                        onClick={() => hasEvents ? setSelectedDate(isSelected ? null : calDay.date) : null}
                        className={`
                          relative flex flex-col items-start p-1.5 md:p-2
                          border-b border-r border-gray-100
                          ${!calDay.isCurrentMonth ? 'bg-gray-50/50' : isPastDate ? 'bg-gray-50/40' : 'bg-white'}
                          ${hasEvents ? 'cursor-pointer group' : 'cursor-default'}
                          ${isSelected ? '!bg-teal-50 ring-2 ring-teal-500 ring-inset z-10' : ''}
                          ${hasEvents && !isSelected ? 'hover:bg-gray-50' : ''}
                          transition-colors
                        `}
                      >
                        {/* Day number */}
                        <span
                          className={`
                            text-sm md:text-sm font-medium leading-none mb-1
                            ${!calDay.isCurrentMonth ? 'text-gray-300' : isPastDate ? 'text-gray-400' : 'text-gray-600'}
                            ${isTodayDate ? 'bg-teal-600 text-white !font-bold w-6 h-6 md:w-7 md:h-7 rounded-full flex items-center justify-center' : ''}
                          `}
                        >
                          {calDay.day}
                        </span>

                        {/* Event indicators */}
                        {hasEvents && (
                          <div className="flex flex-col items-center w-full flex-1 justify-center gap-1">
                            {/* Mobile: avatars with emoji */}
                            <div className="md:hidden flex justify-center">
                              {dayEvents.length === 1 ? (
                                <div className="relative">
                                  <Avatar
                                    src={dayEvents[0].profilePicture}
                                    name={dayEvents[0].profileName}
                                    size="sm"
                                  />
                                  <span className="absolute -bottom-1 -right-1 text-xs drop-shadow-sm">
                                    {getEventEmoji(dayEvents[0].type)}
                                  </span>
                                </div>
                              ) : (
                                <div className="flex -space-x-2">
                                  {dayEvents.slice(0, 2).map((event, i) => (
                                    <div key={i} className="relative">
                                      <Avatar
                                        src={event.profilePicture}
                                        name={event.profileName}
                                        size="xs"
                                      />
                                      <span className="absolute -bottom-0.5 -right-0.5 text-[10px] drop-shadow-sm">
                                        {getEventEmoji(event.type)}
                                      </span>
                                    </div>
                                  ))}
                                  {dayEvents.length > 2 && (
                                    <span className="text-[10px] text-gray-500 ml-1 font-semibold self-center">
                                      +{dayEvents.length - 2}
                                    </span>
                                  )}
                                </div>
                              )}
                            </div>

                            {/* Desktop: richer event cards */}
                            <div className="hidden md:flex flex-col gap-0.5 w-full overflow-hidden">
                              {dayEvents.slice(0, 3).map((event, i) => (
                                <div
                                  key={i}
                                  className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-xs leading-tight truncate border ${getEventColorClasses(event.type)} ${isPastDate ? 'opacity-50' : ''}`}
                                >
                                  <span className="flex-shrink-0">{getEventEmoji(event.type)}</span>
                                  <span className="truncate font-medium">
                                    {event.profileName.split(' ')[0]}
                                  </span>
                                </div>
                              ))}
                              {dayEvents.length > 3 && (
                                <span className="text-[10px] text-gray-400 font-medium pl-1">
                                  +{dayEvents.length - 3} more
                                </span>
                              )}
                            </div>
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Desktop sidebar for selected date */}
          <AnimatePresence>
            {selectedDate && selectedEvents.length > 0 && (
              <motion.div
                initial={{ width: 0, opacity: 0 }}
                animate={{ width: 320, opacity: 1 }}
                exit={{ width: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="hidden md:block border-l border-gray-200 bg-white overflow-hidden flex-shrink-0"
              >
                <div className="w-80 h-full flex flex-col">
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'long',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="flex-1 overflow-y-auto p-3 space-y-2">
                    {selectedEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event.profileId)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar
                            src={event.profilePicture}
                            name={event.profileName}
                            size="md"
                          />
                          <span className="absolute -bottom-1 -right-1 text-base drop-shadow-sm">
                            {getEventEmoji(event.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate text-sm">
                            {event.profileName}
                          </p>
                          <p className="text-xs text-gray-500 capitalize">
                            {event.name || event.type}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Mobile bottom panel for selected date */}
          <AnimatePresence>
            {selectedDate && selectedEvents.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                className="md:hidden border-t border-gray-200 bg-white overflow-hidden"
              >
                <div className="p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-semibold text-gray-900 text-sm">
                      {new Date(selectedDate + 'T12:00:00').toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </h3>
                    <button
                      onClick={() => setSelectedDate(null)}
                      className="p-1 hover:bg-gray-100 rounded-full transition-colors"
                    >
                      <X className="w-4 h-4 text-gray-400" />
                    </button>
                  </div>

                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selectedEvents.map(event => (
                      <button
                        key={event.id}
                        onClick={() => onEventClick(event.profileId)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar
                            src={event.profilePicture}
                            name={event.profileName}
                            size="md"
                          />
                          <span className="absolute -bottom-1 -right-1 text-base drop-shadow-sm">
                            {getEventEmoji(event.type)}
                          </span>
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-gray-900 truncate">
                            {event.profileName}
                          </p>
                          <p className="text-sm text-gray-500 capitalize">
                            {event.name || event.type}
                          </p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        /* List View */
        <div className="flex-1 overflow-auto p-4 md:p-6">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Spinner size="lg" />
            </div>
          ) : listEvents.length === 0 ? (
            <div className="text-center py-12">
              <CalendarDays className="w-12 h-12 mx-auto text-gray-300 mb-3" />
              <p className="text-gray-500">No upcoming occasions in the next year</p>
            </div>
          ) : (
            <div className="space-y-6 max-w-2xl mx-auto">
              {groupOrder.map(group => {
                const groupEvents = groupedListEvents[group];
                if (!groupEvents?.length) return null;

                return (
                  <div key={group}>
                    <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3 sticky top-0 bg-white py-1 z-10">
                      {group}
                    </h3>
                    <div className="space-y-2">
                      {groupEvents.map(event => (
                        <button
                          key={`${event.id}-${event.date}`}
                          onClick={() => onEventClick(event.profileId)}
                          className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <div className="relative flex-shrink-0">
                            <Avatar
                              src={event.profilePicture}
                              name={event.profileName}
                              size="md"
                            />
                            <span className="absolute -bottom-1 -right-1 text-base drop-shadow-sm">
                              {getEventEmoji(event.type)}
                            </span>
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">
                              {event.profileName}
                            </p>
                            <p className="text-sm text-gray-500">
                              {event.name || event.type.charAt(0).toUpperCase() + event.type.slice(1)}
                              {event.age && ` · Turning ${event.age}`}
                            </p>
                          </div>
                          <div className="text-right flex-shrink-0">
                            <p className="text-sm font-medium text-gray-900">
                              {new Date(event.date + 'T12:00:00').toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                              })}
                            </p>
                            <p className={`text-xs ${
                              event.daysUntilEvent === 0 ? 'text-coral-600 font-semibold' :
                              event.daysUntilEvent <= 7 ? 'text-amber-600' : 'text-gray-500'
                            }`}>
                              {event.daysUntilEvent === 0 ? 'Today' :
                               event.daysUntilEvent === 1 ? 'Tomorrow' :
                               `in ${event.daysUntilEvent} days`}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
