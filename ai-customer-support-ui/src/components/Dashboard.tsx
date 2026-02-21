import LeftSidebar from './LeftSidebar';
import CenterPanel from './CenterPanel';
import RightSidebar from './RightSidebar';

function Dashboard() {
  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans">
      <div className="flex h-screen overflow-hidden">
        <LeftSidebar />
        <CenterPanel />
        <RightSidebar />
      </div>
    </div>
  );
}

export default Dashboard;
