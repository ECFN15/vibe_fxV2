import { publicSeoRoutes } from "./seo-pages";

export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app";
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1.0,
    },
    ...publicSeoRoutes.map((route) => ({
      url: `${siteUrl}${route}`,
      lastModified: now,
      changeFrequency: route.startsWith("/ressources/") ? "monthly" : "weekly",
      priority: route === "/pricing" ? 0.8 : 0.9,
    })),
  ];
}
