import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { Users } from "lucide-react";

export default function EmployeesPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Employees & Staff"
        category="Human Resources"
        icon={Users}
        description="Employee management, shift schedules, cash register assignments, role permissions, and sales commissions."
        features={[
          "Staff contact directory and attendance tracking",
          "Role-based system access (Admin, Cashier, Storekeeper)",
          "Cash drawer handover and closing audit trails",
          "Individual employee sales commission tracking",
        ]}
      />
    </RetailLayout>
  );
}
