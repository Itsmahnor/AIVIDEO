import brandFixture from '@ai-video-studio/schema/fixtures/brand-kit.json';
import briefFixture from '@ai-video-studio/schema/fixtures/brief-saas-16x9.json';
import {brandKitSchema, briefSchema, type BrandKit, type Brief} from '@ai-video-studio/schema';

export const sampleBrand: BrandKit = brandKitSchema.parse(brandFixture);
export const sampleBrief: Brief = briefSchema.parse(briefFixture);

export const emptyBrief: Brief = {
  videoType: 'saas-explainer',
  subtype: 'product-overview',
  aspectRatio: '16:9',
  durationSec: 30,
  userPrompt: '',
  assets: [],
  details: {
    productName: '',
    oneLiner: '',
    problem: '',
    keyFeatures: [{title: '', description: ''}],
    audience: 'general',
    goal: 'signups',
    tone: 'friendly',
    cta: {type: 'trial', text: 'Start your free trial', url: ''},
  },
};

export const emptyBrand: BrandKit = {...sampleBrand, name: '', logoUrl: '', tone: '', rules: {dos: [], donts: []}};
