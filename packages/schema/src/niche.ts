import {z} from 'zod';

export const VIDEO_TYPES = ['real-estate-listing'] as const;

export type VideoType = (typeof VIDEO_TYPES)[number];

export const NICHE_FIELDS = {
  'real-estate-listing': [
    'listingType',
    'propertyType',
    'price',
    'currency',
    'location',
    'bedrooms',
    'bathrooms',
    'areaSize',
    'areaUnit',
    'keyFeatures',
    'agentName',
    'agentPhone',
    'agencyName',
  ],
} as const satisfies Record<VideoType, readonly string[]>;

export const realEstateListingSchema = z.object({
  listingType: z.string(),
  propertyType: z.string(),
  price: z.number().nonnegative(),
  currency: z.string(),
  location: z.string(),
  bedrooms: z.number().nonnegative(),
  bathrooms: z.number().nonnegative(),
  areaSize: z.number().positive(),
  areaUnit: z.string(),
  keyFeatures: z.array(z.string()),
  agentName: z.string(),
  agentPhone: z.string(),
  agencyName: z.string(),
});

export type RealEstateListing = z.infer<typeof realEstateListingSchema>;
