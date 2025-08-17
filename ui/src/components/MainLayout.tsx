const { Outlet } = ReactRouterDOM;
import TopNav from './TopNav.tsx';
import Sidebar from './Sidebar.tsx';
import GlobalBanner from './GlobalBanner.tsx';

export default function MainLayout({ onLogout }) {
  return (
    <div className="h-screen flex flex-col">
      <GlobalBanner />
      <TopNav onLogout={onLogout} />
      <div className="flex flex-1 overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-4 bg-white">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
