import React, { useEffect } from "react";

interface SeoHelperProps {
  title: string;
  description: string;
  keywords?: string[];
  image?: string;
  canonicalUrl?: string;
  schemaJson?: any;
}

export const SeoHelper: React.FC<SeoHelperProps> = ({
  title,
  description,
  keywords = [],
  image,
  canonicalUrl,
  schemaJson,
}) => {
  useEffect(() => {
    // 1. Update Title
    const formattedTitle = title.includes("Eker") ? title : `${title} | Eker Casino Listings`;
    document.title = formattedTitle;

    // Helper to query or create meta tags
    const updateMetaTag = (attributeName: string, attributeValue: string, contentValue: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attributeValue}"]`);
      if (!element) {
        element = document.createElement("meta");
        element.setAttribute(attributeName, attributeValue);
        document.head.appendChild(element);
      }
      element.setAttribute("content", contentValue);
    };

    // 2. Update Standard Meta Tags
    updateMetaTag("name", "description", description);
    if (keywords.length > 0) {
      updateMetaTag("name", "keywords", keywords.join(", "));
    }

    // 3. Update Open Graph Meta Tags
    updateMetaTag("property", "og:title", formattedTitle);
    updateMetaTag("property", "og:description", description);
    updateMetaTag("property", "og:type", "website");
    if (image) {
      updateMetaTag("property", "og:image", image);
    }
    const currentHref = canonicalUrl || window.location.href;
    updateMetaTag("property", "og:url", currentHref);

    // 4. Update Twitter Card Tags
    updateMetaTag("name", "twitter:card", "summary_large_image");
    updateMetaTag("name", "twitter:title", formattedTitle);
    updateMetaTag("name", "twitter:description", description);
    if (image) {
      updateMetaTag("name", "twitter:image", image);
    }

    // 5. Update Canonical Link
    let canonicalLink = document.querySelector('link[rel="canonical"]');
    if (!canonicalLink) {
      canonicalLink = document.createElement("link");
      canonicalLink.setAttribute("rel", "canonical");
      document.head.appendChild(canonicalLink);
    }
    canonicalLink.setAttribute("href", currentHref);

    // 6. Inject / Update JSON-LD Schema
    let schemaScript = document.getElementById("json-ld-schema") as HTMLScriptElement;
    if (schemaJson) {
      if (!schemaScript) {
        schemaScript = document.createElement("script");
        schemaScript.id = "json-ld-schema";
        schemaScript.type = "application/ld+json";
        document.head.appendChild(schemaScript);
      }
      schemaScript.text = JSON.stringify(schemaJson);
    } else {
      if (schemaScript) {
        schemaScript.remove();
      }
    }

    // Cleanup: We don't necessarily have to remove standard tags, but can clean up custom schema on unmount
    return () => {
      // Keep title as default or generic
    };
  }, [title, description, keywords, image, canonicalUrl, schemaJson]);

  return null; // Renderless helper
};

export default SeoHelper;
