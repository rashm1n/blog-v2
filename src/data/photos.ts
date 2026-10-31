import type { ImageMetadata } from 'astro';
import weligama from '../assets/photos/weligama.jpg';
import avukana from '../assets/photos/avukana.jpg';
import buduruwagala from '../assets/photos/buduruwagala.jpg';
import buttala from '../assets/photos/buttala.jpg';
import overBangkok from '../assets/photos/over-bangkok.jpg';
import sametNangshe from '../assets/photos/samet-nangshe.jpg';
import church from '../assets/photos/church.jpg';
import kualaLumpur from '../assets/photos/kuala-lumpur.jpg';
import galle from '../assets/photos/galle.jpg';
import gardensByTheBay from '../assets/photos/gardens-by-the-bay.jpg';

export interface Photo {
  id: string;
  src: ImageMetadata;
  alt: string;
  place: string;
  /** Rounded to one decimal (~10 km) on purpose; the files themselves carry no GPS. */
  coords: string;
  taken: Date;
}

/** Newest first. The originals' EXIF (GPS included) was stripped when they were copied in. */
export const PHOTOS: Photo[] = [
  { id: 'gardens-by-the-bay', src: gardensByTheBay, place: 'Gardens by the Bay, Singapore', coords: '1.3° N, 103.9° E', taken: new Date('2026-10-06'), alt: 'The Supertree Grove lit blue at night and reflected in the water, with the Singapore Flyer behind' },
  { id: 'galle', src: galle, place: 'Galle, Sri Lanka', coords: '6.0° N, 80.2° E', taken: new Date('2026-09-26'), alt: 'The sun setting over a rough sea, with a bird crossing the sky' },
  { id: 'kuala-lumpur', src: kualaLumpur, place: 'Kuala Lumpur, Malaysia', coords: '3.2° N, 101.7° E', taken: new Date('2026-04-13'), alt: 'The Petronas Towers reflected in a pool in KLCC Park' },
  { id: 'church', src: church, place: 'Near Colombo, Sri Lanka', coords: '7.0° N, 79.9° E', taken: new Date('2026-01-11'), alt: 'A small grey stone church at the end of a garden path among the trees' },
  { id: 'samet-nangshe', src: sametNangshe, place: 'Samet Nangshe, Thailand', coords: '8.2° N, 98.4° E', taken: new Date('2025-11-07'), alt: 'Limestone islands rising out of Phang Nga Bay under heavy cloud, with mangroves and jungle below' },
  { id: 'over-bangkok', src: overBangkok, place: 'Over Bangkok, Thailand', coords: '13.9° N, 100.6° E', taken: new Date('2025-11-01'), alt: 'An AirAsia wingtip above a sea of cloud' },
  { id: 'buttala', src: buttala, place: 'Near Buttala, Sri Lanka', coords: '6.8° N, 81.3° E', taken: new Date('2025-08-04'), alt: 'A brick stupa behind a low wall, framed by a large tree and blue sky' },
  { id: 'buduruwagala', src: buduruwagala, place: 'Buduruwagala, Sri Lanka', coords: '6.7° N, 81.1° E', taken: new Date('2025-08-02'), alt: 'The Buduruwagala Buddha carved into a dark rock face, with a person standing at its foot' },
  { id: 'weligama', src: weligama, place: 'Weligama, Sri Lanka', coords: '6.0° N, 80.4° E', taken: new Date('2025-07-26'), alt: 'Fishing boats pulled up on a beach between palm trees and the surf, seen from a drone' },
  { id: 'avukana', src: avukana, place: 'Avukana, Sri Lanka', coords: '8.0° N, 80.5° E', taken: new Date('2025-07-06'), alt: 'The Avukana Buddha, a standing statue cut from rock, with visitors at its base' },
];

export const photoMonth = (d: Date) => d.toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' });
