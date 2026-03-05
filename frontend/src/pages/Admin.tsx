import { Fragment, useState, useEffect } from 'react';
import {
  Plus, Loader, AlertCircle, BarChart3, Users, Zap, CheckCircle,
  XCircle, Clock, TrendingUp
} from 'lucide-react';
import {
  getAnalytics, getAreas, createArea, getAOMs, createAOM,
  updateArea, deleteArea,
  updateAOM, deleteAOM,
  getCandidates, createCandidate, updateCandidate, deleteCandidate,
  getUsers, createUser, getGoogleOAuthStartUrl
} from '../api/client';

type Tab = 'analytics' | 'areas' | 'aoms' | 'users' | 'candidates';

interface Analytics {
  summary: {
    total_candidates: number;
    total_areas: number;
    total_aoms: number;
    total_interviews: number;
  };
  interview_stats: {
    scheduled: number;
    failed: number;
    pending: number;
    completed: number;
    success_rate: number;
  };
}

interface Area {
  id: number;
  name: string;
  is_active: boolean;
  aom_count: number;
}

interface AOM {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  area: string | null;
  has_oauth_tokens: boolean;
  is_active: boolean;
}

interface AppUser {
  id: number;
  username: string;
  first_name: string;
  last_name: string;
  email: string;
  role: 'admin' | 'user';
  is_staff: boolean;
  is_active: boolean;
}

interface Candidate {
  id: number;
  name: string;
  email: string;
  area: string | null;
  is_active: boolean;
  applied_at: string;
}

