import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import StudentMobileShell from "../../components/StudentMobileShell";
import { StatCard, ElectionCard } from "../../components/UI/EnhancedCard";
import { useToast } from "../../components/UI/Toast";
import { studentAPI, noticesAPI } from "../../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [stats, setStats] = useState({ noticeCount: 0, activeElections: 0, votedCount: 0 });
  const [loading, setLoading] = useState(true);
  const [recentElections, setRecentElections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch real student-specific data
        const [noticesRes, electionsRes, studentRes] = await Promise.all([
          noticesAPI.list(),
          studentAPI.elections(),
          studentAPI.me()
        ]);
        
        const student = studentRes.data;
        const elections = electionsRes.data || [];
        const notices = noticesRes.data || [];
        
        // Calculate stats based on real data
        const activeElections = elections.filter(election => {
          const now = new Date();
          const start = election.startDate ? new Date(election.startDate) : null;
          const end = election.endDate ? new Date(election.endDate) : null;
          
          if (start && now < start) return false;
          if (end && now > end) return false;
          return true;
        });
        
        const votedElections = student?.votedElections || [];
        
        setStats({ 
          noticeCount: notices.length,
          activeElections: activeElections.length,
          votedCount: votedElections.length
        });
        
        // Show recent elections (active ones first, then recent)
        const sortedElections = [
          ...activeElections,
          ...elections.filter(e => !activeElections.includes(e))
        ].slice(0, 3);
        
        setRecentElections(sortedElections);
        
      } catch (err) {
        console.error('Dashboard data fetch error:', err);
        // Fallback to mock data if API fails
        setStats({ 
          noticeCount: 5, 
          activeElections: 2, 
          votedCount: 3 
        });
        setRecentElections([
          {
            _id: "1",
            title: "Class Representative Election",
            description: "Vote for your class representative",
            startDate: "2024-03-01",
            endDate: "2024-03-15"
          }
        ]);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const getElectionStatus = (election) => {
    const now = new Date();
    const start = election.startDate ? new Date(election.startDate) : null;
    const end = election.endDate ? new Date(election.endDate) : null;
    
    if (start && now < start) return 'Upcoming';
    if (end && now > end) return 'Closed';
    return 'Active';
  };

  const handleElectionClick = (election) => {
    const status = getElectionStatus(election);
    if (status === 'Active') {
      // Check if student has already voted in this election
      // This will be handled by the election page itself
      navigate(`/student/elections/${election._id}`);
    } else {
      navigate("/student/elections");
    }
  };

  if (loading) {
    return (
      <StudentMobileShell title="Student Dashboard" subtitle="Loading...">
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border-2 border-gray-100 p-4 text-center shadow-sm animate-pulse">
                <div className="h-8 bg-gray-200 rounded w-12 mx-auto mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-16 mx-auto"></div>
              </div>
            ))}
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
                <div className="h-5 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </div>
      </StudentMobileShell>
    );
  }

  return (
    <StudentMobileShell title="Student Dashboard" subtitle="Student Overview">
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            title="Notices" 
            value={stats.noticeCount} 
            icon="📢" 
            color="blue"
          />
          <StatCard 
            title="Active Elections" 
            value={stats.activeElections} 
            icon="🗳️" 
            color="green"
          />
          <StatCard 
            title="Voted" 
            value={stats.votedCount} 
            icon="✅" 
            color="purple"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/student/notices")}
              className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📢</span>
              <span className="text-xs font-medium text-gray-700">Notices</span>
            </button>
            <button
              onClick={() => navigate("/student/elections")}
              className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">🗳️</span>
              <span className="text-xs font-medium text-gray-700">Elections</span>
            </button>
            <button
              onClick={() => navigate("/student/results")}
              className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📊</span>
              <span className="text-xs font-medium text-gray-700">Results</span>
            </button>
            <button
              onClick={() => navigate("/student/profile")}
              className="p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">👤</span>
              <span className="text-xs font-medium text-gray-700">Profile</span>
            </button>
          </div>
        </div>
      </div>
    </StudentMobileShell>
  );
}
