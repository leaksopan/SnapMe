import React, { useEffect, useRef } from "react";
import { animate, scroll } from "motion";
import {
  Package,
  CalendarClock,
  CreditCard,
  MapPin,
  ImageDown,
  ArrowDown,
  Sparkles,
} from "lucide-react";

const steps = [
  {
    id: 1,
    title: "PILIH PAKET",
    subtitle: "Temukan paket yang sesuai kebutuhanmu",
    icon: Package,
    color: "bg-blue-100 dark:bg-blue-950/30",
    iconBg: "bg-blue-200 dark:bg-blue-900/50",
    iconColor: "text-blue-600 dark:text-blue-400",
  },
  {
    id: 2,
    title: "TENTUKAN WAKTU",
    subtitle: "Pilih tanggal dan jam yang tersedia",
    icon: CalendarClock,
    color: "bg-violet-100 dark:bg-violet-950/30",
    iconBg: "bg-violet-200 dark:bg-violet-900/50",
    iconColor: "text-violet-600 dark:text-violet-400",
  },
  {
    id: 3,
    title: "BAYAR",
    subtitle: "Lakukan pembayaran dengan mudah",
    icon: CreditCard,
    color: "bg-emerald-100 dark:bg-emerald-950/30",
    iconBg: "bg-emerald-200 dark:bg-emerald-900/50",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  {
    id: 4,
    title: "DATANG KE STUDIO",
    subtitle: "Kunjungi studio sesuai jadwal",
    icon: MapPin,
    color: "bg-amber-100 dark:bg-amber-950/30",
    iconBg: "bg-amber-200 dark:bg-amber-900/50",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  {
    id: 5,
    title: "TERIMA HASIL",
    subtitle: "Dapatkan foto berkualitas tinggi",
    icon: ImageDown,
    color: "bg-rose-100 dark:bg-rose-950/30",
    iconBg: "bg-rose-200 dark:bg-rose-900/50",
    iconColor: "text-rose-600 dark:text-rose-400",
  },
];

function HowToBook() {
  const ulRef = useRef(null);
  const sectionRef = useRef(null);

  useEffect(() => {
    const items = document.querySelectorAll(".scroll-item");

    if (ulRef.current && sectionRef.current && items.length > 0) {
      // Main horizontal scroll animation - translate by (n-1) * 100vw
      const totalTranslate = (items.length - 1) * 100;

      const controls = animate(
        ulRef.current,
        {
          transform: [`translateX(0vw)`, `translateX(-${totalTranslate}vw)`],
        },
        { easing: "ease-out" }
      );

      scroll(controls, { target: sectionRef.current });

      // Animate headers with parallax effect
      const segmentLength = 1 / items.length;
      items.forEach((item, i) => {
        const header = item.querySelector(".parallax-title");
        if (header && sectionRef.current) {
          scroll(animate(header, { x: [500, -500] }), {
            target: sectionRef.current,
            offset: [
              [i * segmentLength, 1],
              [(i + 1) * segmentLength, 0],
            ],
          });
        }
      });
    }
  }, []);

  return (
    <div className="bg-background">
      {/* Section Header */}
      <header className="relative w-full bg-gradient-to-b from-muted/50 to-background py-20 px-4">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/20 text-sm mb-6">
            {/* <Sparkles className="w-4 h-4 text-primary" /> */}
            {/* <span className="text-foreground/80 font-medium">
              Mudah & Cepat
            </span> */}
          </span>
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-foreground tracking-tight mb-4">
            Cara Booking
          </h1>
          {/* <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Ikuti 5 langkah mudah untuk memesan sesi foto di SnapMe Studio
          </p> */}
          <div className="flex items-center justify-center gap-2 mt-8 text-sm text-muted-foreground">
            {/* <span>Scroll ke bawah</span> */}
            <ArrowDown className="w-4 h-4 animate-bounce" />
          </div>
        </div>
      </header>

      {/* Horizontal Scroll Section */}
      <section ref={sectionRef} className="h-[500vh] relative">
        <ul
          ref={ulRef}
          className="sticky top-0 flex"
          style={{ width: `${steps.length * 100}vw` }}
        >
          {steps.map((step, index) => {
            const IconComponent = step.icon;
            return (
              <li
                key={step.id}
                className={`scroll-item h-screen flex-shrink-0 flex flex-col justify-center items-center overflow-hidden ${step.color} relative`}
                style={{ width: "100vw" }}
              >
                {/* Step Number */}
                <div className="absolute top-8 left-8 md:top-12 md:left-12">
                  <span className="text-[120px] md:text-[180px] font-bold text-foreground/[0.04] leading-none">
                    0{step.id}
                  </span>
                </div>

                {/* Main Title - Parallax */}
                <h2 className="parallax-title text-[15vw] md:text-[12vw] font-bold text-foreground/[0.03] absolute whitespace-nowrap select-none pointer-events-none">
                  {step.title}
                </h2>

                {/* Content Card */}
                <div className="relative z-10 flex flex-col items-center text-center px-6 max-w-lg">
                  {/* Icon */}
                  <div
                    className={`w-24 h-24 md:w-32 md:h-32 rounded-3xl ${step.iconBg} flex items-center justify-center mb-8 shadow-lg`}
                  >
                    <IconComponent
                      className={`w-12 h-12 md:w-16 md:h-16 ${step.iconColor}`}
                      strokeWidth={1.5}
                    />
                  </div>

                  {/* Title */}
                  <h3 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
                    {step.title}
                  </h3>

                  {/* Subtitle */}
                  <p className="text-base md:text-lg text-muted-foreground">
                    {step.subtitle}
                  </p>

                  {/* Step indicator */}
                  {/* <div className="flex items-center gap-2 mt-8">
                    {steps.map((_, i) => (
                      <div
                        key={i}
                        className={`h-2 rounded-full transition-all duration-300 ${
                          i === index
                            ? "w-8 bg-primary"
                            : "w-2 bg-foreground/20"
                        }`}
                      />
                    ))}
                  </div> */}
                </div>
              </li>
            );
          })}
        </ul>
      </section>
    </div>
  );
}

export default HowToBook;
