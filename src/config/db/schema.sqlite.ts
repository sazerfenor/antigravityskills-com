/**
 * SQLite/Turso Schema
 *
 * 转换规则：
 * - pgTable → sqliteTable
 * - timestamp → integer (Unix timestamp in seconds)
 * - jsonb → text (JSON string)
 * - boolean → integer (0/1, with mode: 'boolean')
 * - PostgreSQL unique() → SQLite unique (在列定义中)
 *
 * 注意事项：
 * - SQLite 不支持 FOR UPDATE 行锁（已有 polyfill）
 * - SQLite 的 RETURNING 在 3.35+ 支持
 * - 索引定义语法略有不同
 */

import {
  index,
  integer,
  sqliteTable,
  text,
} from 'drizzle-orm/sqlite-core';

// ============================================
// 用户和认证相关表
// ============================================

export const user = sqliteTable(
  'user',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    emailVerified: integer('email_verified', { mode: 'boolean' }).default(false).notNull(),
    image: text('image'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
    // 虚拟作者相关字段
    isVirtual: integer('is_virtual', { mode: 'boolean' }).default(false).notNull(),
    bio: text('bio'),
    originalTwitterHandle: text('original_twitter_handle'),
    originalTwitterUrl: text('original_twitter_url'),
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
    index('idx_user_name').on(table.name),
    index('idx_user_created_at').on(table.createdAt),
    index('idx_user_is_virtual').on(table.isVirtual),
  ]
);

export const session = sqliteTable(
  'session',
  {
    id: text('id').primaryKey(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    token: text('token').notNull().unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
  },
  (table) => [
    index('idx_session_user_expires').on(table.userId, table.expiresAt),
  ]
);

export const account = sqliteTable(
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
    accessTokenExpiresAt: integer('access_token_expires_at', { mode: 'timestamp' }),
    refreshTokenExpiresAt: integer('refresh_token_expires_at', { mode: 'timestamp' }),
    scope: text('scope'),
    password: text('password'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_account_user_id').on(table.userId),
    index('idx_account_provider_account').on(table.providerId, table.accountId),
  ]
);

export const verification = sqliteTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_verification_identifier').on(table.identifier),
  ]
);

// ============================================
// 配置表
// ============================================

export const config = sqliteTable('config', {
  name: text('name').unique().notNull(),
  value: text('value'),
});

// ============================================
// 内容相关表
// ============================================

export const taxonomy = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    index('idx_taxonomy_type_status').on(table.type, table.status),
  ]
);

export const post = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    index('idx_post_type_status').on(table.type, table.status),
  ]
);

// ============================================
// 订单和支付相关表
// ============================================

