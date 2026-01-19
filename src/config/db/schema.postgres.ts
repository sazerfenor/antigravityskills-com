import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
} from 'drizzle-orm/pg-core';

export const user = pgTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: boolean('email_verified').default(false).notNull(),
    image: text('image'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    // 虚拟作者相关字段
    isVirtual: boolean('is_virtual').default(false).notNull(),
    bio: text('bio'), // 虚拟作者简介
    originalTwitterHandle: text('original_twitter_handle'), // 原始 Twitter 用户名
    originalTwitterUrl: text('original_twitter_url'), // 原始 Twitter 链接
    // 关注系统计数字段
    followerCount: integer('follower_count').default(0).notNull(),
    followingCount: integer('following_count').default(0).notNull(),
    // 作者统计字段
    totalLikes: integer('total_likes').default(0).notNull(),
    totalViews: integer('total_views').default(0).notNull(),
    totalDownloads: integer('total_downloads').default(0).notNull(),
    postCount: integer('post_count').default(0).notNull(),
    // 用户注册来源统计 (v1.6.3)
    utmSource: text('utm_source').default('').notNull(),
    registrationIp: text('registration_ip').default('').notNull(),
    registrationLocale: text('registration_locale').default('').notNull(),
  },
  (table) => [
    // Search users by name in admin dashboard
    index('idx_user_name').on(table.name),
    // Order users by registration time for latest users list
    index('idx_user_created_at').on(table.createdAt),
    // Filter virtual vs real users
    index('idx_user_is_virtual').on(table.isVirtual),
  ]
);

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: timestamp('expires_at').notNull(),
    token: text('token').notNull().unique(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // Composite: Query user sessions and filter by expiration
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    idToken: text('id_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    password: text('password'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Query all linked accounts for a user
    index('idx_account_user_id').on(table.userId),
    // Composite: OAuth login (most critical)
    // Can also be used for: WHERE providerId = ? (left-prefix)
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Find verification code by identifier (e.g., find code by email)
    index('idx_verification_identifier').on(table.identifier),
  ]
);

