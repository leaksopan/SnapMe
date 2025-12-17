import React, { useState } from "react";
import { useIsMobile } from "../../hooks/useMediaQuery";
import { Menu, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const LandingNav = ({ onLoginClick }) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const isMobile = useIsMobile();

  const navItems = [
    { label: "Beranda", href: "/", isPage: true },
    { label: "Paket", href: "/paket", isPage: true, comingSoon: true },
    { label: "Gallery", href: "/gallery", isPage: true, comingSoon: true },
    { label: "Claim Foto", href: "/claim-foto", isPage: true },
    { label: "Kontak", href: "/kontak", isPage: true, comingSoon: true },
  ];

  return (
    <nav className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-[95%] max-w-4xl">
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
        className="bg-background/70 backdrop-blur-xl border border-border/50 rounded-2xl shadow-lg shadow-black/5"
      >
        <div className="px-4 sm:px-6">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <a href="#beranda" className="flex items-center gap-2">
              <img
                src="/stiker logo snapme.png"
                alt="SnapMe"
                className="h-8 w-auto object-contain"
              />
            </a>

            {/* Desktop Navigation */}
            {!isMobile && (
              <div className="flex items-center gap-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      if (item.comingSoon) {
                        alert('Coming Soon! 🚀');
                      } else {
                        window.location.href = item.href;
                      }
                    }}
                    className="px-4 py-2 rounded-xl text-sm font-medium text-foreground/70 hover:text-foreground hover:bg-muted/50 transition-all"
                  >
                    {item.label}
                  </a>
                ))}
              </div>
            )}

            {/* CTA Button */}
            <div className="flex items-center gap-2">
              {!isMobile && (
                <button
                  onClick={onLoginClick}
                  className="px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Login
                </button>
              )}

              {/* Mobile Menu Button */}
              {isMobile && (
                <button
                  onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                  className="p-2 rounded-xl hover:bg-muted/50 transition-colors"
                >
                  {mobileMenuOpen ? (
                    <X className="w-5 h-5" />
                  ) : (
                    <Menu className="w-5 h-5" />
                  )}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {isMobile && mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="overflow-hidden border-t border-border/50"
            >
              <div className="px-4 py-3 space-y-1">
                {navItems.map((item) => (
                  <a
                    key={item.label}
                    href={item.href}
                    onClick={(e) => {
                      e.preventDefault();
                      setMobileMenuOpen(false);
                      if (item.comingSoon) {
                        alert('Coming Soon! 🚀');
                      } else {
                        window.location.href = item.href;
                      }
                    }}
                    className="block px-4 py-2.5 rounded-xl text-foreground/70 hover:bg-muted/50 hover:text-foreground transition-colors"
                  >
                    {item.label}
                  </a>
                ))}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onLoginClick();
                  }}
                  className="w-full mt-2 px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
                >
                  Login
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </nav>
  );
};

export default LandingNav;
