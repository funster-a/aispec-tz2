import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

export interface DailyMetric {
  date: string;
  count: number;
  revenue: number;
}

export async function GET() {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseKey = process.env.SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json(
      { error: 'Supabase env vars not configured.' },
      { status: 503 }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey);

  try {
    const { data, error } = await supabase
      .from('orders')
      .select('created_at, total')
      .order('created_at', { ascending: true });

    if (error) throw error;

    // Group by calendar day (YYYY-MM-DD)
    const grouped: Record<string, { count: number; revenue: number }> = {};

    for (const row of data ?? []) {
      if (!row.created_at) continue;
      const day = (row.created_at as string).slice(0, 10); // "YYYY-MM-DD"
      if (!grouped[day]) grouped[day] = { count: 0, revenue: 0 };
      grouped[day].count += 1;
      grouped[day].revenue += Number(row.total ?? 0);
    }

    const result: DailyMetric[] = Object.entries(grouped).map(([date, v]) => ({
      date,
      count: v.count,
      revenue: Math.round(v.revenue),
    }));

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
