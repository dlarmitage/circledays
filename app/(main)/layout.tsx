import { redirect } from 'next/navigation';
import { getCurrentUser, getSession } from '@/lib/auth';
import { db, users, profiles } from '@/lib/db';
import { eq } from 'drizzle-orm';
import { Navigation } from '@/components/Navigation';
import { HelpChat } from '@/components/HelpChat';
import { ImpersonationBanner } from '@/components/ImpersonationBanner';
import { CapacitorPushHandler } from '@/components/CapacitorPushHandler';

export default async function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  // Get user's own profile picture
  const [ownProfile] = await db
    .select({ profilePicture: profiles.profilePicture })
    .from(profiles)
    .where(eq(profiles.linkedUserId, user.id))
    .limit(1);

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

      <Navigation isAdmin={isAdmin} userName={user.name} profilePicture={ownProfile?.profilePicture} />

      {/* Main content - offset for sidebar on desktop, and for banner when impersonating */}
      <main className={`md:ml-64 pb-20 md:pb-0 pt-safe ${impersonation ? 'pt-10' : ''}`}>
        {children}
      </main>

      {/* Push Notification Handler (native only) */}
      <CapacitorPushHandler userId={user.id} pushEnabled={user.pushEnabled} />

      {/* Help Chat Assistant */}
      <HelpChat />
    </div>
  );
}
