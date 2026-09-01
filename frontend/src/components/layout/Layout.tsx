import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  LayoutDashboard, Hotel, CalendarCheck, Users, CreditCard,
  Receipt, UserCheck, Banknote, Droplets, BarChart3, BookOpen,
  Settings, LogOut, Bell, ChevronDown, Menu, X, ShieldCheck,
  Building2, FileText
} from 'lucide-react';

const navItems = [
  { label: 'Dashboard', icon: LayoutDashboard, path: '/' },
  { label: 'Rooms', icon: Hotel, path: '/rooms' },
  { label: 'Bookings', icon: CalendarCheck, path: '/bookings' },
  { label: 'Customers', icon: Users, path: '/customers' },
  { label: 'Payments', icon: CreditCard, path: '/payments' },
  {
    label: 'Expenses', icon: Receipt, path: '/expenses',
    children: [
      { label: 'All Expenses', path: '/expenses' },
      { label: 'Employees', path: '/employees' },
      { label: 'Salary', path: '/salary' },
      { label: 'Water Bills', path: '/water-bills' },
    ]
  },
  {
    label: 'Reports', icon: BarChart3, path: '/reports',
    children: [
      { label: 'Dashboard', path: '/reports' },
      { label: 'Monthly Tally', path: '/reports/monthly-tally' },
      { label: 'Revenue', path: '/reports/revenue' },
      { label: 'Occupancy', path: '/reports/occupancy' },
      { label: 'Room Performance', path: '/reports/room-performance' },
    ]
  },
  { label: 'Audit Logs', icon: ShieldCheck, path: '/audit-logs', roles: ['SUPER_ADMIN', 'MANAGER'] },
  { label: 'Users', icon: UserCheck, path: '/users', roles: ['SUPER_ADMIN'] },
  { label: 'Settings', icon: Settings, path: '/settings' },
];

const Sidebar: React.FC<{ open: boolean; onClose: () => void }> = ({ open, onClose }) => {
  const location = useLocation();
  const { user, logout, hasRole } = useAuth();
  const [expandedItem, setExpandedItem] = useState<string | null>(null);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const filteredNav = navItems.filter(item =>
    !item.roles || item.roles.some(r => hasRole(r))
  );

  return (
    <>
      {/* Overlay */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-20 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed top-0 left-0 h-full bg-slate-900 text-white z-30 transition-transform duration-300
        w-64 flex flex-col
        ${open ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-5 border-b border-slate-700">
          <div className="flex items-center gap-3">
            <div className="bg-amber-500 rounded-lg p-2">
              <Building2 className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-sm tracking-wide">GKR</h1>
              <p className="text-xs text-slate-400">RESIDENCY</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto p-3">
          {filteredNav.map((item) => (
            <div key={item.path}>
              {item.children ? (
                <div>
                  <button
                    className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                      isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    onClick={() => setExpandedItem(expandedItem === item.label ? null : item.label)}
                  >
                    <div className="flex items-center gap-3">
                      <item.icon className="w-4 h-4" />
                      {item.label}
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${expandedItem === item.label ? 'rotate-180' : ''}`} />
                  </button>
                  {expandedItem === item.label && (
                    <div className="ml-7 mb-1">
                      {item.children.map(child => (
                        <Link
                          key={child.path}
                          to={child.path}
                          onClick={onClose}
                          className={`block px-3 py-2 rounded-lg text-sm transition-colors mb-0.5 ${
                            location.pathname === child.path
                              ? 'bg-indigo-500 text-white'
                              : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                          }`}
                        >
                          {child.label}
                        </Link>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <Link
                  to={item.path}
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors mb-0.5 ${
                    isActive(item.path) ? 'bg-indigo-600 text-white' : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                </Link>
              )}
            </div>
          ))}
        </nav>

        {/* User info */}
        <div className="p-4 border-t border-slate-700">
          <div className="flex items-center gap-3 mb-3">
            <div className="bg-indigo-600 rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold">
              {user?.name?.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.name}</p>
              <p className="text-xs text-slate-400">{user?.role}</p>
            </div>
          </div>
          <button
            onClick={logout}
            className="w-full flex items-center gap-2 px-3 py-2 text-sm text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </aside>
    </>
  );
};

export const Layout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.startsWith('/rooms')) return 'Rooms';
    if (path.startsWith('/bookings')) return 'Bookings';
    if (path.startsWith('/customers')) return 'Customers';
    if (path.startsWith('/payments')) return 'Payments';
    if (path.startsWith('/expenses')) return 'Expenses';
    if (path.startsWith('/employees')) return 'Employees';
    if (path.startsWith('/salary')) return 'Salary';
    if (path.startsWith('/water-bills')) return 'Water Bills';
    if (path.startsWith('/reports')) return 'Reports';
    if (path.startsWith('/audit-logs')) return 'Audit Logs';
    if (path.startsWith('/users')) return 'Users';
    if (path.startsWith('/settings')) return 'Settings';
    return 'GKR Residency';
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main content */}
      <div className="lg:ml-64">
        {/* Topbar */}
        <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
          <div className="flex items-center justify-between h-16 px-4 lg:px-6">
            <div className="flex items-center gap-3">
              <button
                className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100"
                onClick={() => setSidebarOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>
              <h2 className="font-semibold text-gray-900">{getPageTitle()}</h2>
            </div>
            <div className="flex items-center gap-2">
              <span className="hidden sm:block text-sm text-gray-500">
                {new Date().toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">
          {children}
        </main>
      </div>
    </div>
  );
};

export default Layout;
