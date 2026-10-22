// All visible copy for the WiseUp homepage lives here.
// Source: Downloads/wiseup-home.html (owner content, 2026-10-21). Items not in that file are kept
// from the earlier live homepage (process step 4, client segments, FAQ). Notes for the owner:
// - The Smoke House cover image shows a "Bucho" logo. Confirm it is the right file.
// - Process card mockups are illustrative UI, not screenshots of a real tool.
// - The scroll sequence (public/seq) is AI-generated footage (Seedance 2.5), not a client shoot.
import smokehouse from '../assets/work/case-smokehouse.jpg';
import karak from '../assets/work/case-karak.jpg';
import indusgo from '../assets/work/case-indusgo.jpg';
import bootland from '../assets/work/case-bootland.jpg';
import erets from '../assets/work/case-erets.jpg';

export const site = {
  name: 'WiseUp',
  role: 'Branding & marketing agency in Kerala',
  url: 'https://wiseup.in',
  description:
    'WiseUp is a branding and digital marketing agency in Kozhikode (Calicut), Kerala, serving brands across India and the Middle East.',
  email: 'brandingwithwiseup@gmail.com',
  phone: '+91 62824 34503',
  phoneHref: 'tel:+916282434503',
  whatsapp: 'https://wa.me/916282434503',
  coords: '11.2588°N 75.7804°E',
  city: 'Kozhikode (Calicut), Kerala',
  footerLine: 'Branding & marketing agency, Kozhikode, Kerala · Creative wing of CodeAce',
  socials: [
    { label: 'Instagram', href: 'https://www.instagram.com/branding_with_wiseup/' },
    { label: 'LinkedIn', href: 'https://www.linkedin.com/company/wiseup-marketing-agency/' },
    { label: 'Behance', href: 'https://www.behance.net/brandingwithwiseup' },
  ],
  nav: [
    { label: 'Who we are', href: '/#about' },
    { label: 'Work', href: '/#work' },
    { label: 'Services', href: '/#services' },
    { label: 'CodeAce', href: '/#codeace' },
  ],
  cta: 'Get our plan first',
  ctaShort: 'Get our plan',
};

export const hero = {
  eyebrow: 'Branding & marketing agency in Kerala',
  line: ['We create a voice.', 'Not dragon fire.', 'A burning flame.'],
  lede:
    'Judge us by the plan we send before we even talk numbers. WiseUp is a creative marketing agency in Kozhikode (Calicut), built around how you see your business.',
  stats: [
    { value: '120+', label: 'Projects delivered' },
    { value: '3M+', label: 'Audience reached' },
    { value: '8', label: 'Years of CodeAce engineering' },
    { value: '1', label: 'Goal: scale your business' },
  ],
};

// Pulled from the live homepage's logo ticker (.azb-ticker-section at wiseup.in), 2026-10-22 —
// the real, current client roster for this strip, replacing the older placeholder set (some of
// which, e.g. Smoke House/Bootland/Erets Space, are case-study clients shown elsewhere on the
// site but aren't actually in this particular ticker). Logo files mirrored to public/clients/.
export const marquee = [
  { name: 'CADD Centre', src: '/clients/client-logo-01-sm.webp' },
  { name: 'FIRSTCOMPANi', src: 'https://wiseup.in/wp-content/uploads/2026/10/firstcompani-logo-sm.webp' },
  { name: 'KNP Export', src: 'https://wiseup.in/wp-content/uploads/2026/10/knp-export-logo-sm.webp' },
  { name: 'Scientific Health Tips', src: '/clients/client-logo-04-sm.webp' },
  { name: 'Palaxi Cinemas', src: 'https://wiseup.in/wp-content/uploads/2026/10/palaxi-cinemas-logo-sm.webp' },
  { name: 'MGF Events', src: '/clients/client-logo-06-sm.webp' },
  { name: 'Dimora Hotels & Resorts', src: '/clients/client-logo-07-sm.webp' },
  { name: 'Cake Studio', src: 'https://wiseup.in/wp-content/uploads/2026/10/cake-studio-logo-sm.webp' },
  { name: 'Paraiso', src: '/clients/client-logo-09-sm.webp' },
  { name: 'Eduzet', src: '/clients/client-logo-10-sm.webp' },
  { name: 'Nidra Inn', src: 'https://wiseup.in/wp-content/uploads/2026/10/nidra-inn-logo-sm.webp' },
  { name: 'Cellphonix', src: '/clients/client-logo-12-sm.webp' },
  { name: 'OnShopUp', src: 'https://wiseup.in/wp-content/uploads/2026/10/onshopup-logo-sm.webp' },
  { name: 'Hayath Medicare', src: '/clients/client-logo-14-sm.webp' },
  { name: 'Coco Coopa', src: '/clients/client-logo-15-sm.webp' },
  { name: 'Britco & Bridco', src: '/clients/client-logo-16-sm.webp' },
  { name: 'Livewire', src: '/clients/client-logo-17-sm.webp' },
];

