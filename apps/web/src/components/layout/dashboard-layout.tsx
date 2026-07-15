'use client';

import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuthStore } from '@/stores/auth';
import { useWorkspaceStore } from '@/stores/workspace';
import { api } from '@/lib/api';
import { cn } from '@/lib/utils';
import { LogoMark } from '@/components/ui/logo-mark';
import {
  Bot,
  ChevronDown,
  FileText,
  GitBranch,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  X,
} from 'lucide-react';

interface Workspace {
  id: string;
  name: string;
}

const navigation = [
  {
    name: 'Dashboard',
    href: '/dashboard',
    Icon: LayoutDashboard,
  },
  {
    name: 'Agents',
    href: '/agents',
    Icon: Bot,
  },
  {
    name: 'Documents',
    href: '/documents',
    Icon: FileText,
  },
  {
    name: 'Workflows',
    href: '/workflows',
    Icon: GitBranch,
  },
  {
    name: 'Settings',
    href: '/settings',
    Icon: Settings,
  },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, token, logout } = useAuthStore();
  const { workspaceId, workspaceName, setWorkspace } = useWorkspaceStore();
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const fetchWorkspaces = async () => {
      try {
        const data = await api.get<Workspace[]>('/api/workspaces', token || undefined);
        setWorkspaces(data);
        if (data.length > 0) {
          const storedWorkspaceExists = data.some(ws => ws.id === workspaceId);
          if (!workspaceId || !storedWorkspaceExists) {
            setWorkspace(data[0].id, data[0].name);
          }
        }
      } catch (err) {
        console.error('Failed to fetch workspaces:', err);
      }
    };

    if (token) {
      fetchWorkspaces();
    }
  }, [token]);

  useEffect(() => {
    setSidebarOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="min-h-screen" style={{ background: 'var(--surface-page)' }}>
      {/* Mobile top bar */}
      <div
        className="sticky top-0 z-40 flex h-16 items-center justify-between px-4 lg:hidden"
        style={{
          background: 'var(--surface-overlay)',
          borderBottom: '1px solid var(--border-default)',
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="flex items-center gap-3">
          <LogoMark className="w-9 h-9" iconClassName="w-5 h-5" />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>AgentLab</p>
            <p className="text-xs truncate max-w-[180px]" style={{ color: 'var(--text-muted)' }}>{workspaceName || 'Workspace'}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setSidebarOpen(true)}
          className="btn btn-ghost btn-icon btn-sm"
          aria-label="Open navigation"
        >
          <Menu className="w-5 h-5" strokeWidth={1.8} />
        </button>
      </div>

      {sidebarOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          className="fixed inset-0 z-40 bg-black/30 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        )}
        style={{
          width: '256px',
          background: 'var(--surface-sidebar)',
          borderRight: '1px solid var(--border-default)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Logo */}
        <div className="px-5 py-5" style={{ borderBottom: '1px solid var(--border-default)' }}>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <LogoMark className="w-9 h-9 flex-shrink-0" iconClassName="w-5 h-5" />
              <div className="min-w-0">
                <h1 className="text-base font-semibold truncate" style={{ color: 'var(--text-primary)' }}>AgentLab</h1>
                <p className="text-xs font-medium uppercase tracking-widest" style={{ color: 'var(--text-muted)', fontSize: '10px' }}>Orchestration</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarOpen(false)}
              className="btn btn-ghost btn-icon btn-sm lg:hidden"
              aria-label="Close navigation"
            >
              <X className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </div>

          {/* Workspace Switcher */}
          {workspaceId && (
            <div className="mt-4 relative" ref={dropdownRef}>
              <button
                onClick={() => setShowDropdown(!showDropdown)}
                className="w-full flex items-center justify-between text-left"
                style={{
                  padding: '8px 12px',
                  background: 'var(--surface-inset)',
                  borderRadius: 'var(--radius)',
                  border: '1px solid var(--border-subtle)',
                  fontSize: '14px',
                  color: 'var(--text-secondary)',
                  transition: 'all var(--transition-fast)',
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="rounded-full"
                    style={{
                      width: '8px',
                      height: '8px',
                      background: 'var(--brand-primary)',
                    }}
                  />
                  <span className="truncate">{workspaceName || 'Select workspace'}</span>
                </div>
                <ChevronDown
                  className={cn("w-4 h-4 transition-transform duration-200", showDropdown && "rotate-180")}
                  style={{ color: 'var(--text-muted)' }}
                  strokeWidth={1.8}
                />
              </button>
              {showDropdown && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 max-h-60 overflow-auto py-1"
                  style={{
                    background: 'var(--surface-card)',
                    border: '1px solid var(--border-default)',
                    borderRadius: 'var(--radius)',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 'var(--z-dropdown)',
                    animation: 'slideDown 200ms ease-out',
                  }}
                >
                  {workspaces.map((ws) => (
                    <button
                      key={ws.id}
                      onClick={() => {
                        setWorkspace(ws.id, ws.name);
                        setShowDropdown(false);
                      }}
                      className="w-full text-left transition-all duration-150"
                      style={{
                        padding: '10px 14px',
                        fontSize: '14px',
                        color: ws.id === workspaceId ? 'var(--brand-primary)' : 'var(--text-secondary)',
                        background: ws.id === workspaceId ? 'var(--brand-soft)' : 'transparent',
                        borderLeft: ws.id === workspaceId ? '2px solid var(--brand-primary)' : '2px solid transparent',
                      }}
                    >
                      {ws.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-3 space-y-1">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={cn('sidebar-nav-item', isActive && 'active')}
              >
                <span style={{ color: isActive ? 'var(--brand-primary)' : 'var(--text-muted)' }}>
                  <item.Icon className="w-5 h-5" strokeWidth={1.6} />
                </span>
                {item.name}
                {isActive && (
                  <div
                    className="ml-auto rounded-full"
                    style={{
                      width: '6px',
                      height: '6px',
                      background: 'var(--brand-primary)',
                    }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* User Section */}
        <div className="p-3" style={{ borderTop: '1px solid var(--border-default)' }}>
          <div className="flex items-center gap-3" style={{ padding: '8px 12px' }}>
            <div
              className="flex items-center justify-center"
              style={{
                width: '36px',
                height: '36px',
                borderRadius: 'var(--radius)',
                background: 'var(--brand-softer)',
                border: '1px solid var(--brand-soft)',
              }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--brand-primary)' }}>
                {user?.name?.[0] || user?.email?.[0] || 'U'}
              </span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate" style={{ color: 'var(--text-primary)' }}>{user?.name || 'User'}</p>
              <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{user?.email}</p>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-icon btn-sm"
              title="Logout"
              style={{ color: 'var(--text-muted)' }}
            >
              <LogOut className="w-4 h-4" strokeWidth={1.6} />
            </button>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="min-h-[calc(100dvh-4rem)] lg:ml-64 lg:min-h-screen">
        <div className="p-4 sm:p-6 lg:p-8 page-enter">
          {children}
        </div>
      </div>
    </div>
  );
}
