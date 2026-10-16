import { useState } from 'react';
import { Badge, ErrorBox, Loading, PageHeader, Table, fmtDate } from '../../components/ui';
import { useFetch } from '../../hooks/useFetch';
import api, { errMsg } from '../../services/api';

export default function Certificates() {
  const certs = useFetch('/certificates');
  const [error, setError] = useState('');

  const act = async (fn) => {
    setError('');
    try {
      await fn();
      certs.reload();
    } catch (err) {
      setError(errMsg(err));
    }
  };

  return (
    <>
      <PageHeader title="Certificates" />
      <ErrorBox message={error || certs.error} />
      {certs.loading ? <Loading /> : (
        <Table head={['Number', 'Employee', 'Training', 'Issued', 'Expires', 'Status', '']}>
          {certs.data.certificates.map((c) => (
            <tr key={c._id}>
              <td className="td"><a className="text-indigo-600 hover:underline" href={c.fileUrl} target="_blank" rel="noreferrer">{c.certificateNumber}</a></td>
              <td className="td">{c.employeeId?.name}</td><td className="td">{c.trainingId?.title}</td>
              <td className="td">{fmtDate(c.issueDate)}</td><td className="td">{fmtDate(c.expiryDate)}</td>
              <td className="td"><Badge value={c.status} /></td>
              <td className="td space-x-2">
                {c.status === 'expired' && (
                  <button className="btn-secondary" onClick={() => act(() => api.post('/certificates', { employeeId: c.employeeId._id, trainingId: c.trainingId._id, renewsCertificateId: c._id }))}>Renew</button>
                )}
                {c.status === 'active' && <button className="btn-secondary" onClick={() => act(() => api.patch(`/certificates/${c._id}/revoke`))}>Revoke</button>}
              </td>
            </tr>
          ))}
        </Table>
      )}
    </>
  );
}