export const config = pgTable('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

export const taxonomy = pgTable(
  'taxonomy',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    image: text('image'),
    icon: text('icon'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query taxonomies by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = pgTable(
  'post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull(),
    title: text('title'),
    description: text('description'),
    image: text('image'),
    content: text('content'),
    categories: text('categories'),
    tags: text('tags'),
    authorName: text('author_name'),
    authorImage: text('author_image'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Composite: Query posts by type and status
    // Can also be used for: WHERE type = ? (left-prefix)
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

export const order = pgTable(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // checkout user email
    status: text('status').notNull(), // created, paid, failed
    amount: integer('amount').notNull(), // checkout amount in cents
    currency: text('currency').notNull(), // checkout currency
    productId: text('product_id'),
    paymentType: text('payment_type'), // one_time, subscription
    paymentInterval: text('payment_interval'), // day, week, month, year
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(), // checkout request info
    checkoutResult: text('checkout_result'), // checkout result
    paymentResult: text('payment_result'), // payment result
    discountCode: text('discount_code'), // discount code
    discountAmount: integer('discount_amount'), // discount amount in cents
    discountCurrency: text('discount_currency'), // discount currency
    paymentEmail: text('payment_email'), // actual payment email
    paymentAmount: integer('payment_amount'), // actual payment amount
    paymentCurrency: text('payment_currency'), // actual payment currency
    paidAt: timestamp('paid_at'), // paid at
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    description: text('description'), // order description
    productName: text('product_name'), // product name
    subscriptionId: text('subscription_id'), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    checkoutUrl: text('checkout_url'), // checkout url
    callbackUrl: text('callback_url'), // callback url, after handle callback
    creditsAmount: integer('credits_amount'), // credits amount
    creditsValidDays: integer('credits_valid_days'), // credits validity days
    planName: text('plan_name'), // subscription plan name
    paymentProductId: text('payment_product_id'), // payment product id
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'), // order subscription no
    transactionId: text('transaction_id'), // payment transaction id
    paymentUserName: text('payment_user_name'), // payment user name
    paymentUserId: text('payment_user_id'), // payment user id
  },
  (table) => [
    // Composite: Query user orders by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_order_user_status_payment_type').on(
      table.userId,
      table.status,
      table.paymentType
    ),
    // Composite: Prevent duplicate payments
    // Can also be used for: WHERE transactionId = ? (left-prefix)
    index('idx_order_transaction_provider').on(
      table.transactionId,
      table.paymentProvider
    ),
    // Order orders by creation time for listing
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = pgTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(), // subscription no
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // subscription user email
    status: text('status').notNull(), // subscription status
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(), // provider subscription id
    subscriptionResult: text('subscription_result'), // provider subscription result
    productId: text('product_id'), // product id
    description: text('description'), // subscription description
    amount: integer('amount'), // subscription amount
    currency: text('currency'), // subscription currency
    interval: text('interval'), // subscription interval, day, week, month, year
    intervalCount: integer('interval_count'), // subscription interval count
    trialPeriodDays: integer('trial_period_days'), // subscription trial period days
    currentPeriodStart: timestamp('current_period_start'), // subscription current period start
    currentPeriodEnd: timestamp('current_period_end'), // subscription current period end
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'), // subscription product name
    creditsAmount: integer('credits_amount'), // subscription credits amount
    creditsValidDays: integer('credits_valid_days'), // subscription credits valid days
    paymentProductId: text('payment_product_id'), // subscription payment product id
    paymentUserId: text('payment_user_id'), // subscription payment user id
    canceledAt: timestamp('canceled_at'), // subscription canceled apply at
    canceledEndAt: timestamp('canceled_end_at'), // subscription canceled end at
    canceledReason: text('canceled_reason'), // subscription canceled reason
    canceledReasonType: text('canceled_reason_type'), // subscription canceled reason type
  },
  (table) => [
    // Composite: Query user's subscriptions by status (most common)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_subscription_user_status_interval').on(
      table.userId,
      table.status,
      table.interval
    ),
    // Composite: Prevent duplicate subscriptions
    // Can also be used for: WHERE paymentProvider = ? (left-prefix)
    index('idx_subscription_provider_id').on(
      table.subscriptionId,
      table.paymentProvider
    ),
    // Order subscriptions by creation time for listing
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = pgTable(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }), // user id
    userEmail: text('user_email'), // user email
    orderNo: text('order_no'), // payment order no
    subscriptionNo: text('subscription_no'), // subscription no
    transactionNo: text('transaction_no').unique().notNull(), // transaction no
    transactionType: text('transaction_type').notNull(), // transaction type, grant / consume
    transactionScene: text('transaction_scene'), // transaction scene, payment / subscription / gift / award
    credits: integer('credits').notNull(), // credits amount, n or -n
    remainingCredits: integer('remaining_credits').notNull().default(0), // remaining credits amount
    description: text('description'), // transaction description
    expiresAt: timestamp('expires_at'), // transaction expires at
    status: text('status').notNull(), // transaction status
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    consumedDetail: text('consumed_detail'), // consumed detail
    metadata: text('metadata'), // transaction metadata
  },
  (table) => [
    // Critical composite index for credit consumption (FIFO queue)
    // Query: WHERE userId = ? AND transactionType = 'grant' AND status = 'active'
    //        AND remainingCredits > 0 ORDER BY expiresAt
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    // Query credits by order number
    index('idx_credit_order_no').on(table.orderNo),
    // Query credits by subscription number
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = pgTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query user's API keys by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_apikey_user_status').on(table.userId, table.status),
    // Composite: Validate active API key (most common for auth)
    // Can also be used for: WHERE key = ? (left-prefix)
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// RBAC Tables
export const role = pgTable(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(), // admin, editor, viewer
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    // Query active roles
    index('idx_role_status').on(table.status),
  ]
);

export const permission = pgTable(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(), // admin.users.read, admin.posts.write
    resource: text('resource').notNull(), // users, posts, categories
    action: text('action').notNull(), // read, write, delete
    title: text('title').notNull(),
    description: text('description'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
  },
  (table) => [
    // Composite: Query permissions by resource and action
    // Can also be used for: WHERE resource = ? (left-prefix)
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = pgTable(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
  },
  (table) => [
    // Composite: Query permissions for a role
    // Can also be used for: WHERE roleId = ? (left-prefix)
    index('idx_role_permission_role_permission').on(
      table.roleId,
      table.permissionId
    ),
  ]
);

export const userRole = pgTable(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    expiresAt: timestamp('expires_at'),
  },
  (table) => [
    // Composite: Query user's active roles (most critical for auth)
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const aiTask = pgTable(
  'ai_task',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    mediaType: text('media_type').notNull(),
    provider: text('provider').notNull(),
    model: text('model').notNull(),
    prompt: text('prompt').notNull(),
    options: text('options'),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    deletedAt: timestamp('deleted_at'),
    taskId: text('task_id'), // provider task id
    taskInfo: text('task_info'), // provider task info
    taskResult: text('task_result'), // provider task result
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'), // credit consumption record id
    optimizationData: jsonb('optimization_data').$type<{
      referenceCaseUsed?: {
        id: string;
        title: string;
        relevanceReason: string;
      };
      enhancementLogic?: string;
      modelAdvantage?: string;
      suggestedModifiers?: string[];
    }>(), // Prompt optimization metadata
  },
  (table) => [
    // Composite: Query user's AI tasks by status
    // Can also be used for: WHERE userId = ? (left-prefix)
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    // Composite: Query user's AI tasks by media type and provider
    // Can also be used for: WHERE mediaType = ? AND provider = ? (left-prefix)
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
  ]
);

export const chat = pgTable(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => /* @__PURE__ */ new Date())
      .notNull(),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
  },
  (table) => [index('idx_chat_user_status').on(table.userId, table.status)]
);

