"use strict";

const FULFILLABLE_CHECKOUT_EVENTS = Object.freeze([
  "checkout.session.completed",
  "checkout.session.async_payment_succeeded",
]);

const FAILED_CHECKOUT_EVENTS = Object.freeze([
  "checkout.session.async_payment_failed",
  "checkout.session.expired",
]);

function checkoutEventAction(eventType) {
  if (FULFILLABLE_CHECKOUT_EVENTS.includes(eventType)) return "fulfill";
  if (FAILED_CHECKOUT_EVENTS.includes(eventType)) return "mark_failed";
  return "ignore";
}

function eventObjectId(event) {
  return event?.data?.object?.id || null;
}

module.exports = {
  FULFILLABLE_CHECKOUT_EVENTS,
  FAILED_CHECKOUT_EVENTS,
  checkoutEventAction,
  eventObjectId,
};
