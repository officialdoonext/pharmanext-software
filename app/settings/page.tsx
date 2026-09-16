import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Settings } from "lucide-react";

export default function SettingsPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Settings & Store Configuration"
        category="Preferences"
        icon={Settings}
        description="Configure store details, GSTIN, receipt templates, thermal barcode printers, and cloud backup preferences."
        features={[
          "Store name, address, GSTIN, and business logo configuration",
          "Custom thermal bill print header, footer, and return policy",
          "Barcode scanner and cash drawer hardware setup",
          "Automated cloud data backup and export preferences",
        ]}
      />
    </RetailLayout>
  );
}
