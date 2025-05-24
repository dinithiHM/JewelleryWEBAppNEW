'use client'; // This marks it as a client-side component

import React, { useState, useEffect } from "react"; // Importing useState and useEffect hooks from React
// import { useSession } from "next-auth/react"; // Importing the session hook
import Link from "next/link";
import {
  Home, Users, Tag, ClipboardList, Coins, ShoppingCart, BarChart, CalendarCheck, CreditCard,
  Bell, UserCircle, Settings, LogOut, Boxes, Package, FileText
} from "lucide-react"; // Importing correct icons
import { useLanguage } from "@/contexts/LanguageContext";

// Function to get the dashboard URL based on user role and branch
const getDashboardUrl = (role: string | null, branchId: string | null) => {
  if (!role) return "/";

  let baseUrl = "/";

  switch (role) {
    case "Admin":
      baseUrl = "/DashView/admin";
      break;
    case "Store Manager":
      baseUrl = "/DashView/storeManager";
      break;
    case "Sales Associate":
      baseUrl = "/DashView/salesAssociate";
      break;
    case "Cashier":
      baseUrl = "/DashView/cashier";
      break;
    default:
      baseUrl = "/";
  }

  // If we have a branch ID and the user is not an admin (admins see all branches),
  // add it as a query parameter
  if (branchId && role !== "Admin") {
    return `${baseUrl}?branch=${branchId}`;
  }

  return baseUrl;
};

const menuItems = [
  {
    title: "menu.menu",
    items: [
      { icon: Home, label: "menu.home", href: "dashboard", visible: ["Admin", "Store Manager", "Sales Associate", "Cashier"] },
      { icon: ShoppingCart, label: "menu.sales", href: "/DashView/sales/manage", visible: ["Admin", "Store Manager", "Sales Associate", "Cashier"] },
      { icon: CreditCard, label: "menu.advancePayment", href: "/DashView/advance-payment", visible: ["Admin", "Store Manager", "Sales Associate", "Cashier"] },
      { icon: ClipboardList, label: "menu.orders", href: "/DashView/orders", visible: ["Admin", "Store Manager", "Sales Associate"] },
      { icon: Package, label: "menu.customOrders", href: "/DashView/custom-orders", visible: ["Admin", "Store Manager", "Sales Associate"] },
      { icon: Boxes, label: "menu.jewelleryStock", href: "/DashView/jewellery-stock", visible: ["Admin", "Store Manager", "Sales Associate","Cashier"] },
      { icon: Coins, label: "menu.goldStock", href: "/DashView/gold-stock", visible: ["Admin", "Store Manager", "Sales Associate", "Cashier"] },
      { icon: BarChart, label: "menu.reports", href: "/DashView/reports", visible: ["Admin"] },
      { icon: FileText, label: "menu.assayReports", href: "/DashView/assay-reports", visible: ["Admin", "Store Manager", "Sales Associate"] },
      { icon: Tag, label: "menu.categories", href: "/DashView/categories", visible: ["Admin", "Store Manager"] },
      { icon: ClipboardList, label: "menu.suppliers", href: "/DashView/list/Supplier", visible: ["Admin"] }, // Only Admin
      { icon: BarChart, label: "menu.supplierDetails", href: "/DashView/supplier-details", visible: ["Admin", "Store Manager"] },
      { icon: Users, label: "menu.storeManagers", href: "/DashView/list/StoreManager", visible: ["Admin"] }, // Only Admin
      { icon: Users, label: "menu.salesAssociates", href: "/DashView/list/SalesAssociate", visible: ["Admin", "Store Manager"] },
      { icon: Users, label: "menu.cashiers", href: "/DashView/list/cashier", visible: ["Admin", "Store Manager"] },
      { icon: Bell, label: "menu.notifications", href: "/list/notifications", visible: ["Admin", "Store Manager", "Sales Associate", "Cashier"] },
    ],
  },
 
];

const Menu = () => {
  // Using the language context for translations
  const { translations } = useLanguage(); // Use language context to trigger re-renders when language changes
  const [role, setRole] = useState<string | null>(null);
  const [branchId, setBranchId] = useState<string | null>(null);

  // Local translation function to avoid calling hooks conditionally
  const translate = (key: string) => {
    return translations[key] || key;
  };

  useEffect(() => {
    // Get user role from localStorage
    const storedRole = localStorage.getItem("role");
    console.log("Stored role:", storedRole);

    // Get branch ID from localStorage
    const storedBranchId = localStorage.getItem("branchId");
    console.log("Stored branch ID:", storedBranchId);

    if (storedRole) {
      setRole(storedRole);
    } else {
      setRole("Guest");
    }

    if (storedBranchId) {
      setBranchId(storedBranchId);
    }
  }, []);

  if (!role) {
    return <div>Loading...</div>; // Show loading while fetching role
  }

  return (
    <div className="mt-4 text-sm bg-[#FFF6BD] p-4 rounded-md w-64">
      {menuItems.map((section) => (
        <div className="flex flex-col gap-2" key={section.title}>
          <span className="hidden lg:block text-black font-semibold my-4 menu-item-text" data-no-auto-translate="true">
            {translate(section.title)}
          </span>
          {section.items.map((item) => {
            // Check if the user's role is listed in the 'visible' array for this item
            if (item.visible.includes(role)) {
              // Determine the correct href
              const href = item.href === "dashboard" ? getDashboardUrl(role, branchId) : item.href;

              return (
                <Link
                  href={href}
                  key={item.label}
                  className="flex items-center justify-start gap-4 text-black py-2 px-4 rounded-md hover:bg-[#F0A500] hover:text-white transition duration-200 menu-item"
                  data-no-auto-translate="true"
                >
                  <item.icon size={20} className="text-black" />
                  <span className="hidden lg:block menu-item-text" data-no-auto-translate="true">
                    {translate(item.label)}
                  </span>
                </Link>
              );
            }
            return null; // Don't render items that the user shouldn't see
          })}
        </div>
      ))}
    </div>
  );
};

export default Menu;
