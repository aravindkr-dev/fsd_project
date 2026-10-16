import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Icon from '../../components/Icon';
import { useToast } from '../../components/toastContext';
import { Badge, ErrorBox, Loading, PageHeader, ProgressBar } from '../../components/ui';
import api, { errMsg } from '../../services/api';

export default function TrainingDetail() {
  const { assignmentId } = useParams();
  const toast = useToast();
  const [assignment, setAssignment] = useState(null);
  const [assessmentId, setAssessmentId] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get('/assignments/me');
        const a = data.assignments.find((x) => x._id === assignmentId);
        if (!a) return setError('Assignment not found');
        setAssignment(a);
        try {
          setAssessmentId((await api.get(`/assessments/by-training/${a.trainingId._id}`)).data.assessment._id);
        } catch {
          /* no assessment for this course */
        }
      } catch (e) {
        setError(errMsg(e));
      }
    })();
  }, [assignmentId]);

  const markDone = async (materialId) => {
    try {
      const { data } = await api.patch(`/assignments/${assignmentId}/progress`, { materialId });
      setAssignment((a) => ({ ...a, ...data.assignment }));
      toast('Progress saved');
    } catch (e) {
      toast(errMsg(e), 'error');
    }
  };

  if (!assignment) return error ? <ErrorBox message={error} /> : <Loading />;
  const t = assignment.trainingId;
  const done = new Set(assignment.completedMaterialIds);
  const completed = assignment.status === 'completed';
  const allRead = t.materials.length > 0 && t.materials.every((m) => done.has(m._id));

  return (
    <>
      <Link to="/employee" className="mb-3 inline-block text-sm text-slate-500 hover:text-slate-800">← Back to my training</Link>
      <PageHeader title={t.title} subtitle={t.description}><Badge value={assignment.status} /></PageHeader>
      <ErrorBox message={error} />

      <div className="card mb-6"><ProgressBar value={assignment.progress} label="Course progress" /></div>

      <h2 className="mb-2 font-medium">Learning material</h2>
      <ul className="mb-6 space-y-2">
        {t.materials.map((m) => (
          <li key={m._id} className="card flex flex-wrap items-center justify-between gap-2">
            <a className="link inline-flex items-center gap-2" href={m.url} target="_blank" rel="noreferrer">
              <Icon name="file" className="h-4 w-4" />{m.title || 'Material'}
            </a>
            {done.has(m._id)
              ? <span className="inline-flex items-center gap-1 text-sm font-medium text-green-700"><Icon name="check" className="h-4 w-4" />Done</span>
              : !completed && <button className="btn-secondary btn-sm" onClick={() => markDone(m._id)}>Mark as done</button>}
          </li>
        ))}
        {!t.materials.length && <li className="card text-sm text-slate-500">No materials attached to this course.</li>}
      </ul>

      {completed ? (
        <Link className="btn" to="/employee/certificates"><Icon name="award" className="h-4 w-4" />View certificate</Link>
      ) : assessmentId ? (
        <div className="card flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-slate-600">{allRead ? 'Ready to test your knowledge?' : 'Review the material, then take the assessment.'}</p>
          <Link className="btn" to={`/employee/assessments/${assessmentId}`}>Take assessment</Link>
        </div>
      ) : null}
    </>
  );
}
