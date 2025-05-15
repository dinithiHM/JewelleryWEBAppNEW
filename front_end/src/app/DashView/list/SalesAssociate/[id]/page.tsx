"use client";

import { useParams } from "next/navigation";
import UserDetailView from "@/components/UserDetailView";

const SalesAssociateView = () => {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <div className="p-4">
      <UserDetailView
        userId={id?.toString() || ""}
        userType="sales-associate"
        backUrl="/DashView/list/SalesAssociate"
      />
    </div>
  );
};

export default SalesAssociateView;
