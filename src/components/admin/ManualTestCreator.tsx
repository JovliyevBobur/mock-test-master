import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SUBJECTS } from '@/lib/constants';
import { cn } from '@/lib/utils';
import { Plus, Trash2, CheckCircle, XCircle, Save, Loader2, Lock, BookOpen, FileQuestion } from 'lucide-react';
import { toast } from 'sonner';

interface ManualQuestion {
  text: string;
  choices: { text: string; isCorrect: boolean }[];
}

interface ManualTestCreatorProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  isSuperAdmin: boolean;
  onCreated: () => void;
}

export function ManualTestCreator({ open, onOpenChange, userId, isSuperAdmin, onCreated }: ManualTestCreatorProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [subject, setSubject] = useState('math');
  const [duration, setDuration] = useState(30);
  const [accessCode, setAccessCode] = useState('');
  const [questions, setQuestions] = useState<ManualQuestion[]>([]);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState('info');

  // Current question being added
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [currentChoices, setCurrentChoices] = useState([
    { text: '', isCorrect: true },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
    { text: '', isCorrect: false },
  ]);

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setSubject('math');
    setDuration(30);
    setAccessCode('');
    setQuestions([]);
    setCurrentQuestion('');
    setCurrentChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    setActiveTab('info');
  };

  const addQuestion = () => {
    if (!currentQuestion.trim()) {
      toast.error('Savol matnini kiriting');
      return;
    }
    const filled = currentChoices.filter(c => c.text.trim());
    if (filled.length < 2) {
      toast.error('Kamida 2 ta javob varianti kerak');
      return;
    }
    if (!filled.some(c => c.isCorrect)) {
      toast.error("To'g'ri javob belgilang");
      return;
    }

    setQuestions(prev => [...prev, {
      text: currentQuestion.trim(),
      choices: filled.map(c => ({ text: c.text.trim(), isCorrect: c.isCorrect })),
    }]);
    setCurrentQuestion('');
    setCurrentChoices([
      { text: '', isCorrect: true },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
      { text: '', isCorrect: false },
    ]);
    toast.success(`Savol qo'shildi (${questions.length + 1})`);
  };

  const removeQuestion = (idx: number) => {
    setQuestions(prev => prev.filter((_, i) => i !== idx));
  };

  const updateChoice = (index: number, field: 'text' | 'isCorrect', value: string | boolean) => {
    setCurrentChoices(prev => prev.map((c, i) => {
      if (i === index) {
        if (field === 'isCorrect' && value === true) return { ...c, isCorrect: true };
        return { ...c, [field]: value };
      }
      if (field === 'isCorrect' && value === true) return { ...c, isCorrect: false };
      return c;
    }));
  };

  const handleSave = async () => {
    if (!title.trim()) {
      toast.error('Test nomini kiriting');
      setActiveTab('info');
      return;
    }
    if (questions.length === 0) {
      toast.error('Kamida 1 ta savol qo\'shing');
      setActiveTab('questions');
      return;
    }

    setSaving(true);
    try {
      // Create test
      const { data: testData, error: testError } = await supabase
        .from('tests')
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          subject: subject as any,
          duration_minutes: duration,
          created_by: userId,
          is_published: false,
          access_code: accessCode.trim() || null,
        })
        .select('id')
        .single();

      if (testError || !testData) throw testError;

      // Insert questions
      const questionsPayload = questions.map((q, i) => ({
        test_id: testData.id,
        question_text: q.text,
        order_index: i,
      }));

      const { data: insertedQuestions, error: qError } = await supabase
        .from('questions')
        .insert(questionsPayload)
        .select('id, order_index');

      if (qError || !insertedQuestions) throw qError;

      // Insert choices
      const choicesPayload = questions.flatMap((q, qi) => {
        const questionId = insertedQuestions.find(iq => iq.order_index === qi)?.id;
        if (!questionId) return [];
        return q.choices.map((c, ci) => ({
          question_id: questionId,
          choice_text: c.text,
          is_correct: c.isCorrect,
          order_index: ci,
        }));
      });

      const { error: cError } = await supabase.from('choices').insert(choicesPayload);
      if (cError) throw cError;

      toast.success(`Test yaratildi! ${questions.length} ta savol bilan`);
      onOpenChange(false);
      resetForm();
      onCreated();
    } catch (err: any) {
      toast.error(err?.message || 'Xatolik yuz berdi');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => { onOpenChange(v); if (!v) resetForm(); }}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="font-serif text-xl flex items-center gap-2">
            <BookOpen className="h-5 w-5" />
            Yangi test yaratish
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="info">1. Test ma'lumoti</TabsTrigger>
            <TabsTrigger value="questions">
              2. Savollar ({questions.length})
            </TabsTrigger>
            <TabsTrigger value="preview">3. Ko'rib chiqish</TabsTrigger>
          </TabsList>

          {/* Step 1: Test Info */}
          <TabsContent value="info" className="flex-1 overflow-auto">
            <div className="space-y-4 py-2">
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
              <Button className="w-full" onClick={() => setActiveTab('questions')}>
                Keyingi: Savollar qo'shish →
              </Button>
            </div>
          </TabsContent>

          {/* Step 2: Add Questions */}
          <TabsContent value="questions" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="space-y-4 py-2 pr-4">
                {/* Added questions list */}
                {questions.length > 0 && (
                  <div className="space-y-2 mb-4">
                    <Label className="text-sm text-muted-foreground">Qo'shilgan savollar:</Label>
                    {questions.map((q, idx) => (
                      <Card key={idx} className="overflow-hidden">
                        <CardContent className="p-3 flex items-start gap-2">
                          <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0 mt-0.5">
                            {idx + 1}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{q.text}</p>
                            <div className="flex flex-wrap gap-1 mt-1">
                              {q.choices.map((c, ci) => (
                                <span key={ci} className={cn(
                                  "text-xs px-2 py-0.5 rounded",
                                  c.isCorrect ? "bg-success/10 text-success" : "bg-muted text-muted-foreground"
                                )}>
                                  {String.fromCharCode(65 + ci)}: {c.text}
                                </span>
                              ))}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeQuestion(idx)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}

                {/* New question form */}
                <Card className="border-dashed border-2 border-primary/30">
                  <CardContent className="p-4 space-y-3">
                    <Label className="flex items-center gap-2">
                      <FileQuestion className="h-4 w-4" />
                      Yangi savol ({questions.length + 1})
                    </Label>
                    <Textarea
                      value={currentQuestion}
                      onChange={(e) => setCurrentQuestion(e.target.value)}
                      placeholder="Savolni kiriting..."
                      rows={2}
                    />
                    <div className="space-y-2">
                      {currentChoices.map((choice, idx) => (
                        <div key={idx} className="flex items-center gap-2">
                          <div className={cn(
                            "flex items-center justify-center w-7 h-7 rounded-full font-bold text-xs",
                            choice.isCorrect
                              ? "bg-success text-white"
                              : "bg-muted text-muted-foreground"
                          )}>
                            {String.fromCharCode(65 + idx)}
                          </div>
                          <Input
                            value={choice.text}
                            onChange={(e) => updateChoice(idx, 'text', e.target.value)}
                            placeholder={`${idx + 1}-variant`}
                            className="flex-1 h-9 text-sm"
                          />
                          <Button
                            type="button"
                            variant={choice.isCorrect ? "default" : "outline"}
                            size="sm"
                            onClick={() => updateChoice(idx, 'isCorrect', true)}
                            className={cn("h-8 w-8 p-0", choice.isCorrect ? "bg-success hover:bg-success/90" : "")}
                          >
                            {choice.isCorrect ? <CheckCircle className="h-3.5 w-3.5" /> : "✓"}
                          </Button>
                        </div>
                      ))}
                    </div>
                    <Button onClick={addQuestion} className="w-full" variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Savolni qo'shish
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setActiveTab('info')} className="flex-1">← Orqaga</Button>
              <Button onClick={() => setActiveTab('preview')} className="flex-1" disabled={questions.length === 0}>
                Ko'rib chiqish →
              </Button>
            </div>
          </TabsContent>

          {/* Step 3: Preview */}
          <TabsContent value="preview" className="flex-1 overflow-hidden flex flex-col">
            <ScrollArea className="flex-1 max-h-[50vh]">
              <div className="space-y-3 py-2 pr-4">
                <Card>
                  <CardContent className="p-4">
                    <h3 className="font-serif font-bold text-lg">{title || 'Nomsiz test'}</h3>
                    {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
                    <div className="flex gap-3 mt-2 text-xs text-muted-foreground">
                      <span>{SUBJECTS.find(s => s.id === subject)?.icon} {SUBJECTS.find(s => s.id === subject)?.name}</span>
                      <span>⏱ {duration} daqiqa</span>
                      <span>📝 {questions.length} savol</span>
                      {accessCode && <span>🔒 Kodli</span>}
                    </div>
                  </CardContent>
                </Card>
                {questions.map((q, idx) => (
                  <Card key={idx}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">{q.text}</p>
                          <div className="grid grid-cols-2 gap-1 mt-2">
                            {q.choices.map((c, ci) => (
                              <div key={ci} className={cn(
                                "flex items-center gap-1 px-2 py-1 rounded text-xs",
                                c.isCorrect ? "bg-success/10 text-success border border-success/30" : "bg-muted"
                              )}>
                                {c.isCorrect ? <CheckCircle className="h-3 w-3" /> : <XCircle className="h-3 w-3 text-muted-foreground" />}
                                {c.text}
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
            <div className="flex gap-2 mt-3">
              <Button variant="outline" onClick={() => setActiveTab('questions')} className="flex-1">← Orqaga</Button>
              <Button variant="premium" onClick={handleSave} disabled={saving} className="flex-1">
                {saving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                Test yaratish va saqlash
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
