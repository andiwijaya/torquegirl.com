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

export const toyota2JzArticle: ArticleSummary = {
  slug: "toyota-2jz-gte-tuning-legend",
  title: "Toyota 2JZ-GTE: Why This 30-Year-Old Engine Is Still a Tuning Legend",
  description: "Discover the engineering, durability, tuning headroom and Supra connection that made Toyota's 2JZ-GTE a lasting performance legend.",
  category: "Engine Legends",
  topics: ["Toyota", "2JZ", "Supra"],
  date: "2026-09-22",
  readingTime: "12 min read",
  heroImage: "/images/articles/torquegirl-2jz-gte-hero.png",
  heroAlt: "TorqueGirl standing beside a Toyota 2JZ-GTE engine on a workshop stand.",
};

export const formulaDownforceArticle: ArticleSummary = {
  slug: "how-formula-1-car-creates-downforce",
  title: "How a Formula 1 Car Creates Downforce",
  description: "Learn how Formula 1 cars use wings, ground-effect floors, diffusers and aerodynamic balance to turn airflow into cornering performance.",
  category: "Technology",
  topics: ["Motorsport", "Aerodynamics", "Formula Racing"],
  date: "2026-09-22",
  readingTime: "13 min read",
  heroImage: "/images/articles/torquegirl-formula-downforce-hero.png",
  heroAlt: "TorqueGirl examining a Formula-style race car and its aerodynamic surfaces in a motorsport workshop.",
};

export const obd2Article: ArticleSummary = {
  slug: "what-is-an-obd2-scanner",
  title: "What Is an OBD2 Scanner? A Beginner’s Guide to Diagnosing Your Car",
  description: "Learn what an OBD2 scanner does, where it plugs in, how diagnostic trouble codes work, and how to use scan data without guessing at parts.",
  category: "Technology",
  topics: ["OBD2", "Diagnostics", "Automotive Technology"],
  date: "2026-09-22",
  readingTime: "14 min read",
  heroImage: "/images/articles/torquegirl-obd2-scanner-hero.png",
  heroAlt: "TorqueGirl using an OBD2 scanner to diagnose a car.",
};

export const obd2ComparisonArticle: ArticleSummary = {
  slug: "obd2-scanner-vs-code-reader",
  title: "OBD2 Scanner vs Code Reader: What’s the Difference?",
  description: "Compare a basic OBD2 code reader with an advanced scan tool, from generic trouble codes and live data to ABS, SRS, service functions, and bidirectional controls.",
  category: "Technology",
  topics: ["OBD2", "Diagnostics", "Scan Tools"],
  date: "2026-09-22",
  readingTime: "12 min read",
  heroImage: "/images/articles/torquegirl-obd2-scanner-vs-code-reader-hero.png",
  heroAlt: "TorqueGirl comparing a basic OBD2 code reader with an advanced automotive scan tool.",
};

export const articles: ArticleSummary[] = [toyota2JzArticle, turboVsSuperchargerArticle, nascarV8Article];
export const technologyArticles: ArticleSummary[] = [obd2ComparisonArticle, obd2Article, formulaDownforceArticle];
