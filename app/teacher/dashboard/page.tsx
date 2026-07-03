'use client';
import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth/AuthContext';
import { getClassesByTeacher, getContentsByClass, getContentsByTeacher, deleteContent, getFoldersByTeacher, createFolder, updateFolder, updateClass, updateContent, deleteFolder, getTopicsByParent, createTopic, updateTopic, deleteTopic } from '@/lib/firebase/queries';
import type { ClassDoc, ContentDoc, FolderDoc, TopicDoc } from '@/lib/firebase/types';
import Navbar from '@/components/layout/Navbar';

export default function TeacherDashboard() {
  const router = useRouter();
  const { user, profile, loading, logout } = useAuth();
  
  const [classes, setClasses] = useState<ClassDoc[]>([]);
  const [folders, setFolders] = useState<FolderDoc[]>([]);
  const [selectedClassId, setSelectedClassId] = useState<string>('library');
  const [contents, setContents] = useState<ContentDoc[]>([]);


  const [isFolderModalOpen, setIsFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [isCreatingFolder, setIsCreatingFolder] = useState(false);

  const [topics, setTopics] = useState<TopicDoc[]>([]);
  const [isTopicModalOpen, setIsTopicModalOpen] = useState(false);
  const [editingTopicId, setEditingTopicId] = useState<string | null>(null);
  const [newTopicName, setNewTopicName] = useState('');
  const [isCreatingTopic, setIsCreatingTopic] = useState(false);
  const [isTopicReorderMode, setIsTopicReorderMode] = useState(false);

  const [draggedContentIndex, setDraggedContentIndex] = useState<number | null>(null);
  const draggedContentOriginalTopicRef = useRef<string | undefined>();
  const [draggedTopicIndex, setDraggedTopicIndex] = useState<number | null>(null);
  const [dragOverContentIndex, setDragOverContentIndex] = useState<number | null>(null);

  const [selectedSubject, setSelectedSubject] = useState<string>('전체');

  const availableSubjects = useMemo(() => {
    const s = new Set<string>();
    contents.forEach(c => c.subject && s.add(c.subject));
    return ['전체', ...Array.from(s)];
  }, [contents]);

  const [draggedClassIndex, setDraggedClassIndex] = useState<number | null>(null);

  // Deletion Modal State
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; type: 'folder' | 'content' | 'topic'; id: string; name: string } | null>(null);
  const [alertMessage, setAlertMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  useEffect(() => {
    if (user?.email && user?.uid) {
      loadClasses(user.email);
      loadFolders(user.uid);
    }
  }, [user]);

  const loadTopics = async (parentId: string) => {
    const list = await getTopicsByParent(parentId);
    setTopics(list);
  };

  useEffect(() => {
    setSelectedSubject('전체');
    if (selectedClassId === 'library' || selectedClassId.startsWith('folder:')) {
      const parentId = selectedClassId.startsWith('folder:') ? selectedClassId.replace('folder:', '') : 'library';
      if (user?.uid) {
        loadTopics(parentId);
        getContentsByTeacher(user.uid).then(list => {
          if (selectedClassId.startsWith('folder:')) {
            const fId = selectedClassId.replace('folder:', '');
            const folderList = list.filter(c => c.folderId === fId);
            folderList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setContents(folderList);
          } else {
            const libList = [...list];
            libList.sort((a, b) => {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            });
            setContents(libList);
          }
        });
      }
    } else if (selectedClassId) {
      loadTopics(selectedClassId);
      loadContents(selectedClassId);
    } else {
      setContents([]);
      setTopics([]);
    }
  }, [selectedClassId, user]);

  const loadClasses = async (email: string) => {
    const list = await getClassesByTeacher(email);
    setClasses(list);
  };

  const loadFolders = async (uid: string) => {
    const list = await getFoldersByTeacher(uid);
    setFolders(list);
  };

  const loadContents = async (classId: string) => {
    const list = await getContentsByClass(classId);
    const cls = classes.find(c => c.id === classId);
    if (cls && cls.contentOrder) {
      const orderMap = new Map(cls.contentOrder.map((id, index) => [id, index]));
      list.sort((a, b) => {
        const aOrder = orderMap.has(a.id) ? orderMap.get(a.id)! : 999999;
        const bOrder = orderMap.has(b.id) ? orderMap.get(b.id)! : 999999;
        return aOrder - bOrder;
      });
    }
    setContents(list);
  };

  const handleDeleteContent = (contentId: string, contentTitle: string) => {
    const CUTOFF = new Date('2026-07-02T23:00:00+09:00').getTime();
    const content = contents.find(c => c.id === contentId);
    const createdAt = content?.createdAt?.toMillis?.() || ((content?.createdAt as any)?.seconds ? (content?.createdAt as any).seconds * 1000 : 0);
    if (content && createdAt < CUTOFF) {
      setAlertMessage('초기 제공된 체험용 학습 콘텐츠는 삭제할 수 없습니다. (새로 생성한 콘텐츠는 삭제 가능)');
      return;
    }
    setDeleteModal({ isOpen: true, type: 'content', id: contentId, name: contentTitle });
  };

  const confirmDeleteContent = async (contentId: string) => {
    try {
      if (deleteModal?.type === 'content') {
        await deleteContent(contentId);
        if ((selectedClassId === 'library' || selectedClassId.startsWith('folder:')) && user?.uid) {
          getContentsByTeacher(user.uid).then(list => {
            if (selectedClassId.startsWith('folder:')) {
              const fId = selectedClassId.replace('folder:', '');
              const folderList = list.filter(c => c.folderId === fId);
              folderList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
              setContents(folderList);
            } else {
              const libList = [...list];
              libList.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
              });
              setContents(libList);
            }
          });
        } else if (selectedClassId && !selectedClassId.startsWith('folder:') && selectedClassId !== 'library') {
          loadContents(selectedClassId);
        }
      } else if (deleteModal?.type === 'topic') {
        await deleteTopic(deleteModal.id);
        const parentId = selectedClassId.startsWith('folder:') ? selectedClassId.replace('folder:', '') : (selectedClassId === 'library' ? 'library' : selectedClassId);
        await loadTopics(parentId);
        if (selectedClassId === 'library' || selectedClassId.startsWith('folder:')) {
          if (user?.uid) {
            const list = await getContentsByTeacher(user.uid);
            if (selectedClassId.startsWith('folder:')) {
              const fId = selectedClassId.replace('folder:', '');
              const folderList = list.filter(c => c.folderId === fId);
              folderList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
              setContents(folderList);
            } else {
              const libList = [...list];
              libList.sort((a, b) => {
                const dateA = a.createdAt?.toMillis?.() || 0;
                const dateB = b.createdAt?.toMillis?.() || 0;
                return dateB - dateA;
              });
              setContents(libList);
            }
          }
        } else if (selectedClassId && !selectedClassId.startsWith('folder:') && selectedClassId !== 'library') {
          loadContents(selectedClassId);
        }
      }
    } catch (err) {
      console.error(err);
      setAlertMessage('삭제 중 오류가 발생했습니다.');
    }
    setDeleteModal(null);
  };



  const openCreateTopicModal = () => {
    setEditingTopicId(null);
    setNewTopicName('');
    setIsTopicModalOpen(true);
  };

  const submitCreateTopic = async (e: React.FormEvent) => {
    e.preventDefault();
    const name = newTopicName.trim();
    if (!name) return;
    
    setIsCreatingTopic(true);
    try {
      if (selectedClassId !== 'library' && selectedSubject !== '전체' && !hasSubjectPermission) {
        setAlertMessage('담당 과목이 아닌 경우 주제를 추가하거나 수정할 수 없습니다.');
        setIsCreatingTopic(false);
        return;
      }
      const parentId = selectedClassId.startsWith('folder:') ? selectedClassId.replace('folder:', '') : (selectedClassId === 'library' ? 'library' : selectedClassId);
      if (editingTopicId) {
        await updateTopic(editingTopicId, { name } as any);
        await loadTopics(parentId);
      } else {
        const payload: any = {
          name,
          parentId,
          orderIndex: topics.length,
          createdAt: new Date() as any,
          createdBy: user?.uid || '',
        };
        if (selectedClass && selectedSubject !== '전체') {
          payload.subject = selectedSubject;
        }
        await createTopic(payload);
        await loadTopics(parentId);
      }
      setIsTopicModalOpen(false);
      setEditingTopicId(null);
    } catch (err) {
      console.error(err);
      alert('주제 저장 중 오류가 발생했습니다.');
    }
    setIsCreatingTopic(false);
  };

  const handleDeleteTopic = async (topicId: string, topicName: string) => {
    const CUTOFF = new Date('2026-07-02T23:00:00+09:00').getTime();
    const topic = topics.find(t => t.id === topicId);
    const createdAt = topic?.createdAt?.toMillis?.() || ((topic?.createdAt as any)?.seconds ? (topic?.createdAt as any).seconds * 1000 : 0);
    if (topic && createdAt < CUTOFF) {
      setAlertMessage('초기 제공된 체험용 주제는 삭제할 수 없습니다.');
      return;
    }
    setDeleteModal({ isOpen: true, type: 'topic', id: topicId, name: topicName });
  };

  const handleMoveToTopic = async (contentId: string, topicId: string) => {
    await updateContent(contentId, { topicId: topicId === 'none' ? null : topicId } as any);
    // Refresh contents
    if (selectedClassId === 'library' || selectedClassId.startsWith('folder:')) {
      if (user?.uid) {
        getContentsByTeacher(user.uid).then(list => {
          if (selectedClassId.startsWith('folder:')) {
            const fId = selectedClassId.replace('folder:', '');
            const folderList = list.filter(c => c.folderId === fId);
            folderList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setContents(folderList);
          } else {
            const libList = [...list];
            libList.sort((a, b) => {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            });
            setContents(libList);
          }
        });
      }
    } else {
      loadContents(selectedClassId);
    }
  };

  const handleDragStartClass = (e: React.DragEvent, index: number) => {
    setDraggedClassIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragEnterClass = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (draggedClassIndex === null || draggedClassIndex === targetIndex) return;

    const newArr = [...classes];
    const [movedItem] = newArr.splice(draggedClassIndex, 1);
    newArr.splice(targetIndex, 0, movedItem);
    
    setClasses(newArr);
    setDraggedClassIndex(targetIndex);
  };

  const handleDragEndClass = async () => {
    setDraggedClassIndex(null);
    
    // Update orderIndex for all classes
    for (let i = 0; i < classes.length; i++) {
      classes[i].orderIndex = i;
      await updateClass(classes[i].id, { orderIndex: i });
    }
  };

  const openCreateFolderModal = () => {
    setEditingFolderId(null);
    setNewFolderName('');
    setIsFolderModalOpen(true);
  };

  const openEditFolderModal = (id: string, currentName: string) => {
    setEditingFolderId(id);
    setNewFolderName(currentName);
    setIsFolderModalOpen(true);
  };

  const submitFolderForm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const name = newFolderName.trim();
    if (!name) return;
    
    setIsCreatingFolder(true);
    try {
      if (editingFolderId) {
        await updateFolder(editingFolderId, { name });
      } else {
        await createFolder({
          name,
          createdBy: user.uid,
          createdAt: new Date() as any,
        });
      }
      await loadFolders(user.uid);
      setIsFolderModalOpen(false);
    } catch (err) {
      console.error(err);
      alert(editingFolderId ? '폴더 수정 중 오류가 발생했습니다.' : '폴더 생성 중 오류가 발생했습니다.');
    }
    setIsCreatingFolder(false);
  };

  const handleDeleteFolder = (folderId: string, folderName: string) => {
    const CUTOFF = new Date('2026-07-02T23:00:00+09:00').getTime();
    const folder = folders.find(f => f.id === folderId);
    const createdAt = folder?.createdAt?.toMillis?.() || ((folder?.createdAt as any)?.seconds ? (folder?.createdAt as any).seconds * 1000 : 0);
    if (folder && createdAt < CUTOFF) {
      setAlertMessage('초기 제공된 체험용 폴더는 삭제할 수 없습니다.');
      return;
    }
    setDeleteModal({ isOpen: true, type: 'folder', id: folderId, name: folderName });
  };

  const confirmDeleteFolder = async (folderId: string) => {
    try {
      await deleteFolder(folderId);
      if (user?.uid) {
        await loadFolders(user.uid);
        if (selectedClassId === `folder:${folderId}`) {
          setSelectedClassId('library');
        } else if (selectedClassId === 'library' || selectedClassId.startsWith('folder:')) {
          getContentsByTeacher(user.uid).then(list => {
            if (selectedClassId.startsWith('folder:')) {
              const fId = selectedClassId.replace('folder:', '');
              setContents(list.filter(c => c.folderId === fId));
            } else {
              setContents(list);
            }
          });
        }
      }
    } catch (err) {
      console.error(err);
      alert('폴더 삭제 중 오류가 발생했습니다.');
    }
    setDeleteModal(null);
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    e.stopPropagation();
    setDraggedContentIndex(index);
    draggedContentOriginalTopicRef.current = contents[index]?.topicId;
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDragEnter = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (selectedClassId === 'library') return;
    if (draggedContentIndex === null || draggedContentIndex === targetIndex) return;

    const newArr = [...contents];
    const [movedItem] = newArr.splice(draggedContentIndex, 1);
    newArr.splice(targetIndex, 0, movedItem);
    
    setContents(newArr);
    setDraggedContentIndex(targetIndex);
  };

  const handleDragEnd = async (e: React.DragEvent) => {
    e.stopPropagation();
    if (draggedContentIndex === null) return;
    if (selectedClassId === 'library') {
      setDraggedContentIndex(null);
      setDragOverContentIndex(null);
      return;
    }
    
    setDraggedContentIndex(null);
    setDragOverContentIndex(null);
    
    if (selectedClassId.startsWith('folder:')) {
      for (let i = 0; i < contents.length; i++) {
        contents[i].orderIndex = i;
        await updateContent(contents[i].id, { orderIndex: i });
      }
    } else {
      const newOrder = contents.map(c => c.id);
      const cls = classes.find(c => c.id === selectedClassId);
      if (cls) {
        cls.contentOrder = newOrder;
        await updateClass(selectedClassId, { contentOrder: newOrder });
      }
    }
  };

  const handleTopicDragStart = (e: React.DragEvent, index: number) => {
    setDraggedTopicIndex(index);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleTopicDragEnter = (e: React.DragEvent, targetIndex: number, topicId: string) => {
    e.preventDefault();
    if (draggedTopicIndex !== null) {
      if (draggedTopicIndex === targetIndex) return;

      const newArr = [...topics];
      const [movedItem] = newArr.splice(draggedTopicIndex, 1);
      newArr.splice(targetIndex, 0, movedItem);
      
      setTopics(newArr);
      setDraggedTopicIndex(targetIndex);
    } else if (draggedContentIndex !== null) {
      // Optimitic update for content dragging
      const content = contents[draggedContentIndex];
      if (content && content.topicId !== topicId) {
        const newContents = [...contents];
        newContents[draggedContentIndex] = { ...content, topicId };
        setContents(newContents);
      }
    }
  };

  const handleUncategorizedDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    if (draggedContentIndex !== null) {
      const content = contents[draggedContentIndex];
      if (content && content.topicId !== undefined) {
        const newContents = [...contents];
        newContents[draggedContentIndex] = { ...content, topicId: undefined };
        setContents(newContents);
      }
    }
  };

  const handleTopicDragEnd = async () => {
    setDraggedTopicIndex(null);
    for (let i = 0; i < topics.length; i++) {
      topics[i].orderIndex = i;
      await updateTopic(topics[i].id, { orderIndex: i });
    }
  };

  const handleMoveToFolder = async (contentId: string, folderId: string) => {
    await updateContent(contentId, { folderId: folderId === 'none' ? null : folderId } as any);
    if (selectedClassId === 'library' || selectedClassId.startsWith('folder:')) {
      if (user?.uid) {
        getContentsByTeacher(user.uid).then(list => {
          if (selectedClassId.startsWith('folder:')) {
            const fId = selectedClassId.replace('folder:', '');
            const folderList = list.filter(c => c.folderId === fId);
            folderList.sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
            setContents(folderList);
          } else {
            const libList = [...list];
            libList.sort((a, b) => {
              const dateA = a.createdAt?.toMillis?.() || 0;
              const dateB = b.createdAt?.toMillis?.() || 0;
              return dateB - dateA;
            });
            setContents(libList);
          }
        });
      }
    }
  };

  const handleContentDropOnFolder = async (e: React.DragEvent, folderId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedContentIndex === null) return;
    const content = contents[draggedContentIndex];
    if (!content) return;
    const targetFolderId = folderId === 'library' ? undefined : folderId;
    if (content.folderId === targetFolderId) return;

    // Optimistic UI update
    const newContents = [...contents];
    newContents.splice(draggedContentIndex, 1);
    setContents(newContents);
    setDraggedContentIndex(null);

    await handleMoveToFolder(content.id, folderId);
  };

  const handleContentDropOnTopic = async (e: React.DragEvent, topicId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (draggedTopicIndex !== null) return;
    if (draggedContentIndex === null) return;
    const content = contents[draggedContentIndex];
    if (!content) return;
    const targetTopicId = topicId === 'none' ? undefined : topicId;
    if (draggedContentOriginalTopicRef.current === targetTopicId) return;

    // Optimistic UI update already handled in onDragEnter, just make sure it's set
    const newContents = [...contents];
    newContents[draggedContentIndex] = { ...content, topicId: targetTopicId };
    setContents(newContents);
    setDraggedContentIndex(null);

    await handleMoveToTopic(content.id, topicId);
  };

  if (loading || !user) return <div style={{ padding: 20 }}>Loading...</div>;

  const selectedClass = classes.find(c => c.id === selectedClassId);
  const filteredContents = selectedSubject === '전체' && selectedClass
    ? [...contents].sort((a, b) => (b.createdAt?.toMillis?.() || 0) - (a.createdAt?.toMillis?.() || 0))
    : (selectedSubject === '전체' ? contents : contents.filter(c => c.subject === selectedSubject));

  const isClassCreator = !selectedClass || selectedClass.createdBy === user?.uid || selectedClass.createdByEmail === user?.email;
  const isMySubject = selectedSubject !== '전체' && (
    selectedSubject === profile?.subject ||
    contents.some(c => c.subject === selectedSubject && c.createdBy === user?.uid) ||
    topics.some(t => t.subject === selectedSubject && t.createdBy === user?.uid)
  );
  const hasSubjectPermission = isMySubject;

  return (
    <div className="page-wrapper" style={{ background: 'var(--color-bg-secondary)', minHeight: '100vh' }}>
      <Navbar roleLabel="선생님" dashboardPath="/teacher/dashboard" />

      <main className="container" style={{ flex: 1, padding: 'var(--spacing-lg)', maxWidth: 1100, margin: '0 auto', width: '100%' }}>
        
        {(user?.email === 'new_user@mock.com' || user?.email === 'demo@mock.com') && (
          <div className="fade-in" style={{ background: '#EFF6FF', border: '1px solid #BFDBFE', color: '#1E3A8A', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '1.25rem' }}>💡</span>
            <div style={{ fontSize: '0.9375rem', fontWeight: 600, lineHeight: 1.5 }}>
              가입 절차 체험이 완료되었습니다! <br/>
              전체적인 선생님 기능을 모두 둘러보시려면 우측 상단 프로필을 눌러 <strong>[로그아웃]</strong> 하신 후, 로그인 화면 하단의 <strong>[목업 교사 계정(김철수 교사 등)]</strong>을 클릭하여 접속해 주세요.
            </div>
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-xl)' }}>
          <h1 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>교사 대시보드</h1>
          <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
            {selectedClassId && selectedClassId !== 'library' && !selectedClassId.startsWith('folder:') ? (
              <button className="btn btn-secondary" onClick={() => router.push(`/teacher/classes?classId=${selectedClassId}`)} style={{ padding: '8px 16px', fontWeight: 700 }}>📚 수업 관리</button>
            ) : (
              <button className="btn btn-secondary" onClick={() => router.push('/teacher/students')} style={{ padding: '8px 16px', fontWeight: 600 }}>👥 학생 전체 관리</button>
            )}
            <div style={{ width: '1px', background: 'var(--color-border-default)', margin: '0 8px' }}></div>
            <button className="btn btn-secondary" onClick={() => router.push('/teacher/classes/new')}>+ 새 수업 생성</button>
            {(selectedClassId === 'library' || selectedClassId.startsWith('folder:')) && (
              <button className="btn btn-sparkle" onClick={() => router.push('/teacher/content/new')}>✨ AI 콘텐츠 생성</button>
            )}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 'var(--spacing-lg)' }}>
          
          <aside>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
              <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, color: 'var(--color-text-secondary)' }}>내 라이브러리</h2>
              <button onClick={openCreateFolderModal} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>+ 추가</button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)', marginBottom: 'var(--spacing-xl)' }}>
              <div>
                <button 
                  onClick={() => setSelectedClassId('library')}
                  onDragOver={handleDragOver}
                  onDrop={(e) => handleContentDropOnFolder(e, 'library')}
                  className={selectedClassId === 'library' ? "btn btn-primary" : "btn btn-secondary"} 
                  style={{ width: '100%', justifyContent: 'flex-start', textAlign: 'left', fontWeight: selectedClassId === 'library' ? 600 : 500 }}
                >
                  📚 모든 콘텐츠
                </button>
                
                <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '16px', marginTop: '8px', gap: '4px' }}>
                  {folders.map(f => (
                    <div key={f.id}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                        <button 
                          onClick={() => setSelectedClassId(`folder:${f.id}`)}
                          className={selectedClassId === `folder:${f.id}` ? "btn btn-primary" : "btn btn-secondary"} 
                          style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', fontWeight: selectedClassId === `folder:${f.id}` ? 600 : 500, paddingLeft: '12px' }}
                        >
                          📁 {f.name}
                        </button>
                        <button onClick={() => openEditFolderModal(f.id, f.name)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', padding: '4px', fontSize: '1rem' }} title="폴더 수정">
                          ✏️
                        </button>
                        <button onClick={() => handleDeleteFolder(f.id, f.name)} style={{ background: 'none', border: 'none', color: 'var(--color-error)', cursor: 'pointer', padding: '4px', fontSize: '1rem' }} title="폴더 삭제">
                          ✕
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <h2 style={{ fontSize: '0.9375rem', fontWeight: 700, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-secondary)' }}>내 수업</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-sm)' }}>
              {classes.length === 0 ? (
                <p style={{ fontSize: '0.875rem', color: 'var(--color-text-muted)' }}>생성된 수업이 없습니다.</p>
              ) : (
                classes.map((c, index) => (
                  <div key={c.id} style={{ display: 'flex', flexDirection: 'column' }}>
                    <div 
                      style={{ display: 'flex', alignItems: 'center' }}
                      draggable
                      onDragStart={(e) => handleDragStartClass(e, index)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleDragEnterClass(e, index)}
                      onDragEnd={handleDragEndClass}
                    >
                      <div style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1rem', padding: '0 8px', opacity: draggedClassIndex === index ? 0.5 : 1 }}>☰</div>
                      <button 
                        onClick={() => setSelectedClassId(c.id)}
                        className={c.id === selectedClassId ? "btn btn-primary" : "btn btn-secondary"} 
                        style={{ flex: 1, justifyContent: 'flex-start', textAlign: 'left', fontWeight: c.id === selectedClassId ? 600 : 500, opacity: draggedClassIndex === index ? 0.5 : 1 }}
                      >
                        🏫 {c.className}
                      </button>
                    </div>
                    {c.id === selectedClassId && availableSubjects.length > 1 && (
                      <div style={{ display: 'flex', flexDirection: 'column', paddingLeft: '48px', marginTop: '4px', gap: '2px' }}>
                        {availableSubjects.map(subj => (
                          <button
                            key={subj}
                            onClick={() => setSelectedSubject(subj)}
                            className="btn btn-ghost"
                            style={{ 
                              padding: '6px 12px', fontSize: '0.8125rem', justifyContent: 'flex-start', textAlign: 'left', 
                              fontWeight: selectedSubject === subj ? 800 : 500,
                              color: selectedSubject === subj ? 'var(--color-primary)' : 'var(--color-text-secondary)',
                              backgroundColor: selectedSubject === subj ? 'var(--color-primary-light)' : 'transparent'
                            }}
                          >
                            {subj === '전체' ? '🌐 전체' : `📚 ${subj}`}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </aside>

          <div>
            {selectedClassId === 'library' || selectedClassId.startsWith('folder:') ? (
              <div className="card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)', marginBottom: 4 }}>
                      {selectedClassId === 'library' ? '모든 콘텐츠' : folders.find(f => f.id === selectedClassId.replace('folder:', ''))?.name}
                    </h2>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>내가 생성한 학습 콘텐츠를 관리하고 각 수업에 배포할 수 있습니다.</p>
                  </div>
                </div>
              </div>
            ) : selectedClass ? (
              <div className="card" style={{ padding: 'var(--spacing-xl)', marginBottom: 'var(--spacing-lg)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <div>
                    <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center', marginBottom: 4 }}>
                      <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>{selectedClass.className} 학습 현황</h2>
                      <span style={{ fontSize: '0.75rem', background: '#F3F4F6', padding: '2px 8px', borderRadius: 12, border: '1px solid #E5E7EB', fontWeight: 600 }}>참여 코드: {selectedClass.classCode}</span>
                    </div>
                    <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem' }}>배포된 학습 콘텐츠: {contents.length}건</p>
                  </div>
                </div>
              </div>
            ) : null}

            {selectedClassId === 'library' || selectedClassId.startsWith('folder:') || selectedClass ? (
              <>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-md)' }}>
                  <h3 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text-primary)' }}>학습 콘텐츠 목록</h3>
                  <div style={{ display: 'flex', gap: 'var(--spacing-sm)' }}>
                    {selectedClassId !== 'library' && selectedSubject !== '전체' && hasSubjectPermission && topics.filter(t => !selectedClass || t.subject === selectedSubject).length > 1 && (
                      <button 
                        className={`btn ${isTopicReorderMode ? 'btn-primary' : 'btn-secondary'}`} 
                        style={{ fontSize: '0.8125rem', padding: '4px 12px' }} 
                        onClick={() => setIsTopicReorderMode(!isTopicReorderMode)}
                      >
                        {isTopicReorderMode ? '✅ 순서 변경 완료' : '🔄 주제 순서 변경'}
                      </button>
                    )}
                    {selectedClassId !== 'library' && selectedSubject !== '전체' && hasSubjectPermission && (
                      <button className="btn btn-secondary" style={{ fontSize: '0.8125rem', padding: '4px 12px' }} onClick={openCreateTopicModal}>+ 주제 추가</button>
                    )}
                  </div>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-xl)' }}>
                  {selectedClassId !== 'library' && (!selectedClass || selectedSubject !== '전체') && topics.filter(t => !selectedClass || t.subject === selectedSubject).map((topic, topicIndex) => (
                    <div 
                      key={topic.id}
                      draggable={isTopicReorderMode && hasSubjectPermission}
                      onDragStart={(e) => handleTopicDragStart(e, topicIndex)}
                      onDragOver={handleDragOver}
                      onDragEnter={(e) => handleTopicDragEnter(e, topicIndex, topic.id)}
                      onDragEnd={handleTopicDragEnd}
                      onDrop={(e) => handleContentDropOnTopic(e, topic.id)}
                      style={{
                        opacity: draggedTopicIndex === topicIndex ? 0.5 : 1,
                        background: 'var(--color-bg-primary)',
                        padding: 'var(--spacing-md)',
                        borderRadius: 'var(--radius-lg)',
                        border: '1px solid var(--color-border-default)',
                        boxShadow: '0 2px 4px rgba(0,0,0,0.02)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)', borderBottom: '2px solid var(--color-primary)' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--spacing-sm)' }}>
                          {isTopicReorderMode && (
                            <div style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1.25rem' }}>☰</div>
                          )}
                          <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-primary)' }}>{topic.name}</h4>
                        </div>
                        {topic.createdBy === user?.uid && (
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button onClick={() => { setEditingTopicId(topic.id); setNewTopicName(topic.name); setIsTopicModalOpen(true); }} style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '0.875rem' }}>이름 변경</button>
                            <button onClick={() => handleDeleteTopic(topic.id, topic.name)} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '0.875rem' }}>삭제</button>
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                        {filteredContents.filter(c => c.topicId === topic.id).length === 0 ? (
                          <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: 'var(--spacing-sm) 0' }}>이 주제에 할당된 콘텐츠가 없습니다.</p>
                        ) : (
                          filteredContents.filter(c => c.topicId === topic.id).map((content) => {
                            const index = contents.findIndex(c => c.id === content.id);
                            return (
                              <div 
                                key={content.id} 
                                className="card" 
                                draggable={hasSubjectPermission && !(selectedClass && selectedSubject === '전체')}
                                onDragStart={(e) => handleDragStart(e, index)}
                                onDragOver={handleDragOver}
                                onDragEnter={(e) => handleDragEnter(e, index)}
                                onDragEnd={(e) => handleDragEnd(e)}
                                style={{ 
                                  padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                                  opacity: draggedContentIndex === index ? 0.5 : 1,
                                }}
                              >
                                {hasSubjectPermission && !(selectedClass && selectedSubject === '전체') && (
                                  <div style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1.25rem', paddingRight: '8px' }}>☰</div>
                                )}
                                <div style={{ flex: 1 }}>
                                  <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                    <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '12px' }}>{content.subject}</span>
                                  </div>
                                  <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{content.unit ? `${content.unit} - ${content.title}` : content.title}</p>
                                </div>
                                <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                  {(selectedClassId === 'library' || selectedClassId.startsWith('folder:')) && (
                                    <div style={{ position: 'relative' }}>
                                      <select 
                                        value={content.folderId || 'none'}
                                        onChange={(e) => handleMoveToFolder(content.id, e.target.value)}
                                        style={{ 
                                          appearance: 'none',
                                          padding: '6px 28px 6px 12px', 
                                          fontSize: '0.8125rem', 
                                          fontWeight: 600,
                                          color: 'var(--color-text-secondary)',
                                          background: '#F3F4F6',
                                          border: '1px solid transparent',
                                          borderRadius: 'var(--radius-full)',
                                          outline: 'none',
                                          cursor: 'pointer',
                                          transition: 'all 0.2s ease',
                                        }}
                                        onMouseEnter={e => e.currentTarget.style.border = '1px solid #D1D5DB'}
                                        onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
                                      >
                                        <option value="none">📁 폴더 없음</option>
                                        {folders.map(f => (
                                          <option key={f.id} value={f.id}>📁 {f.name}</option>
                                        ))}
                                      </select>
                                      <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                        ▼
                                      </div>
                                    </div>
                                  )}
                                  {content.createdBy === user?.uid && (
                                    <button className="btn" onClick={() => router.push(`/teacher/content/${content.id}/edit?from=${selectedClass ? 'class' : 'library'}`)} style={{ fontSize: '0.8125rem', background: selectedClass ? '#FEF08A' : '#F3E8FF', color: selectedClass ? '#854D0E' : '#6B21A8', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>{selectedClass ? '✏️ 수업 전용 편집' : '🚀 편집 및 배포'}</button>
                                  )}
                                  {content.status === 'published' && (
                                    <button className="btn" onClick={() => router.push(`/teacher/content/${content.id}/stats`)} style={{ fontSize: '0.8125rem', background: '#E0E7FF', color: '#4338CA', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>📊 통계 보기</button>
                                  )}
                                  {content.createdBy === user?.uid && (
                                    <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteContent(content.id, content.title); }} style={{ fontSize: '0.8125rem', color: 'var(--color-error)', border: '1px solid var(--color-error-bg)', background: 'var(--color-error-bg)' }}>삭제</button>
                                  )}
                                </div>
                              </div>
                            );
                          })
                        )}
                      </div>
                    </div>
                  ))}

                  <div
                    onDragOver={handleDragOver}
                    onDragEnter={handleUncategorizedDragEnter}
                    onDrop={(e) => handleContentDropOnTopic(e, 'none')}
                  >
                    {selectedClassId !== 'library' && (!selectedClass || selectedSubject !== '전체') && topics.filter(t => !selectedClass || t.subject === selectedSubject).length > 0 && <h4 style={{ fontSize: '1.125rem', fontWeight: 800, color: 'var(--color-text-secondary)', marginBottom: 'var(--spacing-sm)', paddingBottom: 'var(--spacing-xs)', borderBottom: '2px solid var(--color-border-default)' }}>미분류 콘텐츠</h4>}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--spacing-md)' }}>
                      {(selectedClassId === 'library' || (selectedClass && selectedSubject === '전체') ? filteredContents : filteredContents.filter(c => !c.topicId || !topics.some(t => t.id === c.topicId))).length === 0 && selectedClassId !== 'library' && (!selectedClass || selectedSubject !== '전체') && topics.filter(t => !selectedClass || t.subject === selectedSubject).length > 0 ? (
                        <p style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem', padding: 'var(--spacing-sm) 0' }}>미분류 콘텐츠가 없습니다.</p>
                      ) : (selectedClassId === 'library' || (selectedClass && selectedSubject === '전체') ? filteredContents : filteredContents.filter(c => !c.topicId || !topics.some(t => t.id === c.topicId))).length === 0 ? (
                        <div style={{ padding: 'var(--spacing-xl)', textAlign: 'center', border: '1px dashed var(--color-border-default)', borderRadius: 'var(--radius-md)' }}>
                          <p style={{ color: 'var(--color-text-muted)' }}>아직 콘텐츠가 없습니다.</p>
                        </div>
                      ) : (
                        (selectedClassId === 'library' || (selectedClass && selectedSubject === '전체') ? filteredContents : filteredContents.filter(c => !c.topicId || !topics.some(t => t.id === c.topicId))).map((content) => {
                          const index = contents.findIndex(c => c.id === content.id);
                          return (
                            <div 
                              key={content.id} 
                              className="card" 
                              draggable={hasSubjectPermission && !(selectedClass && selectedSubject === '전체')}
                              onDragStart={(e) => handleDragStart(e, index)}
                              onDragOver={handleDragOver}
                              onDragEnter={(e) => handleDragEnter(e, index)}
                              onDragEnd={(e) => handleDragEnd(e)}
                              style={{ 
                                padding: 'var(--spacing-md)', display: 'flex', alignItems: 'center', gap: 'var(--spacing-md)',
                                opacity: draggedContentIndex === index ? 0.5 : 1,
                              }}
                            >
                              {hasSubjectPermission && !(selectedClass && selectedSubject === '전체') && (
                                <div style={{ cursor: 'grab', color: 'var(--color-text-muted)', fontSize: '1.25rem', paddingRight: '8px' }}>☰</div>
                              )}
                              <div style={{ flex: 1 }}>
                                <div style={{ display: 'flex', gap: 'var(--spacing-xs)', marginBottom: 'var(--spacing-xs)' }}>
                                  <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: 'var(--color-primary)', background: 'var(--color-primary-light)', padding: '2px 8px', borderRadius: '12px' }}>{content.subject}</span>
                                </div>
                                <p style={{ fontSize: '0.9375rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{content.unit ? `${content.unit} - ${content.title}` : content.title}</p>
                              </div>
                              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', alignItems: 'center' }}>
                                {(selectedClassId === 'library' || selectedClassId.startsWith('folder:')) && (
                                  <div style={{ position: 'relative' }}>
                                    <select 
                                      value={content.folderId || 'none'}
                                      onChange={(e) => handleMoveToFolder(content.id, e.target.value)}
                                      style={{ 
                                        appearance: 'none',
                                        padding: '6px 28px 6px 12px', 
                                        fontSize: '0.8125rem', 
                                        fontWeight: 600,
                                        color: 'var(--color-text-secondary)',
                                        background: '#F3F4F6',
                                        border: '1px solid transparent',
                                        borderRadius: 'var(--radius-full)',
                                        outline: 'none',
                                        cursor: 'pointer',
                                        transition: 'all 0.2s ease',
                                      }}
                                      onMouseEnter={e => e.currentTarget.style.border = '1px solid #D1D5DB'}
                                      onMouseLeave={e => e.currentTarget.style.border = '1px solid transparent'}
                                    >
                                      <option value="none">📁 폴더 없음</option>
                                      {folders.map(f => (
                                        <option key={f.id} value={f.id}>📁 {f.name}</option>
                                      ))}
                                    </select>
                                    <div style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>
                                      ▼
                                    </div>
                                  </div>
                                )}
                                {content.createdBy === user?.uid && (
                                  <button className="btn" onClick={() => router.push(`/teacher/content/${content.id}/edit?from=${selectedClass ? 'class' : 'library'}`)} style={{ fontSize: '0.8125rem', background: selectedClass ? '#FEF08A' : '#F3E8FF', color: selectedClass ? '#854D0E' : '#6B21A8', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>{selectedClass ? '✏️ 수업 전용 편집' : '🚀 편집 및 배포'}</button>
                                )}
                                {content.status === 'published' && (
                                  <button className="btn" onClick={() => router.push(`/teacher/content/${content.id}/stats`)} style={{ fontSize: '0.8125rem', background: '#E0E7FF', color: '#4338CA', border: 'none', padding: '0.5rem 1rem', borderRadius: 'var(--radius-md)', fontWeight: 600, cursor: 'pointer' }}>📊 통계 보기</button>
                                )}
                                {content.createdBy === user?.uid && (
                                  <button className="btn btn-secondary" onClick={(e) => { e.stopPropagation(); e.preventDefault(); handleDeleteContent(content.id, content.title); }} style={{ fontSize: '0.8125rem', color: 'var(--color-error)', border: '1px solid var(--color-error-bg)', background: 'var(--color-error-bg)' }}>삭제</button>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div style={{ padding: 'var(--spacing-2xl)', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                좌측에서 수업을 선택하거나 새 수업을 생성해주세요.
              </div>
            )}
          </div>
        </div>
      </main>


      {isFolderModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-xl)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)' }}>{editingFolderId ? '폴더 이름 수정' : '새 폴더 생성'}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)' }}>{editingFolderId ? '변경할 폴더 이름을 입력해 주세요.' : '콘텐츠를 분류할 폴더 이름을 입력해 주세요.'}</p>
            <form onSubmit={submitFolderForm}>
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>폴더 이름</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  placeholder="예: 1학기 국어"
                  className="input"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsFolderModalOpen(false)} disabled={isCreatingFolder}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={!newFolderName.trim() || isCreatingFolder}>
                  {isCreatingFolder ? (editingFolderId ? '수정 중...' : '생성 중...') : (editingFolderId ? '수정 완료' : '폴더 생성')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {isTopicModalOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.4)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-xl)', boxShadow: 'var(--shadow-lg)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-xs)', color: 'var(--color-text-primary)' }}>{editingTopicId ? '주제 이름 수정' : '새 주제(단원) 추가'}</h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.875rem', marginBottom: 'var(--spacing-lg)' }}>{editingTopicId ? '변경할 주제(단원)명을 입력해 주세요.' : '콘텐츠를 묶을 주제 또는 단원명을 입력해 주세요.'}</p>
            <form onSubmit={submitCreateTopic}>
              <div style={{ marginBottom: 'var(--spacing-lg)' }}>
                <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 600, marginBottom: 'var(--spacing-xs)' }}>주제명</label>
                <input 
                  autoFocus
                  type="text" 
                  value={newTopicName}
                  onChange={e => setNewTopicName(e.target.value)}
                  placeholder="예: 1. 자석의 성질"
                  className="input"
                  style={{ width: '100%', padding: '10px 12px', border: '1px solid var(--color-border-default)', borderRadius: 'var(--radius-md)', outline: 'none' }}
                />
              </div>
              <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setIsTopicModalOpen(false)} disabled={isCreatingTopic}>취소</button>
                <button type="submit" className="btn btn-primary" disabled={!newTopicName.trim() || isCreatingTopic}>
                  {isCreatingTopic ? (editingTopicId ? '수정 중...' : '생성 중...') : (editingTopicId ? '수정 완료' : '주제 추가')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {deleteModal?.isOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0, 0, 0, 0.5)', backdropFilter: 'blur(4px)' }}>
          <div className="card" style={{ width: '100%', maxWidth: 400, padding: 'var(--spacing-xl)', boxShadow: 'var(--shadow-xl)', border: '1px solid var(--color-border-default)' }}>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: 'var(--spacing-md)', color: 'var(--color-text-primary)', textAlign: 'center' }}>
              {deleteModal.type === 'folder' ? '폴더 삭제' : deleteModal.type === 'topic' ? '주제 삭제' : '콘텐츠 삭제'}
            </h2>
            <p style={{ color: 'var(--color-text-secondary)', fontSize: '0.9375rem', marginBottom: 'var(--spacing-lg)', lineHeight: 1.5, textAlign: 'center' }}>
              &apos;{deleteModal.name}&apos;을(를) 삭제하시겠습니까?
            </p>

            {deleteModal.type === 'folder' && (
              <div style={{ background: '#FEF2F2', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', border: '1px solid #FECACA' }}>
                <p style={{ color: '#991B1B', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  주의: 폴더를 삭제해도 내부에 있는 모든 콘텐츠는 삭제되지 않고 미분류로 이동됩니다.
                </p>
              </div>
            )}
            
            {deleteModal.type === 'topic' && (
              <div style={{ background: '#FEF2F2', padding: 'var(--spacing-md)', borderRadius: 'var(--radius-md)', marginBottom: 'var(--spacing-lg)', border: '1px solid #FECACA' }}>
                <p style={{ color: '#991B1B', fontSize: '0.875rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 6 }}>
                  주의: 주제를 삭제해도 내부에 있는 모든 콘텐츠는 삭제되지 않고 미분류로 이동됩니다.
                </p>
              </div>
            )}

            <div style={{ display: 'flex', gap: 'var(--spacing-sm)', justifyContent: 'flex-end' }}>
              <button type="button" className="btn btn-secondary" onClick={() => setDeleteModal(null)}>취소</button>
              <button 
                type="button" 
                className="btn" 
                style={{ background: 'var(--color-error)', color: 'white', border: 'none' }}
                onClick={() => {
                  if (deleteModal.type === 'folder') {
                    confirmDeleteFolder(deleteModal.id);
                  } else {
                    confirmDeleteContent(deleteModal.id);
                  }
                }}
              >
                삭제하기
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
