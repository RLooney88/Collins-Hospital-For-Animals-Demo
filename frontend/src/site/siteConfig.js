import rawConfig from "./site.config.json";

const FALLBACK_CONFIG = {
  "practice": {
    "name": "Collins Hospital for Animals",
    "shortName": "Collins",
    "displayLines": [
      "Collins Hospital",
      "for Animals"
    ],
    "tagline": "Celebrating over 100 years caring for pets in Washington, DC.",
    "description": "Collins Hospital for Animals provides high quality veterinary medicine, surgery, dentistry, diagnostics, boarding, daycare, and exotic pet care by appointment in Washington, DC.",
    "serviceArea": "Washington, DC"
  },
  "brand": {
    "logo": "/brand/collins-logo.png",
    "logoAlt": "Collins Hospital for Animals logo",
    "colors": {
      "light": "#FBF7EE",
      "dark": "#111111",
      "accent": "#A98243",
      "accentLight": "#EFE5D1"
    }
  },
  "contact": {
    "phone": "(202) 659-8830",
    "phoneHref": "tel:+12026598830",
    "email": "",
    "address": {
      "street": "1808 Wisconsin Ave NW",
      "line2": "",
      "city": "Washington",
      "state": "DC",
      "zip": "20007",
      "country": "US"
    }
  },
  "hours": [
    [
      "Monday",
      "8:00 AM \u2013 7:00 PM"
    ],
    [
      "Tuesday",
      "8:00 AM \u2013 7:00 PM"
    ],
    [
      "Wednesday",
      "9:00 AM \u2013 3:00 PM"
    ],
    [
      "Thursday",
      "8:00 AM \u2013 7:00 PM"
    ],
    [
      "Friday",
      "8:00 AM \u2013 7:00 PM"
    ],
    [
      "Saturday",
      "Closed"
    ],
    [
      "Sunday",
      "Closed"
    ]
  ],
  "links": {
    "website": "https://www.collinsanimalhospital.net",
    "appointment": "/appointment",
    "store": "",
    "pharmacy": "",
    "onlineForms": "https://www.collinsanimalhospital.net/online-forms",
    "facebook": "",
    "instagram": "",
    "linkedin": "",
    "googleBusinessProfile": ""
  },
  "team": [
    {
      "name": "Dr. Lynne D. Cabaniss",
      "role": "Veterinarian, V.M.D.",
      "bio": "Fourth owner of Collins Hospital for Animals after purchasing the practice in 1987. Her interests include exotic pet medicine, feline medicine and surgery, and cardiology.",
      "image": ""
    },
    {
      "name": "Dr. Abby Littleton",
      "role": "Veterinarian, V.M.D.",
      "bio": "Georgetown University and University of Pennsylvania School of Veterinary Medicine graduate with interests including cardiology, neurology, reproduction, dentistry, and exotics.",
      "image": ""
    },
    {
      "name": "Dr. Kristen Fischer",
      "role": "Veterinarian, V.M.D.",
      "bio": "Washington, DC veterinarian and current owner/operator as of January 2026, with interests in internal medicine, dermatology, and long-term family relationships.",
      "image": ""
    }
  ],
  "features": {
    "clientPortal": true,
    "onlineBooking": true,
    "storeLink": false,
    "pharmacyLink": false,
    "onlineFormsLink": true,
    "teamSection": true
  }
};

function mergeConfig(base, override) {
  const output = { ...base, ...override };
  output.practice = { ...base.practice, ...(override.practice || {}) };
  output.brand = { ...base.brand, ...(override.brand || {}) };
  output.brand.colors = { ...base.brand.colors, ...((override.brand && override.brand.colors) || {}) };
  output.contact = { ...base.contact, ...(override.contact || {}) };
  output.contact.address = { ...base.contact.address, ...((override.contact && override.contact.address) || {}) };
  output.links = { ...base.links, ...(override.links || {}) };
  output.features = { ...base.features, ...(override.features || {}) };
  output.hours = override.hours && override.hours.length ? override.hours : base.hours;
  output.team = override.team || base.team;
  return output;
}

export const siteConfig = mergeConfig(FALLBACK_CONFIG, rawConfig || {});

export const practice = siteConfig.practice;
export const brand = siteConfig.brand;
export const contact = siteConfig.contact;
export const links = siteConfig.links;
export const features = siteConfig.features;
export const hours = siteConfig.hours;
export const team = siteConfig.team;

export function formatAddress(address = contact.address, { multiline = false } = {}) {
  const line1 = [address.street, address.line2].filter(Boolean).join(", ");
  const line2 = [address.city, address.state, address.zip].filter(Boolean).join(" ");
  if (multiline) return [line1, line2].filter(Boolean);
  return [line1, line2].filter(Boolean).join(", ");
}

export function getExternalLinks() {
  return [
    features.storeLink && links.store ? { label: "Online Store", href: links.store } : null,
    features.pharmacyLink && links.pharmacy ? { label: "Pharmacy", href: links.pharmacy } : null,
    features.onlineFormsLink && links.onlineForms ? { label: "Forms", href: links.onlineForms } : null,
  ].filter(Boolean);
}
