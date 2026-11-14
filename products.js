/**
 * Product catalogue — edit this file to add or change your eBooks.
 * Prices are in South African Rand (ZAR).
 *
 * After you launch, remember to upload each PDF to your private KV store:
 *   npx wrangler kv key put "file:<id>" --path ./pdfs/<filename>.pdf --namespace-id=<FILES_KV_ID>
 * (see README.md for the full walkthrough)
 */
const PRODUCTS = [
  {
    id: "clean-eating-28",
    title: "The 28-Day Clean Eating Plan",
    description:
      "A full month of simple, delicious meals with shopping lists and prep guides. No weird ingredients, no starving — just real food.",
    price: 149,
    badge: "Bestseller",
    emoji: "🥗",
  },
  {
    id: "mindful-eating",
    title: "A Beginner's Guide to Mindful Eating",
    description:
      "Stop yo-yo dieting. Learn to eat with intention, enjoy your food, and build habits that actually last.",
    price: 99,
    badge: null,
    emoji: "🧘",
  },
  {
    id: "home-workout",
    title: "The Home Workout Handbook",
    description:
      "40+ no-equipment workouts for every fitness level, with clear illustrations and a 12-week progressive plan.",
    price: 129,
    badge: "New",
    emoji: "💪",
  },
  {
    id: "sleep-reset",
    title: "The Sleep Reset Protocol",
    description:
      "A two-week programme to fix your sleep: evening routines, light exposure, nutrition timing and wind-down rituals.",
    price: 119,
    badge: null,
    emoji: "😴",
  },
];
