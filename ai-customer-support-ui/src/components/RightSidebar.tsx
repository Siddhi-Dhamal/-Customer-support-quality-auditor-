import { CheckCircle2, Circle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';

const keywords = [
  'Account Access',
  'Authentication',
  'Password Reset',
  'Security',
  'Error Message',
  'Customer Support',
  'Resolution',
  'Login Issue',
];

const actionItems = [
  { id: '1', text: 'Follow up with customer in 24 hours', completed: false },
  { id: '2', text: 'Update account security documentation', completed: true },
  { id: '3', text: 'Log issue in tracking system', completed: true },
  { id: '4', text: 'Send satisfaction survey', completed: false },
];

function RightSidebar() {
  const [summary, setSummary] = useState<string>("Waiting for analysis...");
  const [loading, setLoading] = useState<boolean>(false);

  // Function to fetch the latest summary from final_summaries.csv via the backend
  const fetchSummary = async () => {
    setLoading(true);
    try {
      // Use a timestamp (t=) to prevent the browser from caching old summary results
      const response = await fetch(`http://localhost:8000/get-summary?t=${Date.now()}`);
      if (response.ok) {
        const data = await response.json();
        // Displays the 'summary' column from the latest row in the CSV
        setSummary(data.summary || "No summary found.");
      } else {
        setSummary("Failed to load summary from server.");
      }
    } catch (error) {
      console.error("Error fetching summary:", error);
      setSummary("Connection error. Ensure backend is running.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Initial fetch on component mount
    fetchSummary();

    // Listen for the 'refreshTranscript' event dispatched after a successful upload
    const handleRefresh = () => {
      console.log("New file detected, refreshing summary...");
      fetchSummary();
    };

    window.addEventListener('refreshTranscript', handleRefresh);
    return () => window.removeEventListener('refreshTranscript', handleRefresh);
  }, []);

  return (
    <div className="w-96 bg-slate-800 overflow-y-auto shadow-2xl h-screen border-l border-slate-700 flex flex-col">
      <div className="p-6 space-y-6">
        <h2 className="text-xl font-semibold text-white border-b border-slate-700 pb-4">
          AI Insights
        </h2>

        {/* Dynamic Summary Section */}
        <div className="bg-slate-700 rounded-xl p-5 shadow-lg border border-slate-600 transition-all">
          <h3 className="text-xs font-bold text-slate-400 mb-3 uppercase tracking-widest">
            Executive Summary
          </h3>
          {loading ? (
            <div className="flex items-center gap-3 text-blue-400 py-4">
              <Loader2 className="animate-spin" size={20} />
              <span className="text-sm font-medium">Generating summary...</span>
            </div>
          ) : (
            <p className="text-sm text-slate-100 leading-relaxed italic border-l-2 border-blue-500 pl-4 py-1">
              {summary}
            </p>
          )}
        </div>

        {/* Sentiment Analysis Section */}
        <div className="bg-slate-700 rounded-xl p-5 shadow-lg border border-slate-600">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
            Customer Sentiment
          </h3>
          <div className="flex flex-col items-center">
            <div className="text-5xl mb-3">😊</div>
            <p className="text-2xl font-bold text-emerald-400 mb-2">85% Positive</p>
            <div className="w-full bg-slate-600 rounded-full h-2.5">
              <div
                className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full rounded-full transition-all duration-1000"
                style={{ width: '85%' }}
              />
            </div>
            <div className="flex justify-between w-full mt-2 text-[10px] text-slate-500 font-bold uppercase">
              <span>Negative</span>
              <span>Neutral</span>
              <span>Positive</span>
            </div>
          </div>
        </div>

        {/* Keywords Section */}
        <div className="bg-slate-700 rounded-xl p-5 shadow-lg border border-slate-600">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
            Key Topics
          </h3>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword, index) => (
              <span
                key={index}
                className="bg-blue-500/10 text-blue-300 border border-blue-500/20 px-3 py-1 rounded-md text-xs font-medium"
              >
                {keyword}
              </span>
            ))}
          </div>
        </div>

        {/* Action Items Section */}
        <div className="bg-slate-700 rounded-xl p-5 shadow-lg border border-slate-600">
          <h3 className="text-xs font-bold text-slate-400 mb-4 uppercase tracking-widest">
            Next Steps
          </h3>
          <div className="space-y-4">
            {actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 group">
                {item.completed ? (
                  <CheckCircle2 size={18} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                ) : (
                  <Circle size={18} className="text-slate-500 mt-0.5 flex-shrink-0" />
                )}
                <span className={`text-sm ${item.completed ? 'text-slate-500 line-through' : 'text-slate-200'}`}>
                  {item.text}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default RightSidebar;
