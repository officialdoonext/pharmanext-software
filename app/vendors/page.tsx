import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Truck } from "lucide-react";

export default function VendorsPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Vendors & Suppliers"
        category="Supplier Directory"
        icon={Truck}
        description="Vendor directory, purchase agreements, payment history, credit terms, and supplier performance metrics."
        features={[
          "Vendor master with GSTIN, PAN, and bank details",
          "Purchase orders and delivery status tracking",
          "Vendor ledger and outstanding payment reminders",
          "Item-wise supplier price comparisons",
        ]}
      />
    </RetailLayout>
  );
}