export const order = sqliteTable(
  'order',
  {
    id: text('id').primaryKey(),
    orderNo: text('order_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'),
    status: text('status').notNull(),
    amount: integer('amount').notNull(),
    currency: text('currency').notNull(),
    productId: text('product_id'),
    paymentType: text('payment_type'),
    paymentInterval: text('payment_interval'),
    paymentProvider: text('payment_provider').notNull(),
    paymentSessionId: text('payment_session_id'),
    checkoutInfo: text('checkout_info').notNull(),
    checkoutResult: text('checkout_result'),
    paymentResult: text('payment_result'),
    discountCode: text('discount_code'),
    discountAmount: integer('discount_amount'),
    discountCurrency: text('discount_currency'),
    paymentEmail: text('payment_email'),
    paymentAmount: integer('payment_amount'),
    paymentCurrency: text('payment_currency'),
    paidAt: integer('paid_at', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    description: text('description'),
    productName: text('product_name'),
    subscriptionId: text('subscription_id'),
    subscriptionResult: text('subscription_result'),
    checkoutUrl: text('checkout_url'),
    callbackUrl: text('callback_url'),
    creditsAmount: integer('credits_amount'),
    creditsValidDays: integer('credits_valid_days'),
    planName: text('plan_name'),
    paymentProductId: text('payment_product_id'),
    invoiceId: text('invoice_id'),
    invoiceUrl: text('invoice_url'),
    subscriptionNo: text('subscription_no'),
    transactionId: text('transaction_id'),
    paymentUserName: text('payment_user_name'),
    paymentUserId: text('payment_user_id'),
  },
  (table) => [
    index('idx_order_user_status_payment_type').on(table.userId, table.status, table.paymentType),
    index('idx_order_transaction_provider').on(table.transactionId, table.paymentProvider),
    index('idx_order_created_at').on(table.createdAt),
  ]
);

export const subscription = sqliteTable(
  'subscription',
  {
    id: text('id').primaryKey(),
    subscriptionNo: text('subscription_no').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'),
    status: text('status').notNull(),
    paymentProvider: text('payment_provider').notNull(),
    subscriptionId: text('subscription_id').notNull(),
    subscriptionResult: text('subscription_result'),
    productId: text('product_id'),
    description: text('description'),
    amount: integer('amount'),
    currency: text('currency'),
    interval: text('interval'),
    intervalCount: integer('interval_count'),
    trialPeriodDays: integer('trial_period_days'),
    currentPeriodStart: integer('current_period_start', { mode: 'timestamp' }),
    currentPeriodEnd: integer('current_period_end', { mode: 'timestamp' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    planName: text('plan_name'),
    billingUrl: text('billing_url'),
    productName: text('product_name'),
    creditsAmount: integer('credits_amount'),
    creditsValidDays: integer('credits_valid_days'),
    paymentProductId: text('payment_product_id'),
    paymentUserId: text('payment_user_id'),
    canceledAt: integer('canceled_at', { mode: 'timestamp' }),
    canceledEndAt: integer('canceled_end_at', { mode: 'timestamp' }),
    canceledReason: text('canceled_reason'),
    canceledReasonType: text('canceled_reason_type'),
  },
  (table) => [
    index('idx_subscription_user_status_interval').on(table.userId, table.status, table.interval),
    index('idx_subscription_provider_id').on(table.subscriptionId, table.paymentProvider),
    index('idx_subscription_created_at').on(table.createdAt),
  ]
);

export const credit = sqliteTable(
  'credit',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'),
    orderNo: text('order_no'),
    subscriptionNo: text('subscription_no'),
    transactionNo: text('transaction_no').unique().notNull(),
    transactionType: text('transaction_type').notNull(),
    transactionScene: text('transaction_scene'),
    credits: integer('credits').notNull(),
    remainingCredits: integer('remaining_credits').notNull().default(0),
    description: text('description'),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    consumedDetail: text('consumed_detail'),
    metadata: text('metadata'),
  },
  (table) => [
    index('idx_credit_consume_fifo').on(
      table.userId,
      table.status,
      table.transactionType,
      table.remainingCredits,
      table.expiresAt
    ),
    index('idx_credit_order_no').on(table.orderNo),
    index('idx_credit_subscription_no').on(table.subscriptionNo),
  ]
);

export const apikey = sqliteTable(
  'apikey',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    key: text('key').notNull(),
    title: text('title').notNull(),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_apikey_user_status').on(table.userId, table.status),
    index('idx_apikey_key_status').on(table.key, table.status),
  ]
);

// ============================================
// RBAC 权限相关表
// ============================================

export const role = sqliteTable(
  'role',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull().unique(),
    title: text('title').notNull(),
    description: text('description'),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    sort: integer('sort').default(0).notNull(),
  },
  (table) => [
    index('idx_role_status').on(table.status),
  ]
);

export const permission = sqliteTable(
  'permission',
  {
    id: text('id').primaryKey(),
    code: text('code').notNull().unique(),
    resource: text('resource').notNull(),
    action: text('action').notNull(),
    title: text('title').notNull(),
    description: text('description'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_permission_resource_action').on(table.resource, table.action),
  ]
);

export const rolePermission = sqliteTable(
  'role_permission',
  {
    id: text('id').primaryKey(),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    permissionId: text('permission_id')
      .notNull()
      .references(() => permission.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_role_permission_role_permission').on(table.roleId, table.permissionId),
  ]
);

export const userRole = sqliteTable(
  'user_role',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    roleId: text('role_id')
      .notNull()
      .references(() => role.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    expiresAt: integer('expires_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_user_role_user_expires').on(table.userId, table.expiresAt),
  ]
);

// ============================================
// AI 任务相关表
// ============================================

export const aiTask = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    deletedAt: integer('deleted_at', { mode: 'timestamp' }),
    taskId: text('task_id'),
    taskInfo: text('task_info'),
    taskResult: text('task_result'),
    costCredits: integer('cost_credits').notNull().default(0),
    scene: text('scene').notNull().default(''),
    creditId: text('credit_id'),
    // SQLite 不支持 jsonb，改用 text 存储 JSON 字符串
    optimizationData: text('optimization_data'),
  },
  (table) => [
    index('idx_ai_task_user_media_type').on(table.userId, table.mediaType),
    index('idx_ai_task_media_type_status').on(table.mediaType, table.status),
  ]
);

