'use client';

import { useRouter } from 'next/navigation';
import { Calendar } from '@/components/Calendar';

export default function CalendarPage() {
  const router = useRouter();
  
  const handleEventClick = (profileId: string) => {
    router.push(`/profile/${profileId}`);
  };
  
  return (
    <div className="h-[calc(100vh-4rem)] md:h-[calc(100vh-2rem)] flex flex-col bg-white md:rounded-2xl md:shadow-soft md:m-4 overflow-hidden">
      <Calendar onEventClick={handleEventClick} />
    </div>
  );
}

