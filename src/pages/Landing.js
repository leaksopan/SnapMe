import React from "react";
import { ReactLenis } from "lenis/react";
import { LandingNav, Hero, HowToBook, PackageSection, GallerySection, StudioSection } from "../components/landing";
import { useTheme } from "../contexts/ThemeContext";
import { Button } from "../components/ui/button";
import { Sun, Moon } from "lucide-react";

const Landing = ({ onLoginClick }) => {
  const { theme, toggleTheme } = useTheme();

  const handleBookingClick = () => {
    // Scroll ke section How To Book
    const howToBookSection = document.querySelector("section");
    if (howToBookSection) {
      howToBookSection.scrollIntoView({ behavior: "smooth" });
    }
  };

  const handleGalleryClick = () => {
    const gallerySection = document.getElementById("gallery");
    if (gallerySection) {
      gallerySection.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <ReactLenis root>
      <div className={theme}>
        {/* Theme Switcher */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleTheme}
          className="fixed bottom-4 right-4 z-50 h-10 w-10 rounded-full bg-background/80 backdrop-blur-sm border shadow-lg"
        >
          {theme === "dark" ? (
            <Sun className="w-4 h-4" />
          ) : (
            <Moon className="w-4 h-4" />
          )}
        </Button>

        {/* Navigation */}
        <LandingNav onLoginClick={onLoginClick} />

        {/* Hero Section */}
        <Hero
          onBookingClick={handleBookingClick}
          onGalleryClick={handleGalleryClick}
        />

        {/* How To Book Section - Horizontal Scroll */}
        <HowToBook />

        {/* Package Section - Sticky Scroll */}
        <PackageSection />

        {/* Gallery Section - Scroll Animation */}
        <GallerySection />

        {/* Studio Section - Expandable Gallery */}
        <StudioSection />

        {/* Kontak Section - Placeholder */}
        <section
          id="kontak"
          className="min-h-[50vh] bg-background flex items-center justify-center py-20"
        >
          <div className="text-center space-y-4 px-4">
            <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm">
              <span className="text-foreground/80 font-medium">Coming Soon</span>
            </span>
            <h2 className="text-3xl md:text-4xl font-bold text-foreground">
              Hubungi Kami
            </h2>
            <p className="text-muted-foreground max-w-md mx-auto">
              Ada pertanyaan? Jangan ragu untuk menghubungi kami
            </p>
          </div>
        </section>

        {/* Footer */}
        <footer className="bg-foreground text-background py-12">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <img
                  src="/stiker logo snapme.png"
                  alt="SnapMe"
                  className="h-10 w-auto object-contain brightness-0 invert"
                />
              </div>
              <p className="text-background/70 text-sm">
                © 2025 SnapMe Studio. All rights reserved.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </ReactLenis>
  );
};

export default Landing;
