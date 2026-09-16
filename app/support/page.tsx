import DashboardLayout from "@/components/DashboardLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Headphones } from "lucide-react";

export default function SupportPage() {
  return (
    <DashboardLayout>
      <ComingSoonView
        title="Help & Support Desk"
        category="Customer Care"
        icon={Headphones}
        description="24/7 dedicated pharmacy support, ticketing system, user manuals, video tutorials, and live remote assistance."
        features={[
          "Direct toll-free and WhatsApp priority support hotline",
          "One-click AnyDesk/TeamViewer remote diagnostics",
          "Comprehensive video tutorials for cashiers and pharmacists",
          "Hardware troubleshooting guides for barcode scanners & printers",
        ]}
      />
    </DashboardLayout>
  );
}
