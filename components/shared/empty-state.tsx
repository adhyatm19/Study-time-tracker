import { Card, CardDescription, CardTitle } from "@/components/shared/card";

export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <Card className="flex min-h-52 flex-col items-center justify-center border-dashed text-center">
      <CardTitle>{title}</CardTitle>
      <CardDescription className="mt-3 max-w-sm">{description}</CardDescription>
    </Card>
  );
}
