import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { FileText } from "lucide-react";

export default function ReportsPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Reports & Business Intelligence"
        category="Analytics"
        icon={FileText}
        description="Comprehensive financial reporting, tax summaries (GSTR-1, GSTR-3B), profit & loss statements, and stock valuation."
        features={[
          "Daily, monthly, and yearly sales & profit breakdown",
          "Automated GST report generation with HSN/SAC summary",
          "Fast-moving vs slow-moving item analysis",
          "One-click Excel and PDF report export",
        ]}
      />
    </RetailLayout>
  );
}
