import { useEffect, useState, useRef, useCallback } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';

import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { ImportProgressBar, type ImportStage } from '@/components/admin/ImportProgressBar';
import { ImportPreviewDialog } from '@/components/admin/ImportPreviewDialog';
import { 
  Plus, Trash2, Edit, BookOpen, Users, FileQuestion, Loader2, 
  Crown, Shield, CheckCircle, XCircle, Save, LayoutDashboard, TrendingUp,
  Upload, FileText, Ban, UserCheck, BarChart3, Target, Award, Lock, Eye, EyeOff,
  ImagePlus, X
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface Test {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  duration_minutes: number;
  is_published: boolean;
  access_code: string | null;
  question_count?: number;
  attempt_count?: number;
  avg_score?: number;
}

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  order_index: number;
  choices: Choice[];
}

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
  order_index: number;
}

interface UserProfile {
  id: string;
  user_id: string;
  full_name: string;
  avatar_url: string | null;
  is_blocked: boolean;
  created_at: string;
  role?: 'super_admin' | 'admin' | 'user';
}

interface TestStats {
  id: string;
  title: string;
  subject: string;
  attempt_count: number;
  avg_score: number;
}

export default function Admin() {
  const { user, isAdmin, isSuperAdmin, session } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [topTests, setTopTests] = useState<TestStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ tests: 0, questions: 0, users: 0, attempts: 0, avgScore: 0 });
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showAccessCode, setShowAccessCode] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const questionImageRef = useRef<HTMLInputElement>(null);
  const MAX_PDF_SIZE = 20 * 1024 * 1024; // 20MB
  const [isDragOver, setIsDragOver] = useState(false);
  const [questionImageFile, setQuestionImageFile] = useState<File | null>(null);
  const [questionImagePreview, setQuestionImagePreview] = useState<string | null>(null);
  const [uploadingImage, setUploadingImage] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);
  const [accessCode, setAccessCode] = useState('');

  // PDF import state
  const [pdfTitle, setPdfTitle] = useState('');
  const [pdfSubject, setPdfSubject] = useState('math');
  const [pdfDuration, setPdfDuration] = useState(30);
  const [pdfAccessCode, setPdfAccessCode] = useState('');
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [pdfAnswerKeys, setPdfAnswerKeys] = useState('');
  const [importing, setImporting] = useState(false);
  const [importStage, setImportStage] = useState<ImportStage>(0);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [importedTestId, setImportedTestId] = useState<string | null>(null);
  const [importedTestTitle, setImportedTestTitle] = useState('');
  const [importedQuestionsCount, setImportedQuestionsCount] = useState(0);

  // Question form state
  const [newQuestionText, setNewQuestionText] = useState('');
  const [newChoices, setNewChoices] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  useEffect(() => {
    fetchTests();
    fetchStats();
    fetchTopTests();
    if (isSuperAdmin) {
      fetchUsers();
    }
  }, [isSuperAdmin]);

  const fetchStats = async () => {
    const [testsRes, questionsRes, usersRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('score, total_questions').not('completed_at', 'is', null),
    ]);

    const attempts = attemptsRes.data || [];
    const avgScore = attempts.length > 0
      ? attempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / attempts.length
      : 0;

    setStats({
      tests: testsRes.count || 0,
      questions: questionsRes.count || 0,
      users: usersRes.count || 0,
      attempts: attempts.length,
      avgScore: Math.round(avgScore),
    });
  };

  const fetchTopTests = async () => {
    const { data: attempts } = await supabase
      .from('test_attempts')
      .select(`
        test_id,
        score,
        total_questions,
        tests (
          id,
          title,
          subject
        )
      `)
      .not('completed_at', 'is', null);

    if (attempts) {
      const testMap = new Map<string, { title: string; subject: string; scores: number[]; count: number }>();
      
      attempts.forEach((attempt: any) => {
        if (attempt.tests) {
          const testId = attempt.test_id;
          if (!testMap.has(testId)) {
            testMap.set(testId, {
              title: attempt.tests.title,
              subject: attempt.tests.subject,
              scores: [],
              count: 0,
            });
          }
          const test = testMap.get(testId)!;
          test.count++;
          if (attempt.score && attempt.total_questions) {
            test.scores.push((attempt.score / attempt.total_questions) * 100);
          }
        }
      });

      const topTestsArray: TestStats[] = Array.from(testMap.entries())
        .map(([id, data]) => ({
          id,
          title: data.title,
          subject: data.subject,
          attempt_count: data.count,
          avg_score: data.scores.length > 0 
            ? Math.round(data.scores.reduce((a, b) => a + b, 0) / data.scores.length)
            : 0,
        }))
        .sort((a, b) => b.attempt_count - a.attempt_count)
        .slice(0, 5);

      setTopTests(topTestsArray);
    }
  };

  const fetchUsers = async () => {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .order('created_at', { ascending: false });

    if (profiles) {
      const { data: roles } = await supabase
        .from('user_roles')
        .select('user_id, role');

      const roleMap = new Map(roles?.map(r => [r.user_id, r.role]) || []);
      
      const usersWithRoles = profiles.map(p => ({
        ...p,
        role: roleMap.get(p.user_id) as 'super_admin' | 'admin' | 'user' || 'user',
      }));
      
      setUsers(usersWithRoles);
    }
  };

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('id, title, description, subject, duration_minutes, is_published, access_code')
      .order('created_at', { ascending: false });

    if (data) {
      const testsWithCounts = await Promise.all(
        data.map(async (test) => {
          const [questionRes, attemptRes] = await Promise.all([
            supabase.from('questions').select('*', { count: 'exact', head: true }).eq('test_id', test.id),
            supabase.from('test_attempts').select('score, total_questions').eq('test_id', test.id).not('completed_at', 'is', null),
          ]);
          
          const attempts = attemptRes.data || [];
          const avgScore = attempts.length > 0
            ? attempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / attempts.length
            : 0;

          return { 
            ...test, 
            question_count: questionRes.count || 0,
            attempt_count: attempts.length,
            avg_score: Math.round(avgScore),
          };
        })
      );
      setTests(testsWithCounts);
    }
    setLoading(false);
  };

  const fetchQuestions = async (testId: string) => {
    const { data } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        image_url,
        order_index,
        choices (
          id,
          choice_text,
          is_correct,
          order_index
        )
      `)
      .eq('test_id', testId)
      .order('order_index');

    if (data) {
      setQuestions(data.map(q => ({
        ...q,
        choices: q.choices.sort((a, b) => a.order_index - b.order_index)
      })));
    }
  };

  const handleSaveTest = async () => {
    if (!title.trim()) {
      toast.error('Test nomini kiriting');
      return;
    }

    setSaving(true);
    if (editingTest) {
      await supabase.from('tests').update({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject as any,
        duration_minutes: duration,
        access_code: accessCode.trim() || null,
      }).eq('id', editingTest.id);
      toast.success('Test yangilandi');
    } else {
      await supabase.from('tests').insert({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject as any,
        duration_minutes: duration,
        created_by: user!.id,
        access_code: accessCode.trim() || null,
      });
      toast.success('Test yaratildi');
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchTests();
    fetchStats();
  };

  const handlePdfImport = async () => {
    if (!pdfTitle.trim() || !pdfFile) {
      toast.error('Test nomini va PDF faylni tanlang');
      return;
    }

    if (!session?.access_token) {
      toast.error('Iltimos, qayta login qiling');
      return;
    }

    if (!pdfFile.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Faqat PDF fayl yuklash mumkin');
      return;
    }

    if (pdfFile.size > MAX_PDF_SIZE) {
      toast.error('PDF hajmi 20MB dan oshmasligi kerak');
      return;
    }

    setImporting(true);
    setImportStage(1);
    try {
      const formData = new FormData();
      formData.append('file', pdfFile);
      formData.append('title', pdfTitle.trim());
      formData.append('subject', pdfSubject);
      formData.append('duration_minutes', String(Math.min(240, Math.max(5, pdfDuration))));
      if (pdfAccessCode.trim()) {
        formData.append('access_code', pdfAccessCode.trim());
      }
      if (pdfAnswerKeys.trim()) {
        formData.append('answer_keys', pdfAnswerKeys.trim());
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 180000);

      setTimeout(() => setImportStage(prev => prev >= 1 ? 2 as ImportStage : prev), 1500);

      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/parse-pdf-to-test`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
        },
        body: formData,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      setImportStage(3);

      const rawResponse = await response.text();
      const data = rawResponse ? JSON.parse(rawResponse) : {};

      if (!response.ok) {
        if (response.status === 429) throw new Error("AI band. 1 daqiqadan keyin qayta urinib ko'ring.");
        if (response.status === 402) throw new Error("AI krediti tugagan.");
        if (response.status === 413) throw new Error("PDF juda katta. Hajmini kamaytirib qayta yuklang.");
        throw new Error(data.error || 'Import xatoligi');
      }

      setImportStage(4);

      setTimeout(() => {
        setImportedTestId(data.test_id);
        setImportedTestTitle(pdfTitle.trim());
        setImportedQuestionsCount(data.questions_count);
        setPdfDialogOpen(false);
        setPreviewDialogOpen(true);
        setImportStage(0);
        setImporting(false);
        resetPdfForm();
        fetchTests();
        fetchStats();
      }, 1200);
    } catch (error: any) {
      setImportStage(0);
      setImporting(false);
      if (error?.name === 'AbortError') {
        toast.error('Import vaqti tugadi. Kichikroq PDF bilan qayta urinib ko\'ring.');
      } else {
        toast.error(error.message || 'Import xatoligi');
      }
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    processPdfFile(file);
  };

  const processPdfFile = (file: File) => {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Faqat PDF fayl yuklash mumkin');
      return;
    }

    if (file.size > MAX_PDF_SIZE) {
      toast.error('PDF hajmi 20MB dan oshmasligi kerak');
      return;
    }

    setPdfFile(file);
    if (!pdfTitle) {
      setPdfTitle(file.name.replace(/\.pdf$/i, ''));
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) processPdfFile(file);
  }, [pdfTitle]);

  const uploadQuestionImage = async (file: File): Promise<string | null> => {
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error } = await supabase.storage
      .from('question-images')
      .upload(filePath, file, { contentType: file.type });

    if (error) {
      console.error('Image upload error:', error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    return urlData.publicUrl;
  };

  const handleQuestionImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllarini yuklash mumkin');
      e.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
      e.target.value = '';
      return;
    }
    setQuestionImageFile(file);
    const reader = new FileReader();
    reader.onload = () => setQuestionImagePreview(reader.result as string);
    reader.readAsDataURL(file);
  };

  const clearQuestionImage = () => {
    setQuestionImageFile(null);
    setQuestionImagePreview(null);
    if (questionImageRef.current) questionImageRef.current.value = '';
  };

  const handleAddQuestion = async () => {
    if (!selectedTest || !newQuestionText.trim()) {
      toast.error('Savol matnini kiriting');
      return;
    }

    const filledChoices = newChoices.filter(c => c.text.trim());
    if (filledChoices.length < 2) {
      toast.error('Kamida 2 ta javob varianti kerak');
      return;
    }

    if (!filledChoices.some(c => c.isCorrect)) {
      toast.error('Kamida bitta to\'g\'ri javob belgilang');
      return;
    }

    setSaving(true);

    // Upload image if provided
    let imageUrl: string | null = null;
    if (questionImageFile) {
      setUploadingImage(true);
      imageUrl = await uploadQuestionImage(questionImageFile);
      setUploadingImage(false);
      if (!imageUrl) {
        toast.error('Rasmni yuklashda xatolik. Savol rasmsiz saqlanadi.');
      }
    }

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        test_id: selectedTest.id,
        question_text: newQuestionText.trim(),
        image_url: imageUrl,
        order_index: questions.length,
      })
      .select()
      .single();

    if (questionError) {
      toast.error('Savol qo\'shishda xatolik');
      setSaving(false);
      return;
    }

    const choicesData = filledChoices.map((c, idx) => ({
      question_id: questionData.id,
      choice_text: c.text.trim(),
      is_correct: c.isCorrect,
      order_index: idx,
    }));

    await supabase.from('choices').insert(choicesData);

    toast.success('Savol qo\'shildi');
    resetQuestionForm();
    clearQuestionImage();
    fetchQuestions(selectedTest.id);
    fetchStats();
    setSaving(false);
  };

  const handleDeleteQuestion = async (questionId: string) => {
    if (!confirm('Savolni o\'chirishni tasdiqlaysizmi?')) return;
    
    await supabase.from('questions').delete().eq('id', questionId);
    toast.success('Savol o\'chirildi');
    if (selectedTest) {
      fetchQuestions(selectedTest.id);
    }
    fetchStats();
  };

  const handleTogglePublish = async (test: Test) => {
    if (!test.is_published && (test.question_count || 0) === 0) {
      toast.error('Nashr qilish uchun kamida 1 ta savol kerak');
      return;
    }

    await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
    fetchTests();
    toast.success(test.is_published ? 'Test yashirildi' : 'Test nashr qilindi');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return;
    await supabase.from('tests').delete().eq('id', id);
    fetchTests();
    fetchStats();
    toast.success('Test o\'chirildi');
  };

  const handleToggleUserBlock = async (userProfile: UserProfile) => {
    const { error } = await supabase
      .from('profiles')
      .update({ is_blocked: !userProfile.is_blocked })
      .eq('id', userProfile.id);

    if (error) {
      toast.error('Xatolik yuz berdi');
      return;
    }

    toast.success(userProfile.is_blocked ? 'Foydalanuvchi blokdan chiqarildi' : 'Foydalanuvchi bloklandi');
    fetchUsers();
  };

  const handleChangeUserRole = async (userId: string, newRole: 'admin' | 'user') => {
    await supabase.from('user_roles').delete().eq('user_id', userId);
    
    const { error } = await supabase
      .from('user_roles')
      .insert({ user_id: userId, role: newRole });

    if (error) {
      toast.error('Xatolik yuz berdi');
      return;
    }

    toast.success(`Foydalanuvchi roli ${newRole === 'admin' ? 'Admin' : 'Foydalanuvchi'}ga o'zgartirildi`);
    fetchUsers();
  };

  const openEditDialog = (test: Test) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description || '');
    setSubject(test.subject);
    setDuration(test.duration_minutes);
    setAccessCode(test.access_code || '');
    setDialogOpen(true);
  };

  const openQuestionDialog = async (test: Test) => {
    setSelectedTest(test);
    await fetchQuestions(test.id);
    setQuestionDialogOpen(true);
  };

  const resetForm = () => {
    setEditingTest(null);
    setTitle('');
    setDescription('');
    setSubject('math');
    setDuration(30);
    setAccessCode('');
  };

  const resetPdfForm = () => {
    setPdfTitle('');
    setPdfSubject('math');
    setPdfDuration(30);
    setPdfAccessCode('');
    setPdfFile(null);
    setPdfAnswerKeys('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const resetQuestionForm = () => {
    setNewQuestionText('');
    setNewChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    clearQuestionImage();
  };

  const updateChoice = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setNewChoices(prev => prev.map((c, i) => {
      if (i === index) {
        if (field === 'isCorrect' && value === true) {
          return { ...c, isCorrect: true };
        }
        return { ...c, [field]: value };
      }
      if (field === 'isCorrect' && value === true) {
        return { ...c, isCorrect: false };
      }
      return c;
    }));
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-gradient-to-r from-amber-500 to-orange-600"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge variant="secondary"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="outline">Foydalanuvchi</Badge>;
    }
  };

  const toggleShowAccessCode = (testId: string) => {
    setShowAccessCode(prev => ({ ...prev, [testId]: !prev[testId] }));
  };

  if (!isAdmin) {
    return (
      <Layout>
        <PageTransition>
          <div className="container py-16 text-center">
            <Shield className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="font-serif text-2xl font-bold mb-2">Ruxsat yo'q</h1>
            <p className="text-muted-foreground">Bu sahifaga kirish uchun admin huquqi kerak</p>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  return (
    <Layout>
      
      <PageTransition>
        <div className="container relative py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8 animate-fade-up">
            <div className="flex items-center gap-4">
              {isSuperAdmin ? (
                <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 text-white shadow-xl">
                  <Crown className="h-8 w-8" />
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-primary/10">
                  <LayoutDashboard className="h-8 w-8 text-primary" />
                </div>
              )}
              <div>
                <h1 className="font-serif text-3xl font-bold">
                  {isSuperAdmin ? 'Super Admin Panel' : 'Admin Panel'}
                </h1>
                <p className="text-muted-foreground">Testlar, savollar va foydalanuvchilarni boshqarish</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              {/* PDF Import Dialog - Only for Super Admin */}
              {isSuperAdmin && (
                <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="lg">
                      <Upload className="h-5 w-5 mr-2" />
                      PDF Import
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl">
                    <DialogHeader>
                      <DialogTitle className="font-serif text-xl flex items-center gap-2">
                        <FileText className="h-6 w-6" />
                        PDF dan test import qilish
                      </DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 mt-4">
                      <div className="space-y-2">
                        <Label>Test nomi</Label>
                        <Input 
                          value={pdfTitle} 
                          onChange={(e) => setPdfTitle(e.target.value)} 
                          placeholder="Masalan: Matematika - Algebra testlari"
                          className="h-11"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Fan</Label>
                          <Select value={pdfSubject} onValueChange={setPdfSubject}>
                            <SelectTrigger className="h-11">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {SUBJECTS.map((s) => (
                                <SelectItem key={s.id} value={s.id}>
                                  {s.icon} {s.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label>Vaqt (daqiqa)</Label>
                          <Input 
                            type="number" 
                            value={pdfDuration} 
                            onChange={(e) => setPdfDuration(Number(e.target.value))}
                            min={5}
                            max={180}
                            className="h-11"
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Kirish kodi (ixtiyoriy - yopiq test uchun)
                        </Label>
                        <Input 
                          value={pdfAccessCode} 
                          onChange={(e) => setPdfAccessCode(e.target.value)}
                          placeholder="Masalan: MATH2024"
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Agar kod kiritilsa, faqat shu kodni bilgan foydalanuvchilar testni ishlaydi
                        </p>
                      </div>
                      <div className="space-y-2">
                        <Label>PDF fayl yuklash</Label>
                        <div
                          onDragOver={handleDragOver}
                          onDragLeave={handleDragLeave}
                          onDrop={handleDrop}
                          onClick={() => fileInputRef.current?.click()}
                          className={cn(
                            "relative flex flex-col items-center justify-center gap-3 p-8 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-300",
                            isDragOver
                              ? "border-primary bg-primary/5 scale-[1.02]"
                              : pdfFile
                              ? "border-success/50 bg-success/5"
                              : "border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50"
                          )}
                        >
                          <input
                            ref={fileInputRef}
                            type="file"
                            accept=".pdf"
                            onChange={handleFileUpload}
                            className="hidden"
                          />
                          {pdfFile ? (
                            <>
                              <div className="p-3 rounded-xl bg-success/10">
                                <CheckCircle className="h-8 w-8 text-success" />
                              </div>
                              <div className="text-center">
                                <p className="font-semibold text-success">{pdfFile.name}</p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  {(pdfFile.size / 1024 / 1024).toFixed(2)} MB • Boshqa fayl tanlash uchun bosing
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <div className={cn(
                                "p-4 rounded-xl transition-all",
                                isDragOver ? "bg-primary/10 scale-110" : "bg-muted"
                              )}>
                                <Upload className={cn(
                                  "h-8 w-8 transition-colors",
                                  isDragOver ? "text-primary" : "text-muted-foreground"
                                )} />
                              </div>
                              <div className="text-center">
                                <p className="font-medium">
                                  {isDragOver ? "PDF faylni shu yerga tashlang" : "PDF faylni tanlang yoki tortib tashlang"}
                                </p>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Maksimal hajm: 20MB • Faqat PDF format
                                </p>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                      <div className="p-4 rounded-xl bg-gradient-to-r from-blue-500/5 to-purple-500/5 border border-blue-500/10">
                        <div className="flex gap-3">
                          <div className="p-2 rounded-lg bg-blue-500/10 h-fit">
                            <span className="text-lg">🤖</span>
                          </div>
                          <div>
                            <p className="text-sm font-medium mb-1">AI avtomatik tahlil qiladi</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              <li>✅ Savollar va javob variantlarini ajratadi</li>
                              <li>✅ To'g'ri javoblarni aniqlaydi</li>
                              <li>✅ Chizma va diagrammalarni tavsiflab yozadi</li>
                              <li>✅ Matematik formulalarni Unicode belgilar bilan saqlaydi</li>
                            </ul>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          📝 Javoblar kaliti (ixtiyoriy)
                        </Label>
                        <Textarea
                          value={pdfAnswerKeys}
                          onChange={(e) => setPdfAnswerKeys(e.target.value)}
                          placeholder={"Masalan:\n1-B\n2-A\n3-D\n4-C\n5-A\n...\n\nYoki: 1B 2A 3D 4C 5A"}
                          rows={6}
                        />
                        <p className="text-xs text-muted-foreground">
                          Javoblar kalitini kiritganingizda AI shu bo'yicha to'g'ri javoblarni belgilaydi. Kiritmasangiz AI o'zi aniqlaydi.
                        </p>
                      </div>
                      <ImportProgressBar stage={importStage} />
                    </div>
                    <DialogFooter className="mt-6">
                      <Button variant="outline" onClick={() => setPdfDialogOpen(false)} disabled={importing}>Bekor</Button>
                      <Button variant="premium" onClick={handlePdfImport} disabled={importing || !pdfFile}>
                        {importing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                        Import qilish
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              )}

              {/* New Test Dialog */}
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="premium" size="lg">
                    <Plus className="h-5 w-5 mr-2" />
                    Yangi test
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-lg">
                  <DialogHeader>
                    <DialogTitle className="font-serif text-xl">
                      {editingTest ? 'Testni tahrirlash' : 'Yangi test yaratish'}
                    </DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label>Test nomi</Label>
                      <Input 
                        value={title} 
                        onChange={(e) => setTitle(e.target.value)} 
                        placeholder="Masalan: Matematika - Algebra"
                        className="h-11"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tavsif</Label>
                      <Textarea 
                        value={description} 
                        onChange={(e) => setDescription(e.target.value)}
                        placeholder="Test haqida qisqacha ma'lumot"
                        rows={3}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Fan</Label>
                        <Select value={subject} onValueChange={setSubject}>
                          <SelectTrigger className="h-11">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {SUBJECTS.map((s) => (
                              <SelectItem key={s.id} value={s.id}>
                                {s.icon} {s.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <Label>Vaqt (daqiqa)</Label>
                        <Input 
                          type="number" 
                          value={duration} 
                          onChange={(e) => setDuration(Number(e.target.value))}
                          min={5}
                          max={180}
                          className="h-11"
                        />
                      </div>
                    </div>
                    {isSuperAdmin && (
                      <div className="space-y-2">
                        <Label className="flex items-center gap-2">
                          <Lock className="h-4 w-4" />
                          Kirish kodi (ixtiyoriy)
                        </Label>
                        <Input 
                          value={accessCode} 
                          onChange={(e) => setAccessCode(e.target.value)}
                          placeholder="Masalan: MATH2024"
                          className="h-11"
                        />
                        <p className="text-xs text-muted-foreground">
                          Yopiq test yaratish uchun kod kiriting
                        </p>
                      </div>
                    )}
                  </div>
                  <DialogFooter className="mt-6">
                    <Button variant="outline" onClick={() => setDialogOpen(false)}>Bekor</Button>
                    <Button variant="premium" onClick={handleSaveTest} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                      Saqlash
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Tabs */}
          <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
            <TabsList className={cn("grid w-full", isSuperAdmin ? "grid-cols-3" : "grid-cols-2")}>
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Statistika
              </TabsTrigger>
              <TabsTrigger value="tests" className="flex items-center gap-2">
                <BookOpen className="h-4 w-4" />
                Testlar
              </TabsTrigger>
              {isSuperAdmin && (
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Foydalanuvchilar
                </TabsTrigger>
              )}
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-6">
              <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Testlar', value: stats.tests, icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
                  { label: 'Savollar', value: stats.questions, icon: FileQuestion, gradient: 'from-amber-500 to-orange-600' },
                  { label: 'Foydalanuvchilar', value: stats.users, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
                  { label: 'Urinishlar', value: stats.attempts, icon: TrendingUp, gradient: 'from-purple-500 to-pink-600' },
                  { label: "O'rtacha ball", value: `${stats.avgScore}%`, icon: Target, gradient: 'from-rose-500 to-red-600' },
                ].map((stat, idx) => (
                  <Card key={stat.label} className="card-premium animate-fade-up" style={{ animationDelay: `${idx * 100}ms` }}>
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm text-muted-foreground">{stat.label}</p>
                          <p className="text-3xl font-serif font-bold mt-1">{stat.value}</p>
                        </div>
                        <div className={cn("p-3 rounded-xl bg-gradient-to-br text-white", stat.gradient)}>
                          <stat.icon className="h-6 w-6" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <Card className="card-premium animate-fade-up delay-500">
                <CardHeader>
                  <CardTitle className="font-serif flex items-center gap-2">
                    <Award className="h-5 w-5 text-amber-500" />
                    Eng ko'p ishlangan testlar
                  </CardTitle>
                  <CardDescription>Foydalanuvchilar tomonidan eng ko'p ishlangan 5 ta test</CardDescription>
                </CardHeader>
                <CardContent>
                  {topTests.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      Hali test urinishlari yo'q
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {topTests.map((test, idx) => {
                        const sub = getSubjectById(test.subject);
                        return (
                          <div key={test.id} className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 hover:bg-muted/50 transition-all">
                            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 text-white font-bold">
                              {idx + 1}
                            </div>
                            <div className="text-3xl">{sub?.icon}</div>
                            <div className="flex-1 min-w-0">
                              <h4 className="font-semibold truncate">{test.title}</h4>
                              <p className="text-sm text-muted-foreground">{sub?.name}</p>
                            </div>
                            <div className="text-right">
                              <p className="font-bold text-lg">{test.attempt_count}</p>
                              <p className="text-xs text-muted-foreground">urinish</p>
                            </div>
                            <div className="text-right">
                              <p className={cn(
                                "font-bold text-lg",
                                test.avg_score >= 80 ? "text-success" : test.avg_score >= 60 ? "text-warning" : "text-destructive"
                              )}>
                                {test.avg_score}%
                              </p>
                              <p className="text-xs text-muted-foreground">o'rtacha</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tests Tab */}
            <TabsContent value="tests">
              <Card className="card-premium animate-fade-up">
                <CardHeader>
                  <CardTitle className="font-serif">Barcha testlar</CardTitle>
                  <CardDescription>Testlarni tahrirlash, savol qo'shish va nashr qilish</CardDescription>
                </CardHeader>
                <CardContent>
                  {loading ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : tests.length === 0 ? (
                    <div className="text-center py-16">
                      <FileQuestion className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                      <h3 className="font-serif text-xl font-semibold mb-2">Hali testlar yo'q</h3>
                      <p className="text-muted-foreground mb-6">Birinchi testingizni yarating</p>
                      <Button variant="premium" onClick={() => setDialogOpen(true)}>
                        <Plus className="h-4 w-4 mr-2" />
                        Yangi test
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {tests.map((test) => {
                        const sub = getSubjectById(test.subject);
                        return (
                          <div 
                            key={test.id} 
                            className="flex items-center gap-4 p-4 rounded-xl border bg-card/50 backdrop-blur-sm hover:shadow-md transition-all"
                          >
                            <div className="text-4xl">{sub?.icon}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2">
                                <h3 className="font-serif font-semibold text-lg truncate">{test.title}</h3>
                                {test.access_code && (
                                  <Badge variant="outline" className="flex items-center gap-1">
                                    <Lock className="h-3 w-3" />
                                    Kodli
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {sub?.name} • {test.question_count} savol • {test.duration_minutes} daqiqa
                              </p>
                              <p className="text-xs text-muted-foreground mt-1">
                                {test.attempt_count} urinish • O'rtacha: {test.avg_score}%
                              </p>
                              {test.access_code && (
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-xs text-muted-foreground">Kod:</span>
                                  <code className="text-xs bg-muted px-2 py-0.5 rounded font-mono">
                                    {showAccessCode[test.id] ? test.access_code : '••••••'}
                                  </code>
                                  <button 
                                    onClick={() => toggleShowAccessCode(test.id)}
                                    className="text-muted-foreground hover:text-foreground"
                                  >
                                    {showAccessCode[test.id] ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="flex items-center gap-3">
                              <div className="flex items-center gap-2">
                                <Switch 
                                  checked={test.is_published} 
                                  onCheckedChange={() => handleTogglePublish(test)} 
                                />
                                <span className={cn(
                                  "text-sm font-medium",
                                  test.is_published ? "text-success" : "text-muted-foreground"
                                )}>
                                  {test.is_published ? 'Nashr' : 'Qoralama'}
                                </span>
                              </div>
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => openQuestionDialog(test)}
                              >
                                <FileQuestion className="h-4 w-4 mr-1" />
                                Savollar
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => openEditDialog(test)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button 
                                variant="outline" 
                                size="icon"
                                onClick={() => handleDelete(test.id)}
                                className="text-destructive hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>

            {/* Users Tab */}
            {isSuperAdmin && (
              <TabsContent value="users">
                <Card className="card-premium animate-fade-up">
                  <CardHeader>
                    <CardTitle className="font-serif flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Foydalanuvchilarni boshqarish
                    </CardTitle>
                    <CardDescription>Foydalanuvchilarni bloklash va rollarini o'zgartirish</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Foydalanuvchi</TableHead>
                          <TableHead>Rol</TableHead>
                          <TableHead>Holat</TableHead>
                          <TableHead>Ro'yxatdan o'tgan</TableHead>
                          <TableHead className="text-right">Amallar</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((userProfile) => (
                          <TableRow key={userProfile.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-white font-bold">
                                  {userProfile.full_name.charAt(0).toUpperCase()}
                                </div>
                                <div>
                                  <p className="font-medium">{userProfile.full_name}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>{getRoleBadge(userProfile.role || 'user')}</TableCell>
                            <TableCell>
                              {userProfile.is_blocked ? (
                                <Badge variant="destructive"><Ban className="h-3 w-3 mr-1" />Bloklangan</Badge>
                              ) : (
                                <Badge variant="outline" className="text-success border-success"><UserCheck className="h-3 w-3 mr-1" />Faol</Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground">
                              {new Date(userProfile.created_at).toLocaleDateString('uz-UZ')}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-2">
                                {userProfile.role !== 'super_admin' && (
                                  <>
                                    <Select
                                      value={userProfile.role || 'user'}
                                      onValueChange={(value) => handleChangeUserRole(userProfile.user_id, value as 'admin' | 'user')}
                                    >
                                      <SelectTrigger className="w-32">
                                        <SelectValue />
                                      </SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="user">Foydalanuvchi</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                      </SelectContent>
                                    </Select>
                                    <Button
                                      variant={userProfile.is_blocked ? "outline" : "destructive"}
                                      size="sm"
                                      onClick={() => handleToggleUserBlock(userProfile)}
                                    >
                                      {userProfile.is_blocked ? (
                                        <><UserCheck className="h-4 w-4 mr-1" />Blokdan chiqarish</>
                                      ) : (
                                        <><Ban className="h-4 w-4 mr-1" />Bloklash</>
                                      )}
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            )}
          </Tabs>
        </div>

        {/* Question Dialog */}
        <Dialog open={questionDialogOpen} onOpenChange={(open) => { 
          setQuestionDialogOpen(open); 
          if (!open) {
            setSelectedTest(null);
            resetQuestionForm();
          }
        }}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
            <DialogHeader>
              <DialogTitle className="font-serif text-xl">
                {selectedTest?.title} - Savollar
              </DialogTitle>
            </DialogHeader>
            
            <Tabs defaultValue="list" className="flex-1 flex flex-col overflow-hidden">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="list">Savollar ro'yxati ({questions.length})</TabsTrigger>
                <TabsTrigger value="add">Yangi savol qo'shish</TabsTrigger>
              </TabsList>
              
              <TabsContent value="list" className="flex-1 overflow-hidden">
                <ScrollArea className="h-[500px] pr-4">
                  {questions.length === 0 ? (
                    <div className="text-center py-12">
                      <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <p className="text-muted-foreground">Hali savollar yo'q</p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {questions.map((question, idx) => (
                        <Card key={question.id} className="overflow-hidden">
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="font-medium mb-2 whitespace-pre-wrap">{question.question_text}</p>
                                {question.image_url && (
                                  <div className="mb-3 rounded-lg overflow-hidden border bg-muted/30 max-w-xs">
                                    <img 
                                      src={question.image_url} 
                                      alt={`Savol ${idx + 1} rasmi`}
                                      className="w-full h-auto max-h-48 object-contain"
                                    />
                                  </div>
                                )}
                                <div className="grid grid-cols-2 gap-2">
                                  {question.choices.map((choice) => (
                                    <div 
                                      key={choice.id}
                                      className={cn(
                                        "flex items-center gap-2 p-2 rounded-lg text-sm",
                                        choice.is_correct 
                                          ? "bg-success/10 text-success border border-success/30" 
                                          : "bg-muted"
                                      )}
                                    >
                                      {choice.is_correct ? (
                                        <CheckCircle className="h-4 w-4 flex-shrink-0" />
                                      ) : (
                                        <XCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                                      )}
                                      <span className="truncate">{choice.choice_text}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => handleDeleteQuestion(question.id)}
                                className="text-destructive hover:bg-destructive/10"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </TabsContent>
              
              <TabsContent value="add" className="flex-1 overflow-auto">
                <div className="space-y-6 py-4">
                  <div className="space-y-2">
                    <Label className="text-base font-semibold">Savol matni</Label>
                    <Textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Savolni kiriting... Masalan: Quyidagi tenglamani yeching: x² + 5x + 6 = 0"
                      rows={4}
                      className="resize-none"
                    />
                  </div>

                  {/* Image Upload Section */}
                  <div className="space-y-2">
                    <Label className="flex items-center gap-2">
                      <ImagePlus className="h-4 w-4" />
                      Savol rasmi (ixtiyoriy)
                    </Label>
                    {questionImagePreview ? (
                      <div className="relative inline-block">
                        <div className="rounded-xl overflow-hidden border-2 border-primary/20 max-w-xs">
                          <img
                            src={questionImagePreview}
                            alt="Savol rasmi"
                            className="w-full h-auto max-h-48 object-contain bg-muted/30"
                          />
                        </div>
                        <Button
                          variant="destructive"
                          size="icon"
                          className="absolute -top-2 -right-2 h-7 w-7 rounded-full shadow-lg"
                          onClick={clearQuestionImage}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    ) : (
                      <div
                        onClick={() => questionImageRef.current?.click()}
                        className="flex items-center gap-3 p-4 rounded-xl border-2 border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all"
                      >
                        <div className="p-2 rounded-lg bg-muted">
                          <ImagePlus className="h-5 w-5 text-muted-foreground" />
                        </div>
                        <div>
                          <p className="text-sm font-medium">Rasm qo'shish</p>
                          <p className="text-xs text-muted-foreground">PNG, JPG, WebP • Max 5MB</p>
                        </div>
                      </div>
                    )}
                    <input
                      ref={questionImageRef}
                      type="file"
                      accept="image/*"
                      onChange={handleQuestionImageChange}
                      className="hidden"
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label className="text-base font-semibold">Javob variantlari</Label>
                    <p className="text-xs text-muted-foreground -mt-2">To'g'ri javobni belgilash uchun "To'g'ri" tugmasini bosing</p>
                    {newChoices.map((choice, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-9 h-9 rounded-xl font-bold text-sm transition-all",
                          choice.isCorrect 
                            ? "bg-success text-success-foreground shadow-md shadow-success/25" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                          placeholder={`${String.fromCharCode(65 + idx)}-variant javobini kiriting`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant={choice.isCorrect ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateChoice(idx, 'isCorrect', true)}
                          className={cn(
                            "min-w-[90px] transition-all",
                            choice.isCorrect ? "bg-success hover:bg-success/90 shadow-md shadow-success/25" : ""
                          )}
                        >
                          {choice.isCorrect ? <CheckCircle className="h-4 w-4 mr-1" /> : null}
                          {choice.isCorrect ? "To'g'ri ✓" : "To'g'ri"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="premium" 
                    onClick={handleAddQuestion} 
                    disabled={saving || uploadingImage}
                    className="w-full h-12 text-base"
                    size="lg"
                  >
                    {saving || uploadingImage ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        {uploadingImage ? 'Rasm yuklanmoqda...' : 'Saqlanmoqda...'}
                      </>
                    ) : (
                      <>
                        <Plus className="h-5 w-5 mr-2" />
                        Savolni qo'shish
                      </>
                    )}
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>

        <ImportPreviewDialog
          open={previewDialogOpen}
          onOpenChange={setPreviewDialogOpen}
          testId={importedTestId}
          testTitle={importedTestTitle}
          questionsCount={importedQuestionsCount}
          onPublished={() => { fetchTests(); fetchStats(); }}
        />
      </PageTransition>
    </Layout>
  );
}
