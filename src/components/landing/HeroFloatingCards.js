import React, { useEffect, useState, useCallback, useMemo } from "react";
import Autoplay from "embla-carousel-autoplay";
import { AnimatePresence, motion } from "motion/react";
import { supabase } from "../../supabaseClient";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { cn } from "../../lib/utils";
import { Carousel, CarouselContent, CarouselItem } from "../ui/carousel";

const HeroFloatingCards = () => {
  const [photos, setPhotos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [api, setApi] = useState();
  const [current, setCurrent] = useState(0);
  const isMobile = useIsMobile();

  const totalPhotos = 7;

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

  // Listen to carousel selection
  useEffect(() => {
    if (!api) return;

    api.on("select", () => {
      setCurrent(api.selectedScrollSnap());
    });
  }, [api]);

  // Placeholder photos
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
  ];

  const displayPhotos =
    photos.length >= totalPhotos
      ? photos.slice(0, totalPhotos)
      : placeholderPhotos;

  // Hero228 rotation logic - 1:1
  const getRotation = useCallback(
    (index) => {
      if (index === current)
        return "md:-rotate-[25deg] md:translate-x-28 md:scale-[0.8] md:relative";
      if (index === current + 1)
        return "md:rotate-0 md:z-10 md:relative md:scale-100";
      if (index === current + 2)
        return "md:rotate-[25deg] md:-translate-x-28 md:scale-[0.8] md:relative";
      return "";
    },
    [current]
  );

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
          loop: true,
        }}
      >
        <CarouselContent>
          {Array.from({
            length: isMobile ? displayPhotos.length : displayPhotos.length + 2,
          }).map((_, index) => {
            // Get the actual photo (handle wrap-around for desktop extra items)
            const photoIndex = index % displayPhotos.length;
            const photo = displayPhotos[photoIndex];

            return (
              <CarouselItem key={index} className="my-10 md:basis-1/3">
                <div
                  className={cn(
                    "h-[280px] md:h-[380px] w-full transition-transform duration-500 ease-in-out",
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
              {displayPhotos[current % displayPhotos.length]?.name}
            </motion.p>
          </AnimatePresence>
          <div className="flex gap-1">{scrollbarBars}</div>
        </div>
      </Carousel>
    </div>
  );
};

export default HeroFloatingCards;