export const chatMessage = pgTable(
  'chat_message',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    chatId: text('chat_id')
      .notNull()
      .references(() => chat.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    role: text('role').notNull(),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
  },
  (table) => [
    index('idx_chat_message_chat_id').on(table.chatId, table.status),
    index('idx_chat_message_user_id').on(table.userId, table.status),
  ]
);

// 错误报告表 - 用于追踪和反馈系统
export const errorReport = pgTable(
  'error_report',
  {
    id: text('id').primaryKey(),
    errorId: text('error_id').unique().notNull(), // 错误码，如 ER-20241201-A3F2
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'), // 冗余字段，便于查询
    feature: text('feature').notNull(), // image_generation, chat, music_generation, payment, upload
    errorType: text('error_type').notNull(), // rate_limit, auth, payment, network, server, unknown
    statusCode: integer('status_code'), // HTTP状态码，如 429, 500
    provider: text('provider'), // gemini, replicate, openrouter, kie
    model: text('model'), // 模型名称
    userMessage: text('user_message').notNull(), // 用户看到的友好消息
    technicalMessage: text('technical_message').notNull(), // 技术错误消息
    stackTrace: text('stack_trace'), // 堆栈跟踪
    apiResponse: text('api_response'), // API原始响应
    requestParams: text('request_params'), // 请求参数 (JSON字符串)
    userFeedback: text('user_feedback'), // 用户反馈说明
    feedbackAt: timestamp('feedback_at'), // 反馈时间
    status: text('status').notNull().default('pending'), // pending, investigating, resolved, closed
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    resolvedAt: timestamp('resolved_at'), // 解决时间
    resolution: text('resolution'), // 解决方案说明
  },
  (table) => [
    // 通过错误码快速查询（用户反馈时）
    index('idx_error_report_error_id').on(table.errorId),
    // 查询用户的所有错误
    index('idx_error_report_user_id').on(table.userId),
    // 复合索引：管理后台列表（最常用查询）
    // 可用于: WHERE status = ? ORDER BY created_at DESC
    index('idx_error_report_status_created').on(table.status, table.createdAt),
    // 复合索引：统计分析
    // 可用于: WHERE feature = ? AND error_type = ?
    index('idx_error_report_feature_type').on(table.feature, table.errorType),
  ]
);

