// config/nav.ts

import {
  Home,
  Flag,
  PlusCircle,
  Users,
  Users2,
  MapPin,
  Trophy,
  Calendar,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon?: JSX.Element; // ← Use JSX.Element
  roles?: ("admin" | "coach" | "player")[];
  badge?: string;
};

export const NAV_ITEMS: NavItem[] = [
  {
    href: "/",
    label: "Dashboard",
    icon: <Home className="h-4 w-4" />,
    roles: ["admin", "coach", "player"],
  },
  {
    href: "/rounds",
    label: "Rounds",
    icon: <Flag className="h-4 w-4" />,
    roles: ["admin", "coach", "player"],
  },
  {
    href: "/rounds/new",
    label: "New Round",
    icon: <PlusCircle className="h-4 w-4" />,
    roles: ["admin", "coach"],
  },
  {
    href: "/players",
    label: "Players",
    icon: <Users className="h-4 w-4" />,
    roles: ["admin", "coach"],
  },
  {
    href: "/teams",
    label: "Teams",
    icon: <Users2 className="h-4 w-4" />,
    roles: ["admin", "coach"],
  },
  {
    href: "/courses",
    label: "Courses",
    icon: <MapPin className="h-4 w-4" />,
    roles: ["admin", "coach"],
  },
  {
    href: "/leaderboard",
    label: "Leaderboard",
    icon: <Trophy className="h-4 w-4" />,
    roles: ["admin", "coach", "player"],
  },
  {
    href: "/events",
    label: "Events",
    icon: <Calendar className="h-4 w-4" />,
    roles: ["admin", "coach"],
    badge: "New",
  },
];