export default function Admin() {
  const [activeTab, setActiveTab] = useState<Tab>('analytics');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics
  const [analytics, setAnalytics] = useState<Analytics | null>(null);

  // Areas
  const [areas, setAreas] = useState<Area[]>([]);
  const [newAreaName, setNewAreaName] = useState('');
  const [addingArea, setAddingArea] = useState(false);
  const [editingAreaId, setEditingAreaId] = useState<number | null>(null);
  const [savingAreaEdit, setSavingAreaEdit] = useState(false);
  const [areaEditName, setAreaEditName] = useState('');

  // AOMs
  const [aoms, setAOMs] = useState<AOM[]>([]);
  const [newAOM, setNewAOM] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    area_id: '',
  });
  const [addingAOM, setAddingAOM] = useState(false);
  const [editingAOMId, setEditingAOMId] = useState<number | null>(null);
  const [savingAOMEdit, setSavingAOMEdit] = useState(false);
  const [connectingAOMId, setConnectingAOMId] = useState<number | null>(null);
  const [aomEditForm, setAOMEditForm] = useState({
    first_name: '',
    last_name: '',
    email: '',
    area_id: '',
  });

  // Users
  const [users, setUsers] = useState<AppUser[]>([]);
  const [newUser, setNewUser] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'user' as 'admin' | 'user',
  });
  const [addingUser, setAddingUser] = useState(false);

  // Candidates
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [newCandidate, setNewCandidate] = useState({
    name: '',
    email: '',
    area_id: '',
  });
  const [addingCandidate, setAddingCandidate] = useState(false);
  const [editingCandidateId, setEditingCandidateId] = useState<number | null>(null);
  const [savingCandidateEdit, setSavingCandidateEdit] = useState(false);
  const [candidateEditForm, setCandidateEditForm] = useState({
    name: '',
    email: '',
    area_id: '',
  });

  // Load data based on active tab
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
        setError(null);

        if (activeTab === 'analytics') {
          const res = await getAnalytics();
          setAnalytics(res.data);
        } else if (activeTab === 'areas') {
          const res = await getAreas();
          setAreas(res.data.areas);
        } else if (activeTab === 'aoms') {
          const [aomsRes, areasRes] = await Promise.all([getAOMs(), getAreas()]);
          setAOMs(aomsRes.data.aoms);
          setAreas(areasRes.data.areas);
        } else if (activeTab === 'users') {
          const usersRes = await getUsers();
          setUsers(usersRes.data.users);
        } else if (activeTab === 'candidates') {
          const [candidatesRes, areasRes] = await Promise.all([getCandidates(), getAreas()]);
          setCandidates(candidatesRes.data.candidates);
          setAreas(areasRes.data.areas);
        }
      } catch (err: any) {
        setError(err.response?.data?.error || `Failed to load ${activeTab}`);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [activeTab]);

  const handleAddArea = async () => {
    if (!newAreaName.trim()) return;
    try {
      setAddingArea(true);
      await createArea(newAreaName);
      setNewAreaName('');
      // Reload areas
      const res = await getAreas();
      setAreas(res.data.areas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create area');
    } finally {
      setAddingArea(false);
    }
  };

  const handleStartEditArea = (area: Area) => {
    setEditingAreaId(area.id);
    setAreaEditName(area.name);
  };

  const handleSaveEditArea = async (areaId: number) => {
    if (!areaEditName.trim()) return;
    try {
      setSavingAreaEdit(true);
      await updateArea(areaId, { name: areaEditName.trim() });
      setEditingAreaId(null);
      const res = await getAreas();
      setAreas(res.data.areas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update area');
    } finally {
      setSavingAreaEdit(false);
    }
  };

  const handleToggleArea = async (area: Area) => {
    try {
      await updateArea(area.id, { is_active: !area.is_active });
      const res = await getAreas();
      setAreas(res.data.areas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update area status');
    }
  };

  const handleDeleteArea = async (area: Area) => {
    if (!window.confirm(`Delete area ${area.name}?`)) return;
    try {
      await deleteArea(area.id);
      const res = await getAreas();
      setAreas(res.data.areas);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete area');
    }
  };

  const handleAddAOM = async () => {
    if (!newAOM.username || !newAOM.email || !newAOM.password) return;
    try {
      setAddingAOM(true);
      await createAOM({
        ...newAOM,
        area_id: newAOM.area_id ? parseInt(newAOM.area_id) : undefined,
      });
      setNewAOM({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        area_id: '',
      });
      // Reload AOMs
      const res = await getAOMs();
      setAOMs(res.data.aoms);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create AOM');
    } finally {
      setAddingAOM(false);
    }
  };

  const handleAddUser = async () => {
    if (!newUser.username || !newUser.email || !newUser.password) return;
    try {
      setAddingUser(true);
      await createUser({ ...newUser });
      setNewUser({
        username: '',
        first_name: '',
        last_name: '',
        email: '',
        password: '',
        role: 'user',
      });
      const usersRes = await getUsers();
      setUsers(usersRes.data.users);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create user');
    } finally {
      setAddingUser(false);
    }
  };

  const handleAddCandidate = async () => {
    if (!newCandidate.name || !newCandidate.email) return;
    try {
      setAddingCandidate(true);
      await createCandidate({
        name: newCandidate.name,
        email: newCandidate.email,
        area_id: newCandidate.area_id ? parseInt(newCandidate.area_id) : undefined,
      });
      setNewCandidate({
        name: '',
        email: '',
        area_id: '',
      });
      // Reload candidates
      const res = await getCandidates();
      setCandidates(res.data.candidates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to create candidate');
    } finally {
      setAddingCandidate(false);
    }
  };

  const handleStartEditAOM = (aom: AOM) => {
    const matchedArea = areas.find((area) => area.name === aom.area);
    setEditingAOMId(aom.id);
    setAOMEditForm({
      first_name: aom.first_name,
      last_name: aom.last_name,
      email: aom.email,
      area_id: matchedArea ? String(matchedArea.id) : '',
    });
  };

  const handleSaveEditAOM = async (aomId: number) => {
    try {
      setSavingAOMEdit(true);
      await updateAOM(aomId, {
        first_name: aomEditForm.first_name,
        last_name: aomEditForm.last_name,
        email: aomEditForm.email,
        area_id: aomEditForm.area_id ? parseInt(aomEditForm.area_id) : null,
      });
      setEditingAOMId(null);
      const res = await getAOMs();
      setAOMs(res.data.aoms);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update AOM');
    } finally {
      setSavingAOMEdit(false);
    }
  };

  const handleToggleAOM = async (aom: AOM) => {
    try {
      await updateAOM(aom.id, { is_active: !aom.is_active });
      const res = await getAOMs();
      setAOMs(res.data.aoms);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update AOM status');
    }
  };

  const handleDeleteAOM = async (aom: AOM) => {
    if (!window.confirm(`Delete AOM ${aom.username}?`)) return;
    try {
      await deleteAOM(aom.id);
      const res = await getAOMs();
      setAOMs(res.data.aoms);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete AOM');
    }
  };

  const handleConnectAOMCalendar = async (aom: AOM) => {
    try {
      setConnectingAOMId(aom.id);
      const response = await getGoogleOAuthStartUrl(aom.id);
      const authUrl = response.data?.auth_url;
      if (!authUrl) {
        setError('Unable to start Google OAuth flow');
        return;
      }
      window.open(authUrl, '_blank', 'noopener,noreferrer');
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to start Google OAuth flow');
    } finally {
      setConnectingAOMId(null);
    }
  };

  const handleStartEditCandidate = (candidate: Candidate) => {
    const matchedArea = areas.find((area) => area.name === candidate.area);
    setEditingCandidateId(candidate.id);
    setCandidateEditForm({
      name: candidate.name,
      email: candidate.email,
      area_id: matchedArea ? String(matchedArea.id) : '',
    });
  };

  const handleSaveEditCandidate = async (candidateId: number) => {
    try {
      setSavingCandidateEdit(true);
      await updateCandidate(candidateId, {
        name: candidateEditForm.name,
        email: candidateEditForm.email,
        area_id: candidateEditForm.area_id ? parseInt(candidateEditForm.area_id) : null,
      });
      setEditingCandidateId(null);
      const res = await getCandidates();
      setCandidates(res.data.candidates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update candidate');
    } finally {
      setSavingCandidateEdit(false);
    }
  };

  const handleToggleCandidate = async (candidate: Candidate) => {
    try {
      await updateCandidate(candidate.id, { is_active: !candidate.is_active });
      const res = await getCandidates();
      setCandidates(res.data.candidates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to update candidate status');
    }
  };

  const handleDeleteCandidate = async (candidate: Candidate) => {
    if (!window.confirm(`Delete candidate ${candidate.name}?`)) return;
    try {
      await deleteCandidate(candidate.id);
      const res = await getCandidates();
      setCandidates(res.data.candidates);
    } catch (err: any) {
      setError(err.response?.data?.error || 'Failed to delete candidate');
    }
  };

  const StatCard = ({ icon: Icon, label, value, color }: any) => (
    <div className={`bg-white rounded-lg shadow p-6 border-l-4 ${color}`}>
      <div className="flex items-start justify-between">
        <div>
          <p className="text-gray-600 text-sm mb-1">{label}</p>
          <p className="text-3xl font-bold text-gray-800">{value}</p>
        </div>
        <Icon className={`w-8 h-8 ${color.replace('border', 'text')}`} />
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader className="w-12 h-12 text-blue-600 animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-4xl font-bold text-gray-800 mb-8">Admin Dashboard</h1>

      {error && (
        <div className="bg-red-50 border-2 border-red-300 rounded-lg p-4 mb-8">
          <div className="flex items-start space-x-3">
            <AlertCircle className="w-6 h-6 text-red-600 flex-shrink-0 mt-0.5" />
            <p className="text-red-800">{error}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex space-x-4 mb-8 border-b-2 border-gray-200">
        {[
          { id: 'analytics', label: 'Analytics', icon: BarChart3 },
          { id: 'areas', label: 'Areas', icon: Zap },
          { id: 'aoms', label: 'AOMs', icon: Users },
          { id: 'candidates', label: 'Candidates', icon: Users },
        ].map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id as Tab)}
            className={`flex items-center space-x-2 px-4 py-3 font-semibold transition ${
              activeTab === id
                ? 'text-blue-600 border-b-4 border-blue-600'
                : 'text-gray-600 hover:text-gray-800'
            }`}
          >
            <Icon className="w-5 h-5" />
            <span>{label}</span>
          </button>
        ))}
      </div>

      {/* Analytics Tab */}
      {activeTab === 'analytics' && analytics && (
        <div className="space-y-8">
          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Overview</h2>
            <div className="grid md:grid-cols-4 gap-6">
              <StatCard
                icon={Users}
                label="Total Candidates"
                value={analytics.summary.total_candidates}
                color="border-blue-500 text-blue-500"
              />
              <StatCard
                icon={Zap}
                label="Areas"
                value={analytics.summary.total_areas}
                color="border-purple-500 text-purple-500"
              />
              <StatCard
                icon={Users}
                label="AOMs"
                value={analytics.summary.total_aoms}
                color="border-green-500 text-green-500"
              />
              <StatCard
                icon={TrendingUp}
                label="Total Interviews"
                value={analytics.summary.total_interviews}
                color="border-orange-500 text-orange-500"
              />
            </div>
          </div>

          <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-4">Interview Statistics</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-white rounded-lg shadow p-6">
                <div className="space-y-4">
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <span className="text-gray-700 font-semibold">Scheduled</span>
                    </div>
                    <span className="text-2xl font-bold text-green-600">
                      {analytics.interview_stats.scheduled}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <XCircle className="w-6 h-6 text-red-600" />
                      <span className="text-gray-700 font-semibold">Failed</span>
                    </div>
                    <span className="text-2xl font-bold text-red-600">
                      {analytics.interview_stats.failed}
                    </span>
                  </div>
                  <div className="flex justify-between items-center pb-4 border-b">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-yellow-600" />
                      <span className="text-gray-700 font-semibold">Pending</span>
                    </div>
                    <span className="text-2xl font-bold text-yellow-600">
                      {analytics.interview_stats.pending}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-blue-600" />
                      <span className="text-gray-700 font-semibold">Completed</span>
                    </div>
                    <span className="text-2xl font-bold text-blue-600">
                      {analytics.interview_stats.completed}
                    </span>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-lg shadow p-8 text-center">
                <TrendingUp className="w-16 h-16 text-green-600 mx-auto mb-4" />
                <p className="text-gray-600 text-sm mb-2">Success Rate</p>
                <p className="text-5xl font-bold text-green-600">
                  {analytics.interview_stats.success_rate}%
                </p>
                <p className="text-gray-600 text-xs mt-4">
                  {analytics.interview_stats.scheduled} out of{' '}
                  {analytics.summary.total_interviews} interviews scheduled
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Areas Tab */}
      {activeTab === 'areas' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Area</h2>
            <div className="flex gap-3">
              <input
                type="text"
                value={newAreaName}
                onChange={(e) => setNewAreaName(e.target.value)}
                placeholder="Enter area name (e.g., New York)"
                className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingArea}
              />
              <button
                onClick={handleAddArea}
                disabled={addingArea || !newAreaName.trim()}
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
              >
                {addingArea ? (
                  <>
                    <Loader className="w-5 h-5 animate-spin" />
                    <span>Adding...</span>
                  </>
                ) : (
                  <>
                    <Plus className="w-5 h-5" />
                    <span>Add Area</span>
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="grid gap-4">
            {areas.map((area) => (
              <div key={area.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-purple-600">
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">{area.name}</h3>
                    <p className="text-gray-600 text-sm mt-1">{area.aom_count} AOMs assigned</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`px-3 py-1 rounded-full text-xs font-semibold ${area.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {area.is_active ? 'Active' : 'Disabled'}
                    </span>
                    <button
                      onClick={() => handleStartEditArea(area)}
                      className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-semibold"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleToggleArea(area)}
                      className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 text-sm font-semibold"
                    >
                      {area.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => handleDeleteArea(area)}
                      className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm font-semibold"
                    >
                      Delete
                    </button>
                  </div>
                </div>

                {editingAreaId === area.id && (
                  <div className="mt-4 border-t pt-4 flex flex-col md:flex-row gap-3 md:items-center">
                    <input
                      type="text"
                      value={areaEditName}
                      onChange={(e) => setAreaEditName(e.target.value)}
                      className="flex-1 px-3 py-2 border rounded"
                      placeholder="Area name"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleSaveEditArea(area.id)}
                        disabled={savingAreaEdit || !areaEditName.trim()}
                        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                      >
                        {savingAreaEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingAreaId(null)}
                        className="px-4 py-2 rounded bg-gray-200 text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* AOMs Tab */}
      {activeTab === 'aoms' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add Core AOM</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Username"
                value={newAOM.username}
                onChange={(e) => setNewAOM({ ...newAOM, username: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              />
              <input
                type="email"
                placeholder="Email"
                value={newAOM.email}
                onChange={(e) => setNewAOM({ ...newAOM, email: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              />
              <input
                type="text"
                placeholder="First Name"
                value={newAOM.first_name}
                onChange={(e) => setNewAOM({ ...newAOM, first_name: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newAOM.last_name}
                onChange={(e) => setNewAOM({ ...newAOM, last_name: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              />
              <input
                type="password"
                placeholder="Password"
                value={newAOM.password}
                onChange={(e) => setNewAOM({ ...newAOM, password: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              />
              <select
                value={newAOM.area_id}
                onChange={(e) => setNewAOM({ ...newAOM, area_id: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingAOM}
              >
                <option value="">Select Area (optional)</option>
                {areas.filter((area) => area.is_active).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddAOM}
              disabled={addingAOM || !newAOM.username || !newAOM.email || !newAOM.password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {addingAOM ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Create AOM</span>
                </>
              )}
            </button>
          </div>

          <div className="grid gap-4">
            {aoms.map((aom) => (
              <div key={aom.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-green-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {aom.first_name} {aom.last_name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">@{aom.username}</p>
                    <p className="text-gray-600 text-sm">{aom.email}</p>
                    {aom.area && <p className="text-gray-600 text-sm mt-2">{aom.area}</p>}
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${aom.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {aom.is_active ? 'Active' : 'Disabled'}
                    </span>
                    {aom.has_oauth_tokens ? (
                      <span className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
                        OAuth Connected
                      </span>
                    ) : (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
                        OAuth Pending
                      </span>
                    )}
                    <div className="flex gap-2 mt-2">
                      <button
                        onClick={() => handleConnectAOMCalendar(aom)}
                        disabled={connectingAOMId === aom.id}
                        className="px-3 py-1 rounded bg-indigo-100 text-indigo-700 text-sm font-semibold disabled:opacity-50"
                      >
                        {connectingAOMId === aom.id ? 'Connecting...' : 'Connect Calendar'}
                      </button>
                      <button
                        onClick={() => handleStartEditAOM(aom)}
                        className="px-3 py-1 rounded bg-blue-100 text-blue-700 text-sm font-semibold"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleAOM(aom)}
                        className="px-3 py-1 rounded bg-yellow-100 text-yellow-700 text-sm font-semibold"
                      >
                        {aom.is_active ? 'Disable' : 'Enable'}
                      </button>
                      <button
                        onClick={() => handleDeleteAOM(aom)}
                        className="px-3 py-1 rounded bg-red-100 text-red-700 text-sm font-semibold"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>

                {editingAOMId === aom.id && (
                  <div className="mt-4 border-t pt-4 grid md:grid-cols-2 gap-3">
                    <input
                      type="text"
                      value={aomEditForm.first_name}
                      onChange={(e) => setAOMEditForm({ ...aomEditForm, first_name: e.target.value })}
                      placeholder="First Name"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="text"
                      value={aomEditForm.last_name}
                      onChange={(e) => setAOMEditForm({ ...aomEditForm, last_name: e.target.value })}
                      placeholder="Last Name"
                      className="px-3 py-2 border rounded"
                    />
                    <input
                      type="email"
                      value={aomEditForm.email}
                      onChange={(e) => setAOMEditForm({ ...aomEditForm, email: e.target.value })}
                      placeholder="Email"
                      className="px-3 py-2 border rounded"
                    />
                    <select
                      value={aomEditForm.area_id}
                      onChange={(e) => setAOMEditForm({ ...aomEditForm, area_id: e.target.value })}
                      className="px-3 py-2 border rounded"
                    >
                      <option value="">No area</option>
                      {areas.map((area) => (
                        <option key={area.id} value={area.id}>{area.name}</option>
                      ))}
                    </select>
                    <div className="flex gap-2 md:col-span-2">
                      <button
                        onClick={() => handleSaveEditAOM(aom.id)}
                        disabled={savingAOMEdit}
                        className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                      >
                        {savingAOMEdit ? 'Saving...' : 'Save'}
                      </button>
                      <button
                        onClick={() => setEditingAOMId(null)}
                        className="px-4 py-2 rounded bg-gray-200 text-gray-800"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Tab */}
      {activeTab === 'users' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add App User (HR/Admin)</h2>
            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <input
                type="text"
                placeholder="Username"
                value={newUser.username}
                onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              />
              <input
                type="email"
                placeholder="Email"
                value={newUser.email}
                onChange={(e) => setNewUser({ ...newUser, email: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              />
              <input
                type="text"
                placeholder="First Name"
                value={newUser.first_name}
                onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              />
              <input
                type="text"
                placeholder="Last Name"
                value={newUser.last_name}
                onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              />
              <input
                type="password"
                placeholder="Password"
                value={newUser.password}
                onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              />
              <select
                value={newUser.role}
                onChange={(e) => setNewUser({ ...newUser, role: e.target.value as 'admin' | 'user' })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingUser}
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
            <button
              onClick={handleAddUser}
              disabled={addingUser || !newUser.username || !newUser.email || !newUser.password}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {addingUser ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Creating...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Create User</span>
                </>
              )}
            </button>
          </div>

          <div className="grid gap-4">
            {users.map((user) => (
              <div key={user.id} className="bg-white rounded-lg shadow p-6 border-l-4 border-blue-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-lg font-bold text-gray-800">
                      {user.first_name} {user.last_name}
                    </h3>
                    <p className="text-gray-600 text-sm mt-1">@{user.username}</p>
                    <p className="text-gray-600 text-sm">{user.email}</p>
                  </div>
                  <div className="flex gap-2">
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${user.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                      {user.role === 'admin' ? 'Admin' : 'User'}
                    </span>
                    <span className={`px-3 py-1 rounded-full text-sm font-semibold ${user.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                      {user.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Candidates Tab */}
      {activeTab === 'candidates' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow p-6">
            <h2 className="text-xl font-bold text-gray-800 mb-4">Add New Candidate</h2>
            <div className="grid md:grid-cols-3 gap-4 mb-4">
              <input
                type="text"
                placeholder="Full Name"
                value={newCandidate.name}
                onChange={(e) => setNewCandidate({ ...newCandidate, name: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingCandidate}
              />
              <input
                type="email"
                placeholder="Email"
                value={newCandidate.email}
                onChange={(e) => setNewCandidate({ ...newCandidate, email: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingCandidate}
              />
              <select
                value={newCandidate.area_id}
                onChange={(e) => setNewCandidate({ ...newCandidate, area_id: e.target.value })}
                className="px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none"
                disabled={addingCandidate}
              >
                <option value="">Select Area (optional)</option>
                {areas.filter((area) => area.is_active).map((area) => (
                  <option key={area.id} value={area.id}>
                    {area.name}
                  </option>
                ))}
              </select>
            </div>
            <button
              onClick={handleAddCandidate}
              disabled={addingCandidate || !newCandidate.name || !newCandidate.email}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {addingCandidate ? (
                <>
                  <Loader className="w-5 h-5 animate-spin" />
                  <span>Adding...</span>
                </>
              ) : (
                <>
                  <Plus className="w-5 h-5" />
                  <span>Add Candidate</span>
                </>
              )}
            </button>
          </div>

          <div className="bg-white rounded-lg shadow overflow-hidden">
            <table className="w-full">
              <thead className="bg-gray-100">
                <tr>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Name</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Email</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Area</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Applied</th>
                  <th className="px-6 py-4 text-left text-sm font-bold text-gray-800">Actions</th>
                </tr>
              </thead>
              <tbody>
                {candidates.map((candidate) => (
                  <Fragment key={candidate.id}>
                    <tr className="border-t hover:bg-gray-50 transition">
                      <td className="px-6 py-4 text-gray-800 font-semibold">{candidate.name}</td>
                      <td className="px-6 py-4 text-gray-600">{candidate.email}</td>
                      <td className="px-6 py-4 text-gray-600">{candidate.area || '—'}</td>
                      <td className="px-6 py-4 text-gray-600">
                        <span className={`px-2 py-1 rounded-full text-xs font-semibold ${candidate.is_active ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                          {candidate.is_active ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {new Date(candidate.applied_at).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleStartEditCandidate(candidate)}
                            className="px-2 py-1 rounded bg-blue-100 text-blue-700 text-xs font-semibold"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleToggleCandidate(candidate)}
                            className="px-2 py-1 rounded bg-yellow-100 text-yellow-700 text-xs font-semibold"
                          >
                            {candidate.is_active ? 'Disable' : 'Enable'}
                          </button>
                          <button
                            onClick={() => handleDeleteCandidate(candidate)}
                            className="px-2 py-1 rounded bg-red-100 text-red-700 text-xs font-semibold"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>

                    {editingCandidateId === candidate.id && (
                      <tr className="border-t bg-blue-50/40">
                        <td className="px-6 py-4" colSpan={6}>
                          <div className="grid md:grid-cols-3 gap-3">
                            <input
                              type="text"
                              value={candidateEditForm.name}
                              onChange={(e) => setCandidateEditForm({ ...candidateEditForm, name: e.target.value })}
                              placeholder="Name"
                              className="px-3 py-2 border rounded"
                            />
                            <input
                              type="email"
                              value={candidateEditForm.email}
                              onChange={(e) => setCandidateEditForm({ ...candidateEditForm, email: e.target.value })}
                              placeholder="Email"
                              className="px-3 py-2 border rounded"
                            />
                            <select
                              value={candidateEditForm.area_id}
                              onChange={(e) => setCandidateEditForm({ ...candidateEditForm, area_id: e.target.value })}
                              className="px-3 py-2 border rounded"
                            >
                              <option value="">No area</option>
                              {areas.map((area) => (
                                <option key={area.id} value={area.id}>{area.name}</option>
                              ))}
                            </select>
                            <div className="flex gap-2 md:col-span-3">
                              <button
                                onClick={() => handleSaveEditCandidate(candidate.id)}
                                disabled={savingCandidateEdit}
                                className="px-4 py-2 rounded bg-blue-600 text-white disabled:opacity-50"
                              >
                                {savingCandidateEdit ? 'Saving...' : 'Save'}
                              </button>
                              <button
                                onClick={() => setEditingCandidateId(null)}
                                className="px-4 py-2 rounded bg-gray-200 text-gray-800"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
