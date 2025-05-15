"use client"; // ✅ Add this at the top

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axios from "axios";

const withAuth = (WrappedComponent: any) => {
  return (props: any) => {
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(true);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
      const token = localStorage.getItem("token");
      if (!token) {
        router.push("/login"); // Redirect if no token
      } else {
        axios
          .get("http://localhost:3002/auth/verifyToken", {
            headers: { Authorization: `Bearer ${token}` },
          })
          .then(() => {
            setIsAuthenticated(true);
          })
          .catch(() => {
            localStorage.removeItem("token");
            router.push("/login");
          })
          .finally(() => setIsLoading(false));
      }
    }, []);

    if (isLoading) return <p>Loading...</p>;
    if (!isAuthenticated) return null;

    return <WrappedComponent {...props} />;
  };
};

export default withAuth;
