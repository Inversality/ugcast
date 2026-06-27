"use client";

import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { IoClose, IoMenu } from "react-icons/io5";
import { FiMoon, FiSun, FiLogOut, FiDollarSign, FiPlus, FiUser, FiSettings, FiCreditCard } from "react-icons/fi";
import config from "@/lib/config";

export default function Navbar() {
  const { data: session, status } = useSession();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);

  const appName = config?.appName || "UGCast";

  // Eagerly prefetch workspace/gallery routes for fast tabs
  useEffect(() => {
    // Prefetch common routes
  }, []);

  const appMatch = pathname ? pathname.match(/^\/app\/([^\/]+)/) : null;
  const currentAppId = appMatch ? appMatch[1] : null;

  const navLinks = currentAppId
    ? [
        { name: "Workspace", path: `/app/${currentAppId}` },
        { name: "Gallery", path: `/app/${currentAppId}/gallery` },
        { name: "Pricing", path: `/app/${currentAppId}/pricing` },
      ]
    : [
        { name: "Workspace", path: "/workspace" },
        { name: "Actors", path: "/actors" },
        { name: "Editor", path: "/editor" },
        { name: "Gallery", path: "/dashboard" },
        { name: "API", path: "/developers" },
        { name: "Pricing", path: "/pricing" },
      ];

  return (
    <header className="sticky top-0 z-50 w-full glass-panel border-b border-divider/50 shadow-md">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
        
        {/* Logo and Brand Title (Visible at all times) */}
        <Link href="/workspace" className="flex items-center gap-2.5 transition-transform hover:scale-[1.02] active:scale-95">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/brand/icon-tile.svg"
            alt={`${appName} logo`}
            width={36}
            height={36}
            className="h-9 w-9 rounded-xl glow-primary"
          />
          <span className="text-lg font-black tracking-tight text-gradient-soft text-nowrap">
            {appName}
          </span>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden md:flex items-center gap-6">
          {navLinks.map((link) => {
            const isActive = pathname === link.path;
            return (
              <Link
                key={link.name}
                href={link.path}
                className={`text-[13px] font-semibold transition-all relative py-1 ${
                  isActive ? "text-primary" : "text-secondary-text hover:text-primary-text"
                }`}
              >
                {link.name}
                {isActive && (
                  <div className="absolute -bottom-[20px] left-0 right-0 h-0.5 bg-gradient-to-r from-primary-500 to-secondary-500 rounded-full" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Desktop Actions Section */}
        <div className="hidden md:flex items-center gap-4">

          {status === "authenticated" ? (
            <div className="flex items-center">
              {/* Credit Balance indicator */}
              <div className="flex items-center h-9 border border-divider rounded-l bg-bg-page/30 overflow-hidden pr-2">
                <span className="font-bold text-[13px] px-3 flex items-center text-primary-text gap-1">
                  <FiDollarSign className="text-emerald-500 text-xs" />
                  {session.user.unlimited ? "∞" : (session.user.credits ?? 0)}
                </span>
                <Link
                  href="/pricing"
                  className="flex items-center justify-center w-5 h-5 rounded hover:bg-bg-card text-secondary-text transition-colors"
                >
                  <FiPlus size={14} />
                </Link>
              </div>

              {/* Profile Menu Toggle */}
              <div className="relative">
                <button
                  onClick={() => setIsProfileOpen(!isProfileOpen)}
                  onBlur={() => setTimeout(() => setIsProfileOpen(false), 200)}
                  className="h-9 w-9 flex items-center justify-center border-y border-r border-divider rounded-r bg-bg-page/30 hover:bg-bg-page transition-colors cursor-pointer"
                >
                  {session.user.image ? (
                    <img
                      src={session.user.image}
                      alt="Profile"
                      className="h-6 w-6 rounded-full object-cover"
                    />
                  ) : (
                    <FiUser className="text-secondary-text" size={16} />
                  )}
                </button>

                {/* Profile Dropdown */}
                {isProfileOpen && (
                  <div className="absolute right-0 top-11 w-48 rounded border border-divider bg-bg-card p-1 shadow-lg z-[100] animate-scale-up">
                    <div className="px-3 py-2 text-xs text-secondary-text border-b border-divider/50 mb-1 truncate">
                      {session.user.email}
                    </div>
                    <Link
                      href="/settings"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-primary-text hover:bg-bg-page transition-colors"
                    >
                      <FiSettings size={14} />
                      <span>Settings</span>
                    </Link>
                    <Link
                      href="/billing"
                      onClick={() => setIsProfileOpen(false)}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-primary-text hover:bg-bg-page transition-colors"
                    >
                      <FiCreditCard size={14} />
                      <span>Billing</span>
                    </Link>
                    <div className="h-px bg-divider/50 my-1" />
                    <button
                      onClick={() => signOut({ callbackUrl: "/login" })}
                      className="flex w-full items-center gap-2 rounded px-3 py-2 text-left text-sm font-semibold text-red-500 hover:bg-red-500/10 transition-colors"
                    >
                      <FiLogOut size={14} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <Link
              href="/login"
              className="bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page px-5 py-2 rounded-full text-sm font-bold hover:brightness-110 transition-all glow-primary"
            >
              Sign In
            </Link>
          )}
        </div>

        {/* Mobile Navbar Hamburger Menu Controls */}
        <div className="flex md:hidden items-center gap-2">
          {status === "authenticated" && (
            <div className="flex items-center h-8 border border-divider rounded bg-bg-page/30 px-2.5 text-xs font-bold text-primary-text gap-0.5">
              <FiDollarSign className="text-emerald-500 text-[10px]" />
              {session.user.unlimited ? "∞" : (session.user.credits ?? 0)}
            </div>
          )}
          
          <button
            onClick={() => setIsOpen(!isOpen)}
            className="hover:bg-bg-card p-2 rounded cursor-pointer transition-colors text-primary-text border border-divider/50"
            aria-label="Toggle Menu"
          >
            {isOpen ? <IoClose size={20} /> : <IoMenu size={20} />}
          </button>
        </div>
      </div>

      {/* Absolutely Positioned Mobile Menu Dropdown (Backdrop blur + matches layout) */}
      {isOpen && (
        <div className="absolute top-full left-0 right-0 z-[200] glass-dropdown border-b border-divider shadow-2xl py-4 px-6 md:hidden animate-fade-in">
          <nav className="flex flex-col gap-3">
            <span className="text-[10px] uppercase font-bold text-secondary-text tracking-widest mb-1">Navigation</span>
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                onClick={() => setIsOpen(false)}
                className={`flex items-center py-2.5 rounded text-sm font-semibold transition-all ${
                  pathname === link.path ? "bg-primary/10 text-primary px-3 border border-primary/20" : "text-primary-text hover:bg-bg-card"
                }`}
              >
                {link.name}
              </Link>
            ))}

            <div className="h-px bg-divider/50 my-2" />

            {status === "authenticated" ? (
              <>
                <span className="text-[10px] uppercase font-bold text-secondary-text tracking-widest mb-1">Account</span>
                <Link
                  href="/settings"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 py-2.5 rounded text-sm font-semibold transition-all ${
                    pathname === "/settings" ? "bg-primary/10 text-primary px-3 border border-primary/20" : "text-primary-text hover:bg-bg-card"
                  }`}
                >
                  <FiSettings size={16} /> Settings
                </Link>
                <Link
                  href="/billing"
                  onClick={() => setIsOpen(false)}
                  className={`flex items-center gap-2 py-2.5 rounded text-sm font-semibold transition-all ${
                    pathname === "/billing" ? "bg-primary/10 text-primary px-3 border border-primary/20" : "text-primary-text hover:bg-bg-card"
                  }`}
                >
                  <FiCreditCard size={16} /> Billing
                </Link>
                <button
                  onClick={() => {
                    setIsOpen(false);
                    signOut({ callbackUrl: "/login" });
                  }}
                  className="flex w-full items-center justify-center gap-2 rounded bg-red-500/10 text-red-500 py-3 text-sm font-bold hover:bg-red-500/20 transition-all border border-red-500/20 mt-2"
                >
                  <FiLogOut size={16} />
                  <span>Sign Out</span>
                </button>
              </>
            ) : (
              <Link
                href="/login"
                onClick={() => setIsOpen(false)}
                className="flex w-full items-center justify-center rounded-full bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page py-3 text-sm font-bold hover:brightness-110 transition-all glow-primary mt-2"
              >
                Sign In
              </Link>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
