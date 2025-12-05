'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield, FileText } from 'lucide-react';

type Tab = 'terms' | 'privacy';

export default function TermsPage() {
  const [activeTab, setActiveTab] = useState<Tab>('terms');
  
  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-coral-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            href="/"
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </Link>
          <h1 className="font-display text-xl font-bold text-gray-900">
            Legal
          </h1>
        </div>
      </header>
      
      {/* Tab Toggle */}
      <div className="max-w-3xl mx-auto px-4 pt-6">
        <div className="flex gap-2 p-1 bg-gray-100 rounded-xl w-fit">
          <button
            onClick={() => setActiveTab('terms')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'terms'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <FileText className="w-4 h-4" />
            Terms of Service
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
              activeTab === 'privacy'
                ? 'bg-white text-teal-700 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            <Shield className="w-4 h-4" />
            Privacy Policy
          </button>
        </div>
      </div>
      
      {/* Content */}
      <main className="max-w-3xl mx-auto px-4 py-8">
        <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 md:p-8">
          {activeTab === 'terms' ? <TermsContent /> : <PrivacyContent />}
        </div>
        
        <p className="text-center text-sm text-gray-500 mt-8">
          Last updated: December 5, 2024
        </p>
      </main>
    </div>
  );
}

function TermsContent() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">
        Terms of Service
      </h1>
      
      <p className="text-gray-600 mb-6">
        Welcome to CircleDays. By using our service, you agree to these terms. 
        Please read them carefully.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        1. Using CircleDays
      </h2>
      <p className="text-gray-600 mb-4">
        CircleDays is a birthday and special event reminder service that helps you 
        remember important dates for people in your life. You must be at least 13 years 
        old to use this service.
      </p>
      <p className="text-gray-600 mb-4">
        You are responsible for:
      </p>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>Maintaining the confidentiality of your account</li>
        <li>All activities that occur under your account</li>
        <li>Ensuring information you enter is accurate and you have permission to share it</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        2. Your Content
      </h2>
      <p className="text-gray-600 mb-4">
        You retain ownership of any content you submit, including profile information, 
        photos, and notes. By using CircleDays, you grant us a license to store and 
        process this content to provide the service.
      </p>
      <p className="text-gray-600 mb-4">
        You agree not to:
      </p>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>Upload content that violates others' privacy or rights</li>
        <li>Use the service for any unlawful purpose</li>
        <li>Attempt to gain unauthorized access to other users' accounts</li>
        <li>Upload malicious content or interfere with the service</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        3. Connections and Invitations
      </h2>
      <p className="text-gray-600 mb-4">
        CircleDays allows you to connect with other users and invite people to join. 
        When you create a profile for someone and invite them, they have the option 
        to accept and claim that profile or decline. Once someone claims a profile, 
        they control their own information.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        4. Notifications
      </h2>
      <p className="text-gray-600 mb-4">
        We send notifications via email and/or SMS based on your preferences. 
        Standard message and data rates may apply for SMS notifications. 
        You can manage your notification preferences in Settings.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        5. Service Availability
      </h2>
      <p className="text-gray-600 mb-4">
        We strive to provide a reliable service but cannot guarantee uninterrupted 
        availability. We may modify, suspend, or discontinue features at any time. 
        We are not liable for any missed reminders or notifications.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        6. Termination
      </h2>
      <p className="text-gray-600 mb-4">
        You may delete your account at any time. We reserve the right to suspend 
        or terminate accounts that violate these terms. Upon termination, your 
        data will be deleted in accordance with our Privacy Policy.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        7. Disclaimer
      </h2>
      <p className="text-gray-600 mb-4">
        CircleDays is provided "as is" without warranties of any kind. We do not 
        guarantee that reminders will always be delivered on time or at all. 
        Use of this service is at your own risk.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        8. Changes to Terms
      </h2>
      <p className="text-gray-600 mb-4">
        We may update these terms from time to time. Continued use of CircleDays 
        after changes constitutes acceptance of the new terms.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        9. Contact
      </h2>
      <p className="text-gray-600">
        Questions about these terms? Contact us at{' '}
        <a href="mailto:support@circledays.app" className="text-teal-600 hover:underline">
          support@circledays.app
        </a>
      </p>
    </div>
  );
}

