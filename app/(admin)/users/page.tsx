'use client';
import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import { Navigation } from '@/components/layout/Navigation';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { getAllWhitelistDocs, createWhitelistDoc, updateWhitelistDoc, deleteWhitelistDoc } from '@/lib/firebase/queries';
import { Timestamp } from 'firebase/firestore';
import type { WhitelistDoc, UserRole } from '@/lib/firebase/types';

export default function AdminUsersPage() {
  return <ProtectedRoute allowedRoles={['admin']}><AdminUsersContent /></ProtectedRoute>;
}

function AdminUsersContent() {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [users, setUsers] = useState<WhitelistDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [newEmail, setNewEmail] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('student');
  const [adding, setAdding] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const load = () => { getAllWhitelistDocs().then((list) => { setUsers(list); setLoading(false); }); };
  useEffect(() => { load(); }, []);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmail.trim() || !newName.trim() || !user?.uid) return;
    setAdding(true);
    try {
      await createWhitelistDoc(newEmail.trim().toLowerCase(), { role: newRole, displayName: newName.trim(), email: newEmail.trim().toLowerCase(), registeredAt: Timestamp.now(), registeredBy: user.uid });
      showToast(`${newEmail} 계정이 등록되었습니다.`, 'success');
      setNewEmail(''); setNewName(''); setNewRole('student'); setShowAddModal(false); load();
    } catch { showToast('등록 실패. 이미 등록된 이메일일 수 있습니다.', 'error'); } finally { setAdding(false); }
  };

  const handleDelete = async (email: string) => {
    if (!confirm(`${email} 계정을 삭제하시겠습니까?`)) return;
    setDeletingId(email);
    try { await deleteWhitelistDoc(email); showToast('계정이 삭제되었습니다.', 'success'); load(); } catch { showToast('삭제 실패', 'error'); } finally { setDeletingId(null); }
  };

  const handleRoleChange = async (email: string, role: UserRole) => {
    try { await updateWhitelistDoc(email, { role }); showToast('역할이 변경되었습니다.', 'success'); load(); } catch { showToast('역할 변경 실패', 'error'); }
  };

  const roleColors: Record<UserRole, string> = { admin: '#EDE9FE', teacher: '#DBEAFE', student: '#DCFCE7' };
  const roleTextColors: Record<UserRole, string> = { admin: '#5B21B6', teacher: '#1D4ED8', student: '#166534' };
  const roleLabels: Record<UserRole, string> = { admin: '관리자', teacher: '교사', student: '학생' };
  const byRole = (role: UserRole) => users.filter((u) => u.role === role);

  return (
    <div className="page-wrapper">
      <Navigation />
      <main style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div><h1 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 4 }}>사용자 관리</h1><p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9rem' }}>Google 이메일 화이트리스트 등록 및 역할 관리</p></div>
          <Button id="btn-add-user" variant="primary" onClick={() => setShowAddModal(true)}>+ 사용자 등록</Button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 'var(--spacing-md)', marginBottom: 'var(--spacing-xl)' }}>
          {(['admin', 'teacher', 'student'] as UserRole[]).map((role) => (
            <div key={role} className="card" style={{ textAlign: 'center' }}><div className="stat-value">{byRole(role).length}</div><div className="stat-label">{roleLabels[role]}</div></div>
          ))}
        </div>

        {loading ? <div style={{ textAlign: 'center', padding: 'var(--spacing-2xl)', color: 'var(--color-text-muted)' }}>로딩 중...</div> : (
          <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '1px solid var(--color-border-default)' }}>
                  {['이름', '이메일 (Google ID)', '역할', '등록일', '관리'].map((h) => <th key={h} style={{ padding: '12px var(--spacing-md)', textAlign: 'left', fontSize: '0.8125rem', fontWeight: 600, color: 'var(--color-text-secondary)' }}>{h}</th>)}
                </tr>
              </thead>
              <tbody>
                {users.map((u, i) => (
                  <tr key={u.id} style={{ borderBottom: i < users.length - 1 ? '1px solid var(--color-border-default)' : 'none' }}>
                    <td style={{ padding: '12px var(--spacing-md)', fontWeight: 600 }}>{u.displayName}</td>
                    <td style={{ padding: '12px var(--spacing-md)', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{u.id}</td>
                    <td style={{ padding: '12px var(--spacing-md)' }}>
                      <select value={u.role} onChange={(e) => handleRoleChange(u.id, e.target.value as UserRole)} style={{ fontSize: '0.8125rem', padding: '4px 8px', background: roleColors[u.role], color: roleTextColors[u.role], border: 'none', borderRadius: 'var(--radius-full)', fontWeight: 600, cursor: 'pointer' }} disabled={u.id === user?.email}>
                        <option value="student">학생</option><option value="teacher">교사</option><option value="admin">관리자</option>
                      </select>
                    </td>
                    <td style={{ padding: '12px var(--spacing-md)', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{u.registeredAt?.toDate?.().toLocaleDateString('ko-KR') ?? '-'}</td>
                    <td style={{ padding: '12px var(--spacing-md)' }}>
                      {u.id !== user?.email && <Button variant="ghost" size="sm" loading={deletingId === u.id} onClick={() => handleDelete(u.id)} style={{ color: 'var(--color-error)', fontSize: '0.8125rem', padding: '4px 10px' }}>삭제</Button>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <Modal open={showAddModal} title="새 사용자 등록" onClose={() => setShowAddModal(false)} footer={<><Button variant="secondary" onClick={() => setShowAddModal(false)}>취소</Button><Button id="btn-confirm-add-user" variant="primary" loading={adding} onClick={handleAdd as unknown as () => void}>등록</Button></>}>
          <form onSubmit={handleAdd} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div className="form-group"><label htmlFor="newEmail" className="form-label">Google 이메일 <span style={{ color: 'var(--color-error)' }}>*</span></label><input id="newEmail" className="form-input" type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="student@school.edu.kr" required autoFocus /></div>
            <div className="form-group"><label htmlFor="newName" className="form-label">이름 <span style={{ color: 'var(--color-error)' }}>*</span></label><input id="newName" className="form-input" type="text" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="홍길동" required /></div>
            <div className="form-group"><label htmlFor="newRole" className="form-label">역할</label><select id="newRole" className="form-select" value={newRole} onChange={(e) => setNewRole(e.target.value as UserRole)}><option value="student">학생</option><option value="teacher">교사</option><option value="admin">관리자</option></select></div>
          </form>
        </Modal>
      </main>
    </div>
  );
}
