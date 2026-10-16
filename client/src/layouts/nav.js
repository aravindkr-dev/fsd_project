// [path, label, icon]
export const NAV = {
  admin: [
    ['/admin', 'Dashboard', 'dashboard'],
    ['/admin/users', 'Users', 'users'],
    ['/admin/departments', 'Departments', 'building'],
    ['/admin/trainings', 'Trainings', 'book'],
    ['/admin/assignments', 'Assign training', 'send'],
    ['/admin/requirements', 'Requirements', 'shield'],
    ['/admin/certificates', 'Certificates', 'award'],
    ['/admin/reports', 'Reports', 'chart'],
  ],
  trainer: [
    ['/trainer', 'Trainings', 'book'],
    ['/trainer/assignments', 'Assign training', 'send'],
  ],
  manager: [
    ['/manager', 'Team compliance', 'dashboard'],
    ['/manager/reports', 'Reports', 'chart'],
  ],
  employee: [
    ['/employee', 'My training', 'book'],
    ['/employee/certificates', 'My certificates', 'award'],
    ['/employee/notifications', 'Notifications', 'bell'],
  ],
};
