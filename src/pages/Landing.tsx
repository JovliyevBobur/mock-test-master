import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { SubjectCard } from '@/components/SubjectCard';
import { SUBJECTS } from '@/lib/constants';
import { CheckCircle, BookOpen, Trophy, Clock, Users, TrendingUp, Award, Star, Sparkles } from 'lucide-react';

export default function Landing() {
  const features = [
    {
      icon: BookOpen,
      title: "Professional testlar",
      description: "6 ta fan bo'yicha mutaxassislar tomonidan tayyorlangan testlar",
    },
    {
      icon: Clock,
      title: "Real vaqt cheklovi",
      description: "Haqiqiy imtihon sharoitida o'zingizni sinab ko'ring",
    },
    {
      icon: Trophy,
      title: "Reyting tizimi",
      description: "O'z natijalaringizni kuzating va raqobatda g'olib bo'ling",
    },
    {
      icon: TrendingUp,
      title: "Batafsil tahlil",
      description: "Har bir javobingiz uchun tushuntirishlar va statistika",
    },
  ];

  const stats = [
    { value: "10,000+", label: "Foydalanuvchilar", icon: Users },
    { value: "5,000+", label: "Savollar", icon: BookOpen },
    { value: "98%", label: "Mamnuniyat", icon: Star },
  ];

  return (
    <Layout>
      {/* Hero Section */}
      <section className="relative overflow-hidden section-premium">
        {/* Decorative Elements */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-primary/5 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
        </div>
        
        <div className="container relative py-24 lg:py-32">
          <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-5 py-2 text-sm font-medium text-accent mb-8 animate-fade-up">
              <Award className="h-4 w-4" />
              <span>O'zbekistonning #1 test platformasi</span>
            </div>
            
            {/* Main Heading */}
            <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 animate-fade-up delay-100 text-balance">
              Imtihonlarga 
              <span className="block mt-2">
                <span className="gradient-gold">professional</span> darajada tayyorlaning
              </span>
            </h1>
            
            {/* Subtitle */}
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-up delay-200 leading-relaxed">
              MockTest Professional bilan real imtihon sharoitida o'zingizni sinab ko'ring. 
              Minglab savollar, tez natijalar va batafsil tahlil.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
              <Link to="/register">
                <Button variant="premium" size="xl">
                  <Sparkles className="h-5 w-5 mr-2" />
                  Bepul boshlash
                </Button>
              </Link>
              <Link to="/subjects">
                <Button variant="outline" size="xl">
                  Fanlarni ko'rish
                </Button>
              </Link>
            </div>

            {/* Stats */}
            <div className="flex flex-wrap items-center justify-center gap-8 md:gap-12 mt-16 pt-8 border-t border-border/60 animate-fade-up delay-400">
              {stats.map((stat, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary/10">
                    <stat.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="text-left">
                    <p className="text-xl font-semibold text-foreground">{stat.value}</p>
                    <p className="text-sm text-muted-foreground">{stat.label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-card border-y border-border/60">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-sm font-medium tracking-elegant text-accent uppercase mb-3">Imkoniyatlar</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
              Nima uchun MockTest Professional?
            </h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Eng zamonaviy platforma sizga muvaffaqiyatli tayyorgarlikni kafolatlaydi
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, index) => (
              <div
                key={index}
                className="group card-premium rounded-lg p-6"
              >
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-md bg-primary/10 text-primary mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors duration-300">
                  <feature.icon className="h-6 w-6" />
                </div>
                <h3 className="font-serif text-lg font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Subjects Section */}
      <section className="py-24 section-premium">
        <div className="container">
          <div className="text-center mb-16">
            <p className="text-sm font-medium tracking-elegant text-accent uppercase mb-3">Fanlar</p>
            <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
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
      <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-0 left-1/4 w-96 h-96 bg-white rounded-full blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-72 h-72 bg-white rounded-full blur-3xl" />
        </div>
        
        <div className="container relative text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/10 mb-6">
            <Trophy className="h-8 w-8" />
          </div>
          <h2 className="font-serif text-3xl md:text-4xl font-semibold mb-4">
            Muvaffaqiyat yo'lini hoziroq boshlang
          </h2>
          <p className="text-primary-foreground/80 max-w-xl mx-auto mb-8 text-lg">
            Ro'yxatdan o'ting va birinchi testingizni bepul ishlang. 
            Professional tayyorgarlik sizni kutmoqda.
          </p>
          <Link to="/register">
            <Button variant="gold" size="xl">
              Bepul ro'yxatdan o'tish
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 bg-card border-t border-border/60">
        <div className="container">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-primary text-primary-foreground">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="flex flex-col">
                <span className="font-serif text-lg font-semibold">MockTest</span>
                <span className="text-[10px] tracking-elegant text-accent font-medium uppercase">Professional</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link to="/subjects" className="hover:text-foreground transition-colors">Fanlar</Link>
              <Link to="/leaderboard" className="hover:text-foreground transition-colors">Reyting</Link>
            </div>
            
            <p className="text-sm text-muted-foreground">
              © 2024 MockTest Professional. Barcha huquqlar himoyalangan.
            </p>
          </div>
        </div>
      </footer>
    </Layout>
  );
}
