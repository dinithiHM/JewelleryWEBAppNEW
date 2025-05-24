type Product = {
  id: number;
  title: string;
  desc?: string;
  img?: string;
  price?: number;
  options?: { title: string; additionalPrice: number }[];
};

type Products = Product[];

export const featuredProducts: Products = [
  {
    id: 1,
    title: "Wedding Earings",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/8.jpg",
  },
  {
    id: 2,
    title: "Barath Necklace",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/11.jpg",
  },
  {
    id: 3,
    title: "Cluster Earings",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/25.jpg",
  },
  {
    id: 4,
    title: "Wedding Earings",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/47.jpg",
  },
  {
    id: 5,
    title: "Wedding Earings",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/70.jpg",
  },
  {
    id: 6,
    title: "Wedding Earings",
    desc: "Two hearts, one promise, and a perfect pair of rings to celebrate your forever 💍✨ Crafted for love, designed to shine.",
    img: "/71.jpg",
  },
  {
    id: 7,
    title: "Wedding Earings",
    desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
    img: "/rings.jpg",
  },
  // {
  //   id: 8,
  //   title: "Wedding Earings",
  //   desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
  //   img: "/placeholder.jpg",
  //   price: 32.9,
  //   options: [
  //     {
  //       title: "Small",
  //       additionalPrice: 0,
  //     },
  //     {
  //       title: "Medium",
  //       additionalPrice: 4,
  //     },
  //     {
  //       title: "Large",
  //       additionalPrice: 6,
  //     },
  //   ],
  // },
  // {
  //   id: 9,
  //   title: "Wedding Earings",
  //   desc: "Step into the spotlight with earrings that steal the show! ✨🎉 Perfectly designed for every unforgettable party moment",
  //   img: "/placeholder.jpg",
  //   price: 29.9,
  //   options: [
  //     {
  //       title: "Small",
  //       additionalPrice: 0,
  //     },
  //     {
  //       title: "Medium",
  //       additionalPrice: 4,
  //     },
  //     {
  //       title: "Large",
  //       additionalPrice: 6,
  //     },
  //   ],
  // },
];




