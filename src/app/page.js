import { redirect } from "next/navigation";

// The app opens on Pricing first (Arcads-style). The generation workspace now
// lives at /workspace (linked from the navbar and logo).
export default function Home() {
  redirect("/pricing");
}
