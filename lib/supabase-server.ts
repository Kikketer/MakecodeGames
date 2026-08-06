import { createClient, type WebSocketLikeConstructor } from "@supabase/supabase-js";

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
}

/**
 * supabase-js eagerly resolves a WebSocket constructor for its Realtime
 * client as soon as `createClient` is called, even though we never use
 * realtime/channels here. That resolution throws in the Workflow SDK's
 * sandboxed step/workflow runtime, which has no global `WebSocket`. Passing
 * a dummy transport short-circuits that lookup - it's never instantiated
 * since we don't call `.channel()`/`.connect()` anywhere in this app.
 */
class UnsupportedRealtimeTransport {
  constructor() {
    throw new Error("Realtime is not supported/used in this environment");
  }
}

export const supabaseServer = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
  },
  realtime: {
    transport: UnsupportedRealtimeTransport as unknown as WebSocketLikeConstructor,
  },
});
