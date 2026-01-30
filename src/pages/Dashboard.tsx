import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { SUBJECTS, getSubjectById } from '@/lib/constants';
import { BookOpen, Trophy, Clock, TrendingUp, ArrowRight, LayoutDashboard } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

interface TestAttempt {
  id: string;
  test_id: string;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number | null;
  time_spent_seconds: number | null;
  tests: {
    title: string;
    subject: string;
  };
}

interface Stats {
  totalTests: number;
  avgScore: number;
  totalTime: number;
  recentAttempts: TestAttempt[];
}

export default function Dashboard() {
  const { user, profile, isAdmin } = useAuth();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchStats();
    }
  }, [user]);

  const fetchStats = async () => {
    const { data: attempts, error } = await supabase
      .from('test_attempts')
      .select(`
        id,
        test_id,
        started_at,
        completed_at,
        score,
        total_questions,
        time_spent_seconds,
        tests (
          title,
          subject
        )
      `)
      .eq('user_id', user!.id)
      .not('completed_at', 'is', null)
      .order('completed_at', { ascending: false })
      .limit(5);

    if (!error && attempts) {
      const completedAttempts = attempts as unknown as TestAttempt[];
      const totalTests = completedAttempts.length;
      const avgScore = totalTests > 0
        ? completedAttempts.reduce((acc, a) => acc + ((a.score || 0) / (a.total_questions || 1) * 100), 0) / totalTests
        : 0;
      const totalTime = completedAttempts.reduce((acc, a) => acc + (a.time_spent_seconds || 0), 0);

      setStats({
        totalTests,
        avgScore: Math.round(avgScore),
        totalTime,
        recentAttempts: completedAttempts,
      });
    }
    setLoading(false);
  };

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    if (hours > 0) {
      return `${hours} soat ${minutes} daqiqa`;
    }
    return `${minutes} daqiqa`;
  };

  return (
    <Layout>
      <div className="container py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="font-display text-3xl font-bold mb-2">
            Xush kelibsiz, {profile?.full_name?.split(' ')[0]}! 👋
          </h1>
          <p className="text-muted-foreground">
            Bugungi testlaringizni ko'rib chiqing va yangi bilimlar oling
          </p>
        </div>

        {/* Admin Quick Access */}
        {isAdmin && (
          <Card className="mb-8 border-primary/20 bg-primary/5">
            <CardContent className="flex items-center justify-between p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <LayoutDashboard className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <h3 className="font-semibold">Admin Panel</h3>
                  <p className="text-sm text-muted-foreground">Testlarni boshqarish va yangilarini qo'shish</p>
                </div>
              </div>
              <Link to="/admin">
                <Button variant="default">
                  Admin panelga o'tish
                  <ArrowRight className="h-4 w-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        )}

        {/* Stats Cards */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-primary/10">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Ishlangan testlar</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.totalTests || 0}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-success/10">
                  <Trophy className="h-6 w-6 text-success" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">O'rtacha ball</p>
                  {loading ? (
                    <Skeleton className="h-8 w-16 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{stats?.avgScore || 0}%</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-warning/10">
                  <Clock className="h-6 w-6 text-warning" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Umumiy vaqt</p>
                  {loading ? (
                    <Skeleton className="h-8 w-24 mt-1" />
                  ) : (
                    <p className="text-2xl font-bold">{formatTime(stats?.totalTime || 0)}</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <div className="p-3 rounded-xl bg-info/10">
                  <TrendingUp className="h-6 w-6 text-info" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Reyting</p>
                  <Link to="/leaderboard" className="text-primary text-sm hover:underline">
                    Ko'rish →
                  </Link>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Recent Tests */}
          <div className="lg:col-span-2">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Oxirgi natijalar</CardTitle>
                <Link to="/profile">
                  <Button variant="ghost" size="sm">
                    Barchasini ko'rish
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
                        <Skeleton className="h-12 w-12 rounded-lg" />
                        <div className="flex-1">
                          <Skeleton className="h-5 w-32 mb-2" />
                          <Skeleton className="h-4 w-24" />
                        </div>
                        <Skeleton className="h-8 w-16" />
                      </div>
                    ))}
                  </div>
                ) : stats?.recentAttempts.length === 0 ? (
                  <div className="text-center py-12">
                    <BookOpen className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <h3 className="font-semibold mb-2">Hali test ishlamagansiz</h3>
                    <p className="text-sm text-muted-foreground mb-4">
                      Birinchi testingizni boshlang va natijalaringizni bu yerda ko'ring
                    </p>
                    <Link to="/subjects">
                      <Button variant="gradient">Testni boshlash</Button>
                    </Link>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {stats?.recentAttempts.map((attempt) => {
                      const subject = getSubjectById(attempt.tests.subject);
                      const percentage = attempt.total_questions 
                        ? Math.round((attempt.score || 0) / attempt.total_questions * 100)
                        : 0;
                      
                      return (
                        <div key={attempt.id} className="flex items-center gap-4 p-4 rounded-lg border hover:bg-muted/50 transition-colors">
                          <div className="text-3xl">{subject?.icon}</div>
                          <div className="flex-1 min-w-0">
                            <h4 className="font-medium truncate">{attempt.tests.title}</h4>
                            <p className="text-sm text-muted-foreground">
                              {subject?.name} • {new Date(attempt.completed_at!).toLocaleDateString('uz-UZ')}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="text-lg font-bold">{percentage}%</p>
                            <p className="text-xs text-muted-foreground">
                              {attempt.score}/{attempt.total_questions}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Quick Actions */}
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Tez test boshlash</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {SUBJECTS.map((subject) => (
                  <Link key={subject.id} to={`/subjects/${subject.id}`}>
                    <div className="flex items-center gap-3 p-3 rounded-lg border hover:bg-muted/50 hover:border-primary/30 transition-all cursor-pointer">
                      <span className="text-2xl">{subject.icon}</span>
                      <span className="font-medium">{subject.name}</span>
                      <ArrowRight className="h-4 w-4 ml-auto text-muted-foreground" />
                    </div>
                  </Link>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}
