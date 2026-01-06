import { PaymentEventType, SubscriptionCycleType } from '@/extensions/payment';
import { findOrderByOrderNo, OrderStatus, updateOrderByOrderNo } from '@/shared/models/order';
import { findSubscriptionByProviderSubscriptionId } from '@/shared/models/subscription';
import { revokeCreditsForOrder } from '@/shared/models/credit';
import {
  getPaymentService,
  handleCheckoutSuccess,
  handleSubscriptionCanceled,
  handleSubscriptionRenewal,
  handleSubscriptionUpdated,
} from '@/shared/services/payment';
import { ErrorLogger } from '@/shared/lib/error-logger';
import { ErrorFeature } from '@/shared/models/error_report';

export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  try {
    const { provider } = await params;

    if (!provider) {
      throw new Error('provider is required');
    }

    const paymentService = await getPaymentService();
    const paymentProvider = paymentService.getProvider(provider);
    if (!paymentProvider) {
      throw new Error('payment provider not found');
    }

    // get payment event from webhook notification
    const event = await paymentProvider.getPaymentEvent({ req });
    if (!event) {
      throw new Error('payment event not found');
    }

    const eventType = event.eventType;
    if (!eventType) {
      throw new Error('event type not found');
    }

    // payment session
    const session = event.paymentSession;
    if (!session) {
      throw new Error('payment session not found');
    }

    // console.log('notify payment session', session);

    if (eventType === PaymentEventType.CHECKOUT_SUCCESS) {
      // one-time payment or subscription first payment
      const orderNo = session.metadata.order_no;

      if (!orderNo) {
        throw new Error('order no not found');
      }

      const order = await findOrderByOrderNo(orderNo);
      if (!order) {
        throw new Error('order not found');
      }

      await handleCheckoutSuccess({
        order,
        session,
      });
    } else if (eventType === PaymentEventType.PAYMENT_SUCCESS) {
      // only handle subscription payment
      if (session.subscriptionId && session.subscriptionInfo) {
        if (
          session.paymentInfo?.subscriptionCycleType ===
          SubscriptionCycleType.RENEWAL
        ) {
          // only handle subscription renewal payment
          const existingSubscription =
            await findSubscriptionByProviderSubscriptionId({
              provider: provider,
              subscriptionId: session.subscriptionId,
            });
          if (!existingSubscription) {
            throw new Error('subscription not found');
          }

          // handle subscription renewal payment
          await handleSubscriptionRenewal({
            subscription: existingSubscription,
            session,
          });
        } else {
          console.log('not handle subscription first payment');
        }
      } else {
        console.log('not handle one-time payment');
      }
    } else if (eventType === PaymentEventType.SUBSCRIBE_UPDATED) {
      // only handle subscription update
      if (!session.subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId: session.subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionUpdated({
        subscription: existingSubscription,
        session,
      });
    } else if (eventType === PaymentEventType.SUBSCRIBE_CANCELED) {
      // only handle subscription cancellation
      if (!session.subscriptionId || !session.subscriptionInfo) {
        throw new Error('subscription id or subscription info not found');
      }

      const existingSubscription =
        await findSubscriptionByProviderSubscriptionId({
          provider: provider,
          subscriptionId: session.subscriptionId,
        });
      if (!existingSubscription) {
        throw new Error('subscription not found');
      }

      await handleSubscriptionCanceled({
        subscription: existingSubscription,
        session,
      });
    } else if (eventType === PaymentEventType.PAYMENT_REFUNDED) {
      // 🚨 处理退款：回收积分，防止"退款但保留积分"的漏洞
      const orderNo = session.metadata?.order_no;

      if (!orderNo) {
        console.warn(`[Payment] Refund event received but no order_no found in metadata. Provider: ${provider}`);
        return Response.json({ message: 'refund processed (no order_no)' });
      }

      const order = await findOrderByOrderNo(orderNo);
      if (!order) {
        console.warn(`[Payment] Refund event for non-existent order: ${orderNo}`);
        return Response.json({ message: 'refund processed (order not found)' });
      }

      // 🛡️ 幂等性检查：已退款的订单跳过处理
      if (order.status === OrderStatus.REFUNDED) {
        console.log(`[Payment] Order ${orderNo} already refunded, skipping duplicate webhook.`);
        return Response.json({ message: 'refund already processed' });
      }

      console.log(`[Payment] Processing refund for Order ${orderNo}. Provider: ${provider}`);

      // 1. 更新订单状态为 REFUNDED
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.REFUNDED,
      });

      // 2. 回收积分
      const revokeResult = await revokeCreditsForOrder(orderNo);

      console.log(
        `[Payment] Refund completed for Order ${orderNo}. ` +
        `Credits revoked: ${revokeResult.totalCreditsRevoked}, ` +
        `Records affected: ${revokeResult.revokedCount}`
      );
    } else if (eventType === PaymentEventType.FRAUD_WARNING) {
      // 🚨 Stripe Radar 早期欺诈预警
      // 强烈建议：收到此事件后立即退款，可避免争议记录影响商家信誉
      const orderNo = session.metadata?.order_no;

      if (!orderNo) {
        console.warn(`[Payment] FRAUD WARNING received but no order_no found. Provider: ${provider}`);
        return Response.json({ message: 'fraud warning processed (no order_no)' });
      }

      const order = await findOrderByOrderNo(orderNo);
      if (!order) {
        console.warn(`[Payment] FRAUD WARNING for non-existent order: ${orderNo}`);
        return Response.json({ message: 'fraud warning processed (order not found)' });
      }

      // 幂等性检查
      if (order.status === OrderStatus.REFUNDED) {
        console.log(`[Payment] Order ${orderNo} already refunded, skipping fraud warning.`);
        return Response.json({ message: 'already refunded' });
      }

      console.warn(
        `[Payment] ⚠️ FRAUD WARNING for Order ${orderNo}. ` +
        `Provider: ${provider}. ` +
        `ACTION REQUIRED: Consider issuing refund via Stripe Dashboard to avoid dispute.`
      );

      // 主动回收积分（止损）
      const revokeResult = await revokeCreditsForOrder(orderNo);

      // 更新订单状态为 REFUNDED（表示已处理欺诈预警）
      await updateOrderByOrderNo(orderNo, {
        status: OrderStatus.REFUNDED,
      });

      console.log(
        `[Payment] Fraud warning processed for Order ${orderNo}. ` +
        `Credits revoked: ${revokeResult.totalCreditsRevoked}. ` +
        `REMINDER: Issue refund in Stripe Dashboard to prevent dispute.`
      );
    } else {
      console.log('not handle other event type: ' + eventType);
    }

    return Response.json({
      message: 'success',
    });
  } catch (err: unknown) {
    // 记录支付通知处理错误
    await ErrorLogger.log({
      error: err,
      context: {
        feature: ErrorFeature.PAYMENT,
        userId: 'system',
      },
    });

    const errorMessage = err instanceof Error ? err.message : 'Unknown error';
    return Response.json(
      {
        message: `handle payment notify failed: ${errorMessage}`,
      },
      {
        status: 500,
      }
    );
  }
}
