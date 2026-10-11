import {useEffect, useState, type FC} from 'react';
import {brandKitSchema, briefSchema, saasExplainerDetailsSchema, type BrandKit, type Brief} from '@ai-video-studio/schema';
import {Button} from './components/ui';
import {api, type Health, type PlanResponse} from './lib/api';
import {emptyBrand, emptyBrief, sampleBrand, sampleBrief} from './lib/defaults';
import {issuesOf} from './lib/validate';
import {BrandStep} from './steps/BrandStep';
import {DescribeStep} from './steps/DescribeStep';
import {GenerateStep} from './steps/GenerateStep';
import {SelectStep} from './steps/SelectStep';
import {UploadStep} from './steps/UploadStep';

const STEPS = ['Brand', 'Options', 'Describe', 'Screenshots', 'Generate'] as const;

export const App: FC = () => {
  const [step, setStep] = useState(0);
  const [brand, setBrand] = useState<BrandKit>(emptyBrand);
  const [brief, setBrief] = useState<Brief>(emptyBrief);
  const [plan, setPlan] = useState<PlanResponse | null>(null);
  const [health, setHealth] = useState<Health | null>(null);
  const [projects, setProjects] = useState<{id: string; name: string}[]>([]);
  const [projectId, setProjectId] = useState<string | undefined>();

  useEffect(() => {
    api.health().then(setHealth).catch(() => setHealth(null));
    api.listProjects().then(setProjects).catch(() => setProjects([]));
  }, [projectId]);

  const stepIssues = (index: number): string[] => {
    if (index === 0) return issuesOf(brandKitSchema, brand);
    if (index === 2) return [...issuesOf(saasExplainerDetailsSchema, brief.details), ...(brief.details.cta.url ? [] : ['A call-to-action URL is needed (Options step).'])];
    return [];
  };
  const missing = stepIssues(step);

  const loadSample = () => {
    setBrand(sampleBrand);
    setBrief({...sampleBrief, assets: []});
    setPlan(null);
    setProjectId(undefined);
    setStep(4);
  };

  const loadProject = async (id: string) => {
    const project = await api.getProject(id);
    setBrand(brandKitSchema.parse(project.brand));
    setBrief(briefSchema.parse(project.brief));
    setPlan(project.plan ?? null);
    setProjectId(project.id);
    setStep(4);
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-6 py-4">
          <div>
            <h1 className="text-xl font-bold text-slate-900">AI Video Studio</h1>
            <p className="text-sm text-slate-500">SaaS explainer videos: your brand in, motion graphics out</p>
          </div>
          <div className="flex items-center gap-3">
            {projects.length > 0 ? (
              <select className="rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm" value="" onChange={(e) => e.target.value && void loadProject(e.target.value)}>
                <option value="">Open saved project...</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            ) : null}
            <Button variant="ghost" onClick={loadSample}>
              Load sample project
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-6 py-8">
        <nav className="mb-8 flex flex-wrap gap-2">
          {STEPS.map((name, index) => (
            <button
              key={name}
              onClick={() => setStep(index)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${index === step ? 'bg-indigo-600 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-100'}`}
            >
              {index + 1}. {name}
            </button>
          ))}
        </nav>

        {step === 0 ? <BrandStep brand={brand} onChange={setBrand} /> : null}
        {step === 1 ? <SelectStep brief={brief} onChange={setBrief} /> : null}
        {step === 2 ? <DescribeStep brief={brief} onChange={setBrief} /> : null}
        {step === 3 ? <UploadStep brief={brief} onChange={setBrief} /> : null}
        {step === 4 ? (
          <GenerateStep
            brand={brand}
            brief={brief}
            health={health}
            plan={plan}
            onPlan={setPlan}
            onAssets={(assets) => setBrief((current) => ({...current, assets}))}
            projectId={projectId}
            onSaved={setProjectId}
          />
        ) : null}

        <div className="mt-8 flex items-center justify-between">
          <Button variant="ghost" disabled={step === 0} onClick={() => setStep(step - 1)}>
            Back
          </Button>
          <div className="flex items-center gap-3">
            {missing.length > 0 && step < 4 ? <span className="max-w-md truncate text-sm text-amber-700" title={missing.join('\n')}>Needs: {missing[0]}</span> : null}
            {step < 4 ? (
              <Button disabled={missing.length > 0} onClick={() => setStep(step + 1)}>
                Next
              </Button>
            ) : null}
          </div>
        </div>
      </main>
    </div>
  );
};
