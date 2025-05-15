"use client";

import { useParams } from "next/navigation";
import UserDetailView from "@/components/UserDetailView";

const SupplierView = () => {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <div className="p-4">
      <UserDetailView
        userId={id?.toString() || ""}
        userType="supplier"
        backUrl="/DashView/list/Supplier"
      />
    </div>
  );
};

export default SupplierView;
