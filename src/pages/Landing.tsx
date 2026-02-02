import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Layout } from '@/components/layout/Layout';
import { PageTransition } from '@/components/PageTransition';
import { FloatingShapes } from '@/components/ui/FloatingShapes';
import { CheckCircle, BookOpen, Trophy, Clock, TrendingUp, Award, Star, Sparkles, ArrowRight, Users } from 'lucide-react';

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
      <PageTransition>
        {/* Hero Section */}
        <section className="relative min-h-[90vh] flex items-center overflow-hidden section-premium">
          <FloatingShapes />
          
          <div className="container relative py-20 lg:py-28">
            <div className="flex flex-col items-center text-center max-w-4xl mx-auto">
              {/* Badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-accent/30 bg-accent/10 px-5 py-2.5 text-sm font-medium text-accent mb-8 animate-fade-up">
                <Award className="h-4 w-4" />
                <span>O'zbekistonning #1 test platformasi</span>
              </div>
              
              {/* Main Heading */}
              <h1 className="font-serif text-4xl md:text-5xl lg:text-6xl xl:text-7xl font-semibold tracking-tight text-foreground mb-6 animate-fade-up delay-100">
                Imtihonlarga 
                <span className="block mt-2">
                  <span className="gradient-gold">professional</span> darajada
                </span>
                <span className="block mt-2">tayyorlaning</span>
              </h1>
              
              {/* Subtitle */}
              <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mb-10 animate-fade-up delay-200 leading-relaxed">
                MockTest Professional bilan real imtihon sharoitida o'zingizni sinab ko'ring. 
                Minglab savollar, tez natijalar va batafsil tahlil.
              </p>

              {/* CTA Buttons */}
              <div className="flex flex-col sm:flex-row gap-4 animate-fade-up delay-300">
                <Link to="/register">
                  <Button variant="premium" size="xl" className="group">
                    <Sparkles className="h-5 w-5 mr-2 transition-transform group-hover:rotate-12" />
                    Bepul boshlash
                    <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
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
                  <div key={index} className="flex items-center gap-3 hover-lift">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10 dark:bg-primary/20">
                      <stat.icon className="h-6 w-6 text-primary" />
                    </div>
                    <div className="text-left">
                      <p className="text-2xl font-bold text-foreground">{stat.value}</p>
                      <p className="text-sm text-muted-foreground">{stat.label}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Decorative bottom wave */}
          <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-card to-transparent" />
        </section>

        {/* Features Section */}
        <section className="py-24 bg-card relative overflow-hidden">
          <div className="container">
            <div className="text-center mb-16">
              <p className="text-sm font-medium tracking-elegant text-accent uppercase mb-3 animate-fade-up">Imkoniyatlar</p>
              <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-4 animate-fade-up delay-100">
                Nima uchun MockTest Professional?
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto animate-fade-up delay-200">
                Eng zamonaviy platforma sizga muvaffaqiyatli tayyorgarlikni kafolatlaydi
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
              {features.map((feature, index) => (
                <div
                  key={index}
                  className="group card-premium rounded-xl p-8 animate-fade-up"
                  style={{ animationDelay: `${(index + 1) * 100}ms` }}
                >
                  <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-primary/10 text-primary mb-6 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-500 group-hover:scale-110 group-hover:rotate-3">
                    <feature.icon className="h-7 w-7" />
                  </div>
                  <h3 className="font-serif text-xl font-semibold mb-3">{feature.title}</h3>
                  <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 bg-primary text-primary-foreground relative overflow-hidden">
          <FloatingShapes className="opacity-20" />
          
          <div className="container relative text-center">
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-white/10 mb-8 animate-fade-up">
              <Trophy className="h-10 w-10" />
            </div>
            <h2 className="font-serif text-3xl md:text-4xl lg:text-5xl font-semibold mb-6 animate-fade-up delay-100">
              Muvaffaqiyat yo'lini hoziroq boshlang
            </h2>
            <p className="text-primary-foreground/80 max-w-xl mx-auto mb-10 text-lg animate-fade-up delay-200">
              Ro'yxatdan o'ting va birinchi testingizni bepul ishlang. 
              Professional tayyorgarlik sizni kutmoqda.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center animate-fade-up delay-300">
              <Link to="/register">
                <Button variant="gold" size="xl" className="group">
                  Bepul ro'yxatdan o'tish
                  <ArrowRight className="h-5 w-5 ml-2 transition-transform group-hover:translate-x-1" />
                </Button>
              </Link>
              <Link to="/subjects">
                <Button variant="outline" size="xl" className="border-white/30 text-white hover:bg-white/10 hover:text-white">
                  Fanlarni ko'rish
                </Button>
              </Link>
            </div>
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
      </PageTransition>
    </Layout>
  );
}
