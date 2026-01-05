"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
    LayoutDashboard,
    Users,
    Bot,
    CreditCard,
    Receipt,
    Bell,
    Settings,
    Zap,
    ChevronRight,
} from "lucide-react"
import { cn } from "@/lib/utils"
import {
    Sidebar,
    SidebarContent,
    SidebarGroup,
    SidebarGroupContent,
    SidebarGroupLabel,
    SidebarHeader,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
    SidebarFooter,
} from "@/components/ui/sidebar"
import { Badge } from "@/components/ui/badge"

const navigation = [
    {
        title: "Mission Control",
        items: [
            { name: "Dashboard", href: "/", icon: LayoutDashboard },
            { name: "Transactions", href: "/transactions", icon: Zap, badge: "Live" },
        ],
    },
    {
        title: "Operations",
        items: [
            { name: "Clients", href: "/clients", icon: Users },
            { name: "Agents", href: "/agents", icon: Bot },
            { name: "Cards", href: "/cards", icon: CreditCard },
        ],
    },
    {
        title: "Finance",
        items: [
            { name: "Billing", href: "/billing", icon: Receipt },
            { name: "Alerts", href: "/alerts", icon: Bell, badge: "2" },
        ],
    },
]

export function AppSidebar() {
    const pathname = usePathname()

    return (
        <Sidebar className="border-r border-sidebar-border">
            <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
                <Link href="/" className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                        <span className="font-mono text-lg font-bold text-primary-foreground">
                            Q
                        </span>
                    </div>
                    <div className="flex flex-col">
                        <span className="font-semibold tracking-tight">Qoda</span>
                        <span className="text-xs text-muted-foreground">Financial OS</span>
                    </div>
                </Link>
            </SidebarHeader>

            <SidebarContent className="px-3 py-4">
                {navigation.map((group) => (
                    <SidebarGroup key={group.title}>
                        <SidebarGroupLabel className="px-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                            {group.title}
                        </SidebarGroupLabel>
                        <SidebarGroupContent>
                            <SidebarMenu>
                                {group.items.map((item) => {
                                    const isActive = pathname === item.href
                                    return (
                                        <SidebarMenuItem key={item.name}>
                                            <SidebarMenuButton
                                                asChild
                                                className={cn(
                                                    "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                                                    isActive
                                                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                                                        : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                                                )}
                                            >
                                                <Link href={item.href}>
                                                    <item.icon
                                                        className={cn(
                                                            "h-4 w-4",
                                                            isActive ? "text-primary" : "text-muted-foreground"
                                                        )}
                                                    />
                                                    <span className="flex-1">{item.name}</span>
                                                    {item.badge && (
                                                        <Badge
                                                            variant={
                                                                item.badge === "Live" ? "default" : "secondary"
                                                            }
                                                            className={cn(
                                                                "h-5 text-[10px] font-medium",
                                                                item.badge === "Live" &&
                                                                "bg-success text-success-foreground"
                                                            )}
                                                        >
                                                            {item.badge}
                                                        </Badge>
                                                    )}
                                                    {isActive && (
                                                        <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                                    )}
                                                </Link>
                                            </SidebarMenuButton>
                                        </SidebarMenuItem>
                                    )
                                })}
                            </SidebarMenu>
                        </SidebarGroupContent>
                    </SidebarGroup>
                ))}
            </SidebarContent>

            <SidebarFooter className="border-t border-sidebar-border p-4">
                <SidebarMenu>
                    <SidebarMenuItem>
                        <SidebarMenuButton
                            asChild
                            className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent/50"
                        >
                            <Link href="/settings">
                                <Settings className="h-4 w-4 text-muted-foreground" />
                                <span>Settings</span>
                            </Link>
                        </SidebarMenuButton>
                    </SidebarMenuItem>
                </SidebarMenu>

                <div className="mt-4 rounded-lg border border-sidebar-border bg-sidebar-accent/30 p-3">
                    <div className="flex items-center gap-2">
                        <div className="h-2 w-2 rounded-full bg-success animate-pulse" />
                        <span className="text-xs font-medium">System Operational</span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                        All services running normally
                    </p>
                </div>
            </SidebarFooter>
        </Sidebar>
    )
}
