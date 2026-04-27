export type Money = {
  currencyCode: string;
  value: string;
  valueInBaseUnits: number;
};

export type AccountType = "SAVER" | "TRANSACTIONAL" | "HOME_LOAN";
export type OwnershipType = "INDIVIDUAL" | "JOINT";

export type AccountResource = {
  type: "accounts";
  id: string;
  attributes: {
    displayName: string;
    accountType: AccountType;
    ownershipType: OwnershipType;
    balance: Money;
    createdAt: string;
  };
  relationships?: {
    transactions?: { links?: { related?: string } };
  };
};

export type TransactionStatus = "HELD" | "SETTLED";

export type TransactionResource = {
  type: "transactions";
  id: string;
  attributes: {
    status: TransactionStatus;
    description: string;
    message: string | null;
    createdAt: string;
    settledAt: string | null;
    amount: Money;
    isCategorizable: boolean;
  };
  relationships: {
    account: { data: { type: string; id: string } };
    category: {
      data: { type: "categories"; id: string } | null;
      links?: { self?: string; related?: string };
    };
    parentCategory: { data: { type: "categories"; id: string } | null };
    tags: {
      data: Array<{ type: "tags"; id: string }>;
      links?: { self?: string };
    };
    attachment: { data: { type: "attachments"; id: string } | null };
  };
};

export type CategoryResource = {
  type: "categories";
  id: string;
  attributes: { name: string };
  relationships: {
    parent: { data: { type: "categories"; id: string } | null };
    children: { data: Array<{ type: "categories"; id: string }> };
  };
};

export type TagResource = {
  type: "tags";
  id: string;
  relationships?: {
    transactions?: { links?: { related?: string } };
  };
};

export type AttachmentResource = {
  type: "attachments";
  id: string;
  attributes: {
    createdAt: string | null;
    fileURL: string | null;
    fileURLExpiresAt: string | null;
    fileExtension: string | null;
    fileContentType: string | null;
  };
  relationships: {
    transaction: {
      data: { type: "transactions"; id: string };
      links?: { related?: string };
    };
  };
};

export type WebhookResource = {
  type: "webhooks";
  id: string;
  attributes: {
    url: string;
    description: string | null;
    secretKey?: string;
    createdAt: string;
  };
  relationships?: {
    logs?: { links?: { related?: string } };
  };
};

export type WebhookDeliveryLogResource = {
  type: "webhook-delivery-logs";
  id: string;
  attributes: {
    request: { body: string };
    response: { statusCode: number; body: string } | null;
    deliveryStatus: string;
    createdAt: string;
  };
  relationships?: {
    webhookEvent?: { data: { type: string; id: string } };
  };
};

export type Paginated<T> = {
  data: T[];
  links?: {
    prev: string | null;
    next: string | null;
  };
};

export type UpErrorPayload = {
  errors?: Array<{
    status?: string;
    title?: string;
    detail?: string;
  }>;
};