export const about = {
  tag: 'Our point of view',
  heading: ['We do one thing: scale your business.', 'Because that is the only way we scale ours.'],
  body:
    "We are a brand strategy agency and digital marketing agency in Kozhikode, Kerala: AI-integrated and technologically advanced, yet deeply human. We work with brands across Kerala, India and the Middle East, from startups to established names. If you believe your brand has untapped potential, connect with us. We don't just provide a service. We provide that future.",
  // The fit/not-fit distinction, as a contrast statement rather than a checklist.
  contrast: {
    statement: ['Posts fade.', 'Brands last.'],
    rows: [
      { no: 'Vendors deliver files.', yes: 'Partners deliver growth.' },
      { no: 'If you want posters and reels by the piece, we’re not your fit.', yes: 'If you want an associate invested in your brand, we’re built for you.' },
    ],
  },
};

export const process = {
  tag: 'Our process',
  heading: ['You see the plan', 'before you see a number.'],
  // Exactly the 3 steps from wiseup-home.html (nested under "Our point of view" there; promoted
  // to its own section here). No 4th step: an earlier "Watch it against the goal." step had no
  // basis in that content file and has been removed.
  steps: [
    { id: 'brief', title: 'Listen first.', text: 'Who we are is shaped by who you are. We align with your business and ambition.' },
    { id: 'plan', title: 'Plan before we price.', text: 'You see the strategy before you see a number.' },
    { id: 'launch', title: 'Execute with intent.', text: "Every asset has a job. If it doesn't serve a purpose, we don't make it." },
  ],
};

export const services = {
  tag: 'What we do',
  heading: ['Every channel.', 'One strategy.'],
  lead: 'Branding, design, web and digital marketing for businesses in Kozhikode, Kerala and across India, all from one team.',
  // Words on the rolling drum: the channels, in short form.
  drum: ['Identity', 'Packaging', 'Websites', 'SEO', 'Google Ads', 'Meta Ads', 'Reels', 'Influencers', 'TV ads', 'Product shoots', 'OOH', 'Media buying'],
  items: [
    { title: 'Brand Strategy & Identity', icon: 'signature', tags: ['Brand Strategy & Positioning', 'Logo & Brand Identity Design', 'Personal Branding', 'Market Research', 'Consultancy'] },
    { title: 'Packaging Design & Events', icon: 'box', tags: ['Product Packaging Design', 'Signage & Print Production', 'Event Branding'] },
    { title: 'Web Development', icon: 'code', tags: ['Business Websites', 'Online Stores', 'Built to be found and to convert'] },
    { title: 'SEO Services', icon: 'search', tags: ['Search Engine Optimization', 'Local SEO in Kozhikode & Kerala', 'Be found. Be chosen.'] },
    { title: 'Performance Marketing', icon: 'target', tags: ['Google Ads', 'Meta Ads', 'Lead generation & PPC'] },
    { title: 'Digital Marketing & Social Media', icon: 'chat', tags: ['Strategy & Creatives', 'Reels', 'Influencer Marketing', 'PR & Crisis Management', 'Engagement & Sponsorship'] },
    { title: 'Video & Photography', icon: 'video', tags: ['TV Commercials', 'Theater & Digital Ads', 'Photoshoot & Product Shoot', 'Corporate & Concept Films', 'CGI & AI Videos'] },
    { title: 'Campaigns & Media Buying', icon: 'megaphone', tags: ['OOH, Print & Radio Campaigns', 'Digital & Video Campaigns', 'Media Planning & Buying', 'Monitoring'] },
  ],
};

export const clients = {
  tag: 'Who we work with',
  heading: ['Branding for brands', 'at every stage.'],
  segments: [
    { id: 'startups', title: 'Startups', text: 'A clear identity, a sharp message and a launch plan sized to a young company’s budget.', points: ['Naming & identity', 'Launch plan', 'First website'] },
    { id: 'retail', title: 'Retail & consumer', text: 'Restaurants, cafés, hospitality and product brands, from Kozhikode to the Gulf.', points: ['Packaging', 'Store & signage', 'Always-on social'], featured: true },
    { id: 'founders', title: 'Founders & professionals', text: 'Personal branding that turns what you know into visibility.', points: ['Personal brand', 'Search presence', 'Press'] },
    { id: 'established', title: 'Established businesses', text: 'Repositioning and rebrands for companies that outgrew their first identity.', points: ['Repositioning', 'Rebrand', 'Growth marketing'] },
  ],
};

