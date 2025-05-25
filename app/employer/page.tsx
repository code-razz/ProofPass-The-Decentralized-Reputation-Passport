'use client';

import EmployerRegistration from '../components/EmployerRegistration';
import OpportunityManagement from '../components/OpportunityManagement';

export default function EmployerDashboard() {
  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-3xl font-bold text-gray-900">Employer Dashboard</h1>
          <p className="mt-4 text-lg text-gray-600">
            Register your company and manage opportunities
          </p>
        </div>

        <div className="space-y-8">
          <EmployerRegistration />
          <OpportunityManagement />
        </div>
      </div>
    </div>
  );
} 