export const chat = sqliteTable(
  'chat',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    status: text('status').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    model: text('model').notNull(),
    provider: text('provider').notNull(),
    title: text('title').notNull().default(''),
    parts: text('parts').notNull(),
    metadata: text('metadata'),
    content: text('content'),
  },
  (table) => [index('idx_chat_user_status').on(table.userId, table.status)]
);

export const chatMessage = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
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

// ============================================
// 错误报告表
// ============================================

export const errorReport = sqliteTable(
  'error_report',
  {
    id: text('id').primaryKey(),
    errorId: text('error_id').unique().notNull(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    userEmail: text('user_email'),
    feature: text('feature').notNull(),
    errorType: text('error_type').notNull(),
    statusCode: integer('status_code'),
    provider: text('provider'),
    model: text('model'),
    userMessage: text('user_message').notNull(),
    technicalMessage: text('technical_message').notNull(),
    stackTrace: text('stack_trace'),
    apiResponse: text('api_response'),
    requestParams: text('request_params'),
    userFeedback: text('user_feedback'),
    feedbackAt: integer('feedback_at', { mode: 'timestamp' }),
    status: text('status').notNull().default('pending'),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    resolvedAt: integer('resolved_at', { mode: 'timestamp' }),
    resolution: text('resolution'),
  },
  (table) => [
    index('idx_error_report_error_id').on(table.errorId),
    index('idx_error_report_user_id').on(table.userId),
    index('idx_error_report_status_created').on(table.status, table.createdAt),
    index('idx_error_report_feature_type').on(table.feature, table.errorType),
  ]
);

// ============================================
// 社区画廊相关表
// ============================================

export const tag = sqliteTable(
  'tag',
  {
    id: text('id').primaryKey(),
    name: text('name').unique().notNull(),
    slug: text('slug').unique().notNull(),
    type: text('type').notNull().default('custom'),
    isSystem: integer('is_system', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_tag_type').on(table.type),
    index('idx_tag_slug').on(table.slug),
  ]
);

export const communityPost = sqliteTable(
  'community_post',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    aiTaskId: text('ai_task_id')
      .references(() => aiTask.id, { onDelete: 'set null' }),
    imageUrl: text('image_url').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    prompt: text('prompt'),
    params: text('params'),
    model: text('model'),
    aspectRatio: text('aspect_ratio'),
    // Gallery 大类分类字段
    category: text('category').default('photography'),
    subcategory: text('subcategory'),  // 二级分类 (如: Portrait, Quote Card, Logo...)
    title: text('title'),
    description: text('description'),
    status: text('status').notNull().default('pending'),
    viewCount: integer('view_count').default(0).notNull(),
    likeCount: integer('like_count').default(0).notNull(),
    downloadCount: integer('download_count').default(0).notNull(),
    seoSlug: text('seo_slug').unique(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
    publishedAt: integer('published_at', { mode: 'timestamp' }),
    // SEO 元数据字段
    seoTitle: text('seo_title'),
    h1Title: text('h1_title'),
    seoDescription: text('seo_description'),
    seoKeywords: text('seo_keywords'),
    seoSlugKeywords: text('seo_slug_keywords'),
    contentIntro: text('content_intro'),
    promptBreakdown: text('prompt_breakdown'),
    imageAlt: text('image_alt'),
    // SQLite 不支持 jsonb，改用 text 存储 JSON
    dynamicHeaders: text('dynamic_headers'),
    faqItems: text('faq_items'),
    useCases: text('use_cases'),
    visualTags: text('visual_tags'),
    relatedPosts: text('related_posts'),
    expertCommentary: text('expert_commentary'),
    remixIdeas: text('remix_ideas'),
    relatedConcepts: text('related_concepts'),
    contentSections: text('content_sections'),
    anchor: text('anchor'),
    microFocus: text('micro_focus'),
  },
  (table) => [
    index('idx_community_post_status_created').on(table.status, table.createdAt),
    index('idx_community_post_status_likes').on(table.status, table.likeCount),
    index('idx_community_post_user').on(table.userId),
    index('idx_community_post_seo_slug').on(table.seoSlug),
    index('idx_community_post_category').on(table.category, table.status),
    index('idx_community_post_category_subcategory').on(table.category, table.subcategory, table.status),
  ]
);

export const postTag = sqliteTable(
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
    index('pk_post_tag').on(table.postId, table.tagId),
    index('idx_post_tag_tag_id').on(table.tagId),
  ]
);

export const reaction = sqliteTable(
  'reaction',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => communityPost.id, { onDelete: 'cascade' }),
    type: text('type').notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_reaction_user_post_type').on(table.userId, table.postId, table.type),
    index('idx_reaction_post_type').on(table.postId, table.type),
  ]
);

