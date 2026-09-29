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

import { useId } from "react";

import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardDescription, CardTitle } from "@/components/shared/card";
import { formatDuration } from "@/lib/utils";

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
  const gradientId = useId().replace(/:/g, "");
  const maxHours = Math.max(0, ...data.map((item) => Number(item[dataKey] ?? 0)));
  const axisMultiplier = maxHours < 1 / 60 ? 3600 : maxHours < 1 ? 60 : 1;
  const axisUnit = maxHours < 1 / 60 ? "s" : maxHours < 1 ? "m" : "h";
  const axisLabel = (value: number) => `${Number((value * axisMultiplier).toFixed(1))}${axisUnit}`;
  const hasData = data.some((item) => Number(item[dataKey] ?? 0) > 0);
  const formatTooltipDuration = (value: number) => formatDuration(Math.round(value * 3600));

  if (!hasData) {
    return <EmptyState title={`${title}: ${emptyTitle.toLowerCase()}`} description={emptyDescription} />;
  }

  return (
    <Card className="rounded-[1.35rem] p-6">
      <div className="mb-6">
        <CardTitle>{title}</CardTitle>
        <CardDescription className="mt-2">{description}</CardDescription>
      </div>

      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {kind === "bar" ? (
            <BarChart data={data} accessibilityLayer>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={axisLabel}
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [formatTooltipDuration(value), "Average"]}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))"
                }}
              />
              <Bar
                isAnimationActive={false}
                dataKey={dataKey}
                fill="hsl(var(--chart-secondary))"
                radius={[18, 18, 0, 0]}
              />
            </BarChart>
          ) : (
            <AreaChart data={data} accessibilityLayer>
              <defs>
                <linearGradient id={`fill-${gradientId}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.36} />
                  <stop offset="95%" stopColor="hsl(var(--chart-primary))" stopOpacity={0.04} />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="hsl(var(--chart-grid))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
              />
              <YAxis
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                tickFormatter={axisLabel}
                width={56}
              />
              <Tooltip
                formatter={(value: number) => [formatTooltipDuration(value), "Study time"]}
                contentStyle={{
                  borderRadius: "1rem",
                  border: "1px solid hsl(var(--border))",
                  background: "hsl(var(--card))"
                }}
              />
              <Area
                isAnimationActive={false}
                type="monotone"
                dataKey={dataKey}
                stroke="hsl(var(--chart-primary))"
                strokeWidth={2.5}
                fill={`url(#fill-${gradientId})`}
              />
            </AreaChart>
          )}
        </ResponsiveContainer>
      </div>
      <details className="mt-4 text-sm">
        <summary className="cursor-pointer text-muted-foreground">View data as a table</summary>
        <div className="mt-3 max-h-64 overflow-auto">
          <table className="w-full text-left">
            <caption className="sr-only">{title}</caption>
            <thead>
              <tr>
                <th scope="col" className="p-2">
                  Period
                </th>
                <th scope="col" className="p-2">
                  {kind === "bar" ? "Average per day" : "Study time"}
                </th>
              </tr>
            </thead>
            <tbody>
              {data.map((row, index) => (
                <tr key={index}>
                  <th scope="row" className="p-2 font-normal">
                    {row.label}
                  </th>
                  <td className="p-2">{formatTooltipDuration(Number(row[dataKey]))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Card>
  );
}