export type Project = {
  slug: string;
  title: string;
  category: string;
  place?: string;
  summary: string;
  cover: { src: ImageMetadata; alt: string };
  externalUrl: string;
};

export const projects: Project[] = [
  {
    slug: 'smoke-house',
    title: 'Smoke House',
    category: 'Restaurant branding',
    place: 'Kozhikode',
    summary: 'A quiet restaurant near Calicut Beach, turned into a high-demand dining destination.',
    cover: { src: smokehouse, alt: 'Skewers on a charcoal grill over open flame, with a cream restaurant logo set over the smoke' },
    externalUrl: 'https://wiseup.in/case-studies/smokehouse/',
  },
  {
    slug: 'golden-karak',
    title: 'Golden Karak',
    category: 'Café brand',
    place: 'Bahrain',
    summary: 'Strong offline fame, small digital footprint. We built the online presence to match.',
    cover: { src: karak, alt: 'Golden Karak Restaurant roundel logo, orange and maroon, over a night photo of the restaurant front' },
    externalUrl: 'https://wiseup.in/case-studies/golden-karak/',
  },
  {
    slug: 'indus-go',
    title: 'Indus Go',
    category: 'Self-drive rentals',
    summary: "Marketing for one of India's leading self-drive car rental brands.",
    cover: { src: indusgo, alt: 'Black Toyota MPV in a grey studio with the Indus Go wordmark in lime across it' },
    externalUrl: 'https://wiseup.in/case-studies/indusgo/',
  },
  {
    slug: 'bootland',
    title: 'Bootland',
    category: 'Event branding',
    summary: 'Full identity and stage branding for a footwear and lifestyle expo, built to read across a crowded hall.',
    cover: { src: bootland, alt: 'Bootland Footwear & Lifestyle Retail Expo identity, lime and black, over a blurred stage with an audience' },
    externalUrl: 'https://wiseup.in/case-studies/bootland/',
  },
  {
    slug: 'erets-space',
    title: 'Erets Space',
    category: 'Space technology',
    summary: 'Brand story for laser and AI systems tackling space debris.',
    cover: { src: erets, alt: 'Erets wordmark in white and red between a satellite and a blue planet in a field of debris' },
    externalUrl: 'https://wiseup.in/case-studies/erets/',
  },
];

export const work = {
  tag: 'Selected work',
  heading: ['Proof, not bluff.', 'Restaurants, cafés, expos and space tech, from Kozhikode to the Gulf.'],
};

export const codeace = {
  tag: 'Our roots',
  heading: ['The creative wing', 'of CodeAce.'],
  body:
    'For eight years, CodeAce has engineered digital platforms for growing businesses. WiseUp is its creative wing. It joins that technical backbone to brand storytelling, so your strategy, your story and your systems are built by one team.',
  // The body, split across the three cards (same sentences, no new claims).
  cards: [
    { mono: 'C', name: 'CodeAce', role: 'Eight years of engineering', text: 'For eight years, CodeAce has engineered digital platforms for growing businesses.', mark: 'codeace.com' },
    { mono: 'W', name: 'WiseUp', role: 'The creative wing', text: 'WiseUp is its creative wing. It joins that technical backbone to brand storytelling.', mark: 'wiseup.in' },
    { mono: '1', name: 'One team', role: 'Strategy, story, systems', text: 'So your strategy, your story and your systems are built by one team.', mark: 'One team' },
  ],
  href: 'https://codeace.com',
};

