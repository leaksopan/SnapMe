"use client";

import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "motion/react";
import React, { useEffect, useState, useCallback, useMemo } from "react";
import { supabase } from "../../supabaseClient";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from "../ui/carousel";

const HeroFloatingCards = () => {
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);

  const isMobile = useIsMobile();
  const totalPhotos = 27;
  const loopBackToIndex = 4; // Loop back to 5th photo (index 4)

  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      const selectedIndex = api.selectedScrollSnap();
      setCurrent(selectedIndex);
      
      // Custom loop: when reaching near the end, jump to loopBackToIndex
      const totalSlides = api.scrollSnapList().length;
      if (selectedIndex >= totalSlides - 1) {
        setTimeout(() => {
          api.scrollTo(loopBackToIndex, false);
        }, 2500);
      }
    });
  }, [api]);

  useEffect(() => {
    const fetchPhotos = async () => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("id, name, image_url, category")
          .not("image_url", "is", null)
          .neq("image_url", "")
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(totalPhotos);

        if (error) throw error;
        const validPhotos = (data || []).filter(
          (item) => !item.image_url?.includes("picsum")
        );
        setPhotos(validPhotos);
      } catch (err) {
        console.error("Error fetching photos:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchPhotos();
  }, []);

  // Placeholder photos - 27 unique photos
  const placeholderPhotos = [
    {
      id: "p1",
      name: "Studio Portrait",
      image_url:
        "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=400&auto=format&fit=crop",
    },
    {
      id: "p2",
      name: "Creative Shot",
      image_url:
        "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=400&auto=format&fit=crop",
    },
    {
      id: "p3",
      name: "Fashion Photo",
      image_url:
        "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=400&auto=format&fit=crop",
    },
    {
      id: "p4",
      name: "Artistic Portrait",
      image_url:
        "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=400&auto=format&fit=crop",
    },
    {
      id: "p5",
      name: "Studio Session",
      image_url:
        "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop",
    },
    {
      id: "p6",
      name: "Group Photo",
      image_url:
        "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&auto=format&fit=crop",
    },
    {
      id: "p7",
      name: "Family Portrait",
      image_url:
        "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=400&auto=format&fit=crop",
    },
    {
      id: "p8",
      name: "Urban Style",
      image_url:
        "https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=400&auto=format&fit=crop",
    },
    {
      id: "p9",
      name: "Natural Light",
      image_url:
        "https://images.unsplash.com/photo-1488426862026-3ee34a7d66df?w=400&auto=format&fit=crop",
    },
    {
      id: "p10",
      name: "Professional Headshot",
      image_url:
        "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=400&auto=format&fit=crop",
    },
    {
      id: "p11",
      name: "Candid Moment",
      image_url:
        "https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=400&auto=format&fit=crop",
    },
    {
      id: "p12",
      name: "Lifestyle Shot",
      image_url:
        "https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?w=400&auto=format&fit=crop",
    },
    {
      id: "p13",
      name: "Elegant Portrait",
      image_url:
        "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=400&auto=format&fit=crop",
    },
    {
      id: "p14",
      name: "Street Fashion",
      image_url:
        "https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=400&auto=format&fit=crop",
    },
    {
      id: "p15",
      name: "Classic Beauty",
      image_url:
        "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=400&auto=format&fit=crop",
    },
    {
      id: "p16",
      name: "Modern Portrait",
      image_url:
        "https://images.unsplash.com/photo-1552058544-f2b08422138a?w=400&auto=format&fit=crop",
    },
    {
      id: "p17",
      name: "Dramatic Light",
      image_url:
        "https://images.unsplash.com/photo-1504257432389-52343af06ae3?w=400&auto=format&fit=crop",
    },
    {
      id: "p18",
      name: "Casual Portrait",
      image_url:
        "https://images.unsplash.com/photo-1489424731084-a5d8b219a5bb?w=400&auto=format&fit=crop",
    },
    {
      id: "p19",
      name: "Studio Lighting",
      image_url:
        "https://images.unsplash.com/photo-1463453091185-61582044d556?w=400&auto=format&fit=crop",
    },
    {
      id: "p20",
      name: "Golden Hour",
      image_url:
        "https://images.unsplash.com/photo-1519699047748-de8e457a634e?w=400&auto=format&fit=crop",
    },
    {
      id: "p21",
      name: "Outdoor Session",
      image_url:
        "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=400&auto=format&fit=crop",
    },
    {
      id: "p22",
      name: "Editorial Style",
      image_url:
        "https://images.unsplash.com/photo-1531123897727-8f129e1688ce?w=400&auto=format&fit=crop",
    },
    {
      id: "p23",
      name: "Portrait Series",
      image_url:
        "https://images.unsplash.com/photo-1499952127939-9bbf5af6c51c?w=400&auto=format&fit=crop",
    },
    {
      id: "p24",
      name: "Beauty Shot",
      image_url:
        "https://images.unsplash.com/photo-1502823403499-6ccfcf4fb453?w=400&auto=format&fit=crop",
    },
    {
      id: "p25",
      name: "Monochrome Style",
      image_url:
        "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop",
    },
    {
      id: "p26",
      name: "Expressive Art",
      image_url:
        "https://images.unsplash.com/photo-1487222477894-8943e31ef7b2?w=400&auto=format&fit=crop",
    },
    {
      id: "p27",
      name: "Studio Classic",
      image_url:
        "https://images.unsplash.com/photo-1528892952291-009c663ce843?w=400&auto=format&fit=crop",
    },
  ];

  const displayPhotos =
    photos.length >= totalPhotos
      ? photos.slice(0, totalPhotos)
      : placeholderPhotos;

  // Hero228 rotation logic - adjusted for better visibility
  // current = LEFT card (rotated, scaled, translated right)
  // current+1 = CENTER card (focused, no rotation)
  // current+2 = RIGHT card (rotated, scaled, translated left)
  const getRotation = useCallback(
    (index) => {
      if (index === current)
        return "md:-rotate-[25deg] md:translate-x-28 md:scale-[0.85] md:relative";
      if (index === current + 1) 
        return "md:rotate-0 md:z-10 md:relative md:scale-100";
      if (index === current + 2)
        return "md:rotate-[25deg] md:-translate-x-28 md:scale-[0.85] md:relative";
      return "";
    },
    [current]
  );

  // Get the photo for an index, handling wrap-around for extra items
  const getPhotoForIndex = useCallback(
    (index) => {
      if (index >= displayPhotos.length) {
        // Wrap around for extra items at the end
        const wrapIndex = index - displayPhotos.length;
        return displayPhotos[wrapIndex] || displayPhotos[0];
      }
      return displayPhotos[index];
    },
    [displayPhotos]
  );

  // Get the display name for current slide
  const getCurrentName = useCallback(() => {
    // The CENTER card is at current + 1, so that's what we display
    const centerIndex = current + 1;
    const photo = getPhotoForIndex(centerIndex);
    return photo?.name || "";
  }, [current, getPhotoForIndex]);

  // Scrollbar bars animation - exactly like Hero228
  const scrollbarBars = useMemo(
    () =>
      [...Array(40)].map((_, item) => (
        <motion.div
          key={item}
          initial={{
            opacity: item % 5 === 0 ? 0.2 : 0.2,
            filter: "blur(1px)",
          }}
          animate={{
            opacity: item % 5 === 0 ? 1 : 0.2,
            filter: "blur(0px)",
          }}
          transition={{
            duration: 0.2,
            delay: item % 5 === 0 ? (item / 5) * 0.05 : 0,
            ease: "easeOut",
          }}
          className={cn(
            "w-[1px] bg-foreground/80",
            item % 5 === 0 ? "h-[15px]" : "h-[10px]"
          )}
        />
      )),
    []
  );

  if (loading) {
    return (
      <div className="relative w-full h-[320px] md:h-[450px]">
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // Calculate total items: on mobile = photos only, on desktop = photos + 2 for seamless loop
  const totalItems = isMobile ? displayPhotos.length : displayPhotos.length + 2;

  return (
    <div className="relative w-full flex flex-col items-center justify-center">
      <Carousel
        className="w-full max-w-5xl"
        plugins={[
          Autoplay({
            delay: 2500,
            stopOnInteraction: true,
          }),
        ]}
        setApi={setApi}
        opts={{
          align: "start",
          loop: false,
        }}
      >
        <CarouselContent>
          {Array.from({ length: totalItems }).map((_, index) => {
            const photo = getPhotoForIndex(index);

            return (
              <CarouselItem key={index} className="my-10 md:basis-1/3">
                <div
                  className={cn(
                    "h-[280px] md:h-[420px] w-full transition-transform duration-500 ease-in-out",
                    getRotation(index)
                  )}
                >
                  <div className="relative h-full w-full overflow-hidden rounded-2xl border-4 border-background bg-card shadow-[0_10px_40px_rgba(37,99,235,0.25)]">
                    <img
                      src={photo?.image_url}
                      alt={photo?.name}
                      className="h-full w-full object-cover"
                    />
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
                    {/* Photo name */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <p className="text-white font-semibold text-sm md:text-base truncate">
                        {photo?.name}
                      </p>
                      <p className="text-white/70 text-xs md:text-sm">
                        SnapMe Studio
                      </p>
                    </div>
                  </div>
                </div>
              </CarouselItem>
            );
          })}
        </CarouselContent>

        {/* Bottom indicator with scrollbar bars and animated name */}
        <div className="absolute bottom-0 right-0 flex w-full translate-y-full flex-col items-center justify-center gap-2 pt-4">
          <div className="flex gap-1">{scrollbarBars}</div>
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.p
              key={current}
              className="w-full text-center text-base md:text-lg font-medium text-foreground"
              initial={{ opacity: 0, y: 20, scale: 0.9, filter: "blur(5px)" }}
              animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: -20, scale: 0.9, filter: "blur(5px)" }}
              transition={{ duration: 0.5 }}
            >
              {getCurrentName()}
            </motion.p>
          </AnimatePresence>
          <div className="flex gap-1">{scrollbarBars}</div>
        </div>
      </Carousel>
    </div>
  );
};

export default HeroFloatingCards;
