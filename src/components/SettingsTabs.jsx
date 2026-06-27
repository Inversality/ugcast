"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { FiUser, FiCreditCard, FiCode } from "react-icons/fi";

// Shared sub-navigation for the account area. Keeps /settings, /billing and the
// developer API-keys page feeling like one cohesive section.
const TABS = [
  { name: "Profile", href: "/settings", icon: FiUser },
  { name: "Billing", href: "/billing", icon: FiCreditCard },
  { name: "API Keys", href: "/developers", icon: FiCode },
];

export default function SettingsTabs() {
  const pathname = usePathname();

  return (
    <div className="inline-flex items-center gap-1 p-1 rounded-full glass-panel border border-glass-border">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        const Icon = tab.icon;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`flex items-center gap-2 px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wide transition-all ${
              active
                ? "bg-gradient-to-br from-primary-500 to-secondary-500 text-bg-page glow-primary"
                : "text-muted hover:text-foreground"
            }`}
          >
            <Icon className="text-sm" />
            <span className="hidden sm:inline">{tab.name}</span>
          </Link>
        );
      })}
    </div>
  );
}
