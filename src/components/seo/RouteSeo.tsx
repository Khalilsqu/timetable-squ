import { useEffect } from "react";
import { useLocation } from "react-router";

type SeoRoute = {
  path: string;
  title: string;
  description: string;
  keywords?: string[];
};

const SITE_NAME = "SQU Timetable";
const SITE_URL =
  (import.meta.env.VITE_SITE_URL as string | undefined) ??
  "https://timetable-squ.pages.dev";
const DEFAULT_SOCIAL_IMAGE = new URL("/og-image.svg", SITE_URL).toString();
const BASE_KEYWORDS = [
  "Sultan Qaboos University timetable",
  "SQU timetable",
  "master timetable",
  "registration",
  "courses",
];

const ROUTES: SeoRoute[] = [
  {
    path: "/",
    title: "SQU Timetable",
    description:
      "Sultan Qaboos University timetable and master timetable portal to browse registration-ready courses by semester, college, and department.",
    keywords: ["Sultan Qaboos University", "course registration", "semester schedule"],
  },
  {
    path: "/student",
    title: "Student Timetable",
    description:
      "Build and explore student timetables with course, section, and exam schedule details.",
    keywords: ["student registration", "course sections"],
  },
  {
    path: "/faculty",
    title: "Faculty Timetable",
    description:
      "View instructor schedules and teaching plans by semester and department filters.",
    keywords: ["faculty schedule", "teaching timetable"],
  },
  {
    path: "/department",
    title: "Department Timetable",
    description:
      "Find timetable information for departments including courses, sections, and exam slots.",
    keywords: ["department courses", "department timetable"],
  },
  {
    path: "/college",
    title: "College Timetable",
    description:
      "Inspect college-level timetable data across departments and semester offerings.",
    keywords: ["college courses", "college timetable"],
  },
  {
    path: "/common-slot",
    title: "Common Slot",
    description:
      "Analyze and export common timetable slots to support scheduling decisions.",
    keywords: ["common slots", "schedule planning"],
  },
  {
    path: "/stats",
    title: "Timetable Statistics",
    description:
      "Explore charts and utilization insights for courses, colleges, and halls by semester.",
    keywords: ["timetable analytics", "course statistics"],
  },
];

function upsertMeta(name: "name" | "property", value: string, content: string) {
  const selector = `meta[${name}="${value}"]`;
  let el = document.head.querySelector(selector) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(name, value);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function upsertCanonical(url: string) {
  let link = document.head.querySelector(
    'link[rel="canonical"]',
  ) as HTMLLinkElement | null;
  if (!link) {
    link = document.createElement("link");
    link.setAttribute("rel", "canonical");
    document.head.appendChild(link);
  }
  link.setAttribute("href", url);
}

function upsertJsonLd(data: unknown) {
  const id = "route-jsonld";
  let script = document.getElementById(id) as HTMLScriptElement | null;
  if (!script) {
    script = document.createElement("script");
    script.type = "application/ld+json";
    script.id = id;
    document.head.appendChild(script);
  }
  script.textContent = JSON.stringify(data);
}

function findRoute(pathname: string): SeoRoute {
  return ROUTES.find((route) => route.path === pathname) ?? ROUTES[0];
}

export default function RouteSeo() {
  const { pathname } = useLocation();

  useEffect(() => {
    const route = findRoute(pathname);
    const url = new URL(pathname || "/", SITE_URL).toString();
    const fullTitle = route.title.includes(SITE_NAME)
      ? route.title
      : `${route.title} | ${SITE_NAME}`;
    const keywords = [...BASE_KEYWORDS, ...(route.keywords ?? [])].join(", ");

    document.title = fullTitle;

    upsertMeta("name", "description", route.description);
    upsertMeta("name", "keywords", keywords);
    upsertMeta("name", "robots", "index,follow");
    upsertMeta("property", "og:type", "website");
    upsertMeta("property", "og:site_name", SITE_NAME);
    upsertMeta("property", "og:title", fullTitle);
    upsertMeta("property", "og:description", route.description);
    upsertMeta("property", "og:url", url);
    upsertMeta("property", "og:image", DEFAULT_SOCIAL_IMAGE);
    upsertMeta("property", "og:image:alt", "SQU Timetable");
    upsertMeta("name", "twitter:card", "summary_large_image");
    upsertMeta("name", "twitter:title", fullTitle);
    upsertMeta("name", "twitter:description", route.description);
    upsertMeta("name", "twitter:image", DEFAULT_SOCIAL_IMAGE);
    upsertCanonical(url);

    upsertJsonLd({
      "@context": "https://schema.org",
      "@graph": [
        {
          "@type": "WebSite",
          name: SITE_NAME,
          url: SITE_URL,
        },
        {
          "@type": "WebPage",
          name: fullTitle,
          url,
          description: route.description,
          isPartOf: { "@type": "WebSite", url: SITE_URL },
        },
      ],
    });
  }, [pathname]);

  return null;
}
