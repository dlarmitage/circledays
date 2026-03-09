import { NextRequest, NextResponse } from 'next/server';
import { withAuth } from '@/lib/api-handler';
import { db, chatSessions, chatMessages } from '@/lib/db';
import { eq, desc, asc } from 'drizzle-orm';

// GET /api/chat/sessions — get user's recent chat sessions
// Query params:
//   ?id=<sessionId> — load a specific session with messages
//   (no params) — returns most recent session with messages + list of recent sessions
export const GET = withAuth(async (request, user) => {
  const { searchParams } = new URL(request.url);
  const specificId = searchParams.get('id');

  // If requesting a specific session, load it
  if (specificId) {
    const [session] = await db
      .select()
      .from(chatSessions)
      .where(eq(chatSessions.id, specificId))
      .limit(1);

    if (!session || session.userId !== user.id) {
      return NextResponse.json({ session: null, messages: [] });
    }

    const messages = await db
      .select({
        id: chatMessages.id,
        role: chatMessages.role,
        content: chatMessages.content,
        pageContext: chatMessages.pageContext,
        createdAt: chatMessages.createdAt,
      })
      .from(chatMessages)
      .where(eq(chatMessages.sessionId, session.id))
      .orderBy(asc(chatMessages.createdAt));

    return NextResponse.json({
      session: {
        id: session.id,
        title: session.title,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
      },
      messages,
    });
  }

  // Default: get recent sessions list + load the most recent one
  const recentSessions = await db
    .select({
      id: chatSessions.id,
      title: chatSessions.title,
      lastPageContext: chatSessions.lastPageContext,
      createdAt: chatSessions.createdAt,
      updatedAt: chatSessions.updatedAt,
    })
    .from(chatSessions)
    .where(eq(chatSessions.userId, user.id))
    .orderBy(desc(chatSessions.updatedAt))
    .limit(5);

  if (recentSessions.length === 0) {
    return NextResponse.json({ session: null, messages: [], recentSessions: [] });
  }

  // Load messages for the most recent session
  const currentSession = recentSessions[0];
  const messages = await db
    .select({
      id: chatMessages.id,
      role: chatMessages.role,
      content: chatMessages.content,
      pageContext: chatMessages.pageContext,
      createdAt: chatMessages.createdAt,
    })
    .from(chatMessages)
    .where(eq(chatMessages.sessionId, currentSession.id))
    .orderBy(asc(chatMessages.createdAt));

  return NextResponse.json({
    session: {
      id: currentSession.id,
      title: currentSession.title,
      createdAt: currentSession.createdAt,
      updatedAt: currentSession.updatedAt,
    },
    messages,
    recentSessions,
  });
}, 'get chat sessions');