// ============================================
// 评论系统表
// ============================================

export const comment = sqliteTable(
  'comment',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    postId: text('post_id')
      .notNull()
      .references(() => communityPost.id, { onDelete: 'cascade' }),
    parentId: text('parent_id'),
    content: text('content').notNull(),
    status: text('status').notNull().default('active'),
    likeCount: integer('like_count').default(0).notNull(),
    uniqueReplierCount: integer('unique_replier_count').default(0).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_comment_post_status').on(table.postId, table.status, table.createdAt),
    index('idx_comment_user').on(table.userId),
    index('idx_comment_parent').on(table.parentId),
  ]
);

export const commentReaction = sqliteTable(
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
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_comment_reaction_unique').on(table.userId, table.commentId, table.type),
    index('idx_comment_reaction_comment').on(table.commentId),
  ]
);

// ============================================
// 用户关注系统表
// ============================================

export const userFollow = sqliteTable(
  'user_follow',
  {
    id: text('id').primaryKey(),
    followerId: text('follower_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    followingId: text('following_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
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

export const notification = sqliteTable(
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
    isRead: integer('is_read', { mode: 'boolean' }).default(false).notNull(),
    isRecalled: integer('is_recalled', { mode: 'boolean' }).default(false).notNull(),
    isPermanent: integer('is_permanent', { mode: 'boolean' }).default(false).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_notification_user_unread').on(table.userId, table.isRead, table.createdAt),
    index('idx_notification_type').on(table.userId, table.type),
  ]
);

// ============================================
// V15.0 Vision-Logic 预设系统表
// ============================================

export const preset = sqliteTable(
  'preset',
  {
    id: text('id').primaryKey(),
    slug: text('slug').notNull().unique(),
    name: text('name').notNull(),
    category: text('category'),
    type: text('type').notNull().default('user'),
    userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
    sourcePostId: text('source_post_id').references(() => communityPost.id, { onDelete: 'set null' }),
    params: text('params').notNull(),
    thumbnailUrl: text('thumbnail_url'),
    imageUrl: text('image_url'),
    displayOrder: integer('display_order').default(0).notNull(),
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_preset_type_order').on(table.type, table.displayOrder),
    index('idx_preset_user').on(table.userId),
    index('idx_preset_category').on(table.category),
  ]
);

// ============================================
// 虚拟用户人格机器人系统表
// ============================================

/**
 * 虚拟人格表 - 存储虚拟用户的人格特征和配置
 * 与 user 表 1:1 关联，扩展虚拟用户的行为能力
 */
export const virtualPersona = sqliteTable(
  'virtual_persona',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .unique()
      .references(() => user.id, { onDelete: 'cascade' }),

    // 基础信息
    displayName: text('display_name').notNull(),
    username: text('username').notNull().unique(),

    // 分类与专长
    primaryCategory: text('primary_category').notNull(), // photography | art-illustration | design | commercial-product | character-design
    secondaryCategories: text('secondary_categories'), // JSON array
    specialties: text('specialties'), // JSON array: ["portrait", "landscape", "street"]
    styleKeywords: text('style_keywords'), // JSON array: ["cinematic", "moody", "vibrant"]

    // 工作流相关（v2.0 新增）
    workflowType: text('workflow_type').default('pure_ai').notNull(), // pure_ai | ai_enhanced | hybrid
    workflowDescription: text('workflow_description'), // 工作流描述
    preferredTools: text('preferred_tools'), // JSON array: ["Stable Diffusion", "Midjourney"]
    dislikes: text('dislikes'), // JSON array: ["oversaturated HDR", "generic anime"]
    sampleInteraction: text('sample_interaction'), // JSON: {scenario, response} 用于灵魂验证

    // 人格特质
    personalityTraits: text('personality_traits').notNull(), // JSON: {warmth, professionalism, humor, creativity}
    communicationStyle: text('communication_style').notNull(), // formal | casual | enthusiastic | reserved
    responsePatterns: text('response_patterns'), // JSON: {greeting[], closing[], emojiUsage}

    // 活跃度与调度（令牌桶机制）
    activityLevel: text('activity_level').default('moderate').notNull(), // low | moderate | high | very_high
    activeHoursStart: integer('active_hours_start').default(9).notNull(),
    activeHoursEnd: integer('active_hours_end').default(22).notNull(),
    dailyTokenBalance: integer('daily_token_balance').default(0).notNull(), // 令牌桶余额
    lastInteractionMap: text('last_interaction_map'), // JSON: { "userId": timestamp } 用于冷却追踪

    // 网站评价
    siteReview: text('site_review'),
    siteRating: integer('site_rating').default(5).notNull(),

    // 生成辅助
    promptStyleGuide: text('prompt_style_guide'), // 生成 Prompt 的风格指南
    commentTemplates: text('comment_templates'), // JSON array: 评论模板

    // 状态
    isActive: integer('is_active', { mode: 'boolean' }).default(true).notNull(),
    lastActiveAt: integer('last_active_at', { mode: 'timestamp' }),

    // 统计
    totalPostsMade: integer('total_posts_made').default(0).notNull(),
    totalCommentsMade: integer('total_comments_made').default(0).notNull(),
    totalFollowsGiven: integer('total_follows_given').default(0).notNull(),

    // 元数据
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    updatedAt: integer('updated_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()).$onUpdate(() => new Date()),
  },
  (table) => [
    index('idx_virtual_persona_user').on(table.userId),
    index('idx_virtual_persona_category').on(table.primaryCategory),
    index('idx_virtual_persona_active').on(table.isActive, table.activityLevel),
  ]
);

/**
 * Prompt 队列表 - 管理员输入的待发布 Prompt
 */
export const promptQueue = sqliteTable(
  'prompt_queue',
  {
    id: text('id').primaryKey(),
    prompt: text('prompt').notNull(),
    category: text('category'), // 可选：指定分类

    // 分配
    assignedPersonaId: text('assigned_persona_id').references(() => virtualPersona.id, { onDelete: 'set null' }),
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }),

    // 状态
    status: text('status').default('pending').notNull(), // pending | assigned | processing | completed | failed
    priority: integer('priority').default(5).notNull(), // 1-10

    // 来源
    source: text('source'), // manual | hotword | api
    sourceMetadata: text('source_metadata'), // JSON

    // 结果
    postId: text('post_id').references(() => communityPost.id, { onDelete: 'set null' }),
    errorMessage: text('error_message'),

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    processedAt: integer('processed_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_prompt_queue_status').on(table.status, table.priority),
    index('idx_prompt_queue_assigned').on(table.assignedPersonaId, table.status),
  ]
);

