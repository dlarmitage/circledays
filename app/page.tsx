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
  Cake,
  Heart,
  Star,
  ChevronRight,
  Check,
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
            <Smartphone className="w-4 h-4" />
            Install as an app on any device
          </div>
          
          <h1 className="font-display text-4xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Never miss a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-coral-500">
              special day
            </span>
            {' '}again
          </h1>
          
          <p className="text-lg md:text-xl text-gray-600 mb-8 max-w-2xl mx-auto">
            The simple, beautiful way to remember birthdays, anniversaries, and special moments 
            for everyone in your life. Build your circle, get timely reminders, and strengthen your relationships.
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
            No credit card required • Free forever for personal use
          </p>
        </div>
        
        {/* Event Types Preview */}
        <div className="flex justify-center gap-4 mb-20 flex-wrap">
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
            <span className="text-sm font-medium text-gray-700">Custom Events</span>
          </div>
        </div>

        {/* Main Features */}
        <div className="max-w-5xl mx-auto mb-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-4">
            Everything you need to stay connected
          </h2>
          <p className="text-center text-gray-600 mb-12 max-w-2xl mx-auto">
            Simple tools that work together to help you remember what matters most
          </p>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Calendar */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-pink-50 flex items-center justify-center mb-4">
                <Calendar className="w-6 h-6 text-pink-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Visual Calendar
              </h3>
              <p className="text-sm text-gray-600">
                See all your events at a glance with photos and emoji indicators. 
                Tap any day to see who's celebrating.
              </p>
            </div>
            
            {/* Network */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
                <Users className="w-6 h-6 text-teal-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Your Network
              </h3>
              <p className="text-sm text-gray-600">
                Browse your connections and discover friends-of-friends. 
                See mutual connections and grow your circle organically.
              </p>
            </div>
            
            {/* Reminders */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-coral-50 flex items-center justify-center mb-4">
                <Bell className="w-6 h-6 text-coral-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Smart Reminders
              </h3>
              <p className="text-sm text-gray-600">
                Get notified via email or SMS. Choose to be reminded 
                on the day, 1 day before, a week ahead—you decide.
              </p>
            </div>
            
            {/* Profiles */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center mb-4">
                <UserPlus className="w-6 h-6 text-purple-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Rich Profiles
              </h3>
              <p className="text-sm text-gray-600">
                Add photos, multiple events, and private notes for each person. 
                Track birthdays, anniversaries, and any custom date.
              </p>
            </div>
            
            {/* Invites */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
                <Share2 className="w-6 h-6 text-amber-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Invite & Share
              </h3>
              <p className="text-sm text-gray-600">
                Invite friends to claim their profile and manage their own dates. 
                Share connections to help everyone stay in touch.
              </p>
            </div>
            
            {/* PWA */}
            <div className="bg-white rounded-2xl p-6 shadow-soft hover:shadow-md transition-shadow">
              <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center mb-4">
                <Smartphone className="w-6 h-6 text-blue-600" />
              </div>
              <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
                Works Everywhere
              </h3>
              <p className="text-sm text-gray-600">
                Install on your phone, tablet, or desktop. 
                Works offline and feels like a native app.
              </p>
            </div>
          </div>
        </div>

        {/* How It Works */}
        <div className="max-w-4xl mx-auto mb-24">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-12">
            Get started in 3 simple steps
          </h2>
          
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                1
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Sign up free</h3>
              <p className="text-sm text-gray-600">
                Just enter your email. No password needed—we use secure magic links.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                2
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Add your people</h3>
              <p className="text-sm text-gray-600">
                Create profiles with photos and dates. Add as many events as you like.
              </p>
            </div>
            
            <div className="text-center">
              <div className="w-12 h-12 rounded-full bg-teal-500 text-white flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                3
              </div>
              <h3 className="font-display font-semibold text-gray-900 mb-2">Never forget again</h3>
              <p className="text-sm text-gray-600">
                Get timely reminders and see upcoming events on your calendar.
              </p>
            </div>
          </div>
        </div>

        {/* Notification Options */}
        <div className="max-w-3xl mx-auto mb-24 bg-white rounded-3xl p-8 md:p-12 shadow-soft">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-center text-gray-900 mb-4">
            Get reminded your way
          </h2>
          <p className="text-center text-gray-600 mb-8">
            Choose how and when you want to be notified
          </p>
          
          <div className="grid sm:grid-cols-2 gap-6">
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <Mail className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">Email</h4>
                <p className="text-sm text-gray-600">Beautiful reminder emails with event details</p>
              </div>
            </div>
            
            <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center flex-shrink-0">
                <MessageSquare className="w-5 h-5 text-teal-600" />
              </div>
              <div>
                <h4 className="font-semibold text-gray-900">SMS</h4>
                <p className="text-sm text-gray-600">Quick text reminders straight to your phone</p>
              </div>
            </div>
          </div>
          
          <div className="mt-8 pt-8 border-t border-gray-100">
            <p className="text-sm text-gray-500 text-center mb-4">Customize your reminder timing:</p>
            <div className="flex flex-wrap justify-center gap-2">
              {['Day of', '1 day before', '3 days', '1 week', '2 weeks'].map((timing) => (
                <span key={timing} className="px-3 py-1.5 bg-teal-50 text-teal-700 rounded-full text-sm font-medium">
                  {timing}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Final CTA */}
        <div className="text-center mb-16">
          <h2 className="font-display text-2xl md:text-3xl font-bold text-gray-900 mb-4">
            Ready to remember what matters?
          </h2>
          <p className="text-gray-600 mb-8 max-w-lg mx-auto">
            Join CircleDays today and never miss another birthday, anniversary, or special moment.
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
