import type {FC} from 'react';
import {AUDIENCES, CTA_TYPES, EXPLAINER_SUBTYPES, GOALS, TONES, type Brief} from '@ai-video-studio/schema';
import {Card, Field, Select, TextInput} from '../components/ui';

type Props = {brief: Brief; onChange: (brief: Brief) => void};

const label = (value: string): string => value.replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
const options = (values: readonly string[]) => values.map((value) => ({value, label: label(value)}));

export const SelectStep: FC<Props> = ({brief, onChange}) => {
  const {details} = brief;
  const setDetails = (patch: Partial<Brief['details']>) => onChange({...brief, details: {...details, ...patch}});

  return (
    <div className="space-y-6">
      <Card title="Video type and format" hint="Pick what kind of video you want. The AI follows a matching storytelling playbook.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Video type">
            <Select value={brief.subtype} options={options(EXPLAINER_SUBTYPES)} onChange={(e) => onChange({...brief, subtype: e.target.value as Brief['subtype']})} />
          </Field>
          <Field label="Length">
            <Select
              value={String(brief.durationSec)}
              options={[15, 30, 60, 90].map((value) => ({value: String(value), label: `${value} seconds`}))}
              onChange={(e) => onChange({...brief, durationSec: Number(e.target.value) as Brief['durationSec']})}
            />
          </Field>
          <Field label="Format">
            <Select
              value={brief.aspectRatio}
              options={[
                {value: '16:9', label: '16:9 (YouTube, website)'},
                {value: '9:16', label: '9:16 (Reels, Shorts, TikTok)'},
                {value: '1:1', label: '1:1 (feed posts)'},
              ]}
              onChange={(e) => onChange({...brief, aspectRatio: e.target.value as Brief['aspectRatio']})}
            />
          </Field>
        </div>
      </Card>
      <Card title="Audience, goal and tone">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Audience">
            <Select value={details.audience} options={options(AUDIENCES)} onChange={(e) => setDetails({audience: e.target.value as Brief['details']['audience']})} />
          </Field>
          <Field label="Goal">
            <Select value={details.goal} options={options(GOALS)} onChange={(e) => setDetails({goal: e.target.value as Brief['details']['goal']})} />
          </Field>
          <Field label="Tone of the writing">
            <Select value={details.tone} options={options(TONES)} onChange={(e) => setDetails({tone: e.target.value as Brief['details']['tone']})} />
          </Field>
        </div>
      </Card>
      <Card title="Call to action" hint="The final scene. Use your own wording and URL.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Field label="Type">
            <Select value={details.cta.type} options={options(CTA_TYPES)} onChange={(e) => setDetails({cta: {...details.cta, type: e.target.value as Brief['details']['cta']['type']}})} />
          </Field>
          <Field label="Button text" hint="Max 6 words reads best">
            <TextInput value={details.cta.text} onChange={(e) => setDetails({cta: {...details.cta, text: e.target.value}})} />
          </Field>
          <Field label="URL">
            <TextInput value={details.cta.url} onChange={(e) => setDetails({cta: {...details.cta, url: e.target.value}})} placeholder="yourapp.com/start" />
          </Field>
        </div>
      </Card>
    </div>
  );
};
