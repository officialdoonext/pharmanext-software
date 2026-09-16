import RetailLayout from "@/components/RetailLayout";
import ComingSoonView from "@/components/ComingSoonView";
import { CreditCard } from "lucide-react";

export default function ExpensesPage() {
  return (
    <RetailLayout>
      <ComingSoonView
        title="Store Expenses"
        category="Finance"
        icon={CreditCard}
        description="Track daily operational costs, store rent, electricity, maintenance, packaging expenses, and petty cash entries."
        features={[
          "Expense categories (Rent, Utilities, Supplies, Wages)",
          "Petty cash drawer log and digital receipt uploads",
          "Automated monthly recurring expense scheduling",
          "Expense vs revenue comparison dashboards",
        ]}
      />
    </RetailLayout>
  );
}
