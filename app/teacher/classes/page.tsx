'use client';
import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { ProtectedRoute } from '@/components/layout/ProtectedRoute';
import Navbar from '@/components/layout/Navbar';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/ToastContext';
import { getClassesByTeacher, createClass, deleteClass, getAllWhitelistDocs, updateWhitelistDoc, updateClass } from '@/lib/firebase/queries';
import type { ClassDoc, WhitelistDoc } from '@/lib/firebase/types';

export default function ClassManagementPage() {
  return (
    <ProtectedRoute allowedRoles={['teacher', 'admin']}>
      <ClassManagementContent />
    </ProtectedRoute>
  );
}

function ClassManagementContent() {
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClassId = searchParams?.get('classId');
  const isSingleClassMode = !!queryClassId;

  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string | null>(null);
  
  const [allStudents, setAllStudents] = useState<WhitelistDoc[]>([]);
  const [studentsInClass, setStudentsInClass] = useState<WhitelistDoc[]>([]);
  
  const [loading, setLoading] = useState(true);
  const [isCreatingClass, setIsCreatingClass] = useState(false);
  const [newClassName, setNewClassName] = useState('');
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [assigning, setAssigning] = useState<string | null>(null);

  const [editingStudent, setEditingStudent] = useState<WhitelistDoc | null>(null);
  const [editFormData, setEditFormData] = useState({ grade: '', classNumber: '', studentNumber: '', displayName: '' });
  const [isEditing, setIsEditing] = useState(false);

  // New states for Teachers and Filters
  const [allTeachers, setAllTeachers] = useState<WhitelistDoc[]>([]);
  const [showAddTeacherModal, setShowAddTeacherModal] = useState(false);
  const [gradeFilter, setGradeFilter] = useState('전체');
  const [classFilter, setClassFilter] = useState('전체');
  const [teacherSearchQuery, setTeacherSearchQuery] = useState('');
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const [selectedTeacherEmailsToAdd, setSelectedTeacherEmailsToAdd] = useState<string[]>([]);
  const [selectedStudentIdsToAdd, setSelectedStudentIdsToAdd] = useState<string[]>([]);
  const [selectedTeacherEmailsToRemove, setSelectedTeacherEmailsToRemove] = useState<string[]>([]);
  const [selectedStudentIdsToRemove, setSelectedStudentIdsToRemove] = useState<string[]>([]);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  const loadData = async (userEmail: string) => {
    try {
      const [classList, allWhitelist] = await Promise.all([
        getClassesByTeacher(userEmail),
        getAllWhitelistDocs()
      ]);
      setClasses(classList);
      const studentList = allWhitelist.filter((u) => u.role === 'student');
      setAllStudents(studentList);
      setAllTeachers(allWhitelist.filter(u => u.role === 'teacher'));
      
      if (queryClassId) {
        setSelectedClassId(queryClassId);
        const sorted = studentList.filter((u) => u.classId === queryClassId).sort((a, b) => {
          const gA = parseInt(a.grade || '0'), gB = parseInt(b.grade || '0');
          const cA = parseInt(a.classNumber || '0'), cB = parseInt(b.classNumber || '0');
          const nA = parseInt(a.studentNumber || '0'), nB = parseInt(b.studentNumber || '0');
          if (gA !== gB) return gA - gB;
          if (cA !== cB) return cA - cB;
          return nA - nB;
        });
        setStudentsInClass(sorted);
      } else if (selectedClassId) {
        const sorted = studentList.filter((u) => u.classId === selectedClassId).sort((a, b) => {
          const gA = parseInt(a.grade || '0'), gB = parseInt(b.grade || '0');
          const cA = parseInt(a.classNumber || '0'), cB = parseInt(b.classNumber || '0');
          const nA = parseInt(a.studentNumber || '0'), nB = parseInt(b.studentNumber || '0');
          if (gA !== gB) return gA - gB;
          if (cA !== cB) return cA - cB;
          return nA - nB;
        });
        setStudentsInClass(sorted);
      } else if (classList.length > 0) {
        setSelectedClassId(classList[0].id);
        const sorted = studentList.filter((u) => u.classId === classList[0].id).sort((a, b) => {
          const gA = parseInt(a.grade || '0'), gB = parseInt(b.grade || '0');
          const cA = parseInt(a.classNumber || '0'), cB = parseInt(b.classNumber || '0');
          const nA = parseInt(a.studentNumber || '0'), nB = parseInt(b.studentNumber || '0');
          if (gA !== gB) return gA - gB;
          if (cA !== cB) return cA - cB;
          return nA - nB;
        });
        setStudentsInClass(sorted);
      }
    } catch (err) {
      console.error(err);
      showToast('데이터를 불러오는데 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user?.email) {
      loadData(user.email);
    }
  }, [user]);

  useEffect(() => {
    if (selectedClassId) {
      const sorted = allStudents.filter((u) => u.classId === selectedClassId).sort((a, b) => {
        const gA = parseInt(a.grade || '0'), gB = parseInt(b.grade || '0');
        const cA = parseInt(a.classNumber || '0'), cB = parseInt(b.classNumber || '0');
        const nA = parseInt(a.studentNumber || '0'), nB = parseInt(b.studentNumber || '0');
        if (gA !== gB) return gA - gB;
        if (cA !== cB) return cA - cB;
        return nA - nB;
      });
      setStudentsInClass(sorted);
    } else {
      setStudentsInClass([]);
    }
  }, [selectedClassId, allStudents]);

  const submitCreateClass = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.email || !user?.uid) return;
    const name = newClassName.trim();
    if (!name) return;
    
    setIsCreatingClass(true);
    const classCode = Math.floor(100000 + Math.random() * 900000).toString(); // 6자리 난수
    try {
      const newClassId = await createClass({
        className: name,
        classCode,
        createdBy: user.uid,
        createdByEmail: user.email,
        createdAt: new Date() as any,
      });
      await loadData(user.email);
      setSelectedClassId(newClassId);
      setNewClassName('');
      showToast(`수업이 생성되었습니다! 참여 코드: ${classCode}`, 'success');
    } catch (err) {
      console.error(err);
      showToast('수업 생성 중 오류가 발생했습니다.', 'error');
    }
    setIsCreatingClass(false);
  };

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; name: string } | null>(null);

  const handleDeleteClassClick = (classId: string, className: string) => {
    const CUTOFF = new Date('2026-07-02T23:00:00+09:00').getTime();
    const cls = classes.find(c => c.id === classId);
    const createdAt = cls?.createdAt?.toMillis?.() || ((cls?.createdAt as any)?.seconds ? (cls?.createdAt as any).seconds * 1000 : 0);
    if (cls && createdAt < CUTOFF) {
      setAlertMessage('초기 제공된 체험용 수업은 삭제할 수 없습니다. (새로 생성한 체험용 수업은 삭제 가능합니다.)');
      return;
    }
    if (cls && cls.createdBy !== user?.uid) {
      showToast('수업을 생성한 교사만 삭제할 수 있습니다.', 'error');
      return;
    }
    setDeleteModal({ isOpen: true, id: classId, name: className });
  };

  const confirmDeleteClass = async () => {
    if (!deleteModal) return;
    try {
      await deleteClass(deleteModal.id);
      showToast('수업이 삭제되었습니다.', 'success');
      if (selectedClassId === deleteModal.id) {
        setSelectedClassId(null);
      }
      if (user?.email) await loadData(user.email);
    } catch (err) {
      console.error(err);
      showToast('수업 삭제 중 오류가 발생했습니다.', 'error');
    }
    setDeleteModal(null);
  };

  const handleAssign = async (email: string) => {
    if (!selectedClassId) return;
    setAssigning(email);
    try {
      await updateWhitelistDoc(email, { classId: selectedClassId });
      showToast(`${email} 학생이 배정되었습니다.`, 'success');
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('배정에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveStudent = async (email: string) => {
    if (!confirm(`${email} 학생을 수업에서 제외하시겠습니까?`)) return;
    setAssigning(email);
    try {
      await updateWhitelistDoc(email, { classId: '' });
      showToast(`${email} 학생의 배정이 해제되었습니다.`, 'success');
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('해제에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleEditStudentClick = (student: WhitelistDoc) => {
    setEditingStudent(student);
    setEditFormData({
      grade: student.grade || '',
      classNumber: student.classNumber || '',
      studentNumber: student.studentNumber || '',
      displayName: student.displayName || ''
    });
  };

  const handleUpdateStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingStudent) return;
    setIsEditing(true);
    try {
      await updateWhitelistDoc(editingStudent.email, editFormData);
      showToast('학생 정보가 수정되었습니다.', 'success');
      setEditingStudent(null);
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('정보 수정에 실패했습니다.', 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleInviteTeacher = async (email: string) => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    
    setAssigning(email);
    try {
      const newCoTeachers = [...(currentClass.coTeacherEmails || []), email];
      await updateClass(selectedClassId, { coTeacherEmails: newCoTeachers });
      showToast(`${email} 교사가 초대되었습니다.`, 'success');
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('초대에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleRemoveTeacher = async (email: string) => {
    if (!selectedClassId) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass || !confirm(`${email} 교사를 수업에서 제외하시겠습니까?`)) return;
    
    setAssigning(email);
    try {
      const newCoTeachers = (currentClass.coTeacherEmails || []).filter(e => e !== email);
      await updateClass(selectedClassId, { coTeacherEmails: newCoTeachers });
      showToast('공동 교사가 제외되었습니다.', 'success');
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('제외에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkInviteTeachers = async () => {
    if (!selectedClassId || selectedTeacherEmailsToAdd.length === 0) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass) return;
    setAssigning('bulk');
    try {
      const newCoTeachers = Array.from(new Set([...(currentClass.coTeacherEmails || []), ...selectedTeacherEmailsToAdd]));
      await updateClass(selectedClassId, { coTeacherEmails: newCoTeachers });
      showToast(`${selectedTeacherEmailsToAdd.length}명의 교사가 초대되었습니다.`, 'success');
      setSelectedTeacherEmailsToAdd([]);
      setShowAddTeacherModal(false);
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('초대에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkAssignStudents = async () => {
    if (!selectedClassId || selectedStudentIdsToAdd.length === 0) return;
    setAssigning('bulk');
    try {
      await Promise.all(selectedStudentIdsToAdd.map(id => updateWhitelistDoc(id, { classId: selectedClassId })));
      showToast(`${selectedStudentIdsToAdd.length}명의 학생이 배정되었습니다.`, 'success');
      setSelectedStudentIdsToAdd([]);
      setShowAddStudentModal(false);
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('배정에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkRemoveStudents = async () => {
    if (selectedStudentIdsToRemove.length === 0) return;
    if (!confirm(`선택한 ${selectedStudentIdsToRemove.length}명의 학생을 수업에서 제외하시겠습니까?`)) return;
    setAssigning('bulk');
    try {
      await Promise.all(selectedStudentIdsToRemove.map(id => updateWhitelistDoc(id, { classId: '' })));
      showToast('선택한 학생들의 배정이 해제되었습니다.', 'success');
      setSelectedStudentIdsToRemove([]);
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('해제에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  const handleBulkRemoveTeachers = async () => {
    if (!selectedClassId || selectedTeacherEmailsToRemove.length === 0) return;
    const currentClass = classes.find(c => c.id === selectedClassId);
    if (!currentClass || !confirm(`선택한 ${selectedTeacherEmailsToRemove.length}명의 교사를 수업에서 제외하시겠습니까?`)) return;
    setAssigning('bulk');
    try {
      const newCoTeachers = (currentClass.coTeacherEmails || []).filter(e => !selectedTeacherEmailsToRemove.includes(e));
      await updateClass(selectedClassId, { coTeacherEmails: newCoTeachers });
      showToast('선택한 교사들이 제외되었습니다.', 'success');
      setSelectedTeacherEmailsToRemove([]);
      if (user?.email) await loadData(user.email);
    } catch {
      showToast('제외에 실패했습니다.', 'error');
    } finally {
      setAssigning(null);
    }
  };

  if (authLoading || loading) return <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh' }}><div className="spinner" style={{ width: 40, height: 40 }} /></div>;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const unassignedStudents = allStudents.filter((u) => !u.classId || u.classId !== selectedClassId);
  
  const filteredUnassignedStudents = unassignedStudents.filter(s => {
    if (gradeFilter !== '전체' && s.grade !== gradeFilter) return false;
    if (classFilter !== '전체' && s.classNumber !== classFilter) return false;
    if (studentSearchQuery && !s.displayName?.includes(studentSearchQuery)) return false;
    return true;
  }).sort((a, b) => {
    const gA = parseInt(a.grade || '0'), gB = parseInt(b.grade || '0');
    const cA = parseInt(a.classNumber || '0'), cB = parseInt(b.classNumber || '0');
    const nA = parseInt(a.studentNumber || '0'), nB = parseInt(b.studentNumber || '0');
    if (gA !== gB) return gA - gB;
    if (cA !== cB) return cA - cB;
    return nA - nB;
  });

  const ownerTeacher = selectedClass ? allTeachers.find(t => t.email === selectedClass.createdByEmail) : null;
  const coTeachers = selectedClass ? allTeachers.filter(t => selectedClass.coTeacherEmails?.includes(t.email)).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')) : [];
  const availableTeachersToInvite = selectedClass ? allTeachers.filter(t => t.email !== selectedClass.createdByEmail && !selectedClass.coTeacherEmails?.includes(t.email) && (!teacherSearchQuery || t.displayName?.includes(teacherSearchQuery))).sort((a, b) => (a.displayName || '').localeCompare(b.displayName || '')) : [];

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="선생님" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 1200, margin: '0 auto', width: '100%' }}>
        <a onClick={() => router.push('/teacher/dashboard')} style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, marginBottom: 'var(--spacing-md)' }}>← 대시보드로 돌아가기</a>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>⚙️ 수업 관리</h1>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: isSingleClassMode ? '1fr' : '280px 1fr', gap: 'var(--spacing-lg)' }}>
          {/* Left Sidebar: Class List */}
          {!isSingleClassMode && (
          <aside>
            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>내 수업 목록</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
              {classes.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)', padding: 'var(--spacing-sm)' }}>생성된 수업이 없습니다.</p>
              ) : (
                classes.map((c) => (
                  <div key={c.id} style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                    <button 
                      onClick={() => setSelectedClassId(c.id)}
                      className={c.id === selectedClassId ? "btn btn-primary" : "btn btn-secondary"} 
                      style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', fontWeight: c.id === selectedClassId ? 600 : 500 }}
                    >
                      🏫 {c.className}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Create Class Form */}
            <div style={{ background: 'var(--color-bg-primary)', borderRadius: 'var(--radius-xl)', padding: 'var(--spacing-lg)', border: '2px dashed var(--color-border-default)', position: 'relative', overflow: 'hidden' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--color-primary)' }}>
                <span style={{ fontSize: '1.1rem' }}>✨</span> 새로운 수업 추가
              </h3>
              <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: 'var(--spacing-md)', wordBreak: 'keep-all', lineHeight: 1.4 }}>
                학생들이 참여할 새로운 반이나 그룹을 만들어보세요.
              </p>
              <form onSubmit={submitCreateClass} style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="예: 3학년 2반, 방과후 코딩반" 
                  value={newClassName} 
                  onChange={(e) => setNewClassName(e.target.value)} 
                  disabled={isCreatingClass}
                  required
                  style={{ background: 'var(--color-bg-secondary)', border: '1px solid var(--color-border-default)', padding: '12px 14px', fontSize: '0.9rem' }}
                />
                <Button type="submit" variant="primary" loading={isCreatingClass} style={{ padding: '12px', background: 'var(--gradient-ai-sparkle)', border: 'none', fontWeight: 700, boxShadow: '0 4px 12px rgba(124, 58, 237, 0.3)' }}>
                  + 수업 개설하기
                </Button>
              </form>
            </div>
          </aside>
          )}

          {/* Right Main Area: Users Management */}
          <div className="card" style={{ minHeight: 500 }}>
            {selectedClass ? (
              <>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 'var(--spacing-2xl)', paddingBottom: 'var(--spacing-lg)', borderBottom: '2px solid var(--color-primary)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.75rem', fontWeight: 800, marginBottom: 4, color: 'var(--color-primary)' }}>🏫 {selectedClass.className}</h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem' }}>수업 참여 코드: <strong style={{ color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: 4 }}>{selectedClass.classCode}</strong></p>
                  </div>
                  {selectedClass.createdBy === user?.uid && (
                    <button 
                      className="btn" 
                      onClick={() => handleDeleteClassClick(selectedClass.id, selectedClass.className)} 
                      style={{ fontSize: '0.8125rem', color: 'var(--color-error)', border: '1px solid var(--color-error-bg)', background: 'var(--color-error-bg)', padding: '6px 12px', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}
                    >
                      수업 삭제
                    </button>
                  )}
                </div>

                {/* Teachers Section */}
                <div style={{ marginBottom: 'var(--spacing-2xl)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border-default)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>교사</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {selectedClass.createdByEmail === user?.email && coTeachers.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (selectedTeacherEmailsToRemove.length === coTeachers.length) {
                            setSelectedTeacherEmailsToRemove([]);
                          } else {
                            setSelectedTeacherEmailsToRemove(coTeachers.map(t => t.email));
                          }
                        }}>
                          {selectedTeacherEmailsToRemove.length === coTeachers.length ? '전체 해제' : '전체 선택'}
                        </Button>
                      )}
                      {selectedClass.createdByEmail === user?.email && (
                        <Button variant="secondary" size="sm" onClick={() => setShowAddTeacherModal(true)}>+ 교사 초대</Button>
                      )}
                    </div>
                  </div>
                  
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xs)' }}>
                    {/* Owner */}
                    <div style={{ display: 'flex', alignItems: 'center', padding: '12px var(--spacing-md)', gap: 'var(--spacing-md)' }}>
                      <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700 }}>
                        {ownerTeacher?.displayName?.[0] ?? '?'}
                      </div>
                      <div style={{ flex: 1 }}>
                        <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{ownerTeacher?.displayName || selectedClass.createdByEmail} <span style={{ fontSize: '0.75rem', background: 'var(--color-bg-secondary)', padding: '2px 6px', borderRadius: 12, color: 'var(--color-text-muted)' }}>소유자</span></p>
                      </div>
                    </div>
                    {/* Co-teachers */}
                    {coTeachers.map(t => (
                      <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '12px var(--spacing-md)', gap: 'var(--spacing-md)', background: selectedTeacherEmailsToRemove.includes(t.email) ? 'var(--color-bg-tertiary)' : 'transparent', borderRadius: 'var(--radius-md)', cursor: selectedClass.createdByEmail === user?.email ? 'pointer' : 'default' }} onClick={() => { if(selectedClass.createdByEmail === user?.email) setSelectedTeacherEmailsToRemove(prev => prev.includes(t.email) ? prev.filter(e => e !== t.email) : [...prev, t.email]); }}>
                        {selectedClass.createdByEmail === user?.email && (
                          <input type="checkbox" checked={selectedTeacherEmailsToRemove.includes(t.email)} onChange={() => {}} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                        )}
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 700 }}>
                          {t.displayName?.[0] ?? '?'}
                        </div>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9375rem' }}>{t.displayName}</p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{t.email}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {selectedTeacherEmailsToRemove.length > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                      <Button variant="ghost" size="sm" onClick={handleBulkRemoveTeachers} loading={assigning === 'bulk'} style={{ color: 'var(--color-error)' }}>선택 교사 {selectedTeacherEmailsToRemove.length}명 제외</Button>
                    </div>
                  )}
                </div>

                {/* Students Section */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)', paddingBottom: 'var(--spacing-xs)', borderBottom: '1px solid var(--color-border-default)' }}>
                    <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>학생 ({studentsInClass.length}명)</h3>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      {studentsInClass.length > 0 && (
                        <Button variant="ghost" size="sm" onClick={() => {
                          if (selectedStudentIdsToRemove.length === studentsInClass.length) {
                            setSelectedStudentIdsToRemove([]);
                          } else {
                            setSelectedStudentIdsToRemove(studentsInClass.map(s => s.id));
                          }
                        }}>
                          {selectedStudentIdsToRemove.length === studentsInClass.length ? '전체 해제' : '전체 선택'}
                        </Button>
                      )}
                      <Button variant="secondary" size="sm" onClick={() => setShowAddStudentModal(true)}>+ 학생 초대</Button>
                    </div>
                  </div>
                  
                  {studentsInClass.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: 'var(--spacing-xl)', color: 'var(--color-text-muted)' }}>
                      학생이 없습니다. 수업 참여 코드를 알려주거나 학생을 직접 초대하세요.
                    </div>
                  ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--spacing-md)' }}>
                    {studentsInClass.map((s) => (
                      <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: 'var(--spacing-md)', border: `1px solid ${selectedStudentIdsToRemove.includes(s.id) ? 'var(--color-error)' : 'var(--color-border-default)'}`, borderRadius: 'var(--radius-md)', gap: 'var(--spacing-md)', background: selectedStudentIdsToRemove.includes(s.id) ? '#FEE2E2' : '#fff', cursor: 'pointer' }} onClick={() => setSelectedStudentIdsToRemove(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}>
                        <input type="checkbox" checked={selectedStudentIdsToRemove.includes(s.id)} onChange={() => {}} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                        <div style={{ width: 36, height: 36, borderRadius: '50%', background: 'var(--color-primary-light)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-primary)', fontWeight: 700 }}>
                          {s.displayName?.[0] ?? '?'}
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <p style={{ fontWeight: 600, fontSize: '0.9375rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.displayName}</p>
                          <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                            {s.grade ? `${s.grade}학년 ` : ''}{s.classNumber ? `${s.classNumber}반 ` : ''}{s.studentNumber ? `${s.studentNumber}번` : ''} | {s.email}
                          </p>
                        </div>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={(e) => { e.stopPropagation(); handleEditStudentClick(s); }} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px' }}>✏️</button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {selectedStudentIdsToRemove.length > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 'var(--spacing-md)' }}>
                    <Button variant="ghost" size="sm" onClick={handleBulkRemoveStudents} loading={assigning === 'bulk'} style={{ color: 'var(--color-error)' }}>선택 학생 {selectedStudentIdsToRemove.length}명 제외</Button>
                  </div>
                )}
                </div>
              </>
            ) : (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--color-text-muted)' }}>
                좌측에서 관리할 수업을 선택하거나 새 수업을 만드세요.
              </div>
            )}
          </div>
        </div>

        {/* Add Teacher Modal */}
        <Modal open={showAddTeacherModal} title="공동 교사 초대" onClose={() => setShowAddTeacherModal(false)}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>이 수업을 함께 관리할 선생님을 검색하여 초대하세요.</p>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '14px' }}>🔍</span>
              <input type="text" className="input" placeholder="선생님 이름으로 검색..." value={teacherSearchQuery} onChange={e => setTeacherSearchQuery(e.target.value)} style={{ width: '100%', paddingLeft: '36px', background: '#fff', border: '1px solid var(--color-border-default)', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)' }} />
            </div>
          </div>
          {availableTeachersToInvite.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>초대할 수 있는 교사가 없습니다.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>총 {availableTeachersToInvite.length}명</span>
                <Button variant="secondary" size="sm" onClick={() => {
                  if (selectedTeacherEmailsToAdd.length === availableTeachersToInvite.length) {
                    setSelectedTeacherEmailsToAdd([]);
                  } else {
                    setSelectedTeacherEmailsToAdd(availableTeachersToInvite.map(t => t.email));
                  }
                }}>
                  {selectedTeacherEmailsToAdd.length === availableTeachersToInvite.length && availableTeachersToInvite.length > 0 ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: 320, overflowY: 'auto' }}>
              {availableTeachersToInvite.map((t) => (
                <div key={t.id} style={{ display: 'flex', alignItems: 'center', padding: '10px var(--spacing-md)', border: `1px solid ${selectedTeacherEmailsToAdd.includes(t.email) ? 'var(--color-primary)' : 'var(--color-border-default)'}`, borderRadius: 'var(--radius-md)', gap: 'var(--spacing-sm)', background: selectedTeacherEmailsToAdd.includes(t.email) ? 'var(--color-bg-tertiary)' : '#fff', cursor: 'pointer' }} onClick={() => setSelectedTeacherEmailsToAdd(prev => prev.includes(t.email) ? prev.filter(e => e !== t.email) : [...prev, t.email])}>
                  <input type="checkbox" checked={selectedTeacherEmailsToAdd.includes(t.email)} onChange={() => {}} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem' }}>{t.displayName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>{t.email} | {t.homeroom || '비담임'} | {t.subject}</p>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
          {availableTeachersToInvite.length > 0 && (
            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedTeacherEmailsToAdd.length}명 선택됨</span>
              <Button variant="primary" onClick={handleBulkInviteTeachers} disabled={selectedTeacherEmailsToAdd.length === 0} loading={assigning === 'bulk'}>선택 교사 초대</Button>
            </div>
          )}
        </Modal>

        {/* Add Student Modal */}
        <Modal open={showAddStudentModal} title="학생 초대" onClose={() => setShowAddStudentModal(false)}>
          <div style={{ marginBottom: 'var(--spacing-lg)' }}>
            <p style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-md)' }}>대기 중인 학생을 조건에 맞게 검색하여 초대할 수 있습니다.</p>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: 'var(--color-bg-secondary)', padding: '12px var(--spacing-md)', borderRadius: 'var(--radius-lg)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px' }}>학년 필터</label>
                <select className="input" value={gradeFilter} onChange={e => setGradeFilter(e.target.value)} style={{ width: '100%', background: '#fff', border: '1px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <option value="전체">전체 학년</option>
                  {[1,2,3,4,5,6].map(g => <option key={g} value={g.toString()}>{g}학년</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px' }}>반 필터</label>
                <select className="input" value={classFilter} onChange={e => setClassFilter(e.target.value)} style={{ width: '100%', background: '#fff', border: '1px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)' }}>
                  <option value="전체">전체 반</option>
                  {[1,2,3,4,5,6,7,8,9,10,11,12].map(c => <option key={c} value={c.toString()}>{c}반</option>)}
                </select>
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--color-text-muted)', marginBottom: '6px' }}>이름 검색</label>
                <div style={{ position: 'relative' }}>
                  <span style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', opacity: 0.5, fontSize: '14px' }}>🔍</span>
                  <input type="text" className="input" placeholder="이름을 입력하세요..." value={studentSearchQuery} onChange={e => setStudentSearchQuery(e.target.value)} style={{ width: '100%', paddingLeft: '32px', background: '#fff', border: '1px solid transparent', boxShadow: '0 1px 3px rgba(0,0,0,0.05)', borderRadius: 'var(--radius-md)' }} />
                </div>
              </div>
            </div>
          </div>
          {filteredUnassignedStudents.length === 0 ? (
            <p style={{ color: 'var(--color-text-muted)', textAlign: 'center', padding: 'var(--spacing-lg)' }}>조건에 맞는 대기 중인 학생이 없습니다.</p>
          ) : (
            <>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)' }}>
                <span style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>총 {filteredUnassignedStudents.length}명 검색됨</span>
                <Button variant="secondary" size="sm" onClick={() => {
                  if (selectedStudentIdsToAdd.length === filteredUnassignedStudents.length) {
                    setSelectedStudentIdsToAdd([]);
                  } else {
                    setSelectedStudentIdsToAdd(filteredUnassignedStudents.map(s => s.id));
                  }
                }}>
                  {selectedStudentIdsToAdd.length === filteredUnassignedStudents.length && filteredUnassignedStudents.length > 0 ? '전체 해제' : '전체 선택'}
                </Button>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', maxHeight: 320, overflowY: 'auto' }}>
              {filteredUnassignedStudents.map((s) => (
                <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '10px var(--spacing-md)', border: `1px solid ${selectedStudentIdsToAdd.includes(s.id) ? 'var(--color-primary)' : 'var(--color-border-default)'}`, borderRadius: 'var(--radius-md)', gap: 'var(--spacing-sm)', background: selectedStudentIdsToAdd.includes(s.id) ? 'var(--color-bg-tertiary)' : '#fff', cursor: 'pointer' }} onClick={() => setSelectedStudentIdsToAdd(prev => prev.includes(s.id) ? prev.filter(id => id !== s.id) : [...prev, s.id])}>
                  <input type="checkbox" checked={selectedStudentIdsToAdd.includes(s.id)} onChange={() => {}} style={{ cursor: 'pointer', width: '16px', height: '16px' }} />
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 600, fontSize: '0.9rem', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{s.displayName}</p>
                    <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {s.grade ? `${s.grade}학년 ` : ''}{s.classNumber ? `${s.classNumber}반 ` : ''}{s.studentNumber ? `${s.studentNumber}번` : ''} | {s.email}
                    </p>
                  </div>
                </div>
              ))}
            </div>
            </>
          )}
          {filteredUnassignedStudents.length > 0 && (
            <div style={{ marginTop: 'var(--spacing-md)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 'var(--spacing-md)', borderTop: '1px solid var(--color-border-default)' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>{selectedStudentIdsToAdd.length}명 선택됨</span>
              <Button variant="primary" onClick={handleBulkAssignStudents} disabled={selectedStudentIdsToAdd.length === 0} loading={assigning === 'bulk'}>선택 학생 추가</Button>
            </div>
          )}
        </Modal>

        {/* Edit Student Modal */}
        <Modal open={!!editingStudent} title="학생 정보 수정" onClose={() => setEditingStudent(null)}>
          <form onSubmit={handleUpdateStudent} style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>이름</label>
              <input type="text" required value={editFormData.displayName} onChange={e => setEditFormData({...editFormData, displayName: e.target.value})} className="input" style={{ width: '100%' }} />
            </div>
            <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>학년</label>
                <input type="number" min="1" max="6" value={editFormData.grade} onChange={e => setEditFormData({...editFormData, grade: e.target.value})} className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>반</label>
                <input type="number" min="1" value={editFormData.classNumber} onChange={e => setEditFormData({...editFormData, classNumber: e.target.value})} className="input" style={{ width: '100%' }} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>번호</label>
                <input type="number" min="1" value={editFormData.studentNumber} onChange={e => setEditFormData({...editFormData, studentNumber: e.target.value})} className="input" style={{ width: '100%' }} />
              </div>
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)', marginTop: 'var(--spacing-sm)' }}>
              <Button type="button" variant="secondary" onClick={() => setEditingStudent(null)}>취소</Button>
              <Button type="submit" variant="primary" loading={isEditing}>저장</Button>
            </div>
          </form>
        </Modal>

        {deleteModal?.isOpen && (
          <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
            <div className="card" style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border-default)' }}>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)', textAlign: 'center' }}>
                수업 삭제
              </h2>
              <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: 'var(--spacing-lg)', lineHeight: 1.5, textAlign: 'center' }}>
                &apos;{deleteModal.name}&apos; 수업을 삭제하시겠습니까?
              </p>
              
              <div style={{ background: '#FEF2F2', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', border: '1px solid #FECACA' }}>
                <p style={{ color: '#991B1B', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  주의: 이 수업에 배포된 모든 학습 콘텐츠 복사본이 삭제되며, 등록된 학생들의 수업 정보가 초기화됩니다.
                </p>
              </div>

              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(null)}>취소</button>
                <button 
                  type="button" 
                  className="btn" 
                  style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}
                  onClick={confirmDeleteClass}
                >
                  삭제하기
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
      
      {/* Alert Modal */}
      {alertMessage && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: 400, textAlign: 'center' }}>
            <div style={{ fontSize: '3rem', marginBottom: 'var(--spacing-md)' }}>🚫</div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)' }}>알림</h2>
            <p style={{ color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-xl)', lineHeight: 1.5 }}>
              {alertMessage}
            </p>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => setAlertMessage(null)}>확인</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
