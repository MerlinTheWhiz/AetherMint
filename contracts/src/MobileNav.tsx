import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const MobileNav = () => {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  const navItems = [
    { name: 'Home', path: '/' },
    { name: 'Courses', path: '/courses' },
    { name: 'Dashboard', path: '/dashboard' },
    { name: 'Profile', path: '/profile' },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50 pb-safe">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          return (
            <Link 
              key={item.path} 
              href={item.path}
              className={`flex flex-col items-center justify-center w-full h-full ${
                isActive ? 'text-blue-600' : 'text-gray-500'
              }`}
            >
              <span className="text-xs mt-1 font-medium">{item.name}</span>
            </Link>
          );
        })}
        
        <button 
          onClick={toggleMenu}
          className="flex flex-col items-center justify-center w-full h-full text-gray-500"
        >
          <span className="text-xs mt-1 font-medium">Menu</span>
        </button>
      </div>

      {/* Slide-up Menu */}
      {isOpen && (
        <div className="absolute bottom-16 left-0 right-0 bg-white border-t border-gray-200 shadow-lg p-4 animate-slide-up">
          <div className="grid grid-cols-1 gap-4">
            <Link href="/settings" className="p-3 hover:bg-gray-50 rounded-lg">
              Settings
            </Link>
            <Link href="/help" className="p-3 hover:bg-gray-50 rounded-lg">
              Help & Support
            </Link>
            <button 
              onClick={() => setIsOpen(false)}
              className="w-full p-3 bg-gray-100 rounded-lg text-center mt-2"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MobileNav;