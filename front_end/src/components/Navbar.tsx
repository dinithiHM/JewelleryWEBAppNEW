'use client';

import React from "react";
import Menu from "./Menu";
import Link from "next/link";
import Image from "next/image";
import LanguageSelector from "./LanguageSelector";
import { t } from "@/contexts/LanguageContext";

const Navbar = () => {
  const user = false;
  return (
    <div className="h-12 text-yellow-500 p-4 flex items-center justify-between border-b-2 border-b white-500 uppercase md:h-24 lg:px-20 xl:px-40">
      {/* LEFT LINKS */}
      <div className="hidden md:flex gap-4 flex-1">
        <Link href="/">Homepage</Link>

        <Link href="/">Contact</Link>
      </div>
      {/* LOGO */}
      <div className="text-xl md:font-bold flex-1 md:text-center font-bona-nova-sc">
        <Link href="/">{t('app.name')}</Link>
      </div>
      {/* MOBILE MENU */}
      <div className="md:hidden">
        <Menu />
      </div>
      {/* RIGHT LINKS */}
      <div className="hidden md:flex gap-4 items-center justify-end flex-1">
        <div className="md:absolute top-3 r-2 lg:static flex items-center gap-2 cursor-pointer bg-white-300 px-1 rounded-md">
          <Image src="/phone.png" alt="" width={20} height={20} />
          <span>123 456 78</span>
        </div>
        <div className="language-selector-container" data-no-auto-translate="true">
          <LanguageSelector />
        </div>
        {!user ? (
          <Link href="/login">Login</Link>
        ) : (
          <Link href="/orders">Orders</Link>
        )
        }

      </div>
    </div>
  );
};

export default Navbar;
