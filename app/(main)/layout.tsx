import { redirect } from 'next/navigation';
import { getCurrentUser, getSession } from '@/lib/auth';
import { db, users } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Navigation } from '@/components/Navigation';
import { HelpChat } from '@/components/HelpChat';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Check impersonation state
  const session = await getSession();
  let impersonation: { originalUserName: string } | null = null;
  let isAdmin = user.isPlatformAdmin;

  if (session.originalUserId) {
    // We're impersonating — get the original admin user info
    const [originalUser] = await db
      .select({ name: users.name, isPlatformAdmin: users.isPlatformAdmin })
      .from(users)
      .where(eq(users.id, session.originalUserId))
      .limit(1);

    if (originalUser) {
      impersonation = { originalUserName: originalUser.name };
      // When impersonating, show admin nav based on original user
      isAdmin = originalUser.isPlatformAdmin;
    }
  }

  return (
    <div className="min-h-screen bg-cream">
      {/* Impersonation Banner */}
      {impersonation && (
        <ImpersonationBanner
          userName={user.name}
          originalUserName={impersonation.originalUserName}
        />
      )}

      <Navigation isAdmin={isAdmin} />

      {/* Main content - offset for sidebar on desktop, and for banner when impersonating */}
      <main className={`md:ml-64 pb-20 md:pb-0 ${impersonation ? 'pt-10' : ''}`}>
        {children}
      </main>

      {/* Help Chat Assistant */}
      <HelpChat />
    </div>
  );
}
