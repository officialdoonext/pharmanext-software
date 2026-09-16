import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Receipt } from "lucide-react";

export default function BillingPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Billing & POS"
        category="Point of Sale"
        icon={Receipt}
        description="Fast barcode scanning, GST compliant invoices, multiple split payment options, and instant receipt printing are coming here."
        features={[
          "Rapid barcode scanner & fast item lookup",
          "Automated GST calculation and HSN code tagging",
          "Split tender: Cash, Card, UPI, and Credit accounts",
          "Thermal printer and digital receipt via SMS/WhatsApp",
        ]}
      />
    </RetailLayout>
  );
}
