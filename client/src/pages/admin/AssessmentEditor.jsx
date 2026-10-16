import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { ErrorBox, PageHeader } from '../../components/ui';
import api, { errMsg } from '../../services/api';

const blankQ = () => ({ text: '', options: ['', ''], correctOptions: [] });

export default function AssessmentEditor() {
  const { id: trainingId } = useParams();
  const [settings, setSettings] = useState({ passingScore: 70, attemptLimit: 3 });
  const [questions, setQuestions] = useState([blankQ()]);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  // Load an existing assessment (staff receive full data including correct answers).
  useEffect(() => {
    api.get(`/assessments/by-training/${trainingId}`)
      .then(({ data }) => {
        const a = data.assessment;
        setSettings({ passingScore: a.passingScore, attemptLimit: a.attemptLimit });
        setQuestions(a.questions.map(({ text, options, correctOptions }) => ({ text, options, correctOptions })));
      })
      .catch(() => {}); // 404 = none yet
  }, [trainingId]);

  const update = (i, patch) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  const toggleCorrect = (i, o) => {
    const cur = questions[i].correctOptions;
    update(i, { correctOptions: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] });
  };

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setSaved(false);
    try {
      await api.post('/assessments', {
        trainingId,
        passingScore: Number(settings.passingScore),
        attemptLimit: Number(settings.attemptLimit),
        questions,
      });
      setSaved(true);
    } catch (err) {
      const details = err.response?.data?.details?.map((d) => `${d.path}: ${d.message}`).join('; ');
      setError(details || errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Assessment" />
      <ErrorBox message={error} />
      {saved && <p className="mb-3 rounded-md bg-green-50 px-3 py-2 text-sm text-green-700">Assessment saved.</p>}
      <form onSubmit={save} className="space-y-4">
        <div className="card grid gap-3 md:grid-cols-2">
          <div><label className="label">Passing score (%)</label>
            <input type="number" min="1" max="100" className="input" value={settings.passingScore} onChange={(e) => setSettings({ ...settings, passingScore: e.target.value })} /></div>
          <div><label className="label">Attempt limit</label>
            <input type="number" min="1" className="input" value={settings.attemptLimit} onChange={(e) => setSettings({ ...settings, attemptLimit: e.target.value })} /></div>
        </div>

        {questions.map((q, i) => (
          <div key={i} className="card space-y-2">
            <div className="flex items-center justify-between">
              <label className="label">Question {i + 1}</label>
              {questions.length > 1 && <button type="button" className="text-sm text-red-600" onClick={() => setQuestions(questions.filter((_, j) => j !== i))}>Remove</button>}
            </div>
            <input required className="input" value={q.text} onChange={(e) => update(i, { text: e.target.value })} />
            <p className="text-xs text-slate-500">Tick every correct option.</p>
            {q.options.map((opt, o) => (
              <div key={o} className="flex items-center gap-2">
                <input type="checkbox" checked={q.correctOptions.includes(o)} onChange={() => toggleCorrect(i, o)} aria-label={`Option ${o + 1} is correct`} />
                <input required className="input" value={opt} onChange={(e) => update(i, { options: q.options.map((x, k) => (k === o ? e.target.value : x)) })} />
              </div>
            ))}
            <button type="button" className="btn-secondary" onClick={() => update(i, { options: [...q.options, ''] })}>Add option</button>
          </div>
        ))}

        <div className="flex gap-2">
          <button type="button" className="btn-secondary" onClick={() => setQuestions([...questions, blankQ()])}>Add question</button>
          <button className="btn">Save assessment</button>
        </div>
      </form>
    </>
  );
}
