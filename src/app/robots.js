export default function robots() {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "https://vibefx.app";

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/studio", "/account", "/api", "/admin", "/backoffice"],
      },
    ],
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
