/**
 * SEARCH ENGINE INDEXING CONTROL - robots.txt
 * 
 * This file controls how search engines crawl and index the entire site.
 * 
 * Current status: INDEXING DISABLED
 * 
 * To re-enable search engine indexing:
 * 1. Set the environment variable: NEXT_PUBLIC_ALLOW_INDEXING=true
 * 2. Deploy or restart your application
 * 
 * The robots.txt will automatically update based on the environment variable.
 */

import type { MetadataRoute } from "next"

export default function robots(): MetadataRoute.Robots {
  // Check if indexing is allowed via environment variable
  const allowIndexing = process.env.NEXT_PUBLIC_ALLOW_INDEXING === "true"

  if (allowIndexing) {
    // Allow all search engines to crawl and index
    return {
      rules: {
        userAgent: "*",
        allow: "/",
      },
    }
  }

  // Block all search engines from crawling and indexing
  return {
    rules: {
      userAgent: "*",
      disallow: "/",
    },
  }
}
