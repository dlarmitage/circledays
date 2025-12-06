import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  Bell, 
  Calendar, 
  Smartphone, 
  Mail, 
  MessageSquare,
  UserPlus,
  Share2,
  ChevronRight,
  Check,
  Sparkles,
  Clock,
  Lock,
  StickyNote,
  Globe,
  Heart,
  Zap,
  HelpCircle,
} from 'lucide-react';

export default async function HomePage() {
  try {
    const user = await getCurrentUser();
    if (user) {
      redirect('/dashboard');
    }
  } catch (error) {
    console.error('Auth check failed:', error);
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <img 
            src="/icons/touch-icon-96x96.png" 
            alt="CircleDays" 
            className="w-10 h-10 rounded-xl"
          />
          <span className="font-display text-xl font-bold text-teal-600">CircleDays</span>
        </div>
        <Link href="/login">
          <Button variant="secondary" size="sm">Sign In</Button>
        </Link>
      </header>
      
      {/* Hero */}
      <main className="container mx-auto px-4 pt-12 md:pt-20 pb-16">
        <div className="max-w-3xl mx-auto text-center mb-16">
          <div className="inline-flex items-center gap-2 bg-teal-50 text-teal-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <Heart className="w-4 h-4" />
            Relationships, not reminders
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            The{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-coral-500">
              people-first
            </span>
            {' '}way to remember
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            More than reminders—CircleDays helps you nurture relationships with private notes, 
            AI-powered messages, and a shared network that grows with your family and friends.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link href="/login">
              <Button size="lg" className="text-base px-8 w-full sm:w-auto">
                Get Started Free
                <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </div>
          
          <p className="text-sm text-gray-500 mt-4">
            No credit card required • Free forever
          </p>
        </div>
        
        {/* Problem/Solution */}
        <div className="max-w-4xl mx-auto mb-24 bg-gradient-to-br from-gray-900 to-gray-800 rounded-3xl p-8 md:p-12 text-white">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center mb-8">
            Why calendar apps fail at birthdays
          </h2>
          
          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-coral-400 font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">😩</span> The calendar problem
              </h3>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-coral-400 mt-0.5">✗</span>
                  Your birthday list is unique to you—can't share it meaningfully
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-400 mt-0.5">✗</span>
                  Multiple calendars for family, friends, work—chaos
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-400 mt-0.5">✗</span>
                  No context—just a name and a date
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-coral-400 mt-0.5">✗</span>
                  Reminder pops up, you scramble to write something
                </li>
              </ul>
            </div>
            
            <div>
              <h3 className="text-teal-400 font-semibold mb-4 flex items-center gap-2">
                <span className="text-xl">✨</span> The CircleDays way
              </h3>
              <ul className="space-y-3 text-gray-300 text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">✓</span>
                  Everyone has their own view, but dates are shared once
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">✓</span>
                  One circle that connects naturally through relationships
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">✓</span>
                  Private notes help you remember what matters
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-teal-400 mt-0.5">✓</span>
                  AI Message Assist crafts thoughtful messages for you
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Key Differentiators */}
        <div className="max-w-5xl mx-auto mb-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-4">
            Features that actually matter
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Built for how relationships really work
          </p>
          
          <div className="grid md:grid-cols-2 gap-6">
            {/* Message Assist - Hero Feature */}
            <div className="md:col-span-2 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl p-8 shadow-lg text-white">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <div className="inline-flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    <Sparkles className="w-4 h-4" />
                    AI-Powered
                  </div>
                  <h3 className="font-display text-2xl font-bold mb-3">
                    Message Assist
                  </h3>
                  <p className="text-purple-100 mb-4">
                    When a birthday arrives, don't stare at a blank screen. Message Assist reads your private 
                    notes and crafts a personalized, heartfelt message you can copy and send. Choose the tone, 
                    refine as needed—the perfect message in seconds.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">Uses your notes</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">Multiple tones</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">One-click copy</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-white/80" />
                </div>
              </div>
            </div>
            
            {/* Private Notes */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <StickyNote className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Private Notes
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Remember the little things: their favorite restaurant, that book they loved, 
                inside jokes. Your notes are encrypted and only visible to you—building a 
                treasure trove of context over the years.
              </p>
              <p className="text-xs text-gray-400 flex items-center gap-1">
                <Lock className="w-3 h-3" /> Auto-saves as you type
              </p>
            </div>
            
            {/* Smart Network */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Shared Yet Personal
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                When you add Grandma, she only gets entered once. Invite family members and 
                they'll see her too—with their own private notes and reminder preferences. 
                No more duplicate data across a dozen calendars.
              </p>
              <p className="text-xs text-gray-400">Discover friends-of-friends organically</p>
            </div>
            
            {/* Timezone-Aware */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Timezone-Smart Reminders
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Reminders arrive at 7 AM in <em>your</em> timezone—not 3 AM because the 
                server is somewhere else. Whether you're in Tokyo or Toronto, you wake up 
                to the reminder right when you need it.
              </p>
              <p className="text-xs text-gray-400">Email or SMS, your choice</p>
            </div>
            
            {/* Help Assistant */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                <HelpCircle className="w-6 h-6 text-green-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Built-in Help Assistant
              </h3>
              <p className="text-sm text-gray-600 mb-3">
                Stuck? Tap the help button and chat with an AI that knows CircleDays inside 
                and out. Ask anything—how to invite someone, where to find your calendar, 
                how connections work. Instant answers.
              </p>
              <p className="text-xs text-gray-400">Always available, always helpful</p>
            </div>
          </div>
        </div>

        {/* Visual Calendar Section */}
        <div className="max-w-4xl mx-auto mb-24">
          <div className="bg-white rounded-3xl p-8 md:p-12 shadow-soft">
            <div className="flex flex-col md:flex-row md:items-center gap-8">
              <div className="flex-1">
                <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
                  <Calendar className="w-6 h-6 text-pink-600" />
                </div>
                <h2 className="font-display text-2xl font-bold text-gray-900 mb-4">
                  A calendar that shows faces, not just text
                </h2>
                <p className="text-gray-600 mb-6">
                  See who's celebrating at a glance with mini avatars and emoji indicators. 
                  Switch between calendar and list views. Tap any event to see the full profile 
                  and—if it's today—launch Message Assist.
                </p>
                <div className="flex flex-wrap gap-3">
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-lg">🎂</span>
                    <span className="text-sm text-gray-600">Birthdays</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-lg">❤️</span>
                    <span className="text-sm text-gray-600">Anniversaries</span>
                  </div>
                  <div className="flex items-center gap-2 bg-gray-50 px-3 py-2 rounded-lg">
                    <span className="text-lg">🎆</span>
                    <span className="text-sm text-gray-600">Custom events</span>
                  </div>
                </div>
              </div>
              <div className="flex-shrink-0 grid grid-cols-7 gap-1 bg-gray-100 p-3 rounded-2xl w-full md:w-64">
                {['S','M','T','W','T','F','S'].map((d, i) => (
                  <div key={i} className="text-center text-xs font-medium text-gray-400 py-1">{d}</div>
                ))}
                {Array.from({length: 35}, (_, i) => {
                  const day = i - 3;
                  const isToday = day === 15;
                  const hasEvent = [8, 15, 22, 28].includes(day);
                  return (
                    <div 
                      key={i} 
                      className={`aspect-square flex items-center justify-center text-xs rounded-lg
                        ${day < 1 || day > 31 ? 'text-gray-300' : 'text-gray-600'}
                        ${isToday ? 'bg-teal-500 text-white font-bold' : ''}
                        ${hasEvent && !isToday ? 'bg-pink-100' : ''}
                      `}
                    >
                      {day >= 1 && day <= 31 ? day : ''}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            Up and running in minutes
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Sign in with email</h3>
              <p className="text-sm text-gray-600">
                No passwords to remember. We send a secure magic link—click and you're in.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Add your people</h3>
              <p className="text-sm text-gray-600">
                Name, birthday, photo. Add notes and events. Invite them to claim their profile.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Relax</h3>
              <p className="text-sm text-gray-600">
                Get reminded when it matters. Use Message Assist for the perfect note.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Options */}
        <div className="max-w-3xl mx-auto mb-24 bg-white rounded-3xl p-8 md:p-12 shadow-soft">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-4">
            Reminders on your terms
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Pick your channel and timing—then forget about it
          </p>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Email</h4>
                <p className="text-sm text-gray-600">Beautiful emails with all the details you need</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">SMS</h4>
                <p className="text-sm text-gray-600">Quick texts that get right to the point</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center mb-4">Choose when to be reminded:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Day of', '1 day before', '3 days', '1 week', '2 weeks'].map((timing) => (
                <span key={timing} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">
                  {timing}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Install as App */}
        <div className="max-w-3xl mx-auto mb-24 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-teal-400 to-teal-600 shadow-lg mb-6">
            <Smartphone className="w-8 h-8 text-white" />
          </div>
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Install it like an app
          </h2>
          <p className="text-gray-600 mb-6 max-w-lg mx-auto">
            CircleDays is a Progressive Web App. Add it to your home screen on any device—
            iPhone, Android, tablet, desktop. It works offline and feels completely native.
          </p>
          <div className="flex flex-wrap justify-center gap-3 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-teal-500" /> No app store needed</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-teal-500" /> Works offline</span>
            <span className="flex items-center gap-1"><Check className="w-4 h-4 text-teal-500" /> Always up to date</span>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-16">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Start remembering what matters
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Your relationships deserve more than a calendar entry. 
            Join CircleDays and make every special day count.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-8">
              Get Started Free
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="border-t border-gray-100 bg-white/50">
        <div className="container mx-auto px-4 py-8">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <img 
                src="/icons/touch-icon-96x96.png" 
                alt="CircleDays" 
                className="w-8 h-8 rounded-lg"
              />
              <span className="font-display font-bold text-teal-600">CircleDays</span>
            </div>
            <div className="flex items-center gap-4 text-sm text-gray-500">
              <Link href="/terms" className="hover:text-teal-600 transition-colors">
                Terms & Privacy
              </Link>
              <span>·</span>
              <span>© {new Date().getFullYear()} CircleDays</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
