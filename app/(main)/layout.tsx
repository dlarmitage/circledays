import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { Navigation } from '@/components/Navigation';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  
  if (!user) {
    redirect('/login');
  }
  
  return (
    <div className="min-h-screen bg-cream">
      <Navigation />
      
      {/* Main content - offset for sidebar on desktop */}
      <main className="md:ml-64 pb-20 md:pb-0">
        {children}
      </main>
    </div>
  );
}

