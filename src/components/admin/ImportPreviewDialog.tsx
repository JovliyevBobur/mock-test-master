import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CheckCircle, XCircle, Edit, Save, Loader2, Trash2, Eye, Rocket, ImagePlus, X } from 'lucide-react';
import { toast } from 'sonner';

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
  order_index: number;
}

interface Question {
  id: string;
  question_text: string;
  image_url: string | null;
  order_index: number;
  choices: Choice[];
}

interface ImportPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testId: string | null;
  testTitle: string;
  questionsCount: number;
  onPublished: () => void;
}

export function ImportPreviewDialog({ open, onOpenChange, testId, testTitle, questionsCount, onPublished }: ImportPreviewDialogProps) {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [editChoices, setEditChoices] = useState<{ id: string; text: string; isCorrect: boolean }[]>([]);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingImageForId, setUploadingImageForId] = useState<string | null>(null);

  const fetchQuestions = async () => {
    if (!testId) return;
    setLoading(true);
    const { data } = await supabase
      .from('questions')
      .select('id, question_text, image_url, order_index, choices(id, choice_text, is_correct, order_index)')
      .eq('test_id', testId)
      .order('order_index');
    
    if (data) {
      setQuestions(data.map(q => ({
        ...q,
        choices: q.choices.sort((a, b) => a.order_index - b.order_index)
      })));
    }
    setLoading(false);
  };

  const handleOpen = (isOpen: boolean) => {
    if (isOpen && testId) {
      fetchQuestions();
    }
    onOpenChange(isOpen);
  };

  const startEdit = (q: Question) => {
    setEditingId(q.id);
    setEditText(q.question_text);
    setEditChoices(q.choices.map(c => ({ id: c.id, text: c.choice_text, isCorrect: c.is_correct })));
  };

  const saveEdit = async () => {
    if (!editingId) return;
    setSaving(true);

    await supabase.from('questions').update({ question_text: editText }).eq('id', editingId);
    
    for (const c of editChoices) {
      await supabase.from('choices').update({ choice_text: c.text, is_correct: c.isCorrect }).eq('id', c.id);
    }

    setEditingId(null);
    await fetchQuestions();
    setSaving(false);
    toast.success('Savol yangilandi');
  };

  const deleteQuestion = async (id: string) => {
    if (!confirm("Savolni o'chirishni tasdiqlaysizmi?")) return;
    await supabase.from('questions').delete().eq('id', id);
    await fetchQuestions();
    toast.success("Savol o'chirildi");
  };

  const handlePublish = async () => {
    if (!testId) return;
    setPublishing(true);
    await supabase.from('tests').update({ is_published: true }).eq('id', testId);
    setPublishing(false);
    toast.success('Test nashr qilindi!');
    onOpenChange(false);
    onPublished();
  };

  const setCorrectChoice = (choiceId: string) => {
    setEditChoices(prev => prev.map(c => ({ ...c, isCorrect: c.id === choiceId })));
  };

  const handleImageUpload = async (questionId: string, file: File) => {
    if (!file.type.startsWith('image/')) {
      toast.error('Faqat rasm fayllarini yuklash mumkin');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Rasm hajmi 5MB dan oshmasligi kerak');
      return;
    }

    setUploadingImageForId(questionId);
    
    const fileExt = file.name.split('.').pop()?.toLowerCase() || 'png';
    const fileName = `${Date.now()}_${Math.random().toString(36).substring(2, 8)}.${fileExt}`;
    const filePath = `questions/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from('question-images')
      .upload(filePath, file, { contentType: file.type });

    if (uploadError) {
      toast.error('Rasmni yuklashda xatolik');
      setUploadingImageForId(null);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('question-images')
      .getPublicUrl(filePath);

    await supabase.from('questions')
      .update({ image_url: urlData.publicUrl })
      .eq('id', questionId);

    await fetchQuestions();
    setUploadingImageForId(null);
    toast.success('Rasm qo\'shildi');
  };

  const removeImage = async (questionId: string) => {
    await supabase.from('questions')
      .update({ image_url: null })
      .eq('id', questionId);
    await fetchQuestions();
    toast.success('Rasm o\'chirildi');
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="font-serif text-xl flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Import natijasi — Ko'rib chiqish
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {testTitle} • {questions.length} ta savol import qilindi
              </p>
            </div>
            <Badge variant="outline" className="text-amber-600 border-amber-300 bg-amber-50 dark:bg-amber-950/30">
              Qoralama
            </Badge>
          </div>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/10 text-sm">
          <p className="text-muted-foreground">
            💡 <strong>Maslahat:</strong> Har bir savolni ko'rib chiqing, kerak bo'lsa tahrirlang yoki rasm qo'shing. 
            Tayyor bo'lgach "Nashr qilish" tugmasini bosing.
          </p>
        </div>

        <ScrollArea className="flex-1 max-h-[55vh] pr-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-3">
              {questions.map((q, idx) => (
                <Card key={q.id} className="overflow-hidden">
                  <CardContent className="p-4">
                    {editingId === q.id ? (
                      <div className="space-y-3">
                        <Textarea
                          value={editText}
                          onChange={(e) => setEditText(e.target.value)}
                          className="font-medium"
                          rows={3}
                        />
                        <div className="grid grid-cols-2 gap-2">
                          {editChoices.map((c) => (
                            <div key={c.id} className="flex items-center gap-2">
                              <Input
                                value={c.text}
                                onChange={(e) => setEditChoices(prev => prev.map(x => x.id === c.id ? { ...x, text: e.target.value } : x))}
                                className="flex-1 text-sm"
                              />
                              <Button
                                size="sm"
                                variant={c.isCorrect ? "default" : "outline"}
                                className={c.isCorrect ? "bg-success hover:bg-success/90" : ""}
                                onClick={() => setCorrectChoice(c.id)}
                              >
                                {c.isCorrect ? <CheckCircle className="h-3 w-3" /> : "✓"}
                              </Button>
                            </div>
                          ))}
                        </div>
                        <div className="flex gap-2 justify-end">
                          <Button size="sm" variant="ghost" onClick={() => setEditingId(null)}>Bekor</Button>
                          <Button size="sm" onClick={saveEdit} disabled={saving}>
                            {saving ? <Loader2 className="h-3 w-3 animate-spin mr-1" /> : <Save className="h-3 w-3 mr-1" />}
                            Saqlash
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="flex items-center justify-center w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex-shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm mb-2 whitespace-pre-wrap">{q.question_text}</p>
                          
                          {/* Image section */}
                          {q.image_url ? (
                            <div className="relative mb-3 inline-block">
                              <div className="rounded-lg overflow-hidden border max-w-[200px]">
                                <img src={q.image_url} alt={`Savol ${idx + 1}`} className="w-full h-auto max-h-32 object-contain bg-muted/30" />
                              </div>
                              <Button
                                variant="destructive"
                                size="icon"
                                className="absolute -top-1.5 -right-1.5 h-5 w-5 rounded-full"
                                onClick={() => removeImage(q.id)}
                              >
                                <X className="h-3 w-3" />
                              </Button>
                            </div>
                          ) : (
                            <label className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs border border-dashed border-muted-foreground/20 cursor-pointer hover:border-primary/40 hover:bg-muted/30 transition-all mb-3">
                              {uploadingImageForId === q.id ? (
                                <Loader2 className="h-3 w-3 animate-spin" />
                              ) : (
                                <ImagePlus className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-muted-foreground">
                                {uploadingImageForId === q.id ? 'Yuklanmoqda...' : 'Rasm qo\'shish'}
                              </span>
                              <input
                                type="file"
                                accept="image/*"
                                className="hidden"
                                disabled={uploadingImageForId === q.id}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  if (file) handleImageUpload(q.id, file);
                                  e.target.value = '';
                                }}
                              />
                            </label>
                          )}
                          
                          <div className="grid grid-cols-2 gap-1.5">
                            {q.choices.map((c) => (
                              <div
                                key={c.id}
                                className={cn(
                                  "flex items-center gap-1.5 px-2 py-1.5 rounded text-xs",
                                  c.is_correct
                                    ? "bg-success/10 text-success border border-success/30"
                                    : "bg-muted"
                                )}
                              >
                                {c.is_correct ? <CheckCircle className="h-3 w-3 flex-shrink-0" /> : <XCircle className="h-3 w-3 flex-shrink-0 text-muted-foreground" />}
                                <span className="truncate">{c.choice_text}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => startEdit(q)}>
                            <Edit className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => deleteQuestion(q.id)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </ScrollArea>

        <DialogFooter className="mt-4 flex-row gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1">
            Keyinroq nashr qilaman
          </Button>
          <Button variant="premium" onClick={handlePublish} disabled={publishing || questions.length === 0} className="flex-1">
            {publishing ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Rocket className="h-4 w-4 mr-2" />}
            Nashr qilish ({questions.length} savol)
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
