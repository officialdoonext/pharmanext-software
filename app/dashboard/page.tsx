import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Home } from "lucide-react";

export default function DashboardPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Dashboard"
        category="Analytics"
        icon={Home}
        description="Comprehensive business overview, daily cash flow tracking, top-selling lines, and real-time inventory statistics."
        features={[
          "Live business sales revenue counter",
          "Fast day-to-day profit and margin analytics",
          "Low-stock and expiry automated alerts",
          "Payment settlement ledger (Cash, UPI, Card)",
        ]}
      />
    </RetailLayout>
  );
}
