import React, { useEffect, useState } from "react";
import { supabase } from "../../supabaseClient";

// Format harga ke Rupiah
const formatRupiah = (num) => {
  return new Intl.NumberFormat("id-ID").format(num);
};

const PackageSection = () => {
  const [packages, setPackages] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPackages = async () => {
      try {
        const { data, error } = await supabase
          .from("items")
          .select("*")
          .eq("category", "studio")
          .eq("is_active", true)
          .order("price", { ascending: true });

        if (error) throw error;
        setPackages(data || []);
      } catch (err) {
        console.error("Error fetching packages:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPackages();
  }, []);

  // Placeholder images untuk paket (karena image_url beberapa masih null)
  const placeholderImages = [
    "https://images.unsplash.com/photo-1718838541476-d04e71caa347?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1715432362539-6ab2ab480db2?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1718601980986-0ce75101d52d?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1685904042960-66242a0ac352?w=500&auto=format&fit=crop",
    "https://images.unsplash.com/photo-1718183120769-ece47f31045b?w=500&auto=format&fit=crop",
  ];

  const getImage = (pkg, index) => {
    if (pkg.image_url && !pkg.image_url.includes("picsum")) {
      return pkg.image_url;
    }
    return placeholderImages[index % placeholderImages.length];
  };

  if (loading) {
    return (
      <section className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-foreground text-xl">Memuat paket...</div>
      </section>
    );
  }

  return (
    <section id="paket" className="text-foreground w-full bg-background">
      <div className="grid grid-cols-1 lg:grid-cols-2">
        {/* Left - Sticky Title */}
        <div className="sticky top-0 h-screen flex items-center justify-center">
          <div className="text-center px-8">
            {/* <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-6">
              <span className="text-primary font-medium">Pilihan Paket</span>
            </span> */}
            <h1 className="2xl:text-7xl text-4xl md:text-5xl font-semibold tracking-tight leading-[120%] text-foreground">
              Temukan Paket
              <br /> Sesuai Kebutuhanmu
            </h1>
            {/* <p className="text-muted-foreground mt-6 max-w-md mx-auto">
              Scroll ke bawah untuk melihat semua paket foto studio kami
            </p> */}
          </div>
        </div>

        {/* Right - Scrolling Package Cards */}
        <div className="grid gap-2 py-4">
          {packages.map((pkg, index) => (
            <figure
              key={pkg.id}
              className={`grid place-content-center ${
                index % 2 === 0 ? "-skew-x-6" : "skew-x-6"
              }`}
            >
              <div className="relative group cursor-pointer shadow-[0_8px_30px_rgba(37,99,235,0.3)] hover:shadow-[0_12px_40px_rgba(37,99,235,0.5)] transition-all duration-300 rounded-lg">
                <img
                  src={getImage(pkg, index)}
                  alt={pkg.name}
                  className="transition-all duration-300 w-80 h-96 align-bottom object-cover rounded-lg"
                />
                {/* Overlay dengan info paket */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/40 to-transparent rounded-lg flex flex-col justify-end p-6">
                  <h3 className="text-xl font-bold text-white mb-1">
                    {pkg.name}
                  </h3>
                  {pkg.duration && (
                    <p className="text-gray-300 text-sm mb-2">{pkg.duration}</p>
                  )}
                  <p className="text-2xl font-bold text-primary">
                    Rp {formatRupiah(pkg.price)}
                  </p>
                </div>
              </div>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
};

export default PackageSection;