function PrivacyContent() {
  return (
    <div className="prose prose-gray max-w-none">
      <h1 className="font-display text-2xl font-bold text-gray-900 mb-6">
        Privacy Policy
      </h1>
      
      <p className="text-gray-600 mb-6">
        Your privacy is important to us. This policy explains what information we collect, 
        how we use it, and your rights regarding your data.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        1. Information We Collect
      </h2>
      
      <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">
        Information You Provide
      </h3>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li><strong>Account Information:</strong> Email address, name, and optionally mobile phone number</li>
        <li><strong>Profile Information:</strong> Names and photos of people you add</li>
        <li><strong>Event Information:</strong> Birthdays, anniversaries, and custom events</li>
        <li><strong>Notes:</strong> Private notes you add to profiles</li>
      </ul>
      
      <h3 className="text-base font-medium text-gray-800 mt-4 mb-2">
        Information Collected Automatically
      </h3>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>Device and browser information</li>
        <li>Usage data (features used, pages viewed)</li>
        <li>Notification delivery status</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        2. How We Use Your Information
      </h2>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>To provide the reminder and notification service</li>
        <li>To authenticate your account</li>
        <li>To send you email and/or SMS notifications based on your preferences</li>
        <li>To improve and develop new features</li>
        <li>To communicate service updates</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        3. Information Sharing
      </h2>
      <p className="text-gray-600 mb-4">
        We do not sell your personal information. We share information only as follows:
      </p>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>
          <strong>With Your Connections:</strong> People you connect with can see your 
          name and profile photo. Events and notes you create may be visible to connections 
          (except private events, which only you can see).
        </li>
        <li>
          <strong>Service Providers:</strong> We use third-party services for email 
          (Resend), SMS (Twilio), image storage (Vercel Blob), and database hosting 
          (Neon). These providers only access data necessary to perform their services.
        </li>
        <li>
          <strong>Legal Requirements:</strong> We may disclose information if required 
          by law or to protect rights and safety.
        </li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        4. Privacy Protections
      </h2>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>
          <strong>Email & Mobile:</strong> Your email and phone number are only visible 
          to you. No other users can see your contact information.
        </li>
        <li>
          <strong>Private Events:</strong> Events you mark as private are only visible 
          to you. No other users can see them or receive reminders about them.
        </li>
        <li>
          <strong>Notes:</strong> Notes you add to profiles are completely private to you.
        </li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        5. Data Security
      </h2>
      <p className="text-gray-600 mb-4">
        We implement appropriate security measures to protect your data, including:
      </p>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>Encrypted data transmission (HTTPS)</li>
        <li>Secure database hosting</li>
        <li>Magic link authentication (no passwords stored)</li>
        <li>Regular security reviews</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        6. Your Rights
      </h2>
      <p className="text-gray-600 mb-4">
        You have the right to:
      </p>
      <ul className="list-disc pl-6 text-gray-600 mb-4 space-y-2">
        <li>Access your personal data</li>
        <li>Update or correct your information</li>
        <li>Delete your account and associated data</li>
        <li>Export your data</li>
        <li>Opt out of notifications</li>
      </ul>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        7. Data Retention
      </h2>
      <p className="text-gray-600 mb-4">
        We retain your data as long as your account is active. When you delete your 
        account, we delete your personal data within 30 days, except where we're 
        required to retain it for legal purposes.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        8. Children's Privacy
      </h2>
      <p className="text-gray-600 mb-4">
        CircleDays is not intended for children under 13. We do not knowingly collect 
        information from children under 13.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        9. International Users
      </h2>
      <p className="text-gray-600 mb-4">
        CircleDays is hosted in the United States. By using our service, you consent 
        to the transfer of your data to the US.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        10. Changes to This Policy
      </h2>
      <p className="text-gray-600 mb-4">
        We may update this policy from time to time. We'll notify you of significant 
        changes via email or in-app notification.
      </p>
      
      <h2 className="text-lg font-semibold text-gray-900 mt-8 mb-4">
        11. Contact Us
      </h2>
      <p className="text-gray-600">
        Questions about privacy? Contact us at{' '}
        <a href="mailto:privacy@circledays.app" className="text-teal-600 hover:underline">
          privacy@circledays.app
        </a>
      </p>
    </div>
  );
}

