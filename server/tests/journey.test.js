import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { Writable } from 'node:stream';
import mongoose from 'mongoose';
import request from 'supertest';
import { MongoMemoryServer } from 'mongodb-memory-server';

process.env.NODE_ENV = 'test';
process.env.CLOUDINARY_CLOUD_NAME = 'test'; // forces the (faked) Cloudinary path

let mongod;
let app;
let User;
let uploadShouldFail = false;

before(async () => {
  mongod = await MongoMemoryServer.create();
  process.env.MONGO_URI = mongod.getUri();
  await mongoose.connect(process.env.MONGO_URI);
  ({ default: app } = await import('../src/app.js'));
  ({ default: User } = await import('../src/models/User.js'));
  const { default: cloudinary } = await import('../src/config/cloudinary.js');

  // Fake Cloudinary: swallow the stream, then call back with a URL (or an error).
  cloudinary.uploader.upload_stream = (opts, cb) =>
    new Writable({
      write(_chunk, _enc, next) {
        next();
      },
      final(done) {
        if (uploadShouldFail) cb(new Error('boom'));
        else cb(null, { secure_url: `https://fake.test/${opts.folder}/${Date.now()}`, public_id: 'pid', resource_type: 'raw' });
        done();
      },
    });
});

after(async () => {
  await mongoose.disconnect();
  await mongod.stop();
});

const api = () => request(app);
const bearer = (t) => ({ Authorization: `Bearer ${t}` });

async function login(email, password) {
  const res = await api().post('/api/v1/auth/login').send({ email, password });
  assert.equal(res.status, 200, JSON.stringify(res.body));
  return res.body.accessToken;
}

