import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { adminAPI } from "../../services/api";
import AdminMobileShell from "../../components/AdminMobileShell";
import { useToast } from "../../components/UI/Toast";

export default function HODNoticePage() {
  const navigate = useNavigate();
  const { success, error: showError } = useToast();
  const [notices, setNotices] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    message: "",
    targetAudience: "department" // department or class
  });

  useEffect(() => {
    fetchNotices();
  }, []);

  const fetchNotices = async () => {
    try {
      const response = await adminAPI.hod.listNotices();
      setNotices(response.data || []);
    } catch (err) {
      setError(err.response?.data?.error || "Failed to load notices");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.title.trim() || !formData.message.trim()) {
      setError("Title and message are required");
      return;
    }

    try {
      setLoading(true);
      const noticeData = {
        title: formData.title.trim(),
        message: formData.message.trim(),
        targetAudience: formData.targetAudience
      };

      await adminAPI.hod.createNotice(noticeData);
      setFormData({ title: "", message: "", targetAudience: "department" });
      fetchNotices();
      success("Notice created successfully!");
    } catch (err) {
      setError(err.response?.data?.error || "Failed to create notice");
      showError(err.response?.data?.error || "Failed to create notice");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return "";
    return new Date(d).toLocaleDateString();
  };

  return (
    <AdminMobileShell
      title="Department Notices"
      subtitle="Send notices to department students"
      headerColor="bg-gradient-to-r from-green-600 to-teal-700"
    >
      {error && (
        <div className="p-3 bg-red-50 text-red-700 rounded-xl text-sm border border-red-200 mb-4">
          {error}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 mb-4">
        <div className="font-bold text-gray-900 mb-3">Create New Notice</div>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input
            type="text"
            placeholder="Notice Title"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            className="input-base"
            required
          />
          <textarea
            placeholder="Notice Message"
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            className="input-base h-24 resize-none"
            rows={4}
            required
          />
          <select
            value={formData.targetAudience}
            onChange={(e) => setFormData({...formData, targetAudience: e.target.value})}
            className="input-base"
          >
            <option value="department">All Department Students</option>
            <option value="class">Specific Class</option>
          </select>
          <button type="submit" disabled={loading} className="btn-primary w-full">
            {loading ? "Posting..." : "Post Notice"}
          </button>
        </form>
      </div>

      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
        <div className="font-bold text-gray-900 mb-3">Recent Notices</div>
        <div className="space-y-2">
          {notices.length === 0 ? (
            <div className="text-center text-gray-500 py-4">No notices yet</div>
          ) : (
            notices.map((notice) => (
              <div key={notice._id} className="p-3 border rounded-xl">
                <div className="font-semibold text-gray-900">{notice.title}</div>
                <div className="text-sm text-gray-600 mt-1">{notice.message}</div>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs text-gray-500">
                    {formatDate(notice.createdAt)}
                  </span>
                  {notice.targetAudience && (
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                      notice.targetAudience === 'department' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-100 text-blue-700'
                    }`}>
                      {notice.targetAudience === 'department' ? 'Department' : 'Class'}
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Back Button */}
      <div className="mt-4">
        <button
          onClick={() => navigate("/hod/dashboard")}
          className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-gray-700 font-medium hover:bg-gray-100 transition"
        >
          Back to Dashboard
        </button>
      </div>
    </AdminMobileShell>
  );
}
