"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from "recharts";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";

type ChartDatum = Record<string, string | number>;

interface StudyChartProps {
  title: string;
  description: string;
  data: ChartDatum[];
  dataKey: string;
  kind?: "area" | "bar";
  emptyTitle?: string;
  emptyDescription?: string;
}

export function StudyChart({
  title,
  description,
  data,
  dataKey,
  kind = "area",
  emptyTitle = "No study data yet",
  emptyDescription = "Start a timer and save a session to see this chart fill in."
}: StudyChartProps) {
  const hasData = data.some((item) => Number(item[dataKey] ?? 0) > 0);

  if (!hasData) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <Card className="p-6">
      <div className="mb-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={data}>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value.toFixed(1)}h`}
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, "Average"]}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))"
                }}
              />
              <Bar dataKey={dataKey} fill="hsl(var(--chart-secondary))" radius={[18, 18, 0, 0]} />
            </BarChart>
          ) : (
            <AreaChart data={data}>
              <defs>
                <linearGradient id={`fill-${dataKey}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis dataKey="label" tickLine={false} axisLine={false} tickMargin={10} />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickFormatter={(value: number) => `${value.toFixed(1)}h`}
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [`${value.toFixed(1)}h`, "Study time"]}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))"
                }}
              />
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke="hsl(var(--chart-primary))"
                strokeWidth={2.5}
                fill={`url(#fill-${dataKey})`}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
