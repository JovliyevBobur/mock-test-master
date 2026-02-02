import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { FloatingShapes } from '@/components/ui/FloatingShapes';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { Plus, Trash2, Edit, FileQuestion, Loader2, LayoutDashboard, BookOpen, Users, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

interface Test {
  id: string;
  title: string;
  description: string | null;
  subject: string;
  duration_minutes: number;
  is_published: boolean;
  question_count?: number;
}

interface Stats {
  totalTests: number;
  totalQuestions: number;
  totalAttempts: number;
  totalUsers: number;
}

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [stats, setStats] = useState<Stats>({ totalTests: 0, totalQuestions: 0, totalAttempts: 0, totalUsers: 0 });
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [saving, setSaving] = useState(false);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const { data: testsData } = await supabase
      .from('tests')
      .select('id, title, description, subject, duration_minutes, is_published')
      .order('created_at', { ascending: false });

    if (testsData) {
      const testsWithCounts = await Promise.all(
        testsData.map(async (test) => {
          const { count } = await supabase.from('questions').select('*', { count: 'exact', head: true }).eq('test_id', test.id);
          return { ...test, question_count: count || 0 };
        })
      );
      setTests(testsWithCounts);
    }

    const { count: testsCount } = await supabase.from('tests').select('*', { count: 'exact', head: true });
    const { count: questionsCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    const { count: attemptsCount } = await supabase.from('test_attempts').select('*', { count: 'exact', head: true });
    const { count: usersCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true });

    setStats({
      totalTests: testsCount || 0,
      totalQuestions: questionsCount || 0,
      totalAttempts: attemptsCount || 0,
      totalUsers: usersCount || 0,
    });
    setLoading(false);
  };

  const handleSaveTest = async () => {
    if (!title.trim()) { toast.error('Test nomini kiriting'); return; }
    setSaving(true);
    if (editingTest) {
      await supabase.from('tests').update({ title: title.trim(), description: description.trim() || null, subject: subject as any, duration_minutes: duration }).eq('id', editingTest.id);
      toast.success('Test yangilandi');
    } else {
      await supabase.from('tests').insert({ title: title.trim(), description: description.trim() || null, subject: subject as any, duration_minutes: duration, created_by: user!.id });
      toast.success('Test yaratildi');
    }
    setSaving(false); setDialogOpen(false); resetForm(); fetchData();
  };

  const handleTogglePublish = async (test: Test) => {
    await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
    fetchData();
    toast.success(test.is_published ? 'Test yashirildi' : 'Test nashr qilindi');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return;
    await supabase.from('tests').delete().eq('id', id);
    fetchData();
    toast.success('Test o\'chirildi');
  };

  const openEditDialog = (test: Test) => {
    setEditingTest(test); setTitle(test.title); setDescription(test.description || ''); setSubject(test.subject); setDuration(test.duration_minutes); setDialogOpen(true);
  };

  const resetForm = () => { setEditingTest(null); setTitle(''); setDescription(''); setSubject('math'); setDuration(30); };

  if (!isAdmin) {
    return (
      <Layout>
        <div className="container py-20 text-center">
          <h1 className="font-serif text-2xl font-semibold mb-4">Ruxsat yo'q</h1>
          <p className="text-muted-foreground">Bu sahifaga kirish uchun admin huquqi kerak.</p>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <PageTransition>
        <div className="relative min-h-screen section-premium overflow-hidden">
          <FloatingShapes className="opacity-30" />
          
          <div className="container relative py-12">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12 animate-fade-up">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-lg">
                  <LayoutDashboard className="h-7 w-7" />
                </div>
                <div>
                  <h1 className="font-serif text-3xl font-semibold">Admin Panel</h1>
                  <p className="text-muted-foreground">Testlar va savollarni boshqarish</p>
                </div>
              </div>
              
              <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
                <DialogTrigger asChild>
                  <Button variant="premium" size="lg"><Plus className="h-5 w-5 mr-2" />Yangi test</Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader><DialogTitle className="font-serif text-xl">{editingTest ? 'Testni tahrirlash' : 'Yangi test yaratish'}</DialogTitle></DialogHeader>
                  <div className="space-y-5 mt-6">
                    <div className="space-y-2"><Label>Test nomi</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Masalan: Matematika asoslari" className="h-12" /></div>
                    <div className="space-y-2"><Label>Tavsif</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Test haqida qisqacha..." rows={3} /></div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2"><Label>Fan</Label>
                        <Select value={subject} onValueChange={setSubject}>
                          <SelectTrigger className="h-12"><SelectValue /></SelectTrigger>
                          <SelectContent>{SUBJECTS.map((s) => <SelectItem key={s.id} value={s.id}><span className="flex items-center gap-2"><span>{s.icon}</span><span>{s.name}</span></span></SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2"><Label>Vaqt (daqiqa)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} className="h-12" /></div>
                    </div>
                    <Button className="w-full h-12" variant="premium" onClick={handleSaveTest} disabled={saving}>
                      {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}{editingTest ? 'Saqlash' : 'Yaratish'}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>

            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
              {[
                { label: 'Jami testlar', value: stats.totalTests, icon: BookOpen, color: 'bg-primary/10 text-primary' },
                { label: 'Jami savollar', value: stats.totalQuestions, icon: FileQuestion, color: 'bg-accent/10 text-accent' },
                { label: 'Test urinishlari', value: stats.totalAttempts, icon: TrendingUp, color: 'bg-success/10 text-success' },
                { label: 'Foydalanuvchilar', value: stats.totalUsers, icon: Users, color: 'bg-info/10 text-info' },
              ].map((stat, index) => (
                <Card key={index} className="card-premium rounded-xl animate-fade-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${stat.color}`}><stat.icon className="h-6 w-6" /></div>
                      <div><p className="text-3xl font-bold">{stat.value}</p><p className="text-sm text-muted-foreground">{stat.label}</p></div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card className="card-premium rounded-xl animate-fade-up delay-400">
              <CardHeader><CardTitle className="font-serif text-xl">Barcha testlar</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {tests.map((test) => {
                    const sub = getSubjectById(test.subject);
                    return (
                      <div key={test.id} className="flex items-center gap-4 p-4 rounded-xl border border-border/60 hover:bg-muted/50 transition-colors">
                        <div className="flex items-center justify-center w-12 h-12 rounded-lg bg-muted text-3xl">{sub?.icon}</div>
                        <div className="flex-1 min-w-0"><h3 className="font-semibold truncate">{test.title}</h3><p className="text-sm text-muted-foreground">{sub?.name} • {test.question_count} savol • {test.duration_minutes} daqiqa</p></div>
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2"><Switch checked={test.is_published} onCheckedChange={() => handleTogglePublish(test)} /><span className="text-sm text-muted-foreground whitespace-nowrap">{test.is_published ? 'Nashr' : 'Qoralama'}</span></div>
                          <Button variant="ghost" size="icon" onClick={() => openEditDialog(test)}><Edit className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(test.id)} className="text-destructive hover:text-destructive"><Trash2 className="h-4 w-4" /></Button>
                        </div>
                      </div>
                    );
                  })}
                  {tests.length === 0 && !loading && (
                    <div className="text-center py-16">
                      <div className="flex items-center justify-center w-16 h-16 rounded-2xl bg-muted mx-auto mb-4"><FileQuestion className="h-8 w-8 text-muted-foreground" /></div>
                      <h3 className="font-semibold mb-2">Hali testlar yo'q</h3><p className="text-sm text-muted-foreground mb-4">Birinchi testingizni yarating</p>
                      <Button variant="premium" onClick={() => setDialogOpen(true)}><Plus className="h-4 w-4 mr-2" />Yangi test</Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
