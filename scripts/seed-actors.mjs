// Seeds the global stock actor roster (isStock=true, userId=null) by generating
// diverse AI faces via MUAPI. Run once after `prisma db push`:
//
//   node scripts/seed-actors.mjs
//
// Idempotent: skips creation if a stock actor with the same name already exists.
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { generateActorImage } from "../src/lib/muapi.js";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

// A diverse starter roster across age, gender, ethnicity and setting.
const ROSTER = [
  { name: "Maya", gender: "female", ageRange: "20s", setting: "bedroom", description: "warm, expressive young woman, casual hoodie" },
  { name: "Ethan", gender: "male", ageRange: "20s", setting: "kitchen", description: "energetic guy, friendly smile, t-shirt" },
  { name: "Sofia", gender: "female", ageRange: "30s", setting: "living room", description: "approachable mom, cozy sweater" },
  { name: "Marcus", gender: "male", ageRange: "30s", setting: "office", description: "confident professional, button-down shirt" },
  { name: "Priya", gender: "female", ageRange: "20s", setting: "outdoor cafe", description: "stylish, bubbly, denim jacket" },
  { name: "Liam", gender: "male", ageRange: "20s", setting: "car", description: "relaxed, trustworthy, hoodie" },
  { name: "Aisha", gender: "female", ageRange: "30s", setting: "bathroom", description: "skincare enthusiast, glowing skin, robe" },
  { name: "David", gender: "male", ageRange: "40s", setting: "garage", description: "handy dad, plaid shirt, easygoing" },
  { name: "Chloe", gender: "female", ageRange: "20s", setting: "bedroom", description: "Gen-Z creator, trendy, colorful top" },
  { name: "Noah", gender: "male", ageRange: "20s", setting: "gym", description: "fit, motivational, athletic wear" },
  { name: "Elena", gender: "female", ageRange: "50s", setting: "kitchen", description: "warm grandmother type, cardigan" },
  { name: "Carlos", gender: "male", ageRange: "30s", setting: "outdoor", description: "adventurous, friendly, casual jacket" },
  { name: "Hana", gender: "female", ageRange: "20s", setting: "studio", description: "minimalist aesthetic, calm, neutral tones" },
  { name: "James", gender: "male", ageRange: "40s", setting: "office", description: "credible executive, blazer" },
  { name: "Zara", gender: "female", ageRange: "20s", setting: "outdoor", description: "fashion-forward, confident, sunglasses on head" },
  { name: "Tyler", gender: "male", ageRange: "20s", setting: "bedroom", description: "gamer/streamer vibe, headphones around neck" },
  { name: "Mia", gender: "female", ageRange: "30s", setting: "living room", description: "wellness coach, serene, athleisure" },
  { name: "Omar", gender: "male", ageRange: "30s", setting: "kitchen", description: "foodie, enthusiastic, apron" },
  { name: "Grace", gender: "female", ageRange: "40s", setting: "office", description: "polished businesswoman, blouse" },
  { name: "Ben", gender: "male", ageRange: "20s", setting: "outdoor cafe", description: "laid-back student, beanie" },
  { name: "Lucia", gender: "female", ageRange: "20s", setting: "bathroom", description: "beauty creator, makeup look, towel turban" },
  { name: "Samuel", gender: "male", ageRange: "50s", setting: "living room", description: "wise, reassuring, sweater" },
  { name: "Nina", gender: "female", ageRange: "30s", setting: "car", description: "busy professional, on-the-go, blazer" },
  { name: "Kai", gender: "male", ageRange: "20s", setting: "studio", description: "creative, artsy, oversized shirt" },
];

async function run() {
  console.log(`Seeding ${ROSTER.length} stock actors...`);
  let created = 0;
  let skipped = 0;

  for (const persona of ROSTER) {
    const existing = await prisma.actor.findFirst({
      where: { name: persona.name, isStock: true },
    });
    if (existing) {
      skipped++;
      console.log(`  • ${persona.name}: already exists, skipping`);
      continue;
    }

    try {
      console.log(`  • ${persona.name}: generating face...`);
      const imageUrl = await generateActorImage(persona);
      await prisma.actor.create({
        data: {
          name: persona.name,
          description: persona.description,
          imageUrl,
          gender: persona.gender,
          ageRange: persona.ageRange,
          setting: persona.setting,
          isStock: true,
          userId: null,
        },
      });
      created++;
      console.log(`  ✓ ${persona.name}: saved`);
    } catch (err) {
      console.error(`  ✗ ${persona.name}: ${err.message}`);
    }
  }

  console.log(`Done. Created ${created}, skipped ${skipped}.`);
  await prisma.$disconnect();
  await pool.end();
}

run().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect();
  process.exit(1);
});
