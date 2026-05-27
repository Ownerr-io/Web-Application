import { motion, useReducedMotion } from 'framer-motion';

export function LeadConversionSection() {
  const reduce = useReducedMotion();

  return (
    <motion.section
      className="mx-auto max-w-[1200px] px-4 pb-16"
      initial={reduce ? false : { opacity: 0, y: 12 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-60px' }}
      transition={{ duration: 0.4 }}
    >
    </motion.section>
  );
}
