import { useState } from 'react';
import { Send, Loader, CheckCircle, AlertCircle } from 'lucide-react';
import { scheduleInterview } from '../api/client';

export default function ScheduleInterview() {
  const [candidateId, setCandidateId] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ taskId?: string; error?: string } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!candidateId) return;

    setLoading(true);
    setResult(null);

    try {
      const response = await scheduleInterview(parseInt(candidateId));
      setResult({ taskId: response.data.task_id });
      setCandidateId('');
    } catch (error: any) {
      setResult({ 
        error: error.response?.data?.error || 'Failed to schedule interview' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Schedule Interview</h1>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Form */}
        <div className="bg-white rounded-lg shadow p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-gray-700 font-semibold mb-3">Candidate ID</label>
              <input
                type="number"
                value={candidateId}
                onChange={(e) => setCandidateId(e.target.value)}
                placeholder="Enter candidate ID"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={loading}
              />
              <p className="text-gray-500 text-sm mt-2">The ID of the candidate to schedule an interview for</p>
            </div>

            <button
              type="submit"
              disabled={loading || !candidateId}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-3 px-4 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Scheduling...</span>
                </>
              ) : (
                <>
                  <Send className="w-5 h-5" />
                  <span>Schedule Interview</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Result */}
        <div className="flex items-center justify-center">
          {result?.taskId && (
            <div className="bg-green-50 border-2 border-green-300 rounded-lg p-8 text-center w-full">
              <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-green-800 mb-2">Success!</h2>
              <p className="text-green-700 mb-4">Interview scheduling has been queued</p>
              <div className="bg-white rounded p-4 text-left">
                <p className="text-gray-600 text-sm">Task ID:</p>
                <p className="text-gray-800 font-mono text-xs break-all">{result.taskId}</p>
              </div>
              <p className="text-green-700 text-sm mt-4">
                Check the Status page to monitor the scheduling progress
              </p>
            </div>
          )}

          {result?.error && (
            <div className="bg-red-50 border-2 border-red-300 rounded-lg p-8 text-center w-full">
              <AlertCircle className="w-16 h-16 text-red-600 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-red-800 mb-2">Error</h2>
              <p className="text-red-700">{result.error}</p>
            </div>
          )}

          {!result && (
            <div className="text-center text-gray-500">
              <p className="text-lg">Results will appear here</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
