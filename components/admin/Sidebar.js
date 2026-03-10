"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export const NAV_GROUPS = [
  {
    label: "Users & Access",
    items: [
      { label: "Users", href: "/admin/users", icon: "👤", access: "read" },
      { label: "Allowed Domains", href: "/admin/allowed-domains", icon: "🌐", access: "crud" },
      { label: "Whitelisted Emails", href: "/admin/whitelisted-emails", icon: "✉️", access: "crud" }
    ]
  },
  {
    label: "Content",
    items: [
      { label: "Images", href: "/admin/images", icon: "🖼️", access: "crud" },
      { label: "Captions", href: "/admin/captions", icon: "💬", access: "read" },
      { label: "Caption Requests", href: "/admin/caption-requests", icon: "📋", access: "read" },
      { label: "Caption Examples", href: "/admin/caption-examples", icon: "📝", access: "crud" },
      { label: "Terms", href: "/admin/terms", icon: "📄", access: "crud" }
    ]
  },
  {
    label: "Humor Engine",
    items: [
      { label: "Humor Flavors", href: "/admin/humor-flavors", icon: "🎭", access: "read" },
      { label: "Humor Flavor Steps", href: "/admin/humor-flavor-steps", icon: "🪜", access: "read" },
      { label: "Humor Mix", href: "/admin/humor-mix", icon: "🎚️", access: "read/update" }
    ]
  },
  {
    label: "LLM",
    items: [
      { label: "LLM Providers", href: "/admin/llm-providers", icon: "🏭", access: "crud" },
      { label: "LLM Models", href: "/admin/llm-models", icon: "🤖", access: "crud" },
      { label: "LLM Prompt Chains", href: "/admin/llm-prompt-chains", icon: "⛓️", access: "read" },
      { label: "LLM Responses", href: "/admin/llm-responses", icon: "📨", access: "read" }
    ]
  }
];

function isActive(pathname, href) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="admin-sidebar panel">
      <div className="admin-sidebar-header">
        <p className="kicker">Navigation</p>
        <h2>Admin Panel</h2>
      </div>

      <div className="admin-sidebar-groups">
        {NAV_GROUPS.map((group) => (
          <section key={group.label} className="admin-nav-group">
            <p className="admin-nav-group-label">{group.label}</p>
            <div className="admin-nav-list">
              {group.items.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={active ? "admin-nav-item active" : "admin-nav-item"}
                  >
                    <span className="admin-nav-icon" aria-hidden="true">
                      {item.icon}
                    </span>
                    <span className="admin-nav-copy">
                      <span>{item.label}</span>
                      <small>{item.access}</small>
                    </span>
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </aside>
  );
}
