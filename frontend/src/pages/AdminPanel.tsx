import { Users, LayoutDashboard } from 'lucide-react';

export default function AdminPanel() {
  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Admin Panel</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Areas Management */}
        <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-blue-100 p-4 rounded-lg">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Manage Areas</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Create and manage geographical or organizational areas for your team.
          </p>
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition w-full">
            Go to Areas Management
          </button>
        </div>

        {/* AOMs Management */}
        <div className="bg-white rounded-lg shadow-lg p-8 hover:shadow-xl transition">
          <div className="flex items-center space-x-4 mb-6">
            <div className="bg-green-100 p-4 rounded-lg">
              <Users className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">Manage AOMs</h2>
          </div>
          <p className="text-gray-600 mb-6">
            Add Area Operations Managers and configure their Google Calendar credentials.
          </p>
          <button className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-medium transition w-full">
            Go to AOMs Management
          </button>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-8 bg-blue-50 border-2 border-blue-300 rounded-lg p-8">
        <h3 className="text-xl font-bold text-blue-900 mb-4">Admin Features Coming Soon</h3>
        <ul className="text-blue-800 space-y-2">
          <li>✓ View all areas and AOMs</li>
          <li>✓ Create new areas</li>
          <li>✓ Add Area Operations Managers</li>
          <li>✓ Manage Google Calendar OAuth credentials</li>
          <li>✓ View scheduling analytics</li>
        </ul>
      </div>
    </div>
  );
}