describe('training → assessment → certificate → compliance', () => {
  const ctx = {};

  before(async () => {
    await User.create({ name: 'HR', email: 'hr@test.com', role: 'admin', passwordHash: await User.hashPassword('Password1!') });
    ctx.admin = await login('hr@test.com', 'Password1!');

    const dept = await api().post('/api/v1/departments').set(bearer(ctx.admin)).send({ name: 'Ops' });
    ctx.deptId = dept.body.department._id;

    for (const n of ['alice', 'bob']) {
      const r = await api().post('/api/v1/users').set(bearer(ctx.admin)).send({
        name: n, email: `${n}@test.com`, password: 'Password1!', role: 'employee', departmentId: ctx.deptId,
      });
      assert.equal(r.status, 201, JSON.stringify(r.body));
      ctx[n + 'Id'] = r.body.user._id;
    }
    ctx.alice = await login('alice@test.com', 'Password1!');
    ctx.bob = await login('bob@test.com', 'Password1!');
  });

  it('rejects unauthenticated and under-privileged requests', async () => {
    assert.equal((await api().get('/api/v1/users')).status, 401);
    assert.equal((await api().post('/api/v1/trainings').set(bearer(ctx.alice)).field('title', 'x')).status, 403);
  });

  it('HR creates a published course and an assessment', async () => {
    const t = await api().post('/api/v1/trainings').set(bearer(ctx.admin))
      .field('title', 'Fire Safety').field('status', 'published').field('mandatory', 'true')
      .field('validityMonths', '12').field('deadlineDays', '14')
      .attach('files', Buffer.from('%PDF-1.4 fake'), { filename: 'guide.pdf', contentType: 'application/pdf' });
    assert.equal(t.status, 201, JSON.stringify(t.body));
    assert.equal(t.body.training.materials.length, 1);
    ctx.trainingId = t.body.training._id;
    ctx.materialId = t.body.training.materials[0]._id;

    const a = await api().post('/api/v1/assessments').set(bearer(ctx.admin)).send({
      trainingId: ctx.trainingId, passingScore: 60, attemptLimit: 2,
      questions: [
        { text: 'Q1', options: ['a', 'b'], correctOptions: [1] },
        { text: 'Q2', options: ['a', 'b', 'c'], correctOptions: [0, 2] },
      ],
    });
    assert.equal(a.status, 201, JSON.stringify(a.body));
    ctx.assessmentId = a.body.assessment._id;
  });

  it('upload failure leaves no training record behind', async () => {
    uploadShouldFail = true;
    const before = await mongoose.model('Training').countDocuments();
    const r = await api().post('/api/v1/trainings').set(bearer(ctx.admin)).field('title', 'Broken')
      .attach('files', Buffer.from('x'), { filename: 'a.pdf', contentType: 'application/pdf' });
    uploadShouldFail = false;
    assert.equal(r.status, 502);
    assert.equal(await mongoose.model('Training').countDocuments(), before);
  });

  it('requires a compliance requirement and shows alice non-compliant before assignment', async () => {
    const r = await api().post('/api/v1/compliance/requirements').set(bearer(ctx.admin)).send({
      name: 'Ops safety', departmentId: ctx.deptId, requiredTrainingIds: [ctx.trainingId],
    });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    const c = await api().get(`/api/v1/compliance/employees/${ctx.aliceId}`).set(bearer(ctx.admin));
    assert.equal(c.body.status, 'non_compliant');
    assert.equal(c.body.gaps[0].type, 'missing_training');
  });

  it('assigns to the department without duplicating on repeat', async () => {
    const r1 = await api().post('/api/v1/assignments').set(bearer(ctx.admin)).send({ trainingId: ctx.trainingId, departmentId: ctx.deptId });
    assert.equal(r1.body.created, 2);
    const r2 = await api().post('/api/v1/assignments').set(bearer(ctx.admin)).send({ trainingId: ctx.trainingId, departmentId: ctx.deptId });
    assert.equal(r2.body.created, 0);
  });

  it('employee tracks progress and never sees correct answers', async () => {
    const mine = await api().get('/api/v1/assignments/me').set(bearer(ctx.alice));
    ctx.aliceAssignment = mine.body.assignments[0]._id;
    const p = await api().patch(`/api/v1/assignments/${ctx.aliceAssignment}/progress`).set(bearer(ctx.alice)).send({ materialId: ctx.materialId });
    assert.equal(p.body.assignment.status, 'in_progress');
    assert.ok(p.body.assignment.progress < 100, 'progress must not hit 100 before the assessment');

    const v = await api().get(`/api/v1/assessments/${ctx.assessmentId}`).set(bearer(ctx.alice));
    assert.equal(v.status, 200);
    assert.ok(v.body.assessment.questions.every((q) => q.correctOptions === undefined));
    ctx.questions = v.body.assessment.questions;
  });

  it("employee cannot touch another employee's assignment or records", async () => {
    const r = await api().patch(`/api/v1/assignments/${ctx.aliceAssignment}/progress`).set(bearer(ctx.bob)).send({ started: true });
    assert.equal(r.status, 403);
    assert.equal((await api().get(`/api/v1/assignments/employee/${ctx.aliceId}`).set(bearer(ctx.bob))).status, 403);
    assert.equal((await api().get(`/api/v1/certificates/employee/${ctx.aliceId}`).set(bearer(ctx.bob))).status, 403);
    assert.equal((await api().get(`/api/v1/compliance/employees/${ctx.aliceId}`).set(bearer(ctx.bob))).status, 403);
  });

  it('a failed attempt is scored server-side, no certificate, attempt limit enforced', async () => {
    const [q1, q2] = ctx.questions;
    const wrong = [{ questionId: q1._id, selected: [0] }, { questionId: q2._id, selected: [1] }];
    // A client-supplied "passed"/"score" must be ignored.
    const r = await api().post(`/api/v1/assessments/${ctx.assessmentId}/attempts`).set(bearer(ctx.bob)).send({ answers: wrong, passed: true, score: 100 });
    assert.equal(r.status, 201);
    assert.equal(r.body.attempt.passed, false);
    assert.equal(r.body.attempt.score, 0);
    assert.equal(r.body.certificate, null);

    await api().post(`/api/v1/assessments/${ctx.assessmentId}/attempts`).set(bearer(ctx.bob)).send({ answers: wrong });
    const third = await api().post(`/api/v1/assessments/${ctx.assessmentId}/attempts`).set(bearer(ctx.bob)).send({ answers: wrong });
    assert.equal(third.status, 403);

    const c = await api().get(`/api/v1/compliance/employees/${ctx.bobId}`).set(bearer(ctx.admin));
    assert.equal(c.body.gaps[0].type, 'failed_assessment');
  });

  it('certificate cannot be issued before requirements are met', async () => {
    const r = await api().post('/api/v1/certificates').set(bearer(ctx.admin)).send({ employeeId: ctx.bobId, trainingId: ctx.trainingId });
    assert.equal(r.status, 400);
  });

  it('passing issues a certificate and makes alice compliant', async () => {
    const [q1, q2] = ctx.questions;
    const right = [{ questionId: q1._id, selected: [1] }, { questionId: q2._id, selected: [2, 0] }];
    const r = await api().post(`/api/v1/assessments/${ctx.assessmentId}/attempts`).set(bearer(ctx.alice)).send({ answers: right });
    assert.equal(r.status, 201, JSON.stringify(r.body));
    assert.equal(r.body.attempt.passed, true);
    assert.ok(r.body.certificate.certificateNumber);
    assert.ok(r.body.certificate.expiryDate);

    const mine = await api().get('/api/v1/certificates/me').set(bearer(ctx.alice));
    assert.equal(mine.body.certificates.length, 1);

    const c = await api().get(`/api/v1/compliance/employees/${ctx.aliceId}`).set(bearer(ctx.admin));
    assert.equal(c.body.status, 'compliant');
  });

  it('an expired certificate flips compliance back to non-compliant', async () => {
    const Certificate = mongoose.model('Certificate');
    const { expireCertificates } = await import('../src/services/certificateService.js');
    await Certificate.updateMany({ employeeId: ctx.aliceId }, { expiryDate: new Date(Date.now() - 86400000) });
    assert.equal(await expireCertificates(), 1);
    const c = await api().get(`/api/v1/compliance/employees/${ctx.aliceId}`).set(bearer(ctx.admin));
    assert.equal(c.body.status, 'non_compliant');
    assert.equal(c.body.gaps[0].type, 'expired_certificate');
    assert.ok(c.body.history.length >= 2, 'status changes are recorded');
  });

  it('reminder job does not send duplicates for the same window', async () => {
    const { runReminderJob } = await import('../src/services/notificationService.js');
    const Notification = mongoose.model('Notification');
    // alice's certificate is expired (previous test) and bob's training is overdue after due date passes.
    await mongoose.model('TrainingAssignment').updateMany({}, { dueDate: new Date(Date.now() - 86400000) });
    const first = await runReminderJob();
    const count = await Notification.countDocuments();
    const second = await runReminderJob();
    assert.ok(first.sent > 0);
    assert.equal(second.sent, 0);
    assert.equal(await Notification.countDocuments(), count);
  });

  it('CSV report neutralizes formula injection and respects roles', async () => {
    await User.updateOne({ _id: ctx.aliceId }, { name: '=HYPERLINK("x")' });
    const r = await api().get('/api/v1/reports/compliance?format=csv').set(bearer(ctx.admin));
    assert.equal(r.status, 200);
    assert.match(r.text, /"'=HYPERLINK/);
    assert.equal((await api().get('/api/v1/reports/compliance').set(bearer(ctx.alice))).status, 403);
  });

  it('summary reflects the department roll-up', async () => {
    const r = await api().get('/api/v1/compliance/summary').set(bearer(ctx.admin));
    assert.equal(r.body.totals.total, 2);
    assert.equal(r.body.totals.non_compliant, 2);
    assert.equal((await api().get('/api/v1/compliance/summary').set(bearer(ctx.alice))).status, 403);
  });
});
