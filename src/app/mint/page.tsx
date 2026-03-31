"use client";

import { useRouter } from "next/navigation";
import MintPage from "@/components/MintPage";

export default function MintRoute() {
  const router = useRouter();

  return <MintPage onClose={() => router.push("/")} />;
}
