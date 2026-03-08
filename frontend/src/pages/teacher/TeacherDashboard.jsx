import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { StatCard, ElectionCard } from "../../components/UI/EnhancedCard";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({ studentCount: 0, activeElections: 0, totalNotices: 0 });
  const [loading, setLoading] = useState(true);
  const [recentElections, setRecentElections] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const userResponse = await authAPI.verifyToken();
        
        if (userResponse.data.assignedClass) {
          const [classResponse, electionsResponse, noticesResponse] = await Promise.all([
            adminAPI.getClass(userResponse.data.assignedClass),
            adminAPI.elections.list(),
            adminAPI.notices.list()
          ]);
          
          // Filter teacher-specific data
          const teacherElections = (electionsResponse.data || []).filter(
            election => election.class === userResponse.data.assignedClass && election.createdBy === userResponse.data._id
          );
          
          const classNotices = (noticesResponse.data || []).filter(
            notice => notice.class === userResponse.data.assignedClass
          );
          
          setStats({
            studentCount: 0, // Would come from API
            activeElections: teacherElections.filter(e => {
              const now = new Date();
              const start = e.startDate ? new Date(e.startDate) : null;
              const end = e.endDate ? new Date(e.endDate) : null;
              return (!start || now >= start) && (!end || now <= end);
            }).length,
            totalNotices: classNotices.length
          });
          
          setRecentElections(teacherElections.slice(0, 3));
        }
      } catch (err) {
        console.error('Dashboard error:', err);
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
      navigate(`/teacher/results/detail?electionId=${election._id}`);
    } else {
      navigate(`/teacher/elections`);
    }
  };

  if (loading) {
    return (
      <AdminMobileShell title="Teacher Dashboard" subtitle="Class Overview">
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
      </AdminMobileShell>
    );
  }

  return (
    <AdminMobileShell title="Teacher Dashboard" subtitle="Class Overview">
      <div className="space-y-4">
        {/* Stats Cards */}
        <div className="grid grid-cols-3 gap-3">
          <StatCard 
            title="Students" 
            value={stats.studentCount} 
            icon="👥" 
            color="blue"
          />
          <StatCard 
            title="Active Elections" 
            value={stats.activeElections} 
            icon="🗳️" 
            color="purple"
          />
          <StatCard 
            title="Notices" 
            value={stats.totalNotices} 
            icon="📢" 
            color="green"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
          <div className="text-sm font-bold text-gray-600 uppercase mb-3">Quick Actions</div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => navigate("/teacher/notices")}
              className="p-3 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📢</span>
              <span className="text-xs font-medium text-gray-700">Notices</span>
            </button>
            <button
              onClick={() => navigate("/teacher/class")}
              className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">🏫</span>
              <span className="text-xs font-medium text-gray-700">Class</span>
            </button>
            <button
              onClick={() => navigate("/teacher/elections")}
              className="p-3 bg-purple-50 hover:bg-purple-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">🗳️</span>
              <span className="text-xs font-medium text-gray-700">Elections</span>
            </button>
            <button
              onClick={() => navigate("/teacher/results")}
              className="p-3 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors text-center"
            >
              <span className="text-2xl block mb-1">📊</span>
              <span className="text-xs font-medium text-gray-700">Results</span>
            </button>
          </div>
        </div>

        {/* Recent Elections */}
        {recentElections.length > 0 && (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-bold text-gray-600 uppercase">Recent Elections</div>
              <button
                onClick={() => navigate("/teacher/elections")}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                View All →
              </button>
            </div>
            <div className="space-y-3">
              {recentElections.map((election) => (
                <ElectionCard
                  key={election._id}
                  election={election}
                  onClick={() => handleElectionClick(election)}
                  status={getElectionStatus(election)}
                />
              ))}
            </div>
          </div>
        )}

        {/* Class Status */}
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-2xl border border-green-200 p-4">
          <div className="text-sm font-bold text-green-800 uppercase mb-2">Class Status</div>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Class Active</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Students Enrolled</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">Elections Ready</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-xs text-gray-700">All Systems Go</span>
            </div>
          </div>
        </div>
      </div>
    </AdminMobileShell>
  );
}
