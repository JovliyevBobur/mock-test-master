import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { CosmicBackground } from '@/components/ui/CosmicBackground';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { getSubjectById, SUBJECTS } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Input } from '@/components/ui/input';
import { Clock, FileQuestion, ArrowRight, ArrowLeft, Sparkles, Search, Lock, BookOpen, Users, Award, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const navigate = useNavigate();
  const [tests, setTests] = useState<Test[]>([]);
  const [loading, setLoading] = useState(true);
  const [testCounts, setTestCounts] = useState<Record<string, number>>({});
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({ totalTests: 0, totalUsers: 0, totalAttempts: 0 });

  const subject = subjectId ? getSubjectById(subjectId) : null;

  useEffect(() => {
    if (subjectId) {
      fetchTests();
    } else {
      fetchTestCounts();
      fetchStats();
    }
  }, [subjectId]);

  const fetchStats = async () => {
    const [testsRes, usersRes, attemptsRes] = await Promise.all([
      supabase.from('tests').select('*', { count: 'exact', head: true }).eq('is_published', true),
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('test_attempts').select('*', { count: 'exact', head: true }).not('completed_at', 'is', null),
    ]);

    setStats({
      totalTests: testsRes.count || 0,
      totalUsers: usersRes.count || 0,
      totalAttempts: attemptsRes.count || 0,
    });
  };

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

  const filteredSubjects = SUBJECTS.filter(sub => 
    sub.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartTest = (testId: string) => {
    if (!user) {
      navigate('/login', { state: { from: { pathname: `/test/${testId}` } } });
      return;
    }
    navigate(`/test/${testId}`);
  };

  // Subject list view - Main Subjects Panel
  if (!subjectId) {
    return (
      <Layout>
        <CosmicBackground />
        <PageTransition>
          <div className="relative min-h-[90vh] overflow-hidden">
            <div className="container relative py-12">
              {/* Header Section */}
              <div className="text-center mb-12">
                <div className="inline-flex items-center gap-2 rounded-full bg-accent/20 border border-accent/30 px-5 py-2.5 text-sm font-medium text-accent mb-6 animate-fade-up backdrop-blur-sm">
                  <BookOpen className="h-4 w-4" />
                  <span>Fanlar markazi</span>
                </div>
                <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-bold mb-6 animate-fade-up delay-100">
                  O'zingizga kerakli 
                  <span className="text-gradient-gold"> fanni</span> tanlang
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto animate-fade-up delay-200">
                  {SUBJECTS.length} ta fan bo'yicha professional testlar. Test ishlash uchun ro'yxatdan o'tishingiz kerak.
                </p>
              </div>

              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4 max-w-2xl mx-auto mb-12 animate-fade-up delay-300">
                {[
                  { icon: BookOpen, value: stats.totalTests, label: 'Testlar' },
                  { icon: Users, value: stats.totalUsers, label: 'Foydalanuvchilar' },
                  { icon: TrendingUp, value: stats.totalAttempts, label: 'Urinishlar' },
                ].map((stat, idx) => (
                  <Card key={idx} className="card-premium text-center">
                    <CardContent className="p-4">
                      <stat.icon className="h-6 w-6 text-accent mx-auto mb-2" />
                      <p className="font-serif text-2xl font-bold">{stat.value}</p>
                      <p className="text-xs text-muted-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>

              {/* Search */}
              <div className="max-w-md mx-auto mb-10 animate-fade-up delay-400">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input 
                    placeholder="Fan nomini qidirish..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="h-12 pl-12 rounded-xl border-2 focus:border-primary"
                  />
                </div>
              </div>

              {/* Auth Warning */}
              {!user && (
                <div className="max-w-2xl mx-auto mb-10 animate-fade-up delay-500">
                  <Card className="border-2 border-accent/30 bg-accent/5">
                    <CardContent className="p-6">
                      <div className="flex items-start gap-4">
                        <div className="p-3 rounded-xl bg-accent/10">
                          <Lock className="h-6 w-6 text-accent" />
                        </div>
                        <div className="flex-1">
                          <h3 className="font-serif text-lg font-semibold mb-1">Test ishlash uchun ro'yxatdan o'ting</h3>
                          <p className="text-muted-foreground text-sm mb-4">
                            Fanlarni ko'rishingiz mumkin, lekin test ishlash uchun tizimga kirishingiz kerak.
                          </p>
                          <div className="flex gap-3">
                            <Link to="/register">
                              <Button variant="premium" size="sm">
                                <Sparkles className="h-4 w-4 mr-2" />
                                Ro'yxatdan o'tish
                              </Button>
                            </Link>
                            <Link to="/login">
                              <Button variant="outline" size="sm">
                                Kirish
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {/* Subject Grid */}
              {loading ? (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <Card key={i} className="border-2">
                      <CardContent className="p-8">
                        <Skeleton className="h-20 w-20 rounded-2xl mx-auto mb-4" />
                        <Skeleton className="h-6 w-32 mx-auto mb-2" />
                        <Skeleton className="h-4 w-24 mx-auto" />
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : filteredSubjects.length === 0 ? (
                <Card className="text-center py-16 card-premium">
                  <CardContent>
                    <Search className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <h3 className="font-serif text-xl font-semibold mb-2">Natija topilmadi</h3>
                    <p className="text-muted-foreground">"{searchQuery}" bo'yicha fan topilmadi</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {filteredSubjects.map((sub, index) => (
                    <Link 
                      key={sub.id} 
                      to={`/subjects/${sub.id}`}
                      className="animate-fade-up"
                      style={{ animationDelay: `${(index + 5) * 100}ms` }}
                    >
                      <Card className={cn(
                        "group card-premium rounded-2xl overflow-hidden cursor-pointer h-full",
                        "hover:border-accent/50 transition-all duration-500"
                      )}>
                        <CardContent className="p-8 text-center">
                          <div className="flex items-center justify-center w-24 h-24 rounded-2xl bg-primary/10 mx-auto mb-6 text-6xl transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 group-hover:bg-primary/20">
                            {sub.icon}
                          </div>
                          <h3 className="font-serif text-2xl font-semibold mb-2">{sub.name}</h3>
                          <p className="text-muted-foreground mb-4">
                            {testCounts[sub.id] || 0} ta test mavjud
                          </p>
                          <div className="flex items-center justify-center gap-2 text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            <span>Testlarni ko'rish</span>
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
      <CosmicBackground />
      <PageTransition>
        <div className="relative min-h-[80vh] overflow-hidden">
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

            {/* Auth Warning in Subject Detail */}
            {!user && (
              <Card className="border-2 border-accent/30 bg-accent/5 mb-8 animate-fade-up delay-100">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="p-3 rounded-xl bg-accent/10">
                        <Lock className="h-6 w-6 text-accent" />
                      </div>
                      <div>
                        <h3 className="font-serif text-lg font-semibold">Test ishlash uchun ro'yxatdan o'ting</h3>
                        <p className="text-muted-foreground text-sm">
                          Testlarni ko'rishingiz mumkin, lekin ishlash uchun tizimga kirishingiz kerak.
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <Link to="/register">
                        <Button variant="premium">
                          <Sparkles className="h-4 w-4 mr-2" />
                          Ro'yxatdan o'tish
                        </Button>
                      </Link>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

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
                    style={{ animationDelay: `${(index + 2) * 100}ms` }}
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
                      
                      <Button 
                        className="w-full group/btn" 
                        variant={user ? "premium" : "outline"}
                        onClick={() => handleStartTest(test.id)}
                      >
                        {user ? (
                          <>
                            <Sparkles className="h-4 w-4 mr-2 transition-transform group-hover/btn:rotate-12" />
                            Testni boshlash
                          </>
                        ) : (
                          <>
                            <Lock className="h-4 w-4 mr-2" />
                            Kirish kerak
                          </>
                        )}
                      </Button>
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
