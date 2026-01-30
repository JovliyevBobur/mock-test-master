import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { SubjectCard } from '@/components/SubjectCard';
import { SUBJECTS } from '@/lib/constants';
import { CheckCircle, BookOpen, Trophy, Clock, Users, TrendingUp } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: BookOpen,
      title: "6 ta fan bo'yicha testlar",
      description: "Matematika, Fizika, Ingliz tili, Tarix, Rus tili va Ona tili bo'yicha testlar",
    },
    {
      icon: Clock,
      title: "Vaqt cheklovi",
      description: "Har bir test uchun vaqt belgilangan - haqiqiy imtihonga tayyorgarlik",
    },
    {
      icon: Trophy,
      title: "Reyting jadvali",
      description: "O'z natijalaringizni boshqalar bilan solishtiring va g'olib bo'ling",
    },
    {
      icon: TrendingUp,
      title: "Statistika",
      description: "O'z rivojlanishingizni kuzatib boring va zaif tomonlaringizni aniqlang",
    },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 gradient-hero opacity-10" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,hsl(var(--primary)/0.1),transparent_50%)]" />
        
        <div className="container relative py-24 md:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary mb-8 animate-fade-in">
              <CheckCircle className="h-4 w-4" />
              <span>O'zbekiston bo'ylab 10,000+ foydalanuvchi</span>
            </div>
            
            <h1 className="font-display text-4xl md:text-6xl lg:text-7xl font-bold tracking-tight mb-6 animate-fade-in">
              Imtihonlarga 
              <span className="gradient-text"> professional </span>
              darajada tayyorlaning
            </h1>
            
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-in">
              MockTest Pro bilan real imtihon sharoitida o'zingizni sinab ko'ring. 
              6 ta fan, minglab savollar, va tez natijalar bilan muvaffaqiyatga erishing.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 animate-fade-in">
              <Link to="/register">
                <Button variant="gradient" size="xl" className="w-full sm:w-auto">
                  Bepul boshlash
                </Button>
              </Link>
              <Link to="/subjects">
                <Button variant="outline" size="xl" className="w-full sm:w-auto">
                  Fanlarni ko'rish
                </Button>
              </Link>
            </div>

            <div className="flex items-center gap-8 mt-12 text-sm text-muted-foreground">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                <span>10,000+ foydalanuvchi</span>
              </div>
              <div className="flex items-center gap-2">
                <BookOpen className="h-5 w-5 text-primary" />
                <span>5,000+ savollar</span>
              </div>
              <div className="flex items-center gap-2">
                <Trophy className="h-5 w-5 text-primary" />
                <span>98% mamnuniyat</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-muted/30">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Nima uchun MockTest Pro?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Eng zamonaviy texnologiyalar bilan qurilgan platforma sizga eng yaxshi natijalarni kafolatlaydi
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group bg-card rounded-2xl p-6 shadow-sm border border-border/50 hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-display text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="py-20">
        <div className="container">
          <div className="text-center mb-16">
            <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
              Barcha fanlar bir joyda
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              O'zingizga kerakli fanni tanlang va darhol testni boshlang
            </p>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {SUBJECTS.map((subject) => (
              <SubjectCard
                key={subject.id}
                id={subject.id}
                name={subject.name}
                icon={subject.icon}
              />
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary text-primary-foreground">
        <div className="container text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold mb-4">
            Hoziroq boshlang!
          </h2>
          <p className="text-primary-foreground/80 max-w-2xl mx-auto mb-8">
            Ro'yxatdan o'ting va birinchi testingizni bepul ishlang. 
            Muvaffaqiyat yo'lida birinchi qadamni qo'ying.
          </p>
          <Link to="/register">
            <Button size="xl" variant="secondary" className="font-bold">
              Bepul ro'yxatdan o'tish
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 border-t">
        <div className="container flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 font-display font-bold">
            <BookOpen className="h-5 w-5 text-primary" />
            <span>MockTest Pro</span>
          </div>
          <p className="text-sm text-muted-foreground">
            © 2024 MockTest Pro. Barcha huquqlar himoyalangan.
          </p>
        </div>
      </footer>
    </Layout>
  );
}