// 社区画廊相关表

// 标签表
export const tag = pgTable(
  'tag',
  {
    id: text('id').primaryKey(),
    name: text('name').unique().notNull(), // 标签名
    slug: text('slug').unique().notNull(), // URL友好名
    type: text('type').notNull().default('custom'), // style, content, model, custom
    isSystem: boolean('is_system').default(false).notNull(), // 是否系统内置
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_tag_type').on(table.type),
    index('idx_tag_slug').on(table.slug),
  ]
);

// 社区帖子表
export const communityPost = pgTable(
  'community_post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    aiTaskId: text('ai_task_id')
      .references(() => aiTask.id, { onDelete: 'set null' }), // 关联原始生成任务
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'), // 🆕 640px WebP 缩略图 URL (Admin发布时生成)
    prompt: text('prompt'), // 纯文本提示词，用于搜索/展示
    params: text('params'), // JSON字符串，存储完整生成配置 (Remix用)
    model: text('model'), // 模型名称/Hash
    aspectRatio: text('aspect_ratio'), // 如 "1024x1024"
    title: text('title'),
    description: text('description'),
    status: text('status').notNull().default('pending'), // pending, published, rejected, private
    viewCount: integer('view_count').default(0).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    
    // SEO slug字段（用于SEO友好的URL）
    seoSlug: text('seo_slug').unique(), // 格式: antigravity-woman-portrait-771ee6
    
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
    publishedAt: timestamp('published_at'),
    
    // SEO元数据字段
    seoTitle: text('seo_title'),              // SEO页面标题 (给搜索引擎，可含品牌词)
    h1Title: text('h1_title'),                // 🆕 页面H1标题 (给用户看，更简洁)
    seoDescription: text('seo_description'),  // SEO描述(meta description)
    seoKeywords: text('seo_keywords'),        // SEO关键词(逗号分隔)
    seoSlugKeywords: text('seo_slug_keywords'), // Slug专用关键词(AI提取，用于URL)
    
    // 新增：增强型SEO内容字段
    contentIntro: text('content_intro'),      // 用户介绍段落(2-3句话)
    promptBreakdown: text('prompt_breakdown'), // 核心元素说明(一句话)
    imageAlt: text('image_alt'),              // AI生成的Alt文本(无障碍访问)
    
    // 🆕 V5.0 动态标题系统
    dynamicHeaders: jsonb('dynamic_headers').$type<{
      about: string;        // "About this [Killer Format]"
      breakdown: string;    // "[Specific Style] Elements Breakdown"
      analysis: string;     // "[Specific Style] Visual Analysis"
      faq: string;          // "FAQ: Creating [Specific Style] Images"
    }>(),
    
    // 结构化内容字段(JSON格式)
    faqItems: text('faq_items'),              // FAQ问答 [{question, answer}]
    useCases: text('use_cases'),              // 适用场景 ["Portrait", "Editorial"]
    visualTags: text('visual_tags'),          // 视觉标签 ["Cinematic", "Urban"]
    relatedPosts: text('related_posts'),      // 相关推荐 ["id1", "id2"]
    
    // 🆕 V11.0 专家点评系统 (Expert Commentary)
    expertCommentary: jsonb('expert_commentary').$type<{
      whyItWorks: string;        // 成功原理：为什么这个Prompt有效
      optimizationTips: string;  // 优化建议：避坑指南和改进方法
      modelAdvantage: string;    // 模型优势：本平台独占优势（转化钩子）
    }>(),
    
    // 🆕 V12.0 Remix Ideas 系统 (用户参与引导)
    remixIdeas: jsonb('remix_ideas').$type<string[]>(),  // 可操作的修改建议
    
    // 🆕 V12.0 Connection Engine (内部链接基础设施)
    relatedConcepts: jsonb('related_concepts').$type<string[]>(),  // 相关概念用于 Topic Cluster
    
    // 🆕 V14.0 Dynamic Content Sections (SEO Optimization)
    // Flexible array of content modules, each with its own type, title, and data.
    // Types: 'rich-text' | 'faq-accordion' | 'checklist' | 'comparison-table'
    contentSections: jsonb('content_sections').$type<Array<{
      id: string;                    // Unique ID for React keys
      type: 'rich-text' | 'faq-accordion' | 'checklist' | 'comparison-table';
      title: string;                 // AI-generated dynamic title (e.g., "Noir Lighting Essentials")
      headingLevel: 'h2' | 'h3';     // AI-determined heading level
      data: any;                     // Polymorphic content based on type
    }>>(),
    // 🆕 V14.0 SEO Focus Fields
    anchor: text('anchor'),           // Core subject (2-5 words, e.g., "Cyberpunk Street Scene")
    microFocus: text('micro_focus'),  // Unique angle for this page (e.g., "Neon Reflection Physics")

    // 🆕 V15.0 预设系统已迁移到独立的 preset 表
    // 旧字段 isPreset, presetSlug, presetName, presetOrder, presetCategory 已删除

    // ============================================
    // Skill 落地页增强字段 (v19.0)
    // ============================================
    // Skill ZIP 下载链接 (R2 存储)
    zipUrl: text('zip_url'),
    // Hero 区域 (JSON: { headline, subheadline, cta: { primary, secondary } })
    heroSection: text('hero_section'),
    // 快速上手 (JSON: { title, steps[], exampleCommand })
    quickStart: text('quick_start'),
    // 核心能力 (JSON array: [{ icon, title, description }])
    capabilities: text('capabilities'),
    // 预设展示 (JSON array: [{ name, colors[], fonts: { heading, body }, bestFor }])
    presets: text('presets'),
    // 使用示例 (JSON array: [{ input, output, beforeAfter?: { before, after } }])
    usageExamples: text('usage_examples'),
    // 触发词 (JSON array: string[])
    triggerPhrases: text('trigger_phrases'),
    // Skill 完整内容 (SKILL.md 原文)
    skillContent: text('skill_content'),
    // README 内容 (可选的 README.md)
    readmeContent: text('readme_content'),
  },
  (table) => [
    // 首页瀑布流查询 (最常用)
    // WHERE status = 'published' ORDER BY created_at DESC
    index('idx_community_post_status_created').on(table.status, table.createdAt),
    // 热门排序
    // WHERE status = 'published' ORDER BY like_count DESC
    index('idx_community_post_status_likes').on(table.status, table.likeCount),
    // 用户个人页
    index('idx_community_post_user').on(table.userId),
    // SEO slug查询（用于 /prompts/[slug] 路由）
    index('idx_community_post_seo_slug').on(table.seoSlug),
  ]
);

