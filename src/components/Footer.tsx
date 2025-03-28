
import React from 'react';
import { Link } from 'react-router-dom';

const Footer = () => {
  return (
    <footer className="w-full py-6 px-4 bg-gray-100 dark:bg-gray-900">
      <div className="container mx-auto max-w-6xl">
        <div className="flex flex-col md:flex-row justify-between items-center">
          <div className="mb-4 md:mb-0">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              © {new Date().getFullYear()} History Hunt. All rights reserved.
            </p>
          </div>
          
          <div className="flex gap-6">
            <Link to="/about" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
              About
            </Link>
            <Link to="/privacy" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
              Privacy
            </Link>
            <Link to="/terms" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
              Terms
            </Link>
            <a href="https://github.com" target="_blank" rel="noopener noreferrer" className="text-sm text-gray-600 dark:text-gray-400 hover:text-primary">
              GitHub
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
