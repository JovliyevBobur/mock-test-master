import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectById, SUBJECTS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { SubjectCard } from '@/components/SubjectCard';
import { Clock, FileQuestion, ArrowRight, ArrowLeft } from 'lucide-react';

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
      // Get question counts for each test
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
        <div className="container py-8">
          <div className="mb-8">
            <h1 className="font-display text-3xl font-bold mb-2">Fanlar</h1>
            <p className="text-muted-foreground">
              O'zingizga kerakli fanni tanlang va testlarni boshlang
            </p>
          </div>

          {loading ? (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3, 4, 5, 6].map((i) => (
                <Card key={i} className="border-2">
                  <CardContent className="p-8">
                    <Skeleton className="h-12 w-12 rounded-lg mx-auto mb-4" />
                    <Skeleton className="h-6 w-24 mx-auto mb-2" />
                    <Skeleton className="h-4 w-20 mx-auto" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {SUBJECTS.map((sub) => (
                <SubjectCard
                  key={sub.id}
                  id={sub.id}
                  name={sub.name}
                  icon={sub.icon}
                  testCount={testCounts[sub.id] || 0}
                />
              ))}
            </div>
          )}
        </div>
      </Layout>
    );
  }

  // Subject detail view
  return (
    <Layout>
      <div className="container py-8">
        <Link to="/subjects" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" />
          <span>Fanlar</span>
        </Link>

        <div className="flex items-center gap-4 mb-8">
          <div className="text-5xl">{subject?.icon}</div>
          <div>
            <h1 className="font-display text-3xl font-bold">{subject?.name}</h1>
            <p className="text-muted-foreground">
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
                  <Skeleton className="h-10 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : tests.length === 0 ? (
          <Card className="text-center py-16">
            <CardContent>
              <FileQuestion className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
              <h3 className="font-display text-xl font-semibold mb-2">
                Hozircha testlar yo'q
              </h3>
              <p className="text-muted-foreground mb-6">
                Bu fan bo'yicha testlar tez orada qo'shiladi
              </p>
              <Link to="/subjects">
                <Button variant="outline">Boshqa fanlarni ko'rish</Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="group hover:shadow-lg hover:-translate-y-1 transition-all duration-300">
                <CardHeader>
                  <CardTitle className="font-display">{test.title}</CardTitle>
                  {test.description && (
                    <CardDescription>{test.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-1">
                      <FileQuestion className="h-4 w-4" />
                      <span>{test.question_count} ta savol</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Clock className="h-4 w-4" />
                      <span>{test.duration_minutes} daqiqa</span>
                    </div>
                  </div>
                  
                  {user ? (
                    <Link to={`/test/${test.id}`}>
                      <Button className="w-full group-hover:bg-primary/90">
                        Testni boshlash
                        <ArrowRight className="h-4 w-4 ml-2" />
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
    </Layout>
  );
}
