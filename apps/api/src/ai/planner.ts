import type Anthropic from '@anthropic-ai/sdk';
import {z} from 'zod';
import {
  TEMPLATE_META,
  TEMPLATE_NAMES,
  TEMPLATE_PROPS,
  buildCatalogText,
  createSceneJsonSchema,
  getTotalDurationInFrames,
  onScreenWords,
  readingSeconds,
  type BrandKit,
  type Brief,
  type SceneJSON,
  type TemplateName,
} from '@ai-video-studio/schema';
import {config} from '../config';
import {loadSkills} from './skills';
import {addUsage, costUsd, emptyUsage, usageFromResponse, type Usage} from './usage';

export type PlanInput = {brand: BrandKit; brief: Brief};

// ---------------------------------------------------------------- storyboard (what the AI returns)

export const storyboardSchema = z.object({
  title: z.string(),
  scenes: z
    .array(
      z.object({
        id: z.string().min(1),
        template: z.enum(TEMPLATE_NAMES),
        purpose: z.string().max(140),
        durationSec: z.number(),
        props: z.record(z.string(), z.unknown()),
        assetId: z.string().optional(),
        focusRegionLabel: z.string().optional(),
      }),
    )
    .min(3),
});
export type Storyboard = z.infer<typeof storyboardSchema>;

export const SCENE_COUNT: Record<number, [number, number]> = {15: [3, 4], 30: [5, 6], 60: [8, 10], 90: [11, 14]};
const SIZE = {'16:9': {width: 1920, height: 1080}, '9:16': {width: 1080, height: 1920}, '1:1': {width: 1080, height: 1080}} as const;
const TRANSITION = {
  calm: {type: 'fade', frames: 15},
  energetic: {type: 'slide', frames: 8},
  playful: {type: 'wipe', frames: 12},
  corporate: {type: 'fade', frames: 12},
} as const;
export const FPS = 30;

// ---------------------------------------------------------------- prompts

const ROLE = `You are the creative director of an automated SaaS explainer video tool.
You do NOT write code. You choose scene templates from the catalog and fill in their props with short on-screen text.
The video has no voiceover, so on-screen text carries the whole story.
Return ONLY one JSON object, no markdown fences, no commentary.`;

const OUTPUT_SHAPE = `JSON shape:
{
  "title": "short internal title",
  "scenes": [
    {
      "id": "s1",
      "template": "HookStatement",
      "purpose": "why this scene exists, max 140 chars",
      "durationSec": 3.5,
      "props": { ...only props defined for that template... },
      "assetId": "optional id from the asset list (screenshot templates only)",
      "focusRegionLabel": "optional region label of that asset (ScreenshotShowcase only)"
    }
  ]
}`;

export const buildUserMessage = ({brand, brief}: PlanInput): string => {
  const [min, max] = SCENE_COUNT[brief.durationSec];
  const payload = {
    brand: {name: brand.name, tone: brand.tone, motionStyle: brand.motionStyle, donts: brand.rules.donts},
    videoType: brief.subtype,
    targetDurationSec: brief.durationSec,
    aspectRatio: brief.aspectRatio,
    audience: brief.details.audience,
    goal: brief.details.goal,
    tone: brief.details.tone,
    product: {name: brief.details.productName, oneLiner: brief.details.oneLiner, problem: brief.details.problem},
    keyFeatures: brief.details.keyFeatures,
    proof: brief.details.proof ?? null,
    cta: brief.details.cta,
    userPrompt: brief.userPrompt,
    assets: brief.assets.map((asset) => ({
      id: asset.id,
      kind: asset.kind,
      label: asset.label,
      description: asset.description ?? '',
      regionLabels: asset.focusRegions.map((region) => region.label),
    })),
  };
  return `Create the video plan for this brief.\nScene count must be ${min}-${max}. Total duration must be within 10% of ${brief.durationSec}s.\nFirst scene: HookStatement or ProductReveal. Last scene: CTAEndCard (only once).\n\nBRIEF:\n${JSON.stringify(payload, null, 2)}\n\n${OUTPUT_SHAPE}`;
};

