import {useRef, useState, type DragEvent, type FC} from 'react';
import type {Brief} from '@ai-video-studio/schema';
import {Button, Card, ErrorBox, Field, TextInput} from '../components/ui';
import {api, downscaleImage} from '../lib/api';

type Props = {brief: Brief; onChange: (brief: Brief) => void};

const MAX = 10;

export const UploadStep: FC<Props> = ({brief, onChange}) => {
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);

  const addFiles = async (files: FileList | File[]) => {
    const list = Array.from(files).filter((file) => /^image\/(png|jpeg|webp)$/.test(file.type));
    if (list.length === 0) {
      setErrors(['Only PNG, JPG or WebP images are supported.']);
      return;
    }
    setBusy(true);
    setErrors([]);
    let assets = brief.assets;
    const problems: string[] = [];
    for (const file of list.slice(0, MAX - assets.length)) {
      try {
        const asset = await api.upload(await downscaleImage(file), 'screenshot', file.name.replace(/\.[^.]+$/, ''));
        assets = [...assets, asset];
        onChange({...brief, assets});
      } catch (e) {
        problems.push(`${file.name}: ${(e as Error).message}`);
      }
    }
    setErrors(problems);
    setBusy(false);
  };

  const onDrop = (event: DragEvent) => {
    event.preventDefault();
    setDragging(false);
    void addFiles(event.dataTransfer.files);
  };

  return (
    <div className="space-y-6">
      <Card title="Your screenshots (optional)" hint={`Up to ${MAX} images, 5MB each. Without screenshots, the video shows a stylised UI built from your brand colors.`}>
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-10 text-center transition ${dragging ? 'border-indigo-500 bg-indigo-50' : 'border-slate-300 bg-slate-50'}`}
        >
          <p className="text-sm text-slate-600">{busy ? 'Uploading...' : 'Drag and drop screenshots here'}</p>
          <Button variant="ghost" disabled={busy || brief.assets.length >= MAX} onClick={() => input.current?.click()}>
            Choose files
          </Button>
          <input ref={input} type="file" multiple accept="image/png,image/jpeg,image/webp" className="hidden" onChange={(e) => e.target.files && void addFiles(e.target.files)} />
        </div>
        <div className="mt-4">
          <ErrorBox messages={errors} />
        </div>
      </Card>

      {brief.assets.length > 0 ? (
        <Card title="Label each screenshot" hint="A short label helps the AI choose where to use it, e.g. 'Dashboard' or 'Invoice builder'.">
          <div className="space-y-4">
            {brief.assets.map((asset) => (
              <div key={asset.id} className="flex items-center gap-4">
                <img src={asset.url} alt={asset.label} className="h-16 w-28 rounded-lg border border-slate-200 object-cover" />
                <Field label={`Label (${asset.width ?? '?'}x${asset.height ?? '?'})`} className="flex-1">
                  <TextInput value={asset.label} maxLength={60} onChange={(e) => onChange({...brief, assets: brief.assets.map((item) => (item.id === asset.id ? {...item, label: e.target.value} : item))})} />
                </Field>
                <Button variant="danger" onClick={() => onChange({...brief, assets: brief.assets.filter((item) => item.id !== asset.id)})}>
                  Remove
                </Button>
              </div>
            ))}
          </div>
        </Card>
      ) : null}
    </div>
  );
};
