import { query, mutation } from './_generated/server';
import { v } from 'convex/values';

const todayString = () => new Date().toISOString().slice(0, 10).replace(/-/g, '');

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
		const otherNotes = notes.filter((note) => note.user_id !== args.user);

		if (otherNotes.length === 0) return null;

		const note = otherNotes[Math.floor(Math.random() * otherNotes.length)];
		return note.content;
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

		if (user?.last_sent === dateStr) return null;

		const note = await ctx.db.insert('notes', {
			user_id: args.user,
			content: args.note,
			sent_at: dateStr
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
