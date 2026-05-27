import { Link } from "wouter";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type Props = {
  className?: string;
  href?: string;
  label?: string;
};

export function OwnerrNetworkStickyCta({
  className,
  href = "/products/ownerr-network",
  label = "OWNERR NETWORK",
}: Props) {
  return (
    <motion.div
      className={cn(
        "pointer-events-none fixed bottom-4 left-1/2 z-[60] w-[min(100%,22rem)] -translate-x-1/2 px-4 sm:bottom-6",
        className,
      )}
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.4 }}
    >
      <Link
        href={href}
        className="btn-platform-gradient pointer-events-auto flex h-14 items-center justify-center rounded-[12px] border border-[color:var(--terminal-border)] px-8 text-sm font-black uppercase tracking-[0.2em] backdrop-blur-md animate-pulse hover:animate-none"
      >
        {label}
      </Link>
    </motion.div>
  );
}
