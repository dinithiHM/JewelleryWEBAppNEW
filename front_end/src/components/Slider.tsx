"use client";
import Image from "next/image";
import React, { useEffect, useState } from "react";

const data = [
  { id: 1, title: "JOURNEY TO GOLDEN ELEGANCE", subtitle: "Where gold meets grace, every piece tells a story of elegance and heritage", image: "/slide1.png" },
  { id: 2, title: " EXPLORE BEAUTY IN GOLD", subtitle: "Discover the timeless beauty of gold—where every piece tells a story of luxury and adventure", image: "/slide2.png" },
  { id: 3, title: "FROM DREAMS TO GOLDEN BRILLIANCE", subtitle: "Gold, the language of luxury, speaking through the artistry of every design", image: "/slide3.jpg" },
];

const Slider: React.FC = () => {
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev === data.length - 1 ? 0 : prev + 1));
    }, 4000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative w-full h-[calc(100vh-6rem)] md:h-[calc(100vh-9rem)]">
      {data.map((slide, index) => (
        <div
          key={slide.id}
          className={`absolute inset-0 transition-opacity duration-1000 ${
            index === currentSlide ? "opacity-100" : "opacity-0"
          }`}
        >
          <Image
            src={slide.image}
            alt="slide image"
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 80vw, 60vw"
            className="object-cover"
          />
          {/* Title and Subheading */}
          <div className="absolute bottom-70 left-1/2 transform -translate-x-1/2 text-white text-4xl font- italic text-center">
            <h1>{slide.title}</h1>
            <p className="text-xl mt-2">{slide.subtitle}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default Slider;
