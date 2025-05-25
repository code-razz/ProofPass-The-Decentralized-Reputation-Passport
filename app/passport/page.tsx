'use client';

import ReputationPassport from '../components/ReputationPassport';

export default function PassportPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Reputation Passport</h1>
          <p className="mt-4 text-lg text-gray-600">
            View and manage your certificates and endorsements
          </p>
        </div>

        <ReputationPassport />
      </div>
    </div>
  );
} 