// ---------------------------------------------------------------- checks

export const checkStoryboard = (storyboard: Storyboard, {brief}: PlanInput): {errors: string[]; warnings: string[]} => {
  const errors: string[] = [];
  const warnings: string[] = [];
  const [min, max] = SCENE_COUNT[brief.durationSec];
  const {scenes} = storyboard;
  if (scenes.length < min || scenes.length > max) errors.push(`Scene count is ${scenes.length}; it must be ${min}-${max} for a ${brief.durationSec}s video.`);

  const ids = new Set<string>();
  scenes.forEach((scene, index) => {
    if (ids.has(scene.id)) errors.push(`Duplicate scene id "${scene.id}".`);
    ids.add(scene.id);
    const parsed = TEMPLATE_PROPS[scene.template].safeParse(scene.props);
    if (!parsed.success) {
      parsed.error.issues.forEach((issue) => errors.push(`Scene ${scene.id} (${scene.template}) props.${issue.path.join('.') || '(root)'}: ${issue.message}`));
    }
    if (scene.template === 'CTAEndCard' && index !== scenes.length - 1) errors.push(`CTAEndCard must only be the last scene (found in ${scene.id}).`);
    if (scene.assetId) {
      const asset = brief.assets.find((item) => item.id === scene.assetId);
      if (!asset) errors.push(`Scene ${scene.id}: assetId "${scene.assetId}" does not exist.`);
      else if (asset.kind === 'logo') errors.push(`Scene ${scene.id}: logo assets cannot be used as screenshots.`);
      else if (scene.focusRegionLabel && !asset.focusRegions.some((region) => region.label === scene.focusRegionLabel)) {
        errors.push(`Scene ${scene.id}: focusRegionLabel "${scene.focusRegionLabel}" is not a region of asset ${asset.id}.`);
      }
      if (!TEMPLATE_META[scene.template].usesScreenshot) warnings.push(`Scene ${scene.id}: ${scene.template} ignores assetId.`);
    }
    const words = onScreenWords(scene.props);
    if (words > TEMPLATE_META[scene.template].maxWords) warnings.push(`Scene ${scene.id}: ${words} words (soft limit ${TEMPLATE_META[scene.template].maxWords}).`);
  });

  const first = scenes[0]?.template;
  if (first !== 'HookStatement' && first !== 'ProductReveal') errors.push('First scene must be HookStatement or ProductReveal.');
  if (scenes[scenes.length - 1]?.template !== 'CTAEndCard') errors.push('Last scene must be CTAEndCard.');
  const count = (template: TemplateName) => scenes.filter((scene) => scene.template === template).length;
  if (count('CTAEndCard') !== 1) errors.push('Use CTAEndCard exactly once.');
  if (count('ProductReveal') > 1) errors.push('Use ProductReveal at most once.');
  if (count('HookStatement') > 1) errors.push('Use HookStatement at most once.');
  if (count('FeatureSpotlight') > 3) errors.push('Use at most 3 FeatureSpotlight scenes.');
  if (count('StepFlow') > 1) errors.push('Use StepFlow at most once.');
  return {errors, warnings};
};

// ---------------------------------------------------------------- compile (deterministic, no AI)

