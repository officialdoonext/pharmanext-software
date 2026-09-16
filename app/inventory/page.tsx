import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Box } from "lucide-react";

export default function InventoryPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Inventory & Stock Control"
        category="Stock Management"
        icon={Box}
        description="Comprehensive stock registers, warehouse locations, stock transfers, physical audits, and scrap adjustments."
        features={[
          "Real-time warehouse and shelf location tracking",
          "Automated low-stock threshold triggers",
          "Damage, loss, and internal consumption logs",
          "Multi-location inter-store stock transfers",
        ]}
      />
    </RetailLayout>
  );
}
