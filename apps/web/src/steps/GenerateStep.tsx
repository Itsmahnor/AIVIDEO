import {useEffect, useRef, useState, type FC} from 'react';
import {briefSchema, brandKitSchema, collectText, getTotalDurationInFrames, type BrandKit, type Brief, type SceneJSON} from '@ai-video-studio/schema';
import {Preview} from '../components/Preview';
import {Button, Card, ErrorBox, Pill} from '../components/ui';
import {api, type Health, type PlanResponse, type RenderJob} from '../lib/api';
import {issuesOf} from '../lib/validate';

type Props = {
  brand: BrandKit;
  brief: Brief;
  health: Health | null;
  plan: PlanResponse | null;
  onPlan: (plan: PlanResponse) => void;
  onAssets: (assets: Brief['assets']) => void;
  projectId: string | undefined;
  onSaved: (id: string) => void;
};

const RENDER_LABEL: Record<RenderJob['status'], string> = {queued: 'Waiting in queue', bundling: 'Preparing (first render takes longer)', rendering: 'Rendering', done: 'Done', error: 'Failed'};

export const GenerateStep: FC<Props> = ({brand, brief, health, plan, onPlan, onAssets, projectId, onSaved}) => {
  const [mock, setMock] = useState(true);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const [job, setJob] = useState<RenderJob | null>(null);
  const [saved, setSaved] = useState('');
  const poll = useRef<number | undefined>(undefined);

  // Default to the free mock planner until an API key is configured.
  useEffect(() => {
    if (health) setMock(!health.hasApiKey || health.mockAi);
  }, [health]);
  useEffect(() => () => window.clearInterval(poll.current), []);

  const problems = [...issuesOf(brandKitSchema, brand).map((m) => `Brand ${m}`), ...issuesOf(briefSchema, brief).map((m) => `Brief ${m}`)];

  const generate = async () => {
    setBusy(true);
    setErrors([]);
    setJob(null);
    try {
      const result = await api.plan(brand, brief, mock);
      onAssets(result.assets);
      onPlan(result);
    } catch (e) {
      setErrors([(e as Error).message]);
    } finally {
      setBusy(false);
    }
  };

  const render = async (preset: 'draft' | 'final') => {
    if (!plan) return;
    setErrors([]);
    try {
      let current = await api.startRender(plan.sceneJson, brand, preset);
      setJob(current);
      window.clearInterval(poll.current);
      poll.current = window.setInterval(async () => {
        try {
          current = await api.renderStatus(current.id);
          setJob(current);
          if (current.status === 'done' || current.status === 'error') window.clearInterval(poll.current);
        } catch (e) {
          window.clearInterval(poll.current);
          setErrors([(e as Error).message]);
        }
      }, 1500);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const save = async () => {
    try {
      const result = await api.saveProject({id: projectId, name: brief.details.productName || 'Untitled', brand, brief, plan});
      onSaved(result.id);
      setSaved(`Saved at ${new Date(result.updatedAt).toLocaleTimeString()}`);
    } catch (e) {
      setErrors([(e as Error).message]);
    }
  };

  const downloadJson = (sceneJson: SceneJSON) => {
    const url = URL.createObjectURL(new Blob([JSON.stringify(sceneJson, null, 2)], {type: 'application/json'}));
    const link = document.createElement('a');
    link.href = url;
    link.download = `${brief.details.productName || 'video'}.scene.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <Card title="Generate" hint="Claude reads your brand, selections, text and screenshots, then plans the scenes. Remotion draws them.">
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={() => void generate()} disabled={busy || problems.length > 0}>
            {busy ? 'Working...' : plan ? 'Generate again' : 'Generate video plan'}
          </Button>
          <label className="flex items-center gap-2 text-sm text-slate-700">
            <input type="checkbox" checked={mock} onChange={(e) => setMock(e.target.checked)} />
            Use free mock AI (no Claude call)
          </label>
          {health ? <Pill tone={health.hasApiKey ? 'green' : 'amber'}>{health.hasApiKey ? `Claude key found (${health.model})` : 'No ANTHROPIC_API_KEY set: mock only'}</Pill> : <Pill tone="amber">API not reachable</Pill>}
        </div>
        {!mock && !health?.hasApiKey ? <p className="mt-3 text-sm text-amber-700">Add ANTHROPIC_API_KEY to apps/api/.env and restart the API to use Claude.</p> : null}
        {problems.length > 0 ? (
          <div className="mt-4">
            <p className="mb-2 text-sm font-medium text-slate-700">Fix these first:</p>
            <ErrorBox messages={problems} />
          </div>
        ) : null}
        <div className="mt-4">
          <ErrorBox messages={errors} />
        </div>
      </Card>

      {plan ? (
        <>
          <Card title="Preview" hint={`${((getTotalDurationInFrames(plan.sceneJson) / plan.sceneJson.meta.fps)).toFixed(1)} seconds, ${plan.sceneJson.scenes.length} scenes`}>
            <Preview sceneJson={plan.sceneJson} brand={brand} />
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <Button onClick={() => void render('draft')} disabled={job?.status === 'rendering' || job?.status === 'bundling' || job?.status === 'queued'}>
                Render draft MP4
              </Button>
              <Button variant="ghost" onClick={() => void render('final')} disabled={job?.status === 'rendering' || job?.status === 'bundling' || job?.status === 'queued'}>
                Render final MP4
              </Button>
              <Button variant="ghost" onClick={() => downloadJson(plan.sceneJson)}>
                Download scene JSON
              </Button>
              <Button variant="ghost" onClick={() => void save()}>
                Save project
              </Button>
              {saved ? <span className="text-sm text-slate-500">{saved}</span> : null}
            </div>
            {job ? (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium text-slate-700">{RENDER_LABEL[job.status]}</span>
                  <span className="text-slate-500">{Math.round(job.progress * 100)}%</span>
                </div>
                <div className="mt-2 h-2 overflow-hidden rounded bg-slate-200">
                  <div className="h-full bg-indigo-600 transition-all" style={{width: `${Math.round(job.progress * 100)}%`}} />
                </div>
                {job.status === 'done' && job.url ? (
                  <a href={job.url} target="_blank" rel="noreferrer" download className="mt-3 inline-block font-semibold text-indigo-700 underline">
                    Download MP4
                  </a>
                ) : null}
                {job.status === 'error' ? <p className="mt-3 whitespace-pre-wrap text-red-700">{job.error}</p> : null}
              </div>
            ) : null}
          </Card>

          <Card title="What the AI planned">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">#</th>
                    <th className="py-2 pr-4">Scene</th>
                    <th className="py-2 pr-4">Seconds</th>
                    <th className="py-2">Text</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {plan.storyboard.scenes.map((scene, index) => (
                    <tr key={scene.id}>
                      <td className="py-2 pr-4 text-slate-400">{index + 1}</td>
                      <td className="py-2 pr-4 font-medium">{scene.template}</td>
                      <td className="py-2 pr-4">{((plan.sceneJson.scenes[index]?.durationInFrames ?? 0) / plan.sceneJson.meta.fps).toFixed(1)}</td>
                      <td className="py-2 text-slate-600">{collectText(scene.props).join(' | ')}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-slate-600">
              <Pill tone={plan.mock ? 'amber' : 'green'}>{plan.mock ? 'Mock AI (no Claude call)' : `Claude: ${plan.attempts} attempt(s)`}</Pill>
              {!plan.mock ? <Pill>{`${plan.usage.input} in / ${plan.usage.output} out tokens, about $${plan.costUsd.toFixed(3)}`}</Pill> : null}
            </div>
            {plan.warnings.length > 0 || plan.notes.length > 0 ? (
              <ul className="mt-3 list-disc space-y-1 pl-5 text-xs text-slate-500">
                {[...plan.warnings, ...plan.notes].map((line) => (
                  <li key={line}>{line}</li>
                ))}
              </ul>
            ) : null}
          </Card>
        </>
      ) : null}
    </div>
  );
};