// 帖子-标签关联表
export const postTag = pgTable(
  'post_tag',
  {
    postId: text('post_id')
      .notNull()
      .references(() => communityPost.id, { onDelete: 'cascade' }),
    tagId: text('tag_id')
      .notNull()
      .references(() => tag.id, { onDelete: 'cascade' }),
  },
  (table) => [
    // 复合主键
    index('pk_post_tag').on(table.postId, table.tagId),
    // 标签页查询
    index('idx_post_tag_tag_id').on(table.tagId),
  ]
);

// 互动表 (点赞/表情)
export const reaction = pgTable(
  'reaction',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => communityPost.id, { onDelete: 'cascade' }),
    type: text('type').notNull(), // like, heart, laugh, cry, bolt
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    // 用户可对同一帖子使用多种表情，但同一种表情只能点一次
    index('idx_reaction_user_post_type').on(table.userId, table.postId, table.type),
    // 统计帖子互动数
    index('idx_reaction_post_type').on(table.postId, table.type),
  ]
);

// ============================================
// 评论系统表
// ============================================

// 评论表
export const comment = pgTable(
  'comment',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => communityPost.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'), // 回复功能：父评论ID (null = 顶级评论)
    content: text('content').notNull(),
    status: text('status').notNull().default('active'), // active, deleted, hidden
    likeCount: integer('like_count').default(0).notNull(),
    uniqueReplierCount: integer('unique_replier_count').default(0).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    index('idx_comment_post_status').on(table.postId, table.status, table.createdAt),
    index('idx_comment_user').on(table.userId),
    index('idx_comment_parent').on(table.parentId),
  ]
);

