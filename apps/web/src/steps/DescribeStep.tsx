import type {FC} from 'react';
import type {Brief} from '@ai-video-studio/schema';
import {Button, Card, Field, TextArea, TextInput} from '../components/ui';

type Props = {brief: Brief; onChange: (brief: Brief) => void};

export const DescribeStep: FC<Props> = ({brief, onChange}) => {
  const {details} = brief;
  const setDetails = (patch: Partial<Brief['details']>) => onChange({...brief, details: {...details, ...patch}});
  const setFeature = (index: number, patch: Partial<Brief['details']['keyFeatures'][number]>) =>
    setDetails({keyFeatures: details.keyFeatures.map((feature, i) => (i === index ? {...feature, ...patch} : feature))});

  return (
    <div className="space-y-6">
      <Card title="Your product" hint="The AI only uses facts you write here. It will not invent features or numbers.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Product name">
            <TextInput value={details.productName} maxLength={30} onChange={(e) => setDetails({productName: e.target.value})} placeholder="Flowly" />
          </Field>
          <Field label="One-liner" hint="What it is, in one sentence">
            <TextInput value={details.oneLiner} maxLength={100} onChange={(e) => setDetails({oneLiner: e.target.value})} placeholder="Project management built for small agencies" />
          </Field>
          <Field label="The problem it solves" className="sm:col-span-2">
            <TextInput value={details.problem} maxLength={200} onChange={(e) => setDetails({problem: e.target.value})} placeholder="Client work gets lost across chats, sheets and email" />
          </Field>
        </div>
      </Card>

      <Card title="Key features" hint="1 to 5. The video shows the 3 that best match your goal.">
        <div className="space-y-3">
          {details.keyFeatures.map((feature, index) => (
            <div key={index} className="grid gap-3 sm:grid-cols-[1fr_2fr_auto]">
              <TextInput value={feature.title} maxLength={40} onChange={(e) => setFeature(index, {title: e.target.value})} placeholder="Feature name" />
              <TextInput value={feature.description} maxLength={140} onChange={(e) => setFeature(index, {description: e.target.value})} placeholder="What it does for the user" />
              <Button variant="danger" disabled={details.keyFeatures.length <= 1} onClick={() => setDetails({keyFeatures: details.keyFeatures.filter((_, i) => i !== index)})}>
                Remove
              </Button>
            </div>
          ))}
          <Button variant="ghost" disabled={details.keyFeatures.length >= 5} onClick={() => setDetails({keyFeatures: [...details.keyFeatures, {title: '', description: ''}]})}>
            + Add feature
          </Button>
        </div>
      </Card>

      <Card title="Anything else?" hint="Optional direction for the AI: mood, what to emphasize, what to avoid.">
        <Field label={`Your prompt (${brief.userPrompt.length}/1500)`}>
          <TextArea value={brief.userPrompt} maxLength={1500} onChange={(e) => onChange({...brief, userPrompt: e.target.value})} placeholder="Make it feel calm and organized. Focus on client approvals." />
        </Field>
        <Field label="Customer count (optional proof)" className="mt-4">
          <TextInput value={details.proof?.customerCount ?? ''} maxLength={40} onChange={(e) => setDetails({proof: {stats: details.proof?.stats ?? [], customerCount: e.target.value || undefined}})} placeholder="Only add if true, e.g. 2,000+ agencies" />
        </Field>
      </Card>
    </div>
  );
};
