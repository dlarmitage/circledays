import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { 
  Users, 
  Smartphone, 
  Mail, 
  MessageSquare,
  Share2,
  ChevronRight,
  Check,
  Sparkles,
  StickyNote,
  Globe,
  Heart,
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
            One profile, everyone remembers
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Birthdays{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-coral-500">
              remembered
            </span>
            {' '}together
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            Add Grandma once. Everyone who loves her gets their own reminders. 
            No more scattered calendars, duplicate entries, or forgotten dates.
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
            Built for how families actually work
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            One shared network of people. Personal reminders for everyone.
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Core Feature - Shared Profiles */}
            <div className="lg:col-span-2 bg-gradient-to-br from-teal-500 to-teal-600 rounded-2xl p-8 shadow-lg text-white">
              <div className="flex flex-col md:flex-row md:items-center gap-6">
                <div className="flex-1">
                  <h3 className="font-display text-2xl font-bold mb-3">
                    Add once, everyone benefits
                  </h3>
                  <p className="text-teal-100 mb-4">
                    When you create a profile for someone, you can invite others to connect to them. 
                    Your spouse, your kids, your siblings—everyone gets their own reminders with their 
                    own timing preferences. One source of truth, personalized for each person.
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">No duplicate entries</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">Personal reminder timing</span>
                    <span className="bg-white/20 px-3 py-1 rounded-full text-xs">Private notes per person</span>
                  </div>
                </div>
                <div className="flex-shrink-0 w-24 h-24 md:w-32 md:h-32 bg-white/10 rounded-2xl flex items-center justify-center">
                  <Users className="w-12 h-12 md:w-16 md:h-16 text-white/80" />
                </div>
              </div>
            </div>
            
            {/* Timezone-Aware */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Globe className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                7 AM Your Time
              </h3>
              <p className="text-sm text-gray-600">
                Reminders arrive at 7 AM in <em>your</em> timezone. Tokyo, Toronto, or Tulsa—
                wake up to the reminder right when you need it.
              </p>
            </div>
            
            {/* Private Notes */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <StickyNote className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Private Notes
              </h3>
              <p className="text-sm text-gray-600">
                Remember the little things only you know—their favorite restaurant, inside jokes, 
                gift ideas. Your notes are private and auto-save as you type.
              </p>
            </div>
            
            {/* Discover Connections */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Discover Connections
              </h3>
              <p className="text-sm text-gray-600">
                See who your connections know. Find mutual friends organically and 
                grow your circle without starting from scratch.
              </p>
            </div>
            
            {/* Message Assist */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
                <Sparkles className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Message Assist
              </h3>
              <p className="text-sm text-gray-600">
                Need help crafting a message? Our optional AI assistant can suggest 
                thoughtful words based on your notes. Use it or don't—it's there if you want it.
              </p>
            </div>
          </div>
        </div>

        {/* Visual Calendar Section */}
        <div className="max-w-5xl mx-auto mb-24">
          <div className="text-center mb-8">
            <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
              A calendar that shows faces, not just text
            </h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              See who's celebrating at a glance with photos and emoji indicators. 
              Tap any day to see details and send your wishes.
            </p>
          </div>
          
          <div className="bg-white rounded-3xl p-4 md:p-8 shadow-soft">
            <img 
              src="/calendar_preview.png" 
              alt="CircleDays calendar showing birthdays with photos and emoji indicators" 
              className="w-full rounded-2xl"
            />
          </div>
          
          <div className="flex justify-center gap-4 mt-6 flex-wrap">
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-soft">
              <span className="text-xl">🎂</span>
              <span className="text-sm font-medium text-gray-700">Birthdays</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-soft">
              <span className="text-xl">❤️</span>
              <span className="text-sm font-medium text-gray-700">Anniversaries</span>
            </div>
            <div className="flex items-center gap-2 bg-white px-4 py-2 rounded-full shadow-soft">
              <span className="text-xl">🎆</span>
              <span className="text-sm font-medium text-gray-700">Custom events</span>
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
