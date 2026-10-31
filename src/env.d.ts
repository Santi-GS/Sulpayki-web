/// <reference types="astro/client" />

import type { UserRole } from "./db/schema";

export interface AuthenticatedUser {
  id: number;
  email: string;
  name: string;
  role: UserRole;
}

declare global {
  namespace App {
    interface Locals {
      user: AuthenticatedUser | null;
    }
  }
}

declare module "@vercel/speed-insights/astro" {
  export default function SpeedInsights(props?: import("@vercel/speed-insights").SpeedInsightsProps): any;
}
