import assets from "./assets.json";

type Asset = { key: string; group: string; src: string; width: number; height: number };

const byKey = new Map((assets as Asset[]).map((asset) => [asset.key, asset]));

/**
 * Our Projects — the legacy page carries exactly two lines of copy (an H1 and
 * an H4) above a 48-image masonry, and nothing else. Both strings are verbatim.
 */
export const projectsHero = {
  heading: "Our Projects",
  breadcrumb: [
    { label: "Home", href: "/" },
    { label: "Our Projects", href: "/our-projects" },
  ],
  /* A production in progress, from Unsplash — the client's own stills are all
     ~1125px wide and visibly soften when stretched full-bleed, so they carry the
     gallery, which is where they belong, and the plate is sourced separately. */
  image: "/projects/hero.jpg",
} as const;

/**
 * The gallery, in the legacy page's own order.
 *
 * Stored as asset keys rather than paths so `assets.json` stays the single
 * register of what ships in `public/` and of every image's real dimensions —
 * the masonry needs those to reserve space before a still decodes.
 *
 * 23 of these were fetched for this page; the other 25 were already local,
 * pulled first by the homepage gallery. The order below is the legacy page's,
 * not the order they sit on disk.
 */
const order = [
  "project-07", "project-33", "project-08", "project-15", "project-34", "project-16",
  "project-14", "project-35", "project-36", "project-18", "project-19", "project-37",
  "project-38", "project-39", "project-40", "project-41", "project-42", "project-17",
  "project-43", "project-09", "project-11", "project-10", "project-44", "project-12",
  "project-45", "project-46", "project-47", "project-48", "project-49", "project-50",
  "project-21", "project-20", "project-13", "project-32", "project-51", "project-31",
  "project-30", "project-29", "project-24", "project-23", "project-25", "project-26",
  "project-27", "project-52", "project-28", "project-53", "project-54", "project-55",
] as const;

export const projectsGallery = {
  /* The page's own name, used as the section label. The legacy markup has no
     eyebrow above the heading — this is furniture, not new copy. */
  eyebrow: "Projects",
  /** The legacy page's own `<h4>` above the masonry. */
  heading: "WHAT WE HAVE DONE?",
  /**
   * Every image in the source carries an empty `alt` and no title, caption or
   * category, so none is invented — the numbering matches what the viewer
   * announces, and nothing is claimed about a still that the client has not
   * said themselves.
   */
  images: order.map((key, index) => {
    const asset = byKey.get(key);
    if (!asset) throw new Error(`projects gallery: unknown asset "${key}"`);
    return {
      src: asset.src,
      width: asset.width,
      height: asset.height,
      alt: `Aruamz Productions project still ${index + 1}`,
    };
  }),
} as const;
