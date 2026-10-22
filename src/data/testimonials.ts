// Client testimonial videos shown in the hero strip (the same assets as the WordPress site's carousel).
// Poster = the WebP the site already serves (1080x1920, with 169/576/768/864 wide variants); video = the MP4.
const UP = 'https://wiseup.in/wp-content/uploads';
const poster = (name: string) => ({
  src: `${UP}/2026/06/${name}-576x1024.webp`,
  srcset: [169, 576, 768].map((w) => `${UP}/2026/06/${name}-${w}x${Math.round(w * 1.7778)}.webp ${w}w`).join(', '),
});
const clip = (file: string) => `${UP}/2026/07/${file}.mp4`;

export type Testimonial = { name: string; poster: { src: string; srcset: string }; video: string };

export const testimonials: Testimonial[] = [
  { name: 'Afsal', poster: poster('afsal'), video: clip('afsal-1') },
  { name: 'Bheegaran', poster: poster('bheegaran'), video: clip('Bheegaran-Testimonial-1') },
  { name: 'Chef Vinod', poster: poster('Chef-vinod'), video: clip('Chef-Testimonial-1') },
  { name: 'Jonah, Brightside', poster: poster('JONAH'), video: clip('Brightside-Testimonial-1') },
  { name: 'Aswathy & Achu', poster: poster('kasinath'), video: clip('Aswathy-Achu-Testimonial-1-1') },
  { name: 'Sajeev Nair', poster: poster('SAJEEV-NAIR'), video: clip('Sajeev-Nair-Testimoni-compressed') },
  { name: 'TR Shamsudheen', poster: poster('tr-shamsudheen'), video: clip('TR-Shamsudheen-Testimonial-1-compressed') },
  { name: 'WAC', poster: poster('wac-1'), video: clip('compressed-video') },
];
