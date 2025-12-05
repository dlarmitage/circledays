'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronLeft, ChevronRight, X, Gift, Heart, Star, Cake } from 'lucide-react';
import { Avatar } from '@/components/ui/Avatar';
import { Spinner } from '@/components/ui/Spinner';

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

function getEventIcon(type: string) {
  switch (type.toLowerCase()) {
    case 'birthday':
      return <Cake className="w-4 h-4" />;
    case 'anniversary':
      return <Heart className="w-4 h-4" />;
    default:
      return <Star className="w-4 h-4" />;
  }
}

function getEventColor(type: string) {
  switch (type.toLowerCase()) {
    case 'birthday':
      return 'bg-pink-500';
    case 'anniversary':
      return 'bg-red-500';
    default:
      return 'bg-teal-500';
  }
}

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

export function Calendar({ onEventClick }: CalendarProps) {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1);
  const [events, setEvents] = useState<DayEvents[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  
  // Fetch events for current month
  useEffect(() => {
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
  }, [currentYear, currentMonth]);
  
  // Build event map for quick lookup
  const eventMap = new Map<string, CalendarEvent[]>();
  events.forEach(day => {
    eventMap.set(day.date, day.events);
  });
  
  // Calendar grid calculations
  const firstDayOfMonth = new Date(currentYear, currentMonth - 1, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth, 0).getDate();
  const daysInPrevMonth = new Date(currentYear, currentMonth - 1, 0).getDate();
  
  // Build calendar grid (6 weeks × 7 days)
  const calendarDays: { day: number; isCurrentMonth: boolean; date: string }[] = [];
  
  // Previous month days
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
  
  // Current month days
  for (let day = 1; day <= daysInMonth; day++) {
    calendarDays.push({
      day,
      isCurrentMonth: true,
      date: `${currentYear}-${String(currentMonth).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
    });
  }
  
  // Next month days (fill to complete grid)
  const remainingDays = 42 - calendarDays.length;
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
  
  const isToday = (date: string) => {
    const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    return date === todayStr;
  };
  
  const selectedEvents = selectedDate ? eventMap.get(selectedDate) || [] : [];
  
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <button
          onClick={goToPrevMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-gray-600" />
        </button>
        
        <button
          onClick={goToToday}
          className="font-display text-lg font-bold text-gray-900 hover:text-teal-600 transition-colors"
        >
          {MONTH_NAMES[currentMonth - 1]} {currentYear}
        </button>
        
        <button
          onClick={goToNextMonth}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-gray-600" />
        </button>
      </div>
      
      {/* Day names */}
      <div className="grid grid-cols-7 border-b border-gray-100">
        {DAY_NAMES.map(day => (
          <div
            key={day}
            className="py-2 text-center text-xs font-medium text-gray-500"
          >
            {day}
          </div>
        ))}
      </div>
      
      {/* Calendar grid */}
      <div className="flex-1 overflow-auto">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="grid grid-cols-7 h-full">
            {calendarDays.map((calDay, index) => {
              const dayEvents = eventMap.get(calDay.date) || [];
              const hasEvents = dayEvents.length > 0;
              const isSelected = selectedDate === calDay.date;
              
              return (
                <button
                  key={index}
                  onClick={() => hasEvents ? setSelectedDate(isSelected ? null : calDay.date) : null}
                  className={`
                    relative p-1 min-h-[60px] md:min-h-[80px] border-b border-r border-gray-50
                    ${calDay.isCurrentMonth ? 'bg-white' : 'bg-gray-50'}
                    ${hasEvents ? 'cursor-pointer hover:bg-teal-50' : 'cursor-default'}
                    ${isSelected ? 'bg-teal-50 ring-2 ring-teal-500 ring-inset' : ''}
                    transition-colors
                  `}
                >
                  <span
                    className={`
                      text-sm font-medium
                      ${!calDay.isCurrentMonth ? 'text-gray-300' : ''}
                      ${isToday(calDay.date) ? 'bg-teal-600 text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto' : ''}
                      ${calDay.isCurrentMonth && !isToday(calDay.date) ? 'text-gray-700' : ''}
                    `}
                  >
                    {calDay.day}
                  </span>
                  
                  {/* Event indicators - mini avatars with emoji */}
                  {hasEvents && (
                    <div className="flex justify-center items-center mt-1">
                      {/* Dynamic sizing based on event count */}
                      {dayEvents.length === 1 ? (
                        // Single event - largest size
                        <div className="relative">
                          {dayEvents[0].profilePicture ? (
                            <img
                              src={dayEvents[0].profilePicture}
                              alt=""
                              className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white object-cover shadow-sm"
                            />
                          ) : (
                            <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center shadow-sm">
                              <span className="text-xs md:text-sm font-bold text-white">
                                {dayEvents[0].profileName.charAt(0)}
                              </span>
                            </div>
                          )}
                          <span className="absolute -bottom-1 -right-1 text-sm md:text-base drop-shadow-sm">
                            {getEventEmoji(dayEvents[0].type)}
                          </span>
                        </div>
                      ) : dayEvents.length === 2 ? (
                        // Two events - medium size
                        <div className="flex -space-x-2">
                          {dayEvents.slice(0, 2).map((event, i) => (
                            <div key={i} className="relative">
                              {event.profilePicture ? (
                                <img
                                  src={event.profilePicture}
                                  alt=""
                                  className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white object-cover shadow-sm"
                                />
                              ) : (
                                <div className="w-7 h-7 md:w-8 md:h-8 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center shadow-sm">
                                  <span className="text-[10px] md:text-xs font-bold text-white">
                                    {event.profileName.charAt(0)}
                                  </span>
                                </div>
                              )}
                              <span className="absolute -bottom-1 -right-1 text-xs md:text-sm drop-shadow-sm">
                                {getEventEmoji(event.type)}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        // 3+ events - smaller size with count
                        <div className="flex items-center">
                          <div className="flex -space-x-2">
                            {dayEvents.slice(0, 3).map((event, i) => (
                              <div key={i} className="relative">
                                {event.profilePicture ? (
                                  <img
                                    src={event.profilePicture}
                                    alt=""
                                    className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white object-cover shadow-sm"
                                  />
                                ) : (
                                  <div className="w-6 h-6 md:w-7 md:h-7 rounded-full border-2 border-white bg-teal-500 flex items-center justify-center shadow-sm">
                                    <span className="text-[8px] md:text-[10px] font-bold text-white">
                                      {event.profileName.charAt(0)}
                                    </span>
                                  </div>
                                )}
                                <span className="absolute -bottom-1 -right-1 text-[10px] md:text-xs drop-shadow-sm">
                                  {getEventEmoji(event.type)}
                                </span>
                              </div>
                            ))}
                          </div>
                          {dayEvents.length > 3 && (
                            <span className="text-xs text-gray-500 ml-1 font-semibold">+{dayEvents.length - 3}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>
      
      {/* Selected day events panel */}
      <AnimatePresence>
        {selectedDate && selectedEvents.length > 0 && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-gray-200 bg-white overflow-hidden"
          >
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-gray-900">
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
              
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {selectedEvents.map(event => (
                  <button
                    key={event.id}
                    onClick={() => onEventClick(event.profileId)}
                    className="w-full flex items-center gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                  >
                    <div className="relative">
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
  );
}

