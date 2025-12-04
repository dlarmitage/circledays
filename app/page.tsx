import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Users, Bell, Sparkles } from 'lucide-react';

export default async function HomePage() {
  const user = await getCurrentUser();
  
  if (user) {
    redirect('/dashboard');
  }
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-cream via-cream to-teal-50">
      {/* Header */}
      <header className="container mx-auto px-4 py-6 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
            <span className="text-white font-bold text-lg">C</span>
          </div>
          <span className="font-display text-xl font-bold text-teal-600">CircleDays</span>
        </div>
        <Link href="/login">
          <Button variant="secondary" size="sm">Sign In</Button>
        </Link>
      </header>
      
      {/* Hero */}
      <main className="container mx-auto px-4 pt-16 pb-24">
        <div className="max-w-3xl mx-auto text-center">
          <h1 className="font-display text-5xl md:text-6xl font-bold text-gray-900 mb-6 leading-tight">
            Never miss a{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-500 to-coral-500">
              special day
            </span>
          </h1>
          <p className="text-xl text-gray-600 mb-10 max-w-xl mx-auto">
            Track birthdays and anniversaries for the people you care about. 
            Build your network and never forget an important date again.
          </p>
          <Link href="/login">
            <Button size="lg" className="text-base px-8">
              Get Started Free
            </Button>
          </Link>
        </div>
        
        {/* Features */}
        <div className="grid md:grid-cols-3 gap-8 mt-24 max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-teal-50 flex items-center justify-center mb-4">
              <Users className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              Build Your Network
            </h3>
            <p className="text-sm text-gray-600">
              Create profiles for friends, family, and colleagues. Connect with others and share your network.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-coral-50 flex items-center justify-center mb-4">
              <Bell className="w-6 h-6 text-coral-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              Timely Reminders
            </h3>
            <p className="text-sm text-gray-600">
              Get email or SMS reminders adjusted to your timezone. Never miss a birthday again.
            </p>
          </div>
          
          <div className="bg-white rounded-2xl p-6 shadow-soft">
            <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center mb-4">
              <Sparkles className="w-6 h-6 text-amber-600" />
            </div>
            <h3 className="font-display text-lg font-semibold text-gray-900 mb-2">
              Visual Network
            </h3>
            <p className="text-sm text-gray-600">
              See your connections in a beautiful interactive graph. Discover mutual friends and grow your circle.
            </p>
          </div>
        </div>
      </main>
      
      {/* Footer */}
      <footer className="container mx-auto px-4 py-8 border-t border-gray-100">
        <p className="text-center text-sm text-gray-500">
          © {new Date().getFullYear()} CircleDays. Made with ❤️
        </p>
      </footer>
    </div>
  );
}
