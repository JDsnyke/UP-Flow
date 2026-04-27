import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { useTokenGate } from "../../hooks/useTokenGate";
import { fetchAllCategoriesFlat } from "../../lib/up-api/client";
import { Button, Card, EmptyState, Spinner } from "../../components/ui";

export function CategoriesPage() {
  const gate = useTokenGate();
  const q = useQuery({
    queryKey: ["up", "categories", "browse"],
    queryFn: fetchAllCategoriesFlat,
    enabled: gate.data === true,
  });

  if (!gate.data) {
    return (
      <EmptyState
        title="Token required"
        action={
          <Link to="/settings">
            <Button>Settings</Button>
          </Link>
        }
      />
    );
  }

  if (q.isLoading) {
    return (
      <div className="flex h-40 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (q.isError) {
    return (
      <EmptyState
        title="Error"
        detail={q.error instanceof Error ? q.error.message : "Failed"}
      />
    );
  }

  const list = q.data ?? [];
  const leaves = list.filter((c) => c.relationships.children.data.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="mt-1 text-sm text-[var(--up-muted)]">
          From{" "}
          <code className="rounded bg-black/30 px-1">GET /categories</code>.
          Only <strong>leaf</strong> categories can be assigned to transactions.
        </p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <h2 className="font-semibold">All ({list.length})</h2>
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto text-sm">
            {list.map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-2 border-b border-[var(--up-border)]/60 py-2"
              >
                <span>{c.attributes.name}</span>
                <code className="text-xs text-[var(--up-muted)]">{c.id}</code>
              </li>
            ))}
          </ul>
        </Card>
        <Card>
          <h2 className="font-semibold">Leaf (assignable) ({leaves.length})</h2>
          <ul className="mt-3 max-h-[480px] space-y-2 overflow-y-auto text-sm">
            {leaves.map((c) => (
              <li
                key={c.id}
                className="flex justify-between gap-2 border-b border-[var(--up-border)]/60 py-2"
              >
                <span>{c.attributes.name}</span>
                <code className="text-xs text-[var(--up-accent)]">{c.id}</code>
              </li>
            ))}
          </ul>
        </Card>
      </div>
    </div>
  );
}