export const faq = {
  tag: 'Questions',
  heading: ['Choosing a branding', 'agency in Kerala.'],
  items: [
    { q: 'What does a branding agency in Kerala actually do?', a: 'It decides how a business is positioned and how it looks and sounds: strategy, naming, logo and identity, packaging and the guidelines that keep it consistent. We also carry that identity into websites, campaigns and social media.' },
    { q: 'How do I choose the best branding agency in Kerala?', a: 'Look past portfolio polish. Ask for case studies with real outcomes, a team that starts with strategy, and a plan before any pricing. That is how we work: you see the plan first, then the numbers.' },
    { q: 'Do you work with startups and brands outside Kerala?', a: 'Yes. We are based in Kozhikode and work with startups, retail and consumer brands across India and the Middle East, from a first identity to full campaigns.' },
    { q: 'What is the difference between a branding agency and a digital marketing agency?', a: 'Branding decides who you are and why people should choose you. Digital marketing, including SEO, ads and social, takes that story to the right audience. One team doing both keeps the message consistent.' },
    { q: 'Can you handle web development, SEO and ads together?', a: 'Yes. CodeAce builds the websites and online stores; WiseUp handles SEO, Google and Meta ads, content and creative. Your site, search presence and campaigns work as one system.' },
  ],
};

// About page (owner content, 2026-10-22). Restored verbatim on the owner's request ("use my
// content only"): only the light edits from the first import remain (sentence case, no
// "seamless"/"cutting-edge", typo fixed). Images are linked from wiseup.in on purpose (owner's choice).
export const aboutPage = {
  tagline: ['Learn smarter.', 'Grow faster.', 'Rise higher.'],
  intro:
    'We are a dedicated team focused on delivering innovative solutions that help businesses thrive in the digital world. With an emphasis on quality and creativity, we build lasting relationships with our clients, combining expertise and technology to create impactful services.',
  who: {
    tag: 'Who we are',
    heading: 'The strategic creative arm of CodeAce IT Solutions.',
    body: [
      'CodeAce is a technology company with over seven years of experience engineering high-performance digital platforms. WiseUp is its strategic creative arm.',
      'We bridge the gap between complex technical execution and brand storytelling. CodeAce provides the technology backbone; WiseUp focuses on brand building, marketing strategy and growth-led campaigns. Together that means data-driven marketing and technical innovation from one team.',
    ],
  },
  expertise: {
    tag: 'Our expertise',
    stats: [
      { value: 7, suffix: '+', label: 'Years of industry experience', text: 'Driving growth for startups, brands and businesses.' },
      { value: 120, suffix: '+', label: 'Projects delivered', text: 'Helping brands scale through strategy, design and marketing.' },
      { value: 3, suffix: 'M+', label: 'Audience reached', text: 'Campaigns generating visibility across digital platforms.' },
    ],
  },
  values: {
    tag: 'Our values',
    items: [
      { title: 'Integrity', text: 'Honesty, transparency, and building trust with our clients.' },
      { title: 'Quality', text: 'High-quality solutions that meet the highest standards.' },
      { title: 'Innovation', text: 'New ideas and technologies, used to make modern, effective solutions.' },
      { title: 'Customer commitment', text: 'Our clients’ success is our priority. We work closely with them to understand their goals and deliver results.' },
    ],
  },
  team: {
    tag: 'Our team',
    text: 'Our team is made up of talented professionals who bring creativity, technical expertise and dedication to every project. We collaborate, share ideas and keep learning, so every client gets our best work.',
    photo: { src: 'https://wiseup.in/wp-content/uploads/2026/10/DSC00377-copy-1-2.webp', alt: 'The WiseUp team together on stage at a brand launch event', width: 540, height: 341 },
  },
  founders: {
    tag: 'Our founders',
    people: [
      { name: 'Jijin Mohan', role: 'CEO', photo: { src: 'https://wiseup.in/wp-content/uploads/2026/10/Frame-1984078518.webp', width: 750, height: 889 } },
      { name: 'Sarath Kumar', role: 'COO', photo: { src: 'https://wiseup.in/wp-content/uploads/2026/10/Frame-1984078518-1.webp', width: 750, height: 891 } },
    ],
  },
};

export const contact = {
  tag: "Let's talk",
  heading: ['Ready to light', 'the fire?'],
  body: "Tell us where you want your brand to go. We'll send the plan before we talk numbers.",
};

// Contact page (redesign 2026-10-22). The brief is one sentence the visitor completes; the preview
// beside it is the exact WhatsApp message it composes (see briefForm() in motion/main.ts).
export const contactPage = {
  title: ['Tell us what', 'you want branded.'],
  intro:
    "Tell us where you want your brand to go. We'll send the plan before we talk numbers. Fill in the form, message us on WhatsApp, or drop by the studio.",
  formHeading: 'Send us a brief',
  detailsHeading: 'Reach us directly',
  mapHeading: 'Find us',
  // city-level coordinates (site.coords): no street address is on file for the studio yet.
  mapEmbed: 'https://www.google.com/maps?q=11.2588,75.7804&z=12&output=embed',
};
