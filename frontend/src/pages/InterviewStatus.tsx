import { useState } from 'react';
import { Search, Loader, AlertCircle } from 'lucide-react';
import { getInterviewStatus } from '../api/client';

interface InterviewStatusData {
  id: number;
  candidate: string;
  status: string;
  scheduled_start: string;
  scheduled_end: string;
  meet_link: string;
  same_area_aom: string;
  diff_area_aom: string;
  failure_reason: string;
}

export default function InterviewStatus() {
  const [interviewId, setInterviewId] = useState('');
  const [loading, setLoading] = useState(false);
  const [interview, setInterview] = useState<InterviewStatusData | null>(null);
  const [error, setError] = useState('');

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!interviewId) return;

    setLoading(true);
    setError('');
    setInterview(null);

    try {
      const response = await getInterviewStatus(parseInt(interviewId));
      setInterview(response.data);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Interview not found');
    } finally {
      setLoading(false);
    }
  };

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

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Interview Status</h1>

      {/* Search Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-8">
        <form onSubmit={handleSearch} className="flex gap-4">
          <input
            type="number"
            value={interviewId}
            onChange={(e) => setInterviewId(e.target.value)}
            placeholder="Enter interview ID..."
            className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !interviewId}
            className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
          >
            {loading ? (
              <>
                <Loader className="w-5 h-5 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Search className="w-5 h-5" />
                <span>Search</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Error */}
      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-6 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800 text-lg font-medium">{error}</p>
          </div>
        </div>
      )}

      {/* Interview Details */}
      {interview && (
        <div className="bg-white rounded-lg shadow p-8">
          <div className="flex justify-between items-start mb-8">
            <div>
              <h2 className="text-3xl font-bold text-gray-800">{interview.candidate}</h2>
              <p className="text-gray-600 text-sm mt-1">Interview ID: {interview.id}</p>
            </div>
            <span className={`px-6 py-2 rounded-full border-2 font-semibold text-lg ${getStatusColor(interview.status)}`}>
              {interview.status.toUpperCase()}
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-gray-600 font-semibold mb-4">Scheduling Details</h3>
              {interview.scheduled_start && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-600 text-sm">Scheduled Start</p>
                  <p className="text-gray-800 font-medium text-lg">
                    {new Date(interview.scheduled_start).toLocaleString()}
                  </p>
                </div>
              )}
              {interview.scheduled_end && (
                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <p className="text-gray-600 text-sm">Scheduled End</p>
                  <p className="text-gray-800 font-medium text-lg">
                    {new Date(interview.scheduled_end).toLocaleString()}
                  </p>
                </div>
              )}
            </div>

            <div>
              <h3 className="text-gray-600 font-semibold mb-4">Area Operations Managers</h3>
              <div className="bg-gray-50 p-4 rounded-lg mb-4">
                <p className="text-gray-600 text-sm">Same Area</p>
                <p className="text-gray-800 font-medium text-lg">{interview.same_area_aom}</p>
              </div>
              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-gray-600 text-sm">Different Area</p>
                <p className="text-gray-800 font-medium text-lg">{interview.diff_area_aom}</p>
              </div>
            </div>
          </div>

          {interview.meet_link && (
            <div className="mt-8">
              <a
                href={interview.meet_link}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white px-6 py-3 rounded-lg font-bold transition inline-block"
              >
                Join Google Meet →
              </a>
            </div>
          )}

          {interview.failure_reason && (
            <div className="mt-8 bg-red-50 border-2 border-red-300 rounded-lg p-6">
              <h4 className="text-red-800 font-bold mb-2">Failure Reason</h4>
              <p className="text-red-700">{interview.failure_reason}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