/**
 * 虚拟用户互动日志表 - 记录所有互动行为
 */
export const virtualInteractionLog = sqliteTable(
  'virtual_interaction_log',
  {
    id: text('id').primaryKey(),
    personaId: text('persona_id')
      .notNull()
      .references(() => virtualPersona.id, { onDelete: 'cascade' }),

    interactionType: text('interaction_type').notNull(), // comment | follow | like
    targetUserId: text('target_user_id').references(() => user.id, { onDelete: 'set null' }),
    targetPostId: text('target_post_id').references(() => communityPost.id, { onDelete: 'set null' }),
    targetCommentId: text('target_comment_id').references(() => comment.id, { onDelete: 'set null' }),

    generatedContent: text('generated_content'), // 生成的评论内容
    threadDepth: integer('thread_depth').default(0).notNull(), // 对话深度

    status: text('status').default('completed').notNull(), // pending | completed | failed
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
  },
  (table) => [
    index('idx_virtual_interaction_persona').on(table.personaId, table.createdAt),
    index('idx_virtual_interaction_target').on(table.targetUserId, table.createdAt),
    index('idx_virtual_interaction_type').on(table.interactionType, table.status),
  ]
);

/**
 * 虚拟用户发帖计划表 - 追踪发帖任务状态
 */
export const virtualPostSchedule = sqliteTable(
  'virtual_post_schedule',
  {
    id: text('id').primaryKey(),
    personaId: text('persona_id')
      .notNull()
      .references(() => virtualPersona.id, { onDelete: 'cascade' }),
    promptQueueId: text('prompt_queue_id').references(() => promptQueue.id, { onDelete: 'set null' }),

    // 生成内容
    generatedPrompt: text('generated_prompt'),
    generatedImageUrl: text('generated_image_url'),
    postId: text('post_id').references(() => communityPost.id, { onDelete: 'set null' }),

    // 调度
    scheduledAt: integer('scheduled_at', { mode: 'timestamp' }).notNull(),

    // 状态机: pending → prompt → image → post → seo → completed | failed
    status: text('status').default('pending').notNull(),
    currentStep: text('current_step'), // 当前执行步骤
    lastError: text('last_error'),

    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
    completedAt: integer('completed_at', { mode: 'timestamp' }),
  },
  (table) => [
    index('idx_virtual_post_schedule_persona').on(table.personaId, table.status),
    index('idx_virtual_post_schedule_status').on(table.status, table.scheduledAt),
  ]
);
