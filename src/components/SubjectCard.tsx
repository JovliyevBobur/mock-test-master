import { Link } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { getSubjectBorderColor } from '@/lib/constants';
import { cn } from '@/lib/utils';

interface SubjectCardProps {
  id: string;
  name: string;
  icon: string;
  testCount?: number;
}

export function SubjectCard({ id, name, icon, testCount = 0 }: SubjectCardProps) {
  return (
    <Link to={`/subjects/${id}`}>
      <Card className={cn(
        "group relative overflow-hidden border-2 transition-all duration-300 hover:shadow-xl hover:-translate-y-2 cursor-pointer",
        getSubjectBorderColor(id)
      )}>
        <div className="absolute inset-0 bg-gradient-to-br from-transparent to-black/5 opacity-0 group-hover:opacity-100 transition-opacity" />
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
            {icon}
          </div>
          <h3 className="font-display text-xl font-bold mb-2">{name}</h3>
          <p className="text-sm text-muted-foreground">
            {testCount} ta test mavjud
          </p>
        </CardContent>
      </Card>
    </Link>
  );
}
