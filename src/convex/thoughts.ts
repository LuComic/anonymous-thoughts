import { query, mutation } from './_generated/server';
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

// Get a random person's thought
// User's last_sent must match the current date
export const getThought = query({
	args: { user: v.string() },
	handler: async (ctx, args) => {
		const user = await ctx.db
			.query('users')
			.withIndex('by_user', (u) => u.eq('id', args.user))
			.first();

		const dateStr = todayString();

		if (user?.last_sent !== dateStr) return null;

		const notes = await ctx.db.query('notes').collect();
		const otherNotes = notes.filter(
			(note) => note.user_id !== args.user && note.received !== true
		);

		if (otherNotes.length === 0) return null;

		const note = otherNotes[Math.floor(Math.random() * otherNotes.length)];
		return {
			id: note._id,
			content: note.content
		};
	}
});

export const markThoughtReceived = mutation({
	args: { note: v.id('notes') },
	handler: async (ctx, args) => {
		await ctx.db.patch(args.note, { received: true });
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

		const todaysLimit = await ctx.db
			.query('dailyCap')
			.withIndex('by_day', (u) => u.eq('day', dateStr))
			.first();

		if (todaysLimit && todaysLimit.amount >= NOTE_LIMIT) return null;

		if (todaysLimit) {
			await ctx.db.patch(todaysLimit._id, {
				amount: todaysLimit.amount + 1
			});
		} else {
			await ctx.db.insert('dailyCap', {
				day: dateStr,
				amount: 1
			});
		}

		const note = await ctx.db.insert('notes', {
			user_id: args.user,
			content,
			sent_at: dateStr,
			received: false
		});

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
