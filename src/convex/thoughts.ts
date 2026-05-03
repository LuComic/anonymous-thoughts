import { mutation, query } from './_generated/server';
import { v } from 'convex/values';

const todayString = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');
const CHAR_LIMIT = 500;
const NOTE_LIMIT = 100;

export const ensureUser = mutation({
	args: { user: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		if (user) return user._id;

		return await ctx.db.insert('users', {
			id: args.user,
			last_sent: ''
		});
	}
});

export const hasSentToday = query({
	args: { user: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		return user?.last_sent === todayString();
	}
});

export const hasAvailableThought = query({
	args: { user: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		const dateStr = todayString();

		if (user?.last_sent !== dateStr) return false;

		const notes = await ctx.db
			.query('notes')
			.withIndex('by_sent_at_and_received', (q) => q.eq('sent_at', dateStr).eq('received', false))
			.collect();

		return notes.some((note) => note.user_id !== args.user);
	}
});

// Get a random person's thought and mark it as received atomically.
// User's last_sent must match the current date
export const getThought = mutation({
	args: { user: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		const dateStr = todayString();

		if (user?.last_sent !== dateStr) return null;

		const notes = await ctx.db
			.query('notes')
			.withIndex('by_sent_at_and_received', (q) => q.eq('sent_at', dateStr).eq('received', false))
			.collect();
		const otherNotes = notes.filter((note) => note.user_id !== args.user && note.received !== true);

		if (otherNotes.length === 0) return null;

		const note = otherNotes[Math.floor(Math.random() * otherNotes.length)];
		await ctx.db.patch(note._id, { received: true });

		return {
			id: note._id,
			content: note.content
		};
	}
});

// Send a note
// User's last_sent cannot be the current day
export const sendThought = mutation({
	args: { user: v.string(), note: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		const dateStr = todayString();
		const content = args.note.trim();

		if (user?.last_sent === dateStr || content.length === 0 || content.length > CHAR_LIMIT)
			return null;

		const todaysNotes = await ctx.db
			.query('notes')
			.withIndex('by_sent_at_and_received', (q) => q.eq('sent_at', dateStr))
			.collect();

		if (todaysNotes.length >= NOTE_LIMIT) return null;

		const todaysLimit = await ctx.db
			.query('dailyCap')
			.withIndex('by_day', (u) => u.eq('day', dateStr))
			.first();

		const note = await ctx.db.insert('notes', {
			user_id: args.user,
			content,
			sent_at: dateStr,
			received: false
		});

		const amount = todaysNotes.length + 1;
		if (todaysLimit) {
			await ctx.db.patch(todaysLimit._id, { amount });
		} else {
			await ctx.db.insert('dailyCap', {
				day: dateStr,
				amount
			});
		}

		if (user) {
			await ctx.db.patch(user._id, { last_sent: dateStr });
		} else {
			// Just for safety and not necessary, since ensureUser already creates the user on load
			await ctx.db.insert('users', {
				id: args.user,
				last_sent: dateStr
			});
		}

		return note;
	}
});
