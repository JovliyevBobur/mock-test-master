import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
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
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { 
  Plus, Trash2, Edit, BookOpen, Users, FileQuestion, Loader2, 
  Crown, Shield, CheckCircle, XCircle, Save, LayoutDashboard, TrendingUp
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
  question_count?: number;
}

interface Question {
  id: string;
  question_text: string;
  order_index: number;
  choices: Choice[];
}

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
  order_index: number;
}

export default function Admin() {
  const { user, isAdmin, isSuperAdmin } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [questionDialogOpen, setQuestionDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [selectedTest, setSelectedTest] = useState<Test | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ tests: 0, questions: 0, users: 0, attempts: 0 });

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);

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
  }, []);

  const fetchStats = async () => {
    const [testsRes, questionsRes, usersRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact', head: true }),
      supabase.from('questions').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    ]);

    setStats({
      tests: testsRes.count || 0,
      questions: questionsRes.count || 0,
      users: usersRes.count || 0,
      attempts: attemptsRes.count || 0,
    });
  };

  const fetchTests = async () => {
    const { data } = await supabase
      .from('tests')
      .select('id, title, description, subject, duration_minutes, is_published')
      .order('created_at', { ascending: false });

    if (data) {
      const testsWithCounts = await Promise.all(
        data.map(async (test) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);
          return { ...test, question_count: count || 0 };
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
      }).eq('id', editingTest.id);
      toast.success('Test yangilandi');
    } else {
      await supabase.from('tests').insert({
        title: title.trim(),
        description: description.trim() || null,
        subject: subject as any,
        duration_minutes: duration,
        created_by: user!.id,
      });
      toast.success('Test yaratildi');
    }

    setSaving(false);
    setDialogOpen(false);
    resetForm();
    fetchTests();
    fetchStats();
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

    const { data: questionData, error: questionError } = await supabase
      .from('questions')
      .insert({
        test_id: selectedTest.id,
        question_text: newQuestionText.trim(),
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

  const openEditDialog = (test: Test) => {
    setEditingTest(test);
    setTitle(test.title);
    setDescription(test.description || '');
    setSubject(test.subject);
    setDuration(test.duration_minutes);
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
  };

  const resetQuestionForm = () => {
    setNewQuestionText('');
    setNewChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
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
      <CosmicBackground />
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
                <p className="text-muted-foreground">Testlar va savollarni boshqarish</p>
              </div>
            </div>
            
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

          {/* Stats */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Testlar', value: stats.tests, icon: BookOpen, gradient: 'from-blue-500 to-indigo-600' },
              { label: 'Savollar', value: stats.questions, icon: FileQuestion, gradient: 'from-amber-500 to-orange-600' },
              { label: 'Foydalanuvchilar', value: stats.users, icon: Users, gradient: 'from-emerald-500 to-teal-600' },
              { label: 'Urinishlar', value: stats.attempts, icon: TrendingUp, gradient: 'from-purple-500 to-pink-600' },
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

          {/* Tests List */}
          <Card className="card-premium animate-fade-up delay-400">
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
                          <h3 className="font-serif font-semibold text-lg truncate">{test.title}</h3>
                          <p className="text-sm text-muted-foreground">
                            {sub?.name} • {test.question_count} savol • {test.duration_minutes} daqiqa
                          </p>
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
                        <Card key={question.id}>
                          <CardContent className="p-4">
                            <div className="flex items-start gap-4">
                              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-sm flex-shrink-0">
                                {idx + 1}
                              </div>
                              <div className="flex-1">
                                <p className="font-medium mb-3">{question.question_text}</p>
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
                    <Label>Savol matni</Label>
                    <Textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Savolni kiriting..."
                      rows={3}
                    />
                  </div>
                  
                  <div className="space-y-4">
                    <Label>Javob variantlari (to'g'ri javobni belgilang)</Label>
                    {newChoices.map((choice, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div className={cn(
                          "flex items-center justify-center w-8 h-8 rounded-full font-bold text-sm",
                          choice.isCorrect 
                            ? "bg-success text-success-foreground" 
                            : "bg-muted text-muted-foreground"
                        )}>
                          {String.fromCharCode(65 + idx)}
                        </div>
                        <Input
                          value={choice.text}
                          onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                          placeholder={`${idx + 1}-variant`}
                          className="flex-1"
                        />
                        <Button
                          type="button"
                          variant={choice.isCorrect ? "default" : "outline"}
                          size="sm"
                          onClick={() => updateChoice(idx, 'isCorrect', true)}
                          className={choice.isCorrect ? "bg-success hover:bg-success/90" : ""}
                        >
                          {choice.isCorrect ? <CheckCircle className="h-4 w-4" /> : "To'g'ri"}
                        </Button>
                      </div>
                    ))}
                  </div>
                  
                  <Button 
                    variant="premium" 
                    onClick={handleAddQuestion} 
                    disabled={saving}
                    className="w-full"
                  >
                    {saving ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <Plus className="h-4 w-4 mr-2" />
                    )}
                    Savolni qo'shish
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      </PageTransition>
    </Layout>
  );
}
