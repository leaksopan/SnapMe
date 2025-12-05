import React from "react";
import { motion, useInView } from "motion/react";
import { useRef } from "react";

const ScrollElement = ({
  children,
  className,
  direction = "up", // 'up', 'down', 'left', 'right'
  viewport = { amount: 0.5, margin: "0px 0px 0px 0px" },
  delay = 0,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, {
    once: true,
    amount: viewport.amount,
    margin: viewport.margin,
  });

  const getInitialPosition = () => {
    switch (direction) {
      case "up":
        return { opacity: 0, y: 50 };
      case "down":
        return { opacity: 0, y: -50 };
      case "left":
        return { opacity: 0, x: 50 };
      case "right":
        return { opacity: 0, x: -50 };
      default:
        return { opacity: 0, y: 50 };
    }
  };

  const getAnimatePosition = () => {
    switch (direction) {
      case "up":
      case "down":
        return { opacity: 1, y: 0 };
      case "left":
      case "right":
        return { opacity: 1, x: 0 };
      default:
        return { opacity: 1, y: 0 };
    }
  };

  return (
    <motion.div
      ref={ref}
      initial={getInitialPosition()}
      animate={isInView ? getAnimatePosition() : getInitialPosition()}
      transition={{
        duration: 0.6,
        ease: "easeOut",
        delay: delay,
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
};

export default ScrollElement;

