import React, { useState, useEffect } from 'react';
import { cn } from '../lib/utils';
import { Button } from './ui/button';
import { Avatar, AvatarFallback } from './ui/avatar';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';
import { getAvailablePages } from '../utils/permissions';

const Navigation = ({ currentPage, setCurrentPage, user, userPermissions, isOpen, setIsOpen, onLogout }) => {
  const [availablePages, setAvailablePages] = useState([]);

  useEffect(() => {
    if (user) {
      const pages = getAvailablePages(user, userPermissions || {});
      setAvailablePages(pages);
    }
  }, [user, userPermissions]);

  return (
    <div className="dark">
      {/* Sidebar */}
      <div
        className={cn(
          "fixed top-0 left-0 h-screen bg-background border-r border-border flex flex-col transition-all duration-300 z-50",
          isOpen ? "w-64" : "w-16"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border">
          {isOpen ? (
            <div className="flex items-center gap-2">
              <img src="/stiker logo snapme.png" alt="SnapMe" className="w-8 h-8 object-contain" />
              <span className="font-semibold text-foreground">SnapMe</span>
            </div>
          ) : (
            <img src="/stiker logo snapme.png" alt="SnapMe" className="w-8 h-8 object-contain mx-auto" />
          )}
          {isOpen && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8 text-foreground"
            >
              <ChevronLeftIcon />
            </Button>
          )}
        </div>

        {/* User Info */}
        <div className="p-4 border-b border-border">
          <div className={cn("flex items-center gap-3", !isOpen && "justify-center")}>
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/10 text-primary text-sm">
                {user?.full_name?.charAt(0) || 'U'}
              </AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground truncate">{user?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {user?.role === 'admin' ? 'Administrator' : 'Kasir'}
                </p>
              </div>
            )}
          </div>
          {isOpen && (
            <p className="text-xs text-muted-foreground mt-3">
              {new Date().toLocaleDateString("id-ID", {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          )}
        </div>

        {/* Navigation Menu */}
        <ScrollArea className="flex-1 py-2">
          <div className="px-2 space-y-1">
            {availablePages.map(page => (
              <Button
                key={page.key}
                variant={currentPage === page.key ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-3 h-10 text-foreground",
                  !isOpen && "justify-center px-2",
                  currentPage === page.key && "bg-secondary"
                )}
                onClick={() => setCurrentPage(page.key)}
              >
                <NavIcon name={page.icon} />
                {isOpen && <span className="text-sm">{page.name}</span>}
              </Button>
            ))}
          </div>
        </ScrollArea>

        <Separator />

        {/* Footer */}
        <div className="p-2">
          <Button
            variant="ghost"
            className={cn(
              "w-full justify-start gap-3 h-10 text-destructive hover:text-destructive hover:bg-destructive/10",
              !isOpen && "justify-center px-2"
            )}
            onClick={onLogout}
          >
            <LogoutIcon />
            {isOpen && <span className="text-sm">Logout</span>}
          </Button>
        </div>

        {/* Toggle button when collapsed */}
        <div className={cn("p-2 border-t border-border", isOpen && "hidden")}>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsOpen(true)}
            className="w-full h-8 text-foreground"
          >
            <ChevronRightIcon />
          </Button>
        </div>
      </div>
    </div>
  );
};

// Icons
const ChevronLeftIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m15 18-6-6 6-6" />
  </svg>
);

const ChevronRightIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m9 18 6-6-6-6" />
  </svg>
);

const LogoutIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const SnapMeIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
    <circle cx="12" cy="13" r="3" />
  </svg>
);

// Navigation Icons
const NavIcon = ({ name }) => {
  const icons = {
    wallet: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1" />
        <path d="M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4" />
      </svg>
    ),
    chart: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 3v18h18" />
        <path d="m19 9-5 5-4-4-3 3" />
      </svg>
    ),
    history: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
        <path d="M12 7v5l4 2" />
      </svg>
    ),
    package: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="m7.5 4.27 9 5.15" />
        <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
        <path d="m3.3 7 8.7 5 8.7-5" />
        <path d="M12 22V12" />
      </svg>
    ),
    calendar: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 2v4" />
        <path d="M16 2v4" />
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M3 10h18" />
      </svg>
    ),
    camera: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
        <circle cx="12" cy="13" r="3" />
      </svg>
    ),
    users: (
      <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  };
  return icons[name] || null;
};

export default Navigation;