export const compileStoryboard = (storyboard: Storyboard, {brand, brief}: PlanInput): {sceneJson: SceneJSON; notes: string[]} => {
  const notes: string[] = [];
  let seconds = storyboard.scenes.map((scene) => {
    const need = readingSeconds(onScreenWords(scene.props));
    const value = Math.min(8, Math.max(3, scene.durationSec, need));
    if (value !== scene.durationSec) notes.push(`Scene ${scene.id}: duration ${scene.durationSec}s -> ${value.toFixed(1)}s (reading-time rule).`);
    return value;
  });

  const transition = TRANSITION[brand.motionStyle];
  const overlap = ((storyboard.scenes.length - 1) * transition.frames) / FPS;
  const sum = seconds.reduce((a, b) => a + b, 0);
  const total = sum - overlap;
  if (Math.abs(total - brief.durationSec) / brief.durationSec > 0.1) {
    const factor = (brief.durationSec + overlap) / sum;
    seconds = seconds.map((value) => Math.min(8, Math.max(3, value * factor)));
    notes.push(`Total was ${total.toFixed(1)}s, scaled toward ${brief.durationSec}s.`);
  }

  const scenes = storyboard.scenes.map((scene, index) => {
    const props: Record<string, unknown> = {...scene.props};
    delete props.screenshotUrl;
    delete props.focusRegion;
    const asset = brief.assets.find((item) => item.id === scene.assetId);
    if (asset && TEMPLATE_META[scene.template].usesScreenshot) {
      props.screenshotUrl = asset.url;
      const region = asset.focusRegions.find((item) => item.label === scene.focusRegionLabel);
      if (region && scene.template === 'ScreenshotShowcase') props.focusRegion = {x: region.x, y: region.y, w: region.w, h: region.h};
    }
    const last = index === storyboard.scenes.length - 1;
    return {
      id: scene.id,
      template: scene.template,
      durationInFrames: Math.round((seconds[index] ?? 3) * FPS),
      props: TEMPLATE_PROPS[scene.template].parse(props) as Record<string, unknown>,
      transitionOut: last ? ({type: 'none', durationInFrames: 0} as const) : ({type: transition.type, durationInFrames: transition.frames} as const),
    };
  });

  const candidate = {version: 1 as const, meta: {fps: FPS, ...SIZE[brief.aspectRatio]}, scenes, audio: {}, captions: []};
  // Final gate: the exact schema Remotion's DynamicVideo uses.
  const sceneJson = createSceneJsonSchema(TEMPLATE_PROPS).parse(candidate);
  return {sceneJson, notes};
};

// ---------------------------------------------------------------- mock planner (free; tests the whole app without Claude)

const cut = (text: string, max: number): string => (text.length <= max ? text : text.slice(0, max - 1).trimEnd());

export const mockStoryboard = ({brief}: PlanInput): Storyboard => {
  const {details} = brief;
  const shot = brief.assets.find((asset) => asset.kind === 'screenshot');
  const features = details.keyFeatures.slice(0, 3);
  const icons = ['chart', 'bolt', 'shield'] as const;
  const make = (template: TemplateName, props: Record<string, unknown>, extra: Partial<Storyboard['scenes'][number]> = {}) => ({
    id: 'x',
    template,
    purpose: `Mock ${template}`,
    durationSec: 4,
    props,
    ...extra,
  });
  const hook = make('HookStatement', {line: cut(details.problem, 60), emphasisWords: [], style: 'word-by-word'});
  const reveal = make('ProductReveal', {productName: cut(details.productName, 30), tagline: cut(details.oneLiner, 60)}, shot ? {assetId: shot.id} : {});
  const feature = (index: number) => {
    const item = features[index % features.length]!;
    return make('FeatureSpotlight', {icon: icons[index % 3], title: cut(item.title, 30), description: cut(item.description, 90)});
  };
  const showcase = () =>
    make('ScreenshotShowcase', {caption: cut(features[0]!.title, 60), showCursor: true}, shot ? {assetId: shot.id, ...(shot.focusRegions[0] ? {focusRegionLabel: shot.focusRegions[0].label} : {})} : {});
  const steps = make('StepFlow', {steps: (features.length >= 2 ? features : [...features, ...features]).slice(0, 3).map((item) => ({label: cut(item.title, 24)}))});
  const cta = make('CTAEndCard', {cta: cut(details.cta.text, 30), url: cut(details.cta.url, 40)});

  const byLength: Record<number, ReturnType<typeof make>[]> = {
    15: [hook, reveal, cta],
    30: [hook, reveal, feature(0), feature(1), feature(2), cta],
    60: [hook, reveal, showcase(), feature(0), feature(1), feature(2), steps, showcase(), cta],
    90: [hook, reveal, showcase(), feature(0), feature(1), feature(2), steps, showcase(), showcase(), showcase(), showcase(), cta],
  };
  const scenes = (byLength[brief.durationSec] ?? byLength[30]!).map((scene, index) => ({...scene, id: `s${index + 1}`}));
  return {title: `Mock plan for ${details.productName}`, scenes};
};

