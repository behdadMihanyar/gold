import { emitOrderChanged } from "../../realtime/events.js";
import { HttpError } from "../../utils/httpError.js";
import * as repo from "./orders.repository.js";

export const listOrders = (side, filters) => repo.listOrders(side, filters);

export const summarizeOrders = (side, filters) => repo.summarize(side, filters);

export async function getOrder(side, id) {
  const order = await repo.findOrder(side, id);
  if (!order) throw HttpError.notFound("Order not found");
  return order;
}

export async function createOrder(side, fields, user) {
  const order = await repo.insertOrder(side, fields, user.id);
  emitOrderChanged(side, "INSERT", order.id);
  return order;
}

export async function updateOrder(side, id, fields) {
  const order = await repo.updateOrder(side, id, fields);
  if (!order) throw HttpError.notFound("Order not found");
  emitOrderChanged(side, "UPDATE", order.id);
  return order;
}

export async function deleteOrder(side, id) {
  const deleted = await repo.deleteOrder(side, id);
  if (!deleted) throw HttpError.notFound("Order not found");
  emitOrderChanged(side, "DELETE", id);
}
