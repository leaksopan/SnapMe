import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";
import ScrollElement from "../ui/scroll-animation";

// 20 Placeholder images
const placeholderImages = [
  {
    id: "p1",
    name: "Studio Session",
    category: "studio",
    image_url:
      "https://images.unsplash.com/photo-1529686342540-1b43aec0df75?w=600&auto=format&fit=crop",
  },
  {
    id: "p2",
    name: "Portrait",
    category: "portrait",
    image_url:
      "https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=600&auto=format&fit=crop",
  },
  {
    id: "p3",
    name: "Group Photo",
    category: "group",
    image_url:
      "https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=600&auto=format&fit=crop",
  },
  {
    id: "p4",
    name: "Graduation",
    category: "graduation",
    image_url:
      "https://images.unsplash.com/photo-1523050854058-8df90110c9f1?w=600&auto=format&fit=crop",
  },
  {
    id: "p5",
    name: "Family Portrait",
    category: "family",
    image_url:
      "https://images.unsplash.com/photo-1511895426328-dc8714191300?w=600&auto=format&fit=crop",
  },
  {
    id: "p6",
    name: "Professional",
    category: "professional",
    image_url:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=600&auto=format&fit=crop",
  },
  {
    id: "p7",
    name: "Creative Shot",
    category: "creative",
    image_url:
      "https://images.unsplash.com/photo-1494790108755-2616b612b47c?w=600&auto=format&fit=crop",
  },
  {
    id: "p8",
    name: "Couple Session",
    category: "couple",
    image_url:
      "https://images.unsplash.com/photo-1522673607200-164d1b6ce486?w=600&auto=format&fit=crop",
  },
  {
    id: "p9",
    name: "Birthday Party",
    category: "event",
    image_url:
      "https://images.unsplash.com/photo-1530103862676-de8c9debad1d?w=600&auto=format&fit=crop",
  },
  {
    id: "p10",
    name: "Studio Lighting",
    category: "studio",
    image_url:
      "https://images.unsplash.com/photo-1516035069371-29a1b244cc32?w=600&auto=format&fit=crop",
  },
  {
    id: "p11",
    name: "Kids Photo",
    category: "kids",
    image_url:
      "https://images.unsplash.com/photo-1503454537195-1dcabb73ffb9?w=600&auto=format&fit=crop",
  },
  {
    id: "p12",
    name: "Fashion Shot",
    category: "fashion",
    image_url:
      "https://images.unsplash.com/photo-1469334031218-e382a71b716b?w=600&auto=format&fit=crop",
  },
  {
    id: "p13",
    name: "Candid Moment",
    category: "candid",
    image_url:
      "https://images.unsplash.com/photo-1517841905240-472988babdf9?w=600&auto=format&fit=crop",
  },
  {
    id: "p14",
    name: "Friends Forever",
    category: "group",
    image_url:
      "https://images.unsplash.com/photo-1539635278303-d4002c07eae3?w=600&auto=format&fit=crop",
  },
  {
    id: "p15",
    name: "Selfie Studio",
    category: "selfie",
    image_url:
      "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=600&auto=format&fit=crop",
  },
  {
    id: "p16",
    name: "Maternity",
    category: "maternity",
    image_url:
      "https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=600&auto=format&fit=crop",
  },
  {
    id: "p17",
    name: "Pet Photo",
    category: "pet",
    image_url:
      "https://images.unsplash.com/photo-1587300003388-59208cc962cb?w=600&auto=format&fit=crop",
  },
  {
    id: "p18",
    name: "Corporate",
    category: "corporate",
    image_url:
      "https://images.unsplash.com/photo-1560250097-0b93528c311a?w=600&auto=format&fit=crop",
  },
  {
    id: "p19",
    name: "Artistic",
    category: "artistic",
    image_url:
      "https://images.unsplash.com/photo-1492106087820-71f1a00d2b11?w=600&auto=format&fit=crop",
  },
  {
    id: "p20",
    name: "Celebration",
    category: "event",
    image_url:
      "https://images.unsplash.com/photo-1496843916299-590492c751f4?w=600&auto=format&fit=crop",
  },
];

const GallerySection = () => {
  const [images, setImages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        // Fetch dari items yang punya image_url
        const { data, error } = await supabase
          .from("items")
          .select("id, name, image_url, category")
          .not("image_url", "is", null)
          .eq("is_active", true)
          .order("created_at", { ascending: false });

        if (error) throw error;

        // Gabungkan data dari Supabase dengan placeholder
        const allImages = [...(data || []), ...placeholderImages];
        setImages(allImages);
      } catch (err) {
        console.error("Error fetching images:", err);
        // Kalau error, tetap tampilkan placeholder
        setImages(placeholderImages);
      } finally {
        setLoading(false);
      }
    };

    fetchImages();
  }, []);

  // Pattern directions untuk variasi animasi
  const getDirection = (index) => {
    const directions = ["left", "up", "right"];
    return directions[index % 3];
  };

  if (loading) {
    return (
      <section
        id="gallery"
        className="min-h-screen bg-background flex items-center justify-center py-20"
      >
        <div className="text-foreground text-xl">Memuat gallery...</div>
      </section>
    );
  }

  return (
    <section id="gallery" className="bg-background py-20">
      {/* Header */}
      <div className="h-[300px] grid place-content-center">
        <div className="text-center px-4">
          <span className="">
            {/* <span className="text-primary font-medium">Gallery</span> */}
          </span>
          <h1 className="text-4xl md:text-6xl font-semibold text-foreground">
            Hasil Karya Kami
          </h1>
          <p className="text-muted-foreground mt-4 max-w-md mx-auto"></p>
        </div>
      </div>

      {/* Gallery Grid - Masonry 3 columns */}
      <div className="px-4 md:px-8 lg:px-16 py-2">
        <div className="columns-2 md:columns-3 gap-2">
          {images.map((item, index) => (
            <ScrollElement
              key={item.id}
              direction={getDirection(index)}
              viewport={{ amount: 0.3, margin: "0px 0px 0px 0px" }}
              delay={index * 0.05}
            >
              <div className="relative group mb-2 overflow-hidden rounded-lg">
                <img
                  src={item.image_url}
                  alt={item.name}
                  className="w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  loading="lazy"
                />
                {/* Overlay on hover */}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                  <div>
                    <p className="text-white font-semibold">{item.name}</p>
                    <p className="text-gray-300 text-sm capitalize">
                      {item.category}
                    </p>
                  </div>
                </div>
              </div>
            </ScrollElement>
          ))}
        </div>
      </div>
    </section>
  );
};

export default GallerySection;
