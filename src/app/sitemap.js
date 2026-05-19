import { seoPages } from "./seo-pages";

export default function sitemap() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app";
  const now = new Date();

  return [
    {
      url: siteUrl,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 1,
    },
    ...seoPages.map((page) => ({
      url: `${siteUrl}${page.path}`,
      lastModified: now,
      changeFrequency: page.kind === "Article" ? "monthly" : "weekly",
      priority: page.kind === "Article" ? 0.72 : 0.86,
    })),
  ];
}