// ---------------------------------------------------------------- Claude call

const extractJson = (text: string): unknown => {
  const cleaned = text.replace(/^```(?:json)?\s*/i, '').replace(/```\s*$/, '').trim();
  const start = cleaned.indexOf('{');
  const end = cleaned.lastIndexOf('}');
  if (start === -1 || end === -1) throw new Error('No JSON object found in the model reply.');
  return JSON.parse(cleaned.slice(start, end + 1));
};

export type PlanResult = {
  storyboard: Storyboard;
  sceneJson: SceneJSON;
  notes: string[];
  warnings: string[];
  usage: Usage;
  costUsd: number;
  attempts: number;
  mock: boolean;
};

export type PlanOptions = {mock?: boolean; client?: Pick<Anthropic, 'messages'>; skillsDir?: string; log?: (message: string) => void};

export const generatePlan = async (input: PlanInput, options: PlanOptions = {}): Promise<PlanResult> => {
  const mock = options.mock ?? config.mockAi;
  let usage = emptyUsage();
  let attempts = 0;
  let storyboard: Storyboard;

  if (mock) {
    storyboard = mockStoryboard(input);
  } else {
    const client = options.client ?? (await createClient());
    const system = [
      {type: 'text' as const, text: ROLE},
      {type: 'text' as const, text: `${loadSkills(input.brief.subtype, options.skillsDir)}\n\n${buildCatalogText()}`, cache_control: {type: 'ephemeral' as const}},
    ];
    const messages: Anthropic.MessageParam[] = [{role: 'user', content: buildUserMessage(input)}];
    let lastErrors: string[] = [];
    let accepted: Storyboard | undefined;

    for (attempts = 1; attempts <= 3 && !accepted; attempts++) {
      const response = await client.messages.create({model: config.model, max_tokens: 6000, system, messages});
      usage = addUsage(usage, usageFromResponse(response));
      const text = response.content.map((block) => (block.type === 'text' ? block.text : '')).join('');

      let errors: string[] = [];
      try {
        const parsed = storyboardSchema.safeParse(extractJson(text));
        if (!parsed.success) errors = parsed.error.issues.map((issue) => `${issue.path.join('.')}: ${issue.message}`);
        else {
          errors = checkStoryboard(parsed.data, input).errors;
          if (errors.length === 0) accepted = parsed.data;
        }
      } catch (error) {
        errors = [(error as Error).message];
      }
      if (!accepted) {
        lastErrors = errors;
        options.log?.(`attempt ${attempts} had ${errors.length} problem(s), asking Claude to repair...`);
        messages.push({role: 'assistant', content: text});
        messages.push({role: 'user', content: `Your JSON has these problems. Fix ALL of them and return the full corrected JSON only:\n- ${errors.join('\n- ')}`});
      }
    }
    attempts -= 1;
    if (!accepted) throw new Error(`Claude could not produce a valid plan after 3 attempts:\n- ${lastErrors.join('\n- ')}`);
    storyboard = accepted;
  }

  const {sceneJson, notes} = compileStoryboard(storyboard, input);
  const {warnings} = checkStoryboard(storyboard, input);
  if (getTotalDurationInFrames(sceneJson) <= 0) throw new Error('Compiled video has no duration.');
  return {storyboard, sceneJson, notes, warnings, usage, costUsd: costUsd(usage), attempts, mock};
};

export const createClient = async (): Promise<Anthropic> => {
  if (!config.apiKey) throw new Error('ANTHROPIC_API_KEY is missing. Add it to apps/api/.env, or set MOCK_AI=1 to test without Claude.');
  const {default: AnthropicSdk} = await import('@anthropic-ai/sdk');
  return new AnthropicSdk({apiKey: config.apiKey});
};
