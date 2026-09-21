export type ArticleSummary = {
  slug: string;
  title: string;
  description: string;
  category: string;
  topics: string[];
  date: string;
  readingTime: string;
  heroImage: string;
  heroAlt: string;
};

export const nascarV8Article: ArticleSummary = {
  slug: "how-a-nascar-v8-engine-works",
  title: "How a NASCAR V8 Engine Works",
  description: "Explore how a NASCAR-style V8 racing engine works, from airflow and combustion to torque, cooling, lubrication and race-ready durability.",
  category: "Engines",
  topics: ["Motorsport", "V8", "Powertrain"],
  date: "2026-09-21",
  readingTime: "9 min read",
  heroImage: "/images/articles/torquegirl-nascar-v8-hero.png",
  heroAlt: "TorqueGirl presenting the V8 engine bay of a stock car in a motorsport workshop.",
};

export const turboVsSuperchargerArticle: ArticleSummary = {
  slug: "turbocharger-vs-supercharger",
  title: "Turbocharger vs Supercharger: What’s the Difference?",
  description: "Learn how turbochargers and superchargers work, where their driving energy comes from, and how boost, response, heat and efficiency differ.",
  category: "Engines",
  topics: ["Technology", "Performance"],
  date: "2026-09-21",
  readingTime: "10 min read",
  heroImage: "/images/articles/torquegirl-turbo-vs-supercharger-hero.png",
  heroAlt: "TorqueGirl comparing a turbocharger and supercharger on a performance workshop bench.",
};

export const articles: ArticleSummary[] = [turboVsSuperchargerArticle, nascarV8Article];
