import { type MetadataRoute } from "next";

const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://dev.hubexpresso.com";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: ["/api/", "/dashboard", "/admin", "/profile/edit", "/queue/waiting/"] },
      { userAgent: "Googlebot", allow: "/", disallow: ["/api/", "/dashboard", "/admin", "/profile/edit", "/queue/waiting/"] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
