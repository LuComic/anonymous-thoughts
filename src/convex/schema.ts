import { defineSchema, defineTable } from 'convex/server';
import { v } from 'convex/values';

export default defineSchema({
	users: defineTable({
		id: v.string(),
		last_sent: v.string()
	}).index('by_user', ['id']),
	notes: defineTable({
		user_id: v.string(),
		content: v.string(),
		sent_at: v.string()
	})
});
