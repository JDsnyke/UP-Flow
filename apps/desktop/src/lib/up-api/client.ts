import { upApiRequest } from "./invoke";
import type {
  AccountResource,
  AttachmentResource,
  CategoryResource,
  Paginated,
  TagResource,
  TransactionResource,
  WebhookDeliveryLogResource,
  WebhookResource,
} from "./types";
import { parseUpJson, splitUpPaginationUrl } from "./parse";

const MAX_AUTO_PAGES = 40;

export async function fetchAccounts(): Promise<AccountResource[]> {
  const res = await upApiRequest("GET", "/accounts", {
    query: { "page[size]": "100" },
  });
  const page = parseUpJson<Paginated<AccountResource>>(res);
  return page.data;
}

export async function fetchAccount(id: string): Promise<AccountResource> {
  const res = await upApiRequest("GET", `/accounts/${id}`);
  const body = parseUpJson<{ data: AccountResource }>(res);
  return body.data;
}

export async function fetchTransactionsPage(
  query: Record<string, string>,
): Promise<Paginated<TransactionResource>> {
  const res = await upApiRequest("GET", "/transactions", { query });
  return parseUpJson<Paginated<TransactionResource>>(res);
}

export async function fetchAccountTransactionsPage(
  accountId: string,
  query: Record<string, string>,
): Promise<Paginated<TransactionResource>> {
  const res = await upApiRequest("GET", `/accounts/${accountId}/transactions`, {
    query,
  });
  return parseUpJson<Paginated<TransactionResource>>(res);
}

export async function fetchTransaction(id: string): Promise<TransactionResource> {
  const res = await upApiRequest("GET", `/transactions/${id}`);
  const body = parseUpJson<{ data: TransactionResource }>(res);
  return body.data;
}

export async function fetchAllTransactionsByNext(
  initialQuery: Record<string, string>,
  maxPages = MAX_AUTO_PAGES,
): Promise<TransactionResource[]> {
  const out: TransactionResource[] = [];
  let nextQuery: Record<string, string> | null = { ...initialQuery };
  let pages = 0;

  while (nextQuery !== null && pages < maxPages) {
    const page = await fetchTransactionsPage(nextQuery);
    out.push(...page.data);
    const nextUrl = page.links?.next;
    if (!nextUrl) {
      nextQuery = null;
    } else {
      const { path, query } = splitUpPaginationUrl(nextUrl);
      if (path !== "/transactions") {
        throw new Error("Unexpected next link for transactions");
      }
      nextQuery = Object.fromEntries(new URLSearchParams(query ?? ""));
    }
    pages += 1;
  }

  return out;
}

export async function fetchCategories(
  parentId?: string,
): Promise<CategoryResource[]> {
  const res = await upApiRequest(
    "GET",
    "/categories",
    parentId ? { query: { "filter[parent]": parentId } } : undefined,
  );
  const body = parseUpJson<{ data: CategoryResource[] }>(res);
  return body.data;
}

/** Walk the category tree (Up returns child ids on each node). */
export async function fetchAllCategoriesFlat(): Promise<CategoryResource[]> {
  const seeds = await fetchCategories();
  const out: CategoryResource[] = [];
  const queue = [...seeds];
  while (queue.length > 0) {
    const c = queue.shift()!;
    out.push(c);
    for (const k of c.relationships.children.data) {
      const sub = await fetchCategories(k.id);
      queue.push(...sub);
    }
  }
  return out;
}

export function leafCategories(all: CategoryResource[]): CategoryResource[] {
  return all.filter((c) => c.relationships.children.data.length === 0);
}

export async function fetchTagsPage(
  query: Record<string, string>,
): Promise<Paginated<TagResource>> {
  const res = await upApiRequest("GET", "/tags", { query });
  return parseUpJson<Paginated<TagResource>>(res);
}

export async function fetchAttachmentsPage(
  query: Record<string, string>,
): Promise<Paginated<AttachmentResource>> {
  const res = await upApiRequest("GET", "/attachments", { query });
  return parseUpJson<Paginated<AttachmentResource>>(res);
}

export async function fetchAttachment(id: string): Promise<AttachmentResource> {
  const res = await upApiRequest("GET", `/attachments/${id}`);
  const body = parseUpJson<{ data: AttachmentResource }>(res);
  return body.data;
}

export async function fetchWebhooksPage(
  query: Record<string, string>,
): Promise<Paginated<WebhookResource>> {
  const res = await upApiRequest("GET", "/webhooks", { query });
  return parseUpJson<Paginated<WebhookResource>>(res);
}

export async function createWebhook(input: {
  url: string;
  description?: string | null;
}): Promise<WebhookResource> {
  const res = await upApiRequest("POST", "/webhooks", {
    body: {
      data: {
        attributes: {
          url: input.url,
          description: input.description ?? null,
        },
      },
    },
  });
  const body = parseUpJson<{ data: WebhookResource }>(res);
  return body.data;
}

export async function deleteWebhook(id: string): Promise<void> {
  const res = await upApiRequest("DELETE", `/webhooks/${id}`);
  if (res.status !== 204 && !(res.status >= 200 && res.status < 300)) {
    parseUpJson(res);
  }
}

export async function pingWebhook(id: string): Promise<unknown> {
  const res = await upApiRequest("POST", `/webhooks/${id}/ping`);
  return parseUpJson(res);
}

export async function fetchWebhookLogsPage(
  webhookId: string,
  query: Record<string, string>,
): Promise<Paginated<WebhookDeliveryLogResource>> {
  const res = await upApiRequest("GET", `/webhooks/${webhookId}/logs`, {
    query,
  });
  return parseUpJson<Paginated<WebhookDeliveryLogResource>>(res);
}

export async function setTransactionCategory(
  transactionId: string,
  categoryId: string | null,
): Promise<void> {
  const res = await upApiRequest(
    "PATCH",
    `/transactions/${transactionId}/relationships/category`,
    {
      body:
        categoryId === null
          ? { data: null }
          : { data: { type: "categories", id: categoryId } },
    },
  );
  if (res.status !== 204 && !(res.status >= 200 && res.status < 300)) {
    parseUpJson(res);
  }
}

export async function addTransactionTags(
  transactionId: string,
  tagIds: string[],
): Promise<void> {
  const res = await upApiRequest(
    "POST",
    `/transactions/${transactionId}/relationships/tags`,
    {
      body: {
        data: tagIds.map((id) => ({ type: "tags", id })),
      },
    },
  );
  if (res.status !== 204 && !(res.status >= 200 && res.status < 300)) {
    parseUpJson(res);
  }
}

export async function removeTransactionTags(
  transactionId: string,
  tagIds: string[],
): Promise<void> {
  const res = await upApiRequest(
    "DELETE",
    `/transactions/${transactionId}/relationships/tags`,
    {
      body: {
        data: tagIds.map((id) => ({ type: "tags", id })),
      },
    },
  );
  if (res.status !== 204 && !(res.status >= 200 && res.status < 300)) {
    parseUpJson(res);
  }
}
