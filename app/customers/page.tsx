import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { User } from "lucide-react";

export default function CustomersPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Customers & CRM"
        category="Customer Management"
        icon={User}
        description="Customer database, purchase records, credit accounts (khata), reward points, and automated messaging."
        features={[
          "Customer profile with phone number lookup",
          "Credit balance and due payment reminders",
          "Loyalty points, cashback, and special discounts",
          "Automated bill dispatch via SMS & WhatsApp",
        ]}
      />
    </RetailLayout>
  );
}
