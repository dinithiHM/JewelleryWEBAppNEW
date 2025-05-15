"use client";

import { useParams } from "next/navigation";
import UserDetailView from "@/components/UserDetailView";

const SingleStoreManagerPage = () => {
  const params = useParams();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;

  return (
    <div className="p-4">
      <UserDetailView
        userId={id?.toString() || ""}
        userType="store-manager"
        backUrl="/DashView/list/StoreManager"
      />
    </div>
  );
};

export default SingleStoreManagerPage;
