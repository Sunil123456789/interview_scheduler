import { useState, useEffect } from 'react';
import { Clock, CheckCircle, AlertCircle, Loader } from 'lucide-react';
import api from '../api/client';

interface Interview {
  id: number;
  candidate: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  meet_link: string;
  same_area_aom: string;
  diff_area_aom: string;
  failure_reason?: string;
}

export default function Dashboard() {
  const [interviews, setInterviews] = useState<Interview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchInterviews = async () => {
      try {
        // Note: This endpoint needs to be implemented in the Django backend
        // For now, we'll show an empty state with instructions
        setError(null);
        setInterviews([]);
      } catch (err: any) {
        console.error('Failed to fetch interviews:', err);
        setError(err.response?.data?.error || 'Failed to load interviews');
      } finally {
        setLoading(false);
      }
    };

    fetchInterviews();
  }, []);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'scheduled':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'pending':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'failed':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'scheduled':
        return <CheckCircle className="w-5 h-5" />;
      case 'pending':
        return <Clock className="w-5 h-5" />;
      case 'failed':
        return <AlertCircle className="w-5 h-5" />;
      default:
        return <Clock className="w-5 h-5" />;
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8">
        <AlertCircle className="w-8 h-8 text-red-600 mb-2" />
        <p className="text-red-800">{error}</p>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Interviews Dashboard</h1>

      {interviews.length === 0 ? (
        <div className="bg-white rounded-lg shadow p-8 text-center">
          <Clock className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600 text-lg mb-2">No interviews scheduled yet</p>
          <p className="text-gray-500 text-sm">Go to the <strong>Schedule</strong> page to create a new interview</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {interviews.map((interview) => (
            <div key={interview.id} className="bg-white rounded-lg shadow-md hover:shadow-lg transition p-6 border-l-4 border-blue-600">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h2 className="text-2xl font-bold text-gray-800">{interview.candidate}</h2>
                  <p className="text-gray-600 text-sm mt-1">Interview ID: {interview.id}</p>
                </div>
                <div className={`flex items-center space-x-2 px-4 py-2 rounded-full border-2 ${getStatusColor(interview.status)}`}>
                  {getStatusIcon(interview.status)}
                  <span className="font-semibold capitalize">{interview.status}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-4">
                <div>
                  <p className="text-gray-500 text-sm">Scheduled Time</p>
                  <p className="text-gray-800 font-medium">{new Date(interview.scheduled_start).toLocaleString()}</p>
                </div>
                <div>
                  <p className="text-gray-500 text-sm">AOMs</p>
                  <p className="text-gray-800 font-medium">{interview.same_area_aom} & {interview.diff_area_aom}</p>
                </div>
              </div>

              {interview.meet_link && (
                <a
                  href={interview.meet_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-block bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition"
                >
                  Join Meeting
                </a>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
