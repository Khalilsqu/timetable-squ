// C:\Users\kalho\Desktop\github\squ_frontend2\src\components\layout\PageTransition.tsx
// src/components/layout/PageTransition.tsx
import { motion } from "framer-motion";
import { type PropsWithChildren } from "react";

import type { Variants } from "framer-motion";

/* declare it once so TS sees the tuple, not an array */
// const cubic: [number, number, number, number] = [0.22, 0.61, 0.36, 1];

const variants: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0, transition: { duration: 0.3 } },
  exit: { opacity: 0, y: -20, transition: { duration: 0.2 } },
};

const PageTransition = ({ children }: PropsWithChildren) => (
  <motion.div
    variants={variants}
    initial="initial"
    animate="animate"
    exit="exit"
    className="h-full"
  >
    {children}
  </motion.div>
);

export default PageTransition;
