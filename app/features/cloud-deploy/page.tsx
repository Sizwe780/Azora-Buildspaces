'use client'

import { RoomPageLayout } from "@/components/layouts/room-page-layout"
import { CloudUpload, Container, Globe, Rocket, ShieldCheck, Zap } from "lucide-react"

export default function CloudDeployPage() {
  return (
    <RoomPageLayout
      roomName="Cloud Deploy"
      roomTagline="Zero-Friction Deployment Pipeline"
      roomDescription="Push your workspace directly to production without configuring complex CI/CD logic. Manage staging environments, rollback deployments, and monitor your cloud edge instantly."
      roomIcon={CloudUpload || Rocket}
      accentColor="blue"
      demoHref="/demo-code-chamber"
      ctaTitle="Ready to Launch?"
      ctaDescription="Deploy your next big idea directly from Azora Buildspaces."
      features={[
        { icon: Rocket, title: "One-Click Deploy", description: "Deploy full stack frameworks (Next.js, Vite, Node) simultaneously to Vercel, AWS, or k8s." },
        { icon: Globe, title: "Instant Edge Networks", description: "Global deployments instantly pushed to the edge ensuring <50ms latency." },
        { icon: ShieldCheck, title: "Security Scans", description: "Automated dependency patching and AST AST static analysis during build steps." },
        { icon: Container, title: "Kubernetes Native", description: "Generate container images and push YAML manifests dynamically." },
        { icon: Zap, title: "Zero Downtime Rollbacks", description: "Revert deployments immediately using continuous snapshot versioning." },
      ]}
      capabilities={[
        "Automated CI/CD Workflows",
        "Next.js / App Router Optimization",
        "Docker Container Generation",
        "Blue/Green Deployments",
        "Live Production Monitoring",
        "Database Migration Automation"
      ]}
    />
  )
}
