'use client'

import { RoomPageLayout } from "@/components/layouts/room-page-layout"
import { Lock, Mail, ShieldAlert, KeyRound } from "lucide-react"

export default function ForgotPasswordPage() {
  return (
    <RoomPageLayout
      roomName="Password Recovery"
      roomTagline="Secure Account Restoration"
      roomDescription="Regain access to your Azora Buildspaces environment through secure, verified email links. We utilize encrypted lifecycles to guarantee your workspaces remain completely locked down."
      roomIcon={Lock}
      accentColor="stone"
      demoHref="/demo-command-desk"
      ctaTitle="Need to login?"
      ctaDescription="Return to the canonical authentication flow."
      features={[
        { icon: Mail, title: "Email Verification", description: "Secure SMTP magic links are generated matching your registered identities." },
        { icon: ShieldAlert, title: "Brute Force Locks", description: "Account restoration checks active locks to prevent denial of service spanning." },
        { icon: KeyRound, title: "PBKDF2 Keys", description: "Your passwords use top-tier iterations meaning older credentials immediately invalidate." },
      ]}
      capabilities={[
        "Email MFA Workflows",
        "Token Lifespan Controls",
        "Account auditing & un-locking",
      ]}
    />
  )
}
