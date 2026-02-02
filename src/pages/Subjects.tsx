import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { FloatingShapes } from '@/components/ui/FloatingShapes';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectById, SUBJECTS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Clock, FileQuestion, ArrowRight, ArrowLeft, Sparkles } from 'lucide-react';

interface Test {
  id: string;
  title: string;
  description: string | null;
  duration_minutes: number;
  question_count: number;
}

export default function Subjects() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const { user } = useAuth();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});

  const subject = subjectId ? getSubjectById(subjectId) : null;

  useEffect(() => {
    if (subjectId) {
      fetchTests();
    } else {
      fetchTestCounts();
    }
  }, [subjectId]);

  const fetchTestCounts = async () => {
    const { data, error } = await supabase
      .from('tests')
      .select('subject')
      .eq('is_published', true);

    if (!error && data) {
      const counts: Record<string, number> = {};
      data.forEach((test) => {
        counts[test.subject] = (counts[test.subject] || 0) + 1;
      });
      setTestCounts(counts);
    }
    setLoading(false);
  };

  const fetchTests = async () => {
    const { data: testsData, error } = await supabase
      .from('tests')
      .select('id, title, description, duration_minutes')
      .eq('subject', subjectId as any)
      .eq('is_published', true)
      .order('created_at', { ascending: false });

    if (!error && testsData) {
      const testsWithCounts = await Promise.all(
        testsData.map(async (test) => {
          const { count } = await supabase
            .from('questions')
            .select('*', { count: 'exact', head: true })
            .eq('test_id', test.id);
          
          return {
            ...test,
            question_count: count || 0,
          };
        })
      );
      
      setTests(testsWithCounts);
    }
    setLoading(false);
  };

  // Subject list view
  if (!subjectId) {
    return (
      <Layout>
        <PageTransition>
          <div className="relative min-h-[80vh] section-premium overflow-hidden">
            <FloatingShapes />
            
            <div className="container relative py-16">
              <div className="text-center mb-16">
                <p className="text-sm font-medium tracking-elegant text-accent uppercase mb-3 animate-fade-up">Fanlar</p>
                <h1 className="font-serif text-4xl md:text-5xl font-semibold mb-4 animate-fade-up delay-100">
                  O'zingizga kerakli fanni tanlang
                </h1>
                <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-up delay-200">
                  6 ta fan bo'yicha professional testlar. Har bir fan bo'yicha minglab savollar.
                </p>
              </div>

              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="border-2">
                      <CardContent className="p-8">
                        <Skeleton className="h-16 w-16 rounded-xl mx-auto mb-4" />
                        <Skeleton className="h-6 w-32 mx-auto mb-2" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {SUBJECTS.map((sub, index) => (
                    <Link 
                      key={sub.id} 
                      to={`/subjects/${sub.id}`}
                      className="animate-fade-up"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <Card className="group card-premium rounded-xl overflow-hidden cursor-pointer h-full">
                        <CardContent className="p-8 text-center">
                          <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-primary/10 mx-auto mb-6 text-5xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary/20">
                            {sub.icon}
                          </div>
                          <h3 className="font-serif text-2xl font-semibold mb-2">{sub.name}</h3>
                          <p className="text-muted-foreground mb-4">
                            {testCounts[sub.id] || 0} ta test mavjud
                          </p>
                          <div className="flex items-center justify-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span>Ko'rish</span>
                            <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
                          </div>
                        </CardContent>
                      </Card>
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        </PageTransition>
      </Layout>
    );
  }

  // Subject detail view
  return (
    <Layout>
      <PageTransition>
        <div className="relative min-h-[80vh] section-premium overflow-hidden">
          <FloatingShapes />
          
          <div className="container relative py-12">
            <Link 
              to="/subjects" 
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-8 transition-colors group"
            >
              <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-1" />
              <span>Barcha fanlar</span>
            </Link>

            <div className="flex items-center gap-6 mb-12 animate-fade-up">
              <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 text-6xl">
                {subject?.icon}
              </div>
              <div>
                <h1 className="font-serif text-4xl font-semibold mb-2">{subject?.name}</h1>
                <p className="text-muted-foreground text-lg">
                  {tests.length} ta test mavjud
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-6 w-48 mb-2" />
                      <Skeleton className="h-4 w-full" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-11 w-full" />
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : tests.length === 0 ? (
              <Card className="text-center py-20 card-premium rounded-xl animate-fade-up">
                <CardContent>
                  <div className="flex items-center justify-center w-20 h-20 rounded-2xl bg-muted mx-auto mb-6">
                    <FileQuestion className="h-10 w-10 text-muted-foreground" />
                  </div>
                  <h3 className="font-serif text-2xl font-semibold mb-3">
                    Hozircha testlar yo'q
                  </h3>
                  <p className="text-muted-foreground mb-8 max-w-md mx-auto">
                    Bu fan bo'yicha testlar tez orada qo'shiladi. Boshqa fanlarni ko'rib chiqishingiz mumkin.
                  </p>
                  <Link to="/subjects">
                    <Button variant="outline" size="lg">
                      <ArrowLeft className="h-4 w-4 mr-2" />
                      Boshqa fanlarni ko'rish
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ) : (
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test, index) => (
                  <Card 
                    key={test.id} 
                    className="group card-premium rounded-xl animate-fade-up"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardHeader>
                      <CardTitle className="font-serif text-xl">{test.title}</CardTitle>
                      {test.description && (
                        <CardDescription className="line-clamp-2">{test.description}</CardDescription>
                      )}
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground mb-6">
                        <div className="flex items-center gap-2">
                          <FileQuestion className="h-4 w-4" />
                          <span>{test.question_count} ta savol</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="h-4 w-4" />
                          <span>{test.duration_minutes} daqiqa</span>
                        </div>
                      </div>
                      
                      {user ? (
                        <Link to={`/test/${test.id}`}>
                          <Button className="w-full group/btn" variant="premium">
                            <Sparkles className="h-4 w-4 mr-2 transition-transform group-hover/btn:rotate-12" />
                            Testni boshlash
                          </Button>
                        </Link>
                      ) : (
                        <Link to="/login">
                          <Button variant="outline" className="w-full">
                            Kirish kerak
                          </Button>
                        </Link>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </PageTransition>
    </Layout>
  );
}
