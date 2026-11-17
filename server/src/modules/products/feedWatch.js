import { emitPricesChanged } from "../../realtime/events.js";
import { getBoard, getFeedState } from "./products.service.js";

/**
 * The feed can go down without any event: the collector may just stop reporting.
 * This watcher notices when `live` flips either way and pushes the whole board, so
 * customers' screens hide prices at once (and show them again on recovery) without
 * waiting for a reload.
 */
let lastLive = null;
let running = false;
let timer = null;

export async function checkFeed() {
  if (running) return;
  running = true;
  try {
    const feed = await getFeedState();
    if (lastLive !== null && feed.live !== lastLive) {
      const board = await getBoard(); // customer view: prices masked while down
      emitPricesChanged(board.products, board.feed);
    }
    lastLive = feed.live;
  } catch (err) {
    console.error("[feed] check failed:", err.message);
  } finally {
    running = false;
  }
}

export function startFeedWatch(intervalMs = 2000) {
  stopFeedWatch();
  timer = setInterval(checkFeed, intervalMs);
  timer.unref?.();
  checkFeed();
}

export function stopFeedWatch() {
  if (timer) clearInterval(timer);
  timer = null;
  lastLive = null;
}
