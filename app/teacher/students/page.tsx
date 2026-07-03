'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getAllWhitelistDocs, updateWhitelistDoc, deleteWhitelistDoc } from '@/lib/firebase/queries';
import type { WhitelistDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function TeacherStudentsPage() {
  const router = useRouter();
  const { user, profile, loading } = useAuth();
  
  const [students, setStudents] = useState<WhitelistDoc[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  const [filterGrade, setFilterGrade] = useState('');
  const [filterClass, setFilterClass] = useState('');
  const [searchName, setSearchName] = useState('');
  
  const [editingStudent, setEditingStudent] = useState<WhitelistDoc | null>(null);
  const [editData, setEditData] = useState({
    displayName: '',
    grade: '',
    classNumber: '',
    studentNumber: ''
  });
  const [isSaving, setIsSaving] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<Set<string>>(new Set());
  const [isDeleting, setIsDeleting] = useState(false);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
    if (user && profile?.role === 'teacher') {
      fetchStudents();
    }
  }, [user, profile, loading, router]);

  const fetchStudents = async () => {
    setIsLoading(true);
    try {
      const data = await getAllWhitelistDocs();
      setStudents(data.filter((d: any) => d.role === 'student'));
      setSelectedStudents(new Set());
    } catch (e) {
      console.error(e);
      alert('학생 목록을 불러오는 중 오류가 발생했습니다.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAll = (filteredList: WhitelistDoc[]) => {
    if (selectedStudents.size === filteredList.length && filteredList.length > 0) {
      setSelectedStudents(new Set());
    } else {
      setSelectedStudents(new Set(filteredList.map(s => s.id)));
    }
  };

  const handleSelectStudent = (id: string) => {
    const next = new Set(selectedStudents);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedStudents(next);
  };

  const handleDeleteSelected = async () => {
    const CUTOFF = new Date('2026-07-02T21:00:00+09:00').getTime();
    const validIds = Array.from(selectedStudents).filter(id => {
      if (!id.endsWith('@mock.com')) return true;
      const student = students.find(s => s.id === id);
      const registeredAt = student?.registeredAt?.toMillis?.() || 0;
      return registeredAt >= CUTOFF;
    });
    if (validIds.length === 0) {
      window.alert('기본 제공된 초기 체험용 계정은 삭제할 수 없습니다.');
      return;
    }
    
    if (!confirm(`선택한 학생 ${validIds.length}명을 정말로 삭제하시겠습니까?\n(목업 계정은 삭제 대상에서 제외됩니다)\n이 작업은 되돌릴 수 없습니다.`)) return;
    
    setIsDeleting(true);
    try {
      await Promise.all(validIds.map(id => deleteWhitelistDoc(id)));
      alert('선택한 학생이 삭제되었습니다.');
      await fetchStudents();
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = async (id: string, name: string) => {
    const CUTOFF = new Date('2026-07-02T21:00:00+09:00').getTime();
    const student = students.find(s => s.id === id);
    const registeredAt = student?.registeredAt?.toMillis?.() || 0;
    if (id.endsWith('@mock.com') && registeredAt < CUTOFF) {
      window.alert('기본 제공된 초기 체험용 학생 계정은 삭제할 수 없습니다.');
      return;
    }
    if (!confirm(`'${name}' 학생을 정말로 삭제하시겠습니까?\n이 작업은 되돌릴 수 없습니다.`)) return;
    
    setIsDeleting(true);
    try {
      await deleteWhitelistDoc(id);
      alert('학생이 삭제되었습니다.');
      await fetchStudents();
    } catch (e) {
      console.error(e);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditClick = (student: WhitelistDoc) => {
    setEditingStudent(student);
    setEditData({
      displayName: student.displayName || '',
      grade: student.grade || '',
      classNumber: student.classNumber || '',
      studentNumber: student.studentNumber || ''
    });
  };

  const handleSave = async () => {
    if (!editingStudent) return;
    setIsSaving(true);
    try {
      await updateWhitelistDoc(editingStudent.id, {
        displayName: editData.displayName,
        grade: editData.grade,
        classNumber: editData.classNumber,
        studentNumber: editData.studentNumber
      });
      setEditingStudent(null);
      await fetchStudents();
    } catch (e) {
      console.error(e);
      alert('저장 중 오류가 발생했습니다.');
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || !user) return <div style={{ padding: 20 }}>Loading...</div>;

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="교사" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ paddingTop: 'var(--spacing-xl)', paddingBottom: 'var(--spacing-xl)', maxWidth: '1000px', margin: '0 auto', width: '100%', paddingLeft: 'var(--spacing-lg)', paddingRight: 'var(--spacing-lg)' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>전체 학생 관리</h1>
            <p style={{ color: 'var(--color-text-secondary)', marginTop: 'var(--spacing-xs)' }}>등록된 모든 학생 명단을 조회하고 학적 정보를 수정합니다.</p>
          </div>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {selectedStudents.size > 0 && (
              <button 
                className="btn btn-secondary" 
                onClick={handleDeleteSelected} 
                disabled={isDeleting}
                style={{ padding: '8px 16px', fontWeight: 600, color: 'var(--color-error)', border: '1px solid var(--color-error)' }}
              >
                {isDeleting ? '삭제 중...' : `선택 삭제 (${selectedStudents.size})`}
              </button>
            )}
            <button className="btn btn-secondary" onClick={() => router.back()} style={{ padding: '8px 16px', fontWeight: 600 }}>← 뒤로가기</button>
          </div>
        </div>

        <div className="card" style={{ overflow: 'hidden' }}>
          <div style={{ padding: 'var(--spacing-md) var(--spacing-xl)', borderBottom: '1px solid var(--color-border-default)', display: 'flex', gap: 'var(--spacing-lg)', alignItems: 'center', background: 'var(--color-bg-secondary)', borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)' }}>
            <div style={{ display: 'flex', gap: 'var(--spacing-md)', alignItems: 'center' }}>
              
              {/* 학년 필터 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-primary)', padding: '6px 14px', borderRadius: '100px', border: '1px solid var(--color-border-default)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg>
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '4px' }}>학년</span>
                <select 
                  style={{ border: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', cursor: 'pointer', padding: '0 4px' }} 
                  value={filterGrade} 
                  onChange={e => setFilterGrade(e.target.value)}
                >
                  <option value="">전체</option>
                  {Array.from(new Set(students.map(s => s.grade).filter(Boolean))).sort().map(g => (
                    <option key={g} value={g}>{g}학년</option>
                  ))}
                </select>
              </div>

              {/* 반 필터 */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'var(--color-bg-primary)', padding: '6px 14px', borderRadius: '100px', border: '1px solid var(--color-border-default)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                <span style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
                </span>
                <span style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-secondary)', marginRight: '4px' }}>반</span>
                <select 
                  style={{ border: 'none', background: 'transparent', fontSize: '0.875rem', fontWeight: 700, color: 'var(--color-text-primary)', outline: 'none', cursor: 'pointer', padding: '0 4px' }} 
                  value={filterClass} 
                  onChange={e => setFilterClass(e.target.value)}
                >
                  <option value="">전체</option>
                  {Array.from(new Set(students.map(s => s.classNumber).filter(Boolean))).sort((a:any, b:any) => parseInt(a) - parseInt(b)).map(c => (
                    <option key={c} value={c}>{c}반</option>
                  ))}
                </select>
              </div>

            </div>
            
            <div style={{ flex: 1 }}></div>
            
            {/* 이름 검색 */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--color-bg-primary)', padding: '8px 16px', borderRadius: '100px', border: '1px solid var(--color-border-default)', boxShadow: '0 2px 4px rgba(0,0,0,0.02)', width: '240px', transition: 'all 0.2s ease' }}>
              <span style={{ color: 'var(--color-text-secondary)', display: 'flex', alignItems: 'center' }}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
              </span>
              <input 
                type="text" 
                style={{ border: 'none', background: 'transparent', fontSize: '0.875rem', width: '100%', outline: 'none', color: 'var(--color-text-primary)', fontWeight: 500 }} 
                placeholder="학생 이름 검색..." 
                value={searchName} 
                onChange={e => setSearchName(e.target.value)} 
              />
            </div>
          </div>
          {isLoading ? (
            <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>학생 목록을 불러오는 중입니다...</div>
          ) : (() => {
            const filteredStudents = students.filter(s => {
              const matchGrade = !filterGrade || (s.grade === filterGrade);
              const matchClass = !filterClass || (s.classNumber === filterClass);
              const matchName = !searchName || (s.displayName?.toLowerCase().includes(searchName.toLowerCase()));
              return matchGrade && matchClass && matchName;
            }).sort((a, b) => {
              const gA = parseInt(a.grade || '999', 10);
              const gB = parseInt(b.grade || '999', 10);
              if (gA !== gB) return gA - gB;
              
              const cA = parseInt(a.classNumber || '999', 10);
              const cB = parseInt(b.classNumber || '999', 10);
              if (cA !== cB) return cA - cB;
              
              const nA = parseInt(a.studentNumber || '999', 10);
              const nB = parseInt(b.studentNumber || '999', 10);
              return nA - nB;
            });

            if (filteredStudents.length === 0) {
              return <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-secondary)' }}>검색 조건에 맞는 학생이 없습니다.</div>;
            }

            return (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                  <thead>
                    <tr style={{ background: 'var(--color-bg-secondary)', borderBottom: '2px solid var(--color-border-default)' }}>
                      <th style={{ padding: '12px 16px', width: '40px', textAlign: 'center' }}>
                        <input 
                          type="checkbox" 
                          checked={filteredStudents.length > 0 && selectedStudents.size === filteredStudents.length}
                          onChange={() => handleSelectAll(filteredStudents)}
                          style={{ cursor: 'pointer' }}
                        />
                      </th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)', width: '60px', textAlign: 'center' }}>학년</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)', width: '60px', textAlign: 'center' }}>반</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)', width: '60px', textAlign: 'center' }}>번호</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)', width: '120px' }}>이름</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>이메일</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>가입일</th>
                      <th style={{ padding: '12px 16px', fontWeight: 700, fontSize: '0.875rem', color: 'var(--color-text-secondary)', textAlign: 'center', width: '80px' }}>관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredStudents.map((student) => {
                      const dateStr = student.registeredAt 
                        ? (typeof student.registeredAt.toMillis === 'function' 
                            ? new Date(student.registeredAt.toMillis()).toLocaleDateString() 
                            : ((student.registeredAt as any).seconds 
                                ? new Date((student.registeredAt as any).seconds * 1000).toLocaleDateString()
                                : new Date(student.registeredAt as any).toLocaleDateString())) 
                        : '-';

                      return (
                        <tr key={student.id} style={{ borderBottom: '1px solid var(--color-border-default)', background: selectedStudents.has(student.id) ? 'var(--color-primary-light)' : 'transparent', opacity: student.id.endsWith('@mock.com') ? 0.7 : 1 }}>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <input 
                              type="checkbox" 
                              checked={selectedStudents.has(student.id)}
                              onChange={() => handleSelectStudent(student.id)}
                              style={{ cursor: student.id.endsWith('@mock.com') ? 'not-allowed' : 'pointer' }}
                              disabled={student.id.endsWith('@mock.com')}
                              title={student.id.endsWith('@mock.com') ? "목업 계정은 선택할 수 없습니다" : ""}
                            />
                          </td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'center' }}>{student.grade || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'center' }}>{student.classNumber || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', textAlign: 'center' }}>{student.studentNumber || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', fontWeight: 600 }}>{student.displayName || '-'}</td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{student.id}</td>
                          <td style={{ padding: '12px 16px', fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>{dateStr}</td>
                          <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'center' }}>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem' }}
                                onClick={() => handleEditClick(student)}
                              >
                                수정
                              </button>
                              <button 
                                className="btn btn-secondary" 
                                style={{ padding: '4px 10px', fontSize: '0.75rem', color: 'var(--color-error)', border: '1px solid var(--color-error-bg)', background: 'var(--color-error-bg)' }}
                                onClick={() => {
                                  if (student.id.endsWith('@mock.com')) {
                                    setAlertMessage('목업(테스트) 계정은 삭제할 수 없습니다.');
                                  } else {
                                    handleDeleteSingle(student.id, student.displayName || '이름 없음');
                                  }
                                }}
                                disabled={isDeleting}
                                title={student.id.endsWith('@mock.com') ? "목업 계정은 삭제할 수 없습니다" : ""}
                              >
                                삭제
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            );
          })()}
        </div>

      </main>

      {editingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: 'var(--spacing-lg)' }}>
          <div className="card" style={{ width: '100%', maxWidth: '400px', padding: 'var(--spacing-xl)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-lg)' }}>학생 정보 수정</h2>
            
            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>이메일 계정</label>
              <div style={{ padding: '8px', background: 'var(--color-bg-secondary)', borderRadius: 'var(--radius-sm)', color: 'var(--color-text-secondary)' }}>
                {editingStudent.id}
              </div>
            </div>

            <div style={{ marginBottom: 'var(--spacing-md)' }}>
              <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>이름</label>
              <input type="text" className="input" value={editData.displayName} onChange={e => setEditData({...editData, displayName: e.target.value})} style={{ width: '100%', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>학년</label>
                <input type="text" className="input" value={editData.grade} onChange={e => setEditData({...editData, grade: e.target.value})} placeholder="예: 3" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>반</label>
                <input type="text" className="input" value={editData.classNumber} onChange={e => setEditData({...editData, classNumber: e.target.value})} placeholder="예: 2" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: '4px' }}>번호</label>
                <input type="text" className="input" value={editData.studentNumber} onChange={e => setEditData({...editData, studentNumber: e.target.value})} placeholder="예: 15" style={{ width: '100%', boxSizing: 'border-box' }} />
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--spacing-sm)' }}>
              <button className="btn btn-secondary" onClick={() => setEditingStudent(null)} disabled={isSaving}>취소</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                {isSaving ? '저장 중...' : '저장'}
              </button>
            </div>
          </div>
        </div>
      )}

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