// 评论点赞表
export const commentReaction = pgTable(
  'comment_reaction',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    commentId: text('comment_id')
      .notNull()
      .references(() => comment.id, { onDelete: 'cascade' }),
    type: text('type').notNull().default('like'),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_comment_reaction_unique').on(table.userId, table.commentId, table.type),
    index('idx_comment_reaction_comment').on(table.commentId),
  ]
);

// ============================================
// 用户关注系统表
// ============================================

export const userFollow = pgTable(
  'user_follow',
  {
    id: text('id').primaryKey(),
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_user_follow_follower').on(table.followerId),
    index('idx_user_follow_following').on(table.followingId),
    index('idx_user_follow_unique').on(table.followerId, table.followingId),
  ]
);

// ============================================
// 站内通知系统表
// ============================================

export const notification = pgTable(
  'notification',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    actorId: text('actor_id')
      .references(() => user.id, { onDelete: 'set null' }),
    resourceId: text('resource_id'),
    resourceType: text('resource_type'),
    link: text('link'),
    previewText: text('preview_text'),
    isRead: boolean('is_read').default(false).notNull(),
    isRecalled: boolean('is_recalled').default(false).notNull(),
    isPermanent: boolean('is_permanent').default(false).notNull(),
    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => [
    index('idx_notification_user_unread').on(table.userId, table.isRead, table.createdAt),
    index('idx_notification_type').on(table.userId, table.type),
  ]
);

// ============================================
// V15.0 Vision-Logic 预设系统表
// ============================================

export const preset = pgTable(
  'preset',
  {
    id: text('id').primaryKey(),
    // 唯一标识符，用于 URL
    slug: text('slug').notNull().unique(),
    // 显示名称
    name: text('name').notNull(),
    // 分类标签
    category: text('category'),
    // 预设类型：system = 系统预设, user = 用户模板
    type: text('type').notNull().default('user'),
    // 用户 ID（系统预设为 null）
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    // 关联的原始帖子 ID（可选，用于追溯来源）
    sourcePostId: text('source_post_id').references(() => communityPost.id, { onDelete: 'set null' }),
    // V2 params 数据（schema, formValues, promptHighlights 等）
    params: text('params').notNull(),
    // 缩略图 URL
    thumbnailUrl: text('thumbnail_url'),
    // 完整图片 URL
    imageUrl: text('image_url'),
    // 排序权重（越小越靠前）
    displayOrder: integer('display_order').default(0).notNull(),
    // 是否激活（可用于临时禁用预设）
    isActive: boolean('is_active').default(true).notNull(),
    // 时间戳
    createdAt: timestamp('created_at').defaultNow().notNull(),
    updatedAt: timestamp('updated_at')
      .defaultNow()
      .$onUpdate(() => new Date())
      .notNull(),
  },
  (table) => [
    // 查询系统预设（按排序）
    index('idx_preset_type_order').on(table.type, table.displayOrder),
    // 查询用户模板
    index('idx_preset_user').on(table.userId),
    // 按分类筛选
    index('idx_preset_category').on(table.category),
  ]
);
