import React from "react";
import { motion } from "motion/react";
import { Calendar, ArrowRight, Sparkles, Star, MapPin } from "lucide-react";
import HeroFloatingCards from "./HeroFloatingCards";

const Hero = ({ onBookingClick, onGalleryClick }) => {
  return (
    <section
      id="beranda"
      className="relative min-h-screen pt-20 pb-8 overflow-hidden bg-background"
    >
      {/* Background Gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-primary/3 pointer-events-none" />

      {/* Subtle Grid Pattern */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, hsl(var(--foreground)) 1px, transparent 0)`,
          backgroundSize: "40px 40px",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-[1fr,1.3fr] gap-6 lg:gap-4 items-center min-h-[calc(100vh-100px)]">
          {/* Left Content - More Compact */}
          <div className="space-y-5 lg:space-y-6">
            {/* Badge */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs sm:text-sm">
                <Sparkles className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="text-foreground/80 font-medium">
                  Self Photo Studio
                </span>
              </span>
            </motion.div>

            {/* Headline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="space-y-1"
            >
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground leading-[1.1]">
                Abadikan Momen
                <br />
                <span className="text-primary">Spesialmu</span>
              </h1>
              <p className="text-xl sm:text-2xl lg:text-3xl font-light italic text-muted-foreground">
                Bersama Kami
              </p>
            </motion.div>

            {/* Subtext - Hidden on small mobile */}
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="text-sm sm:text-base text-muted-foreground max-w-md leading-relaxed hidden sm:block"
            >
              Studio foto profesional dengan berbagai paket menarik. Hasil foto
              berkualitas tinggi dengan harga terjangkau.
            </motion.p>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
              className="flex flex-wrap gap-3"
            >
              <motion.button
                onClick={onBookingClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-primary text-primary-foreground text-sm sm:text-base font-medium hover:bg-primary/90 transition-all shadow-lg shadow-primary/25"
              >
                <Calendar className="w-4 h-4" />
                Booking Sekarang
                <ArrowRight className="w-3 h-3 sm:w-4 sm:h-4 group-hover:translate-x-1 transition-transform" />
              </motion.button>

              <motion.button
                onClick={onGalleryClick}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="group inline-flex items-center gap-2 px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-muted/50 border border-border text-foreground text-sm sm:text-base font-medium hover:bg-muted transition-all"
              >
                Lihat Gallery
              </motion.button>
            </motion.div>

            {/* Trust Badges */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="flex flex-wrap items-center gap-4 sm:gap-5 pt-2"
            >
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                </span>
                <span className="font-medium">Buka Hari Ini</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <Star className="w-3 h-3 sm:w-4 sm:h-4 text-primary fill-primary" />
                <span className="font-medium">4.9/5</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs sm:text-sm text-muted-foreground">
                <MapPin className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                <span className="font-medium">Strategis</span>
              </div>
            </motion.div>
          </div>

          {/* Right Content - Floating Cards (All Screens) */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, delay: 0.2 }}
            className="relative"
          >
            <HeroFloatingCards />
          </motion.div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
