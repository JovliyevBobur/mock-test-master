import { useEffect, useState } from 'react';
import { Layout } from '@/components/layout/Layout';
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
import { Plus, Trash2, Edit, BookOpen, Users, FileQuestion, Loader2 } from 'lucide-react';
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

export default function Admin() {
  const { user, isAdmin } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTest, setEditingTest] = useState<Test | null>(null);
  const [saving, setSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);

  useEffect(() => {
    fetchTests();
  }, []);

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
  };

  const handleTogglePublish = async (test: Test) => {
    await supabase.from('tests').update({ is_published: !test.is_published }).eq('id', test.id);
    fetchTests();
    toast.success(test.is_published ? 'Test yashirildi' : 'Test nashr qilindi');
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Testni o\'chirishni tasdiqlaysizmi?')) return;
    await supabase.from('tests').delete().eq('id', id);
    fetchTests();
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

  const resetForm = () => {
    setEditingTest(null);
    setTitle('');
    setDescription('');
    setSubject('math');
    setDuration(30);
  };

  if (!isAdmin) {
    return <Layout><div className="container py-8 text-center">Ruxsat yo'q</div></Layout>;
  }

  return (
    <Layout>
      <div className="container py-8">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="font-display text-3xl font-bold">Admin Panel</h1>
            <p className="text-muted-foreground">Testlarni boshqarish</p>
          </div>
          <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
            <DialogTrigger asChild>
              <Button variant="gradient"><Plus className="h-4 w-4 mr-2" />Yangi test</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>{editingTest ? 'Testni tahrirlash' : 'Yangi test yaratish'}</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div><Label>Nomi</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} /></div>
                <div><Label>Tavsif</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} /></div>
                <div><Label>Fan</Label>
                  <Select value={subject} onValueChange={setSubject}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS.map((s) => <SelectItem key={s.id} value={s.id}>{s.icon} {s.name}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div><Label>Vaqt (daqiqa)</Label><Input type="number" value={duration} onChange={(e) => setDuration(Number(e.target.value))} /></div>
                <Button className="w-full" onClick={handleSaveTest} disabled={saving}>
                  {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Saqlash
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid gap-4">
          {tests.map((test) => {
            const sub = getSubjectById(test.subject);
            return (
              <Card key={test.id}>
                <CardContent className="flex items-center gap-4 p-4">
                  <div className="text-3xl">{sub?.icon}</div>
                  <div className="flex-1">
                    <h3 className="font-semibold">{test.title}</h3>
                    <p className="text-sm text-muted-foreground">{sub?.name} • {test.question_count} savol • {test.duration_minutes} daqiqa</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={test.is_published} onCheckedChange={() => handleTogglePublish(test)} />
                    <span className="text-sm">{test.is_published ? 'Nashr' : 'Qoralama'}</span>
                  </div>
                  <Button variant="outline" size="icon" onClick={() => openEditDialog(test)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="outline" size="icon" onClick={() => handleDelete(test.id)}><Trash2 className="h-4 w-4" /></Button>
                </CardContent>
              </Card>
            );
          })}
          {tests.length === 0 && !loading && (
            <Card className="text-center py-12"><CardContent><FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" /><p>Hali testlar yo'q</p></CardContent></Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
