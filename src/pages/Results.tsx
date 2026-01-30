import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { getSubjectById } from '@/lib/constants';
import { Loader2, Trophy, Clock, CheckCircle, XCircle, RotateCcw, Home, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface Choice {
  id: string;
  choice_text: string;
  is_correct: boolean;
}

interface Question {
  id: string;
  question_text: string;
  choices: Choice[];
}

interface UserAnswer {
  question_id: string;
  selected_choice_id: string | null;
  is_correct: boolean | null;
}

interface AttemptResult {
  id: string;
  score: number;
  total_questions: number;
  time_spent_seconds: number;
  test: {
    id: string;
    title: string;
    subject: string;
  };
  questions: Question[];
  answers: UserAnswer[];
}

export default function Results() {
  const { attemptId } = useParams<{ attemptId: string }>();
  const [result, setResult] = useState<AttemptResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [showAnswers, setShowAnswers] = useState(false);

  useEffect(() => {
    if (attemptId) {
      fetchResults();
    }
  }, [attemptId]);

  const fetchResults = async () => {
    // Fetch attempt
    const { data: attemptData, error: attemptError } = await supabase
      .from('test_attempts')
      .select(`
        id,
        score,
        total_questions,
        time_spent_seconds,
        tests (
          id,
          title,
          subject
        )
      `)
      .eq('id', attemptId)
      .single();

    if (attemptError || !attemptData) {
      setLoading(false);
      return;
    }

    // Fetch questions with choices
    const { data: questionsData } = await supabase
      .from('questions')
      .select(`
        id,
        question_text,
        choices (
          id,
          choice_text,
          is_correct
        )
      `)
      .eq('test_id', (attemptData.tests as any).id)
      .order('order_index');

    // Fetch user answers
    const { data: answersData } = await supabase
      .from('user_answers')
      .select('question_id, selected_choice_id, is_correct')
      .eq('attempt_id', attemptId);

    setResult({
      id: attemptData.id,
      score: attemptData.score || 0,
      total_questions: attemptData.total_questions || 0,
      time_spent_seconds: attemptData.time_spent_seconds || 0,
      test: attemptData.tests as any,
      questions: questionsData || [],
      answers: answersData || [],
    });

    setLoading(false);

    // Confetti for good score
    const percentage = ((attemptData.score || 0) / (attemptData.total_questions || 1)) * 100;
    if (percentage >= 80) {
      setTimeout(() => {
        confetti({
          particleCount: 100,
          spread: 70,
          origin: { y: 0.6 },
        });
      }, 500);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins} daqiqa ${secs} soniya`;
  };

  const getScoreColor = (percentage: number) => {
    if (percentage >= 80) return 'text-success';
    if (percentage >= 60) return 'text-warning';
    return 'text-destructive';
  };

  const getScoreMessage = (percentage: number) => {
    if (percentage >= 90) return 'Ajoyib natija! 🎉';
    if (percentage >= 80) return 'Juda yaxshi! 👏';
    if (percentage >= 60) return 'Yaxshi harakat! 💪';
    if (percentage >= 40) return 'Ko\'proq mashq qiling 📚';
    return 'Qayta urinib ko\'ring 🔄';
  };

  if (loading) {
    return (
      <Layout>
        <div className="flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </Layout>
    );
  }

  if (!result) {
    return (
      <Layout>
        <div className="container py-8 text-center">
          <h1 className="font-display text-2xl font-bold mb-4">Natija topilmadi</h1>
          <Link to="/dashboard">
            <Button>Bosh sahifaga qaytish</Button>
          </Link>
        </div>
      </Layout>
    );
  }

  const percentage = Math.round((result.score / result.total_questions) * 100);
  const subject = getSubjectById(result.test.subject);

  return (
    <Layout>
      <div className="container py-8 max-w-4xl">
        {/* Score Card */}
        <Card className="mb-8 overflow-hidden">
          <div className="gradient-hero p-8 text-center text-white">
            <div className="text-6xl mb-4">{subject?.icon}</div>
            <h1 className="font-display text-3xl font-bold mb-2">{result.test.title}</h1>
            <p className="opacity-80">{subject?.name}</p>
          </div>
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className={cn("text-7xl font-display font-bold mb-2", getScoreColor(percentage))}>
                {percentage}%
              </div>
              <p className="text-xl text-muted-foreground mb-4">
                {result.score} / {result.total_questions} to'g'ri javob
              </p>
              <p className="text-2xl font-semibold">{getScoreMessage(percentage)}</p>
            </div>

            <Progress value={percentage} className="h-4 mb-8" />

            <div className="grid sm:grid-cols-3 gap-4 text-center">
              <div className="p-4 rounded-lg bg-muted">
                <Trophy className="h-6 w-6 mx-auto mb-2 text-primary" />
                <p className="text-2xl font-bold">{result.score}</p>
                <p className="text-sm text-muted-foreground">To'g'ri</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <XCircle className="h-6 w-6 mx-auto mb-2 text-destructive" />
                <p className="text-2xl font-bold">{result.total_questions - result.score}</p>
                <p className="text-sm text-muted-foreground">Noto'g'ri</p>
              </div>
              <div className="p-4 rounded-lg bg-muted">
                <Clock className="h-6 w-6 mx-auto mb-2 text-info" />
                <p className="text-2xl font-bold">{Math.floor(result.time_spent_seconds / 60)}</p>
                <p className="text-sm text-muted-foreground">Daqiqa</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <div className="flex flex-wrap gap-4 justify-center mb-8">
          <Link to={`/test/${result.test.id}`}>
            <Button variant="gradient" size="lg">
              <RotateCcw className="h-5 w-5 mr-2" />
              Qayta ishlash
            </Button>
          </Link>
          <Button
            variant="outline"
            size="lg"
            onClick={() => setShowAnswers(!showAnswers)}
          >
            {showAnswers ? 'Javoblarni yashirish' : 'Javoblarni ko\'rish'}
          </Button>
          <Link to="/dashboard">
            <Button variant="outline" size="lg">
              <Home className="h-5 w-5 mr-2" />
              Bosh sahifa
            </Button>
          </Link>
        </div>

        {/* Answers Review */}
        {showAnswers && (
          <div className="space-y-4">
            <h2 className="font-display text-2xl font-bold mb-4">Javoblar tahlili</h2>
            {result.questions.map((question, idx) => {
              const userAnswer = result.answers.find((a) => a.question_id === question.id);
              const isCorrect = userAnswer?.is_correct;
              const correctChoice = question.choices.find((c) => c.is_correct);

              return (
                <Card key={question.id} className={cn(
                  "border-2",
                  isCorrect ? "border-success/30" : "border-destructive/30"
                )}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        "flex items-center justify-center w-8 h-8 rounded-full flex-shrink-0",
                        isCorrect ? "bg-success text-success-foreground" : "bg-destructive text-destructive-foreground"
                      )}>
                        {isCorrect ? <CheckCircle className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
                      </div>
                      <CardTitle className="font-display text-lg">
                        {idx + 1}. {question.question_text}
                      </CardTitle>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 ml-11">
                      {question.choices.map((choice) => {
                        const isSelected = userAnswer?.selected_choice_id === choice.id;
                        const isCorrectChoice = choice.is_correct;

                        return (
                          <div
                            key={choice.id}
                            className={cn(
                              "p-3 rounded-lg border",
                              isCorrectChoice && "bg-success/10 border-success",
                              isSelected && !isCorrectChoice && "bg-destructive/10 border-destructive",
                              !isSelected && !isCorrectChoice && "bg-muted/50"
                            )}
                          >
                            <div className="flex items-center gap-2">
                              {isCorrectChoice && <CheckCircle className="h-4 w-4 text-success" />}
                              {isSelected && !isCorrectChoice && <XCircle className="h-4 w-4 text-destructive" />}
                              <span className={cn(
                                isCorrectChoice && "font-semibold text-success",
                                isSelected && !isCorrectChoice && "line-through text-destructive"
                              )}>
                                {choice.choice_text}
                              </span>
                              {isSelected && <span className="text-xs text-muted-foreground">(sizning javobingiz)</span>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </Layout>
  );
}
