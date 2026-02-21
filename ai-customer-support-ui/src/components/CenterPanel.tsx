import { Play, Search, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';

// Define the shape of our message data
interface Message {
  speaker: string;
  text: string;
  time: string;
}

function CenterPanel() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");

  // 1. Function to fetch the latest transcript from the backend
  const fetchTranscript = async () => {
    setLoading(true);
    try {
      // We add a timestamp query (?t=...) to prevent the browser from showing cached old data
      const response = await fetch(`http://localhost:8000/get-transcript?t=${Date.now()}`);
      const data = await response.json();
      
      if (data && data.length > 0) {
        const formattedMessages = data.map((item: any) => ({
          speaker: item.speaker || 'UNKNOWN',
          text: item.text || item.transcription || '',
          // Convert seconds to MM:SS format
          time: item.start ? new Date(item.start * 1000).toISOString().substr(14, 5) : '00:00'
        }));
        setMessages(formattedMessages);
      } else {
        setMessages([]);
      }
    } catch (error) {
      console.error("Fetch error:", error);
    } finally {
      setLoading(false);
    }
  };

  // 2. Lifecycle management: Fetch on load and listen for updates
  useEffect(() => {
    fetchTranscript();

    const handleRefresh = () => {
      console.log("New file detected. Refreshing transcript...");
      fetchTranscript();
    };

    // Listen for the custom event sent by LeftSidebar.tsx
    window.addEventListener('refreshTranscript', handleRefresh);
    return () => window.removeEventListener('refreshTranscript', handleRefresh);
  }, []);

  // 3. Filter logic for the search bar
  const filteredMessages = messages.filter(msg => 
    msg.text.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="flex-1 bg-gray-50 flex flex-col h-screen overflow-hidden">
      {/* Header Section */}
      <div className="bg-white border-b border-gray-200 p-6 shadow-sm">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">Transcript</h2>

        {/* Audio Player UI */}
        <div className="bg-slate-800 rounded-lg p-4 mb-4">
          <div className="flex items-center gap-4 mb-3">
            <button className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-full transition-colors">
              <Play size={20} fill="white" />
            </button>
            <div className="flex-1 bg-slate-700 h-12 rounded-lg relative overflow-hidden flex items-center px-4">
               <div className="w-full bg-slate-600 h-1 rounded-full overflow-hidden">
                  <div className="bg-blue-500 h-full w-1/3"></div>
               </div>
            </div>
            <span className="text-white text-sm font-mono">Real-time Audio</span>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search transcript..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800"
          />
        </div>
      </div>

      {/* Transcript List Section */}
      <div className="flex-1 overflow-y-auto p-6 space-y-4">
        {loading ? (
          <div className="flex flex-col items-center justify-center h-full text-gray-400">
            <Loader2 className="animate-spin mb-2" size={32} />
            <p className="animate-pulse">AI is processing audio...</p>
          </div>
        ) : messages.length > 0 ? (
          filteredMessages.map((message, index) => (
            <div
              key={index}
              className={`flex ${message.speaker.includes('00') ? 'justify-start' : 'justify-end'}`}
            >
              <div className="max-w-2xl">
                <div className={`flex items-center gap-2 mb-1 ${message.speaker.includes('00') ? 'flex-row' : 'flex-row-reverse'}`}>
                  <span className={`text-xs font-bold ${message.speaker.includes('00') ? 'text-blue-600' : 'text-gray-600'}`}>
                    {message.speaker.includes('00') ? 'Speaker 00 (Agent)' : 'Speaker 01 (Customer)'}
                  </span>
                  <span className="text-xs text-gray-400">{message.time}</span>
                </div>
                <div
                  className={`rounded-2xl px-4 py-3 shadow-sm ${
                    message.speaker.includes('00')
                      ? 'bg-blue-600 text-white rounded-tl-sm'
                      : 'bg-gray-200 text-gray-800 rounded-tr-sm'
                  }`}
                >
                  <p className="text-sm leading-relaxed">{message.text}</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-gray-400 border-2 border-dashed border-gray-200 rounded-2xl">
            <p className="text-lg font-medium">No active transcription</p>
            <p className="text-sm text-gray-300">Upload a call file from the sidebar to begin.</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default CenterPanel;