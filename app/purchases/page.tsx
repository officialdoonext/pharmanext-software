import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { ShoppingCart } from "lucide-react";

export default function PurchasesPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Purchases & Vendor Bills"
        category="Procurement"
        icon={ShoppingCart}
        description="Manage purchase orders, goods received notes (GRN), supplier bills, purchase returns, and supplier payments."
        features={[
          "Vendor purchase orders and auto invoice import",
          "Barcode batch tracking with expiry alerts",
          "Automated stock replenishment suggestions",
          "Supplier payment tracking and aging reports",
        ]}
      />
    </RetailLayout>
  );
}
