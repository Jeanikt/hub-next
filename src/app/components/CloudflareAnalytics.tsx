"use client";

import Script from "next/script";

const CF_BEACON_TOKEN = "5a3eaa1263c84b4b9dae41c306059367";

export function CloudflareAnalytics() {
  return (
    <Script
      defer
      src="https://static.cloudflareinsights.com/beacon.min.js"
      data-cf-beacon={JSON.stringify({ token: CF_BEACON_TOKEN })}
      strategy="afterInteractive"
    />
  );
}
