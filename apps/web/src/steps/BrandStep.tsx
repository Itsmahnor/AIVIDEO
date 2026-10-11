import {useState, type FC} from 'react';
import {supportedFontNames} from '@ai-video-studio/video/player';
import type {BrandKit} from '@ai-video-studio/schema';
import {Button, Card, ErrorBox, Field, Select, TextArea, TextInput} from '../components/ui';
import {api, downscaleImage} from '../lib/api';

type Props = {brand: BrandKit; onChange: (brand: BrandKit) => void};

const COLOR_KEYS = ['primary', 'secondary', 'accent', 'background', 'text'] as const;
const fontOptions = supportedFontNames.map((name) => ({value: name, label: name}));
const MOTION = [
  {value: 'calm', label: 'Calm: smooth and slow'},
  {value: 'energetic', label: 'Energetic: snappy and fast'},
  {value: 'playful', label: 'Playful: bouncy'},
  {value: 'corporate', label: 'Corporate: smooth and medium'},
];

const lines = (value: string): string[] => value.split('\n').map((line) => line.trim()).filter(Boolean);

export const BrandStep: FC<Props> = ({brand, onChange}) => {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string[]>([]);

  const uploadLogo = async (file: File | undefined) => {
    if (!file) return;
    setUploading(true);
    setError([]);
    try {
      const asset = await api.upload(await downscaleImage(file, 800), 'logo', 'Logo');
      onChange({...brand, logoUrl: asset.url});
    } catch (e) {
      setError([(e as Error).message]);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card title="Brand basics" hint="These apply to every scene automatically: colors, fonts and the logo.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand name">
            <TextInput value={brand.name} onChange={(e) => onChange({...brand, name: e.target.value})} placeholder="Flowly" />
          </Field>
          <Field label="Brand tone" hint="How the brand sounds, e.g. friendly, clear and confident">
            <TextInput value={brand.tone} onChange={(e) => onChange({...brand, tone: e.target.value})} />
          </Field>
          <Field label="Logo" hint="PNG, JPG or WebP. Without a logo, the brand name is shown as text." className="sm:col-span-2">
            <div className="flex items-center gap-3">
              {brand.logoUrl ? <img src={brand.logoUrl.startsWith('http') ? brand.logoUrl : `/${brand.logoUrl}`} alt="Logo" className="h-10 max-w-[160px] rounded bg-slate-100 object-contain p-1" /> : <span className="text-sm text-slate-400">No logo</span>}
              <input type="file" accept="image/png,image/jpeg,image/webp" disabled={uploading} onChange={(e) => void uploadLogo(e.target.files?.[0])} className="text-sm" />
              {brand.logoUrl ? (
                <Button variant="danger" onClick={() => onChange({...brand, logoUrl: ''})}>
                  Remove
                </Button>
              ) : null}
            </div>
          </Field>
        </div>
      </Card>

      <Card title="Colors and fonts">
        <div className="grid gap-4 sm:grid-cols-5">
          {COLOR_KEYS.map((key) => (
            <Field key={key} label={key[0]!.toUpperCase() + key.slice(1)}>
              <div className="flex items-center gap-2">
                <input type="color" value={brand.colors[key]} onChange={(e) => onChange({...brand, colors: {...brand.colors, [key]: e.target.value.toUpperCase()}})} className="h-9 w-10 cursor-pointer rounded border border-slate-300 bg-white p-0.5" />
                <TextInput value={brand.colors[key]} onChange={(e) => onChange({...brand, colors: {...brand.colors, [key]: e.target.value}})} className="font-mono" />
              </div>
            </Field>
          ))}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <Field label="Heading font">
            <Select value={brand.fonts.heading} options={fontOptions} onChange={(e) => onChange({...brand, fonts: {...brand.fonts, heading: e.target.value}})} />
          </Field>
          <Field label="Body font">
            <Select value={brand.fonts.body} options={fontOptions} onChange={(e) => onChange({...brand, fonts: {...brand.fonts, body: e.target.value}})} />
          </Field>
          <Field label="Motion style">
            <Select value={brand.motionStyle} options={MOTION} onChange={(e) => onChange({...brand, motionStyle: e.target.value as BrandKit['motionStyle']})} />
          </Field>
        </div>
      </Card>

      <Card title="Brand rules" hint="One rule per line. The AI follows these when it writes text.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Do">
            <TextArea value={brand.rules.dos.join('\n')} onChange={(e) => onChange({...brand, rules: {...brand.rules, dos: lines(e.target.value)}})} placeholder="Use plain words" />
          </Field>
          <Field label="Don't">
            <TextArea value={brand.rules.donts.join('\n')} onChange={(e) => onChange({...brand, rules: {...brand.rules, donts: lines(e.target.value)}})} placeholder="No exclamation marks" />
          </Field>
        </div>
      </Card>
      <ErrorBox messages={error} />
    </div>
  );
};
