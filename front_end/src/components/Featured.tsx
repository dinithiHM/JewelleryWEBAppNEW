import { featuredProducts } from "@/data";
import Image from "next/image";
import React from "react";
import { t, DynamicText } from "@/contexts/LanguageContext";

const Featured = () => {
  return (
    <div className="w-screen overflow-x-scroll text-black-500">
      {/* WRAPPER */}
      <div className="w-max flex">
        {/* SINGLE ITEM */}
        {featuredProducts.map((item) => (
          <div
            key={item.id}
            className="w-screen h-[60vh] flex flex-col items-center justify-around p-4 hover:bg-fuchsia-50 transition-all duration-300 md:w-[50vw] xl:w-[33vw] xl:h-[90vh]"
          >
            {/* IMAGE CONTAINER */}
            {item.img && (
              <div className="relative flex-1 w-full hover:rotate-[60deg] transition-all duration-500">
                <Image src={item.img} alt="" fill className="object-contain" />
              </div>
            )}
            {/* TEXT CONTAINER */}
            <div className=" flex-1 flex flex-col items-center justify-center text-center gap-4">
              <h1 className="text-xl font-bold uppercase xl:text-2xl 2xl:text-3xl">
                <DynamicText text={item.title} />
              </h1>
              <p className="p-4 2xl:p-8">
                <DynamicText text={item.desc || ""} />
              </p>
              {item.price && <span className="text-xl font-bold">Rs. {item.price}</span>}

            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Featured;
