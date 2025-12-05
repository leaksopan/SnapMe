import React, { useState } from "react";
import { AnimatePresence, motion } from "motion/react";

const studioItems = [
  {
    id: 1,
    url:
      "https://images.unsplash.com/photo-1709949908058-a08659bfa922?q=80&w=1200&auto=format",
    title: "Studio Basic",
    description:
      "Studio dengan setup lighting profesional untuk foto portrait dan keluarga.",
    tags: ["Studio", "Portrait", "Family"],
  },
  {
    id: 2,
    url:
      "https://images.unsplash.com/photo-1548192746-dd526f154ed9?q=80&w=1200&auto=format",
    title: "Studio MRT",
    description: "Konsep MRT Jakarta untuk foto yang unik dan instagramable.",
    tags: ["MRT", "Unique", "Instagram"],
  },
  {
    id: 3,
    url:
      "https://images.unsplash.com/photo-1693581176773-a5f2362209e6?q=80&w=1200&auto=format",
    title: "Basic Tirai",
    description:
      "Studio dengan berbagai pilihan tirai warna untuk backdrop yang bervariasi.",
    tags: ["Tirai", "Colorful", "Backdrop"],
  },
  {
    id: 4,
    url:
      "https://images.unsplash.com/photo-1584043204475-8cc101d6c77a?q=80&w=1200&auto=format",
    title: "Spot Light",
    description:
      "Setup spotlight untuk foto dengan efek dramatis dan artistik.",
    tags: ["Spotlight", "Dramatic", "Artistic"],
  },
  {
    id: 5,
    url:
      "https://images.unsplash.com/photo-1709949908058-a08659bfa922?q=80&w=1200&auto=format",
    title: "Photobox",
    description:
      "Area photobox untuk foto grup yang menyenangkan dengan props lucu.",
    tags: ["Photobox", "Group", "Fun"],
  },
];

const article = {
  hidden: { opacity: 0, y: 20 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 100,
      delayChildren: 0.2,
      staggerChildren: 0.1,
    },
  },
};

function Gallery({ items, setIndex, index }) {
  return (
    <div className="w-fit mx-auto gap-1 flex pb-20 pt-10">
      {items.slice(0, 5).map((item, i) => {
        return (
          <motion.div
            whileTap={{ scale: 0.95 }}
            className={`rounded-xl relative ${
              index === i ? "w-[450px]" : "w-[50px]"
            } h-[400px] shrink-0 transition-[width] ease-in-linear duration-500 origin-center`}
            key={i}
            onClick={() => {
              setIndex(i);
            }}
            onMouseEnter={() => {
              setIndex(i);
            }}
          >
            <motion.img
              src={item?.url}
              alt={item?.title}
              className={`${
                index === i ? "cursor-default" : "cursor-pointer"
              } w-full rounded-xl h-full object-cover`}
            />
            <AnimatePresence mode="wait">
              {index === i && (
                <motion.article
                  variants={article}
                  initial="hidden"
                  animate="show"
                  className="absolute flex rounded-xl flex-col justify-end h-full top-0 p-3 space-y-2 overflow-hidden bg-gradient-to-t from-black/60 from-20% to-transparent to-80%"
                >
                  <motion.h1
                    variants={article}
                    className="text-2xl font-semibold text-white"
                  >
                    {item?.title}
                  </motion.h1>
                  <motion.p
                    variants={article}
                    className="leading-[120%] text-gray-200"
                  >
                    {item?.description}
                  </motion.p>
                </motion.article>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
}

const StudioSection = () => {
  const [index, setIndex] = useState(2);

  return (
    <section id="studio" className="bg-background py-20">
      {/* Header */}
      <div className="text-center px-4 mb-8">
        <h1 className="text-4xl md:text-6xl font-semibold text-foreground">
          Studio Kami
        </h1>
        <p className="text-muted-foreground mt-4 max-w-md mx-auto">
          Lihat Keadaan Studio Kami
        </p>
      </div>

      {/* Gallery */}
      <div className="relative">
        <Gallery items={studioItems} index={index} setIndex={setIndex} />
      </div>
    </section>
  );
};

export default StudioSection;
