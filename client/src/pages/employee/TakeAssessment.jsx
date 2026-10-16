import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ErrorBox, Loading, PageHeader } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function TakeAssessment() {
  const { id } = useParams();
  const { data, error: loadError, loading, reload } = useFetch(`/assessments/${id}`);
  const [answers, setAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  if (loading) return <Loading />;
  if (loadError) return <ErrorBox message={loadError} />;
  const { assessment, attempts } = data;

  const pick = (q, o) =>
    setAnswers((a) => {
      const cur = a[q._id] ?? [];
      if (!q.multiple) return { ...a, [q._id]: [o] };
      return { ...a, [q._id]: cur.includes(o) ? cur.filter((x) => x !== o) : [...cur, o] };
    });

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const body = { answers: assessment.questions.map((q) => ({ questionId: q._id, selected: answers[q._id] ?? [] })) };
      const { data: res } = await api.post(`/assessments/${id}/attempts`, body);
      setResult(res);
      setAnswers({});
      reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  if (result?.attempt.passed) {
    return (
      <div className="card max-w-lg">
        <h1 className="mb-2 text-xl font-semibold text-green-700">Passed — {result.attempt.score}%</h1>
        <p className="mb-4 text-sm">{result.certificate ? 'Your certificate has been issued.' : result.certificateError}</p>
        <Link className="btn" to="/employee/certificates">View certificates</Link>
      </div>
    );
  }

  const used = attempts.length;
  const exhausted = used >= assessment.attemptLimit;

  return (
    <>
      <PageHeader title={assessment.title || 'Assessment'} />
      <p className="mb-3 text-sm text-slate-600">
        Pass mark {assessment.passingScore}% · attempts used {used}/{assessment.attemptLimit}
      </p>
      <ErrorBox message={error} />
      {result && <p className="mb-3 rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">Score {result.attempt.score}% — not passed. {result.attemptsRemaining} attempt(s) left.</p>}
      {exhausted ? (
        <p className="text-sm text-red-700">You have used all attempts. Contact your trainer.</p>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          {assessment.questions.map((q, i) => (
            <fieldset key={q._id} className="card">
              <legend className="mb-2 font-medium">{i + 1}. {q.text}{q.multiple && <span className="ml-2 text-xs text-slate-500">(select all that apply)</span>}</legend>
              {q.options.map((opt, o) => (
                <label key={o} className="flex items-center gap-2 py-1 text-sm">
                  <input type={q.multiple ? 'checkbox' : 'radio'} name={q._id} checked={(answers[q._id] ?? []).includes(o)} onChange={() => pick(q, o)} />
                  {opt}
                </label>
              ))}
            </fieldset>
          ))}
          <button className="btn">Submit answers</button>
        </form>
      )}
    </>
  );
}
