"use client";

import React, { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import RetailLayout from "@/components/RetailLayout";
import ProductsContent from "@/components/ProductsContent";

export default function HomePage() {
  const router = useRouter();
  const { user, isAuthenticated, currentPharmacy } = useAuth();

  useEffect(() => {
    if (isAuthenticated) {
      if (user?.role === "staff") {
        router.replace("/billing");
      }
    }
  }, [isAuthenticated, user, router]);

  if (user?.role === "staff") {
    return null;
  }

  return (
    <RetailLayout>
      <ProductsContent />
    </RetailLayout>
  );
}
