import { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { LayoutDashboard, Image as ImageIcon, Award, Users as UsersIcon, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

const AdminPage = () => {
  const location = useLocation();
  const [isCollapsed, setIsCollapsed] = useState(false);

  const navigation = [
    {
      name: 'Dashboard',
      href: '/test/admin',
      icon: LayoutDashboard,
      current: location.pathname === '/test/admin',
    },
    {
      name: 'Images',
      href: '/test/admin/images',
      icon: ImageIcon,
      current: location.pathname.startsWith('/test/admin/images'),
    },
    {
      name: 'Badges',
      href: '/test/admin/badges',
      icon: Award,
      current: location.pathname.startsWith('/test/admin/badges'),
    },
    {
      name: 'Users',
      href: '/test/admin/users',
      icon: UsersIcon,
      current: location.pathname.startsWith('/test/admin/users'),
    },
  ];

  return (
    <div className="flex h-screen bg-gray-50 dark:bg-gray-900">
      {/* Sidebar */}
      <div
        className={cn(
          'flex flex-col bg-white dark:bg-gray-800 shadow-md transition-all duration-300 ease-in-out',
          isCollapsed ? 'w-20' : 'w-64'
        )}
      >
        <div className="flex h-16 items-center px-4 border-b border-gray-200 dark:border-gray-700">
          <h1 className={cn('text-xl font-semibold text-gray-900 dark:text-white', isCollapsed && 'hidden')}>
            Admin Panel
          </h1>
          <Button
            variant="ghost"
            size="icon"
            className="ml-auto"
            onClick={() => setIsCollapsed(!isCollapsed)}
          >
            <ChevronRight
              className={cn(
                'h-5 w-5 text-gray-500 transition-transform duration-300',
                isCollapsed && 'rotate-180'
              )}
            />
          </Button>
        </div>
        <nav className="flex-1 px-2 py-4 space-y-1">
          {navigation.map((item) => {
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                to={item.href}
                className={cn(
                  'flex items-center px-4 py-3 text-sm font-medium rounded-md transition-colors',
                  item.current
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-100'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700',
                  isCollapsed ? 'justify-center' : 'px-4'
                )}
              >
                <Icon
                  className={cn('h-5 w-5', !isCollapsed && 'mr-3')}
                  aria-hidden="true"
                />
                {!isCollapsed && item.name}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Main content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default AdminPage;
