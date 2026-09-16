import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { UserCog } from "lucide-react";

export default function StaffPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Staff & Access Control"
        category="Team Management"
        icon={UserCog}
        description="Manage helper staff, delivery personnel, counter assistants, store permissions, and activity audit logs."
        features={[
          "Staff contact directories and emergency contacts",
          "Delivery personnel dispatch and cash-on-delivery tracking",
          "Granular feature permissions and security logs",
          "Staff payroll and monthly attendance records",
        ]}
      />
    </RetailLayout>
  );
}
