import {z} from 'zod';
import {realEstateListingSchema, VIDEO_TYPES} from './niche';

export const aspectRatioSchema = z.enum(['9:16', '1:1', '16:9']);

const briefBaseSchema = z.object({
  goal: z.string().min(1),
  aspectRatio: aspectRatioSchema,
  durationSec: z.number().positive(),
  audience: z.string().min(1),
  keyMessage: z.string().min(1),
  cta: z.string().min(1),
  assetUrls: z.array(z.string().url()),
  voiceover: z.boolean(),
});

export const briefSchema = z.discriminatedUnion('videoType', [
  briefBaseSchema.extend({
    videoType: z.literal(VIDEO_TYPES[0]),
    details: realEstateListingSchema,
  }),
]);

export type Brief = z.infer<typeof briefSchema>;
