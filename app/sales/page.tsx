import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { TrendingUp } from "lucide-react";

export default function SalesPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Sales & Invoicing"
        category="Orders & Revenue"
        icon={TrendingUp}
        description="Point of sale registers, invoice generation, returns management, customer ledger, and split payment options."
        features={[
          "Instant barcode billing and thermal print receipts",
          "GST invoice compliance and auto tax computation",
          "Payment modes: Cash, Card, UPI, and Customer Credit",
          "Daily register reconciliation and cash drawer report",
        ]}
      />
    </RetailLayout>
  );
}
