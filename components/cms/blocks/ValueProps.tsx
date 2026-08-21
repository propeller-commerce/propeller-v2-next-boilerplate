import { Card, CardContent } from '@/components/ui/Card';
import type { CmsValueProps } from '@/lib/cms/types';

export default function ValueProps({ block }: { block: CmsValueProps }) {
  return (
    <section className="py-16 border-b border-border/60 bg-slate-50/30">
      <div className="container-width">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {block.items.map((item, i) => (
            <Card key={i} className="border-none shadow-none bg-transparent">
              <CardContent className="flex items-center gap-4 pt-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-2xl shadow-sm text-primary">
                  {item.icon}
                </div>
                <div>
                  <h3 className="font-semibold text-lg">{item.title}</h3>
                  <p className="text-sm text-muted-foreground">{item.text}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
}
