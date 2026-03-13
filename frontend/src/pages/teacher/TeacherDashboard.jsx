import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { authAPI, teacherAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { StatCard, ElectionCard } from "../../components/UI/EnhancedCard";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [teacherClass, setTeacherClass] = useState(null);
  const [stats, setStats] = useState({ studentCount: 0, activeElections: 0, totalNotices: 0 });
  const [loading, setLoading] = useState(true);
  const [recentElections, setRecentElections] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Get user data first
        const userResponse = await authAPI.verifyToken();
        const userData = userResponse.data.user || userResponse.data;
        console.log("User data fetched:", userData);
        setUser(userData);
        
        // Get teacher dashboard data
        try {
          const dashboardResponse = await teacherAPI.getDashboard();
          console.log("Teacher dashboard data:", dashboardResponse.data);
          
          const { class: classData, students, stats: dashboardStats } = dashboardResponse.data;
          
          if (classData) {
            setTeacherClass(classData);
            setStats({
              studentCount: dashboardStats?.totalStudents || students?.length || 0,
              activeElections: 0,
              totalNotices: 0
            });
          } else {
            setError("No class assigned to this teacher");
          }
        } catch (dashboardError) {
          console.error("Dashboard fetch error:", dashboardError);
          setError("Failed to load class information");
        }
      } catch (err) {
        console.error("Dashboard error:", err);
        setError(err.response?.data?.error || "Failed to load dashboard data");
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const handleClassClick = () => {
    if (teacherClass) {
      navigate(`/teacher/class/${teacherClass._id}`);
    }
  };

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
    <AdminMobileShell title="Teacher Dashboard" subtitle={teacherClass ? `${teacherClass.name} - ${teacherClass.year || ''}` : "Class Overview"}>
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200">
          {error}
        </div>
      )}

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

      {/* Assigned Class Section - Similar to HOD Department Section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="flex justify-between items-center mb-4">
          <div className="font-bold text-gray-900">Assigned Class</div>
          <div className="text-xs font-semibold text-gray-500">{teacherClass ? '1 TOTAL' : '0 TOTAL'}</div>
        </div>
        
        {!teacherClass ? (
          <div className="text-center py-8">
            <div className="text-gray-500 mb-4">
              <div className="text-4xl mb-2">🏫</div>
              <p className="text-lg font-medium">No Class Assigned</p>
              <p className="text-sm">You are not assigned to any class yet.</p>
            </div>
          </div>
        ) : (
          <div 
            className="p-4 border rounded-xl bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
            onClick={handleClassClick}
          >
            <div className="flex justify-between items-center">
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 text-sm">{teacherClass.name}</h3>
                <div className="flex items-center mt-1 space-x-4">
                  <span className="text-xs text-gray-500">
                    ID: {teacherClass._id.slice(-8)}
                  </span>
                  <span className="text-xs text-green-600 font-medium">
                    Active
                  </span>
                  {teacherClass.year && (
                    <span className="text-xs text-blue-600 font-medium">
                      {teacherClass.year}
                    </span>
                  )}
                </div>
                <div className="mt-1">
                  <span className="text-xs text-gray-600">
                    Department: {teacherClass.department?.name || "Loading..."}
                  </span>
                </div>
              </div>
              <div className="flex items-center">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleClassClick();
                  }}
                  className="text-blue-600 hover:text-blue-900 font-medium text-sm"
                >
                  View →
                </button>
              </div>
            </div>
          </div>
        )}
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
            <span className="text-2xl block mb-1">�</span>
            <span className="text-xs font-medium text-gray-700">Results</span>
          </button>
          <button
            onClick={() => navigate("/teacher/students")}
            className="p-3 bg-green-50 hover:bg-green-100 rounded-xl transition-colors text-center"
          >
            <span className="text-2xl block mb-1">�</span>
            <span className="text-xs font-medium text-gray-700">Students</span>
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
    </AdminMobileShell>
  );
}
