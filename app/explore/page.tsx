import type { Metadata } from "next";
import { ExploreView } from "@/components/explore/ExploreView";

export const metadata: Metadata = {
  title: "Explore — VAULT",
  description: "Look up wrapper tokens by originTokenId or source token address.",
};

export default function ExplorePage() {
  return <ExploreView />;